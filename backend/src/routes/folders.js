import { Hono } from 'hono';
import { drizzle } from 'drizzle-orm/d1';
import * as schema from '../../drizzle/schema.js';
import { eq, and, isNull, asc, sql, gt, or } from 'drizzle-orm';
import { authenticate } from '../middleware/auth.js';
import {
  READ, WRITE, accessible, accessibleWithDeleted, findAccessible, inLibrary, libraryFields, libraryOf,
  personalLibrary, sameLibrary,
} from '../lib/access.js';

const foldersRouter = new Hono();

foldersRouter.use('*', authenticate);

const getDb = (c) => drizzle(c.env.citavers_db, { schema });

/**
 * Get All Folders
 * GET /api/folders
 */
foldersRouter.get('/', async (c) => {
  const db = getDb(c);
  const authUser = c.get('user');
  const since = c.req.query('since') || null;

  try {
    // Delta mode: include tombstones so clients can detect remote deletions.
    const whereClause = since
      ? and(
          accessibleWithDeleted(schema.folders, authUser, READ),
          or(gt(schema.folders.updatedAt, since), gt(schema.folders.deletedAt, since))
        )
      : accessible(schema.folders, authUser, READ);

    const userFolders = await db.query.folders.findMany({
      where: whereClause,
      orderBy: [asc(schema.folders.position), asc(schema.folders.createdAt)],
      columns: {
        id: true,
        name: true,
        icon: true,
        color: true,
        position: true,
        workspaceId: true,
        isShared: true,
        createdAt: true,
        updatedAt: true,
        deletedAt: true,
        version: true
      }
    });

    // Attach paperIds to each folder in one extra query (replaces N per-folder REST calls).
    const assocRows = await db
      .select({ folderId: schema.paperFolders.folderId, paperId: schema.paperFolders.paperId })
      .from(schema.paperFolders)
      .where(accessible(schema.paperFolders, authUser, READ));

    const byFolder = new Map();
    for (const r of assocRows) {
      if (!byFolder.has(r.folderId)) byFolder.set(r.folderId, []);
      byFolder.get(r.folderId).push(r.paperId);
    }

    const foldersWithPapers = userFolders.map(f => ({ ...f, paperIds: byFolder.get(f.id) ?? [] }));

    return c.json({
      success: true,
      data: { folders: foldersWithPapers }
    });
  } catch (err) {
    return c.json({ success: false, error: err.message }, 500);
  }
});

/**
 * Get Single Folder
 * GET /api/folders/:id
 */
foldersRouter.get('/:id', async (c) => {
  const db = getDb(c);
  const authUser = c.get('user');
  const folderId = parseInt(c.req.param('id'), 10);

  try {
    const folder = await findAccessible(db.query.folders, schema.folders, authUser, folderId, READ, {
        id: true,
        name: true,
        icon: true,
        color: true,
        position: true,
        workspaceId: true,
        isShared: true,
        createdAt: true,
        updatedAt: true,
        version: true
    });

    if (!folder) {
      return c.json({ success: false, error: { message: 'Folder not found' } }, 404);
    }

    return c.json({
      success: true,
      data: { folder }
    });
  } catch (err) {
    return c.json({ success: false, error: err.message }, 500);
  }
});

/**
 * Create Folder
 * POST /api/folders
 */
foldersRouter.post('/', async (c) => {
  const db = getDb(c);
  const authUser = c.get('user');
  const body = await c.req.json().catch(() => ({}));

  if (!body.name || !body.name.trim()) {
    return c.json({ success: false, error: { message: 'Name is required' } }, 400);
  }

  try {
    // New folders go to the caller's personal library (groups will pass a library id)
    const [folder] = await db.insert(schema.folders).values({
      ...libraryFields(personalLibrary(authUser)),
      name: body.name.trim(),
      icon: body.icon || 'folder',
      color: body.color || null,
      position: body.position || 0,
      version: 1
    }).returning({
      id: schema.folders.id,
      name: schema.folders.name,
      icon: schema.folders.icon,
      color: schema.folders.color,
      position: schema.folders.position,
      workspaceId: schema.folders.workspaceId,
      isShared: schema.folders.isShared,
      createdAt: schema.folders.createdAt,
      updatedAt: schema.folders.updatedAt,
      version: schema.folders.version
    });

    return c.json({
      success: true,
      data: { folder }
    }, 201);
  } catch (err) {
    return c.json({ success: false, error: err.message }, 500);
  }
});

/**
 * Update Folder
 * PUT /api/folders/:id
 */
foldersRouter.put('/:id', async (c) => {
  const db = getDb(c);
  const authUser = c.get('user');
  const folderId = parseInt(c.req.param('id'), 10);
  const updates = await c.req.json().catch(() => ({}));

  try {
    const existing = await findAccessible(db.query.folders, schema.folders, authUser, folderId, WRITE);

    if (!existing) {
      return c.json({ success: false, error: { message: 'Folder not found' } }, 404);
    }

    const updateData = { updatedAt: new Date().toISOString() };
    if (updates.name !== undefined) updateData.name = updates.name;
    if (updates.icon !== undefined) updateData.icon = updates.icon;
    if (updates.color !== undefined) updateData.color = updates.color;
    if (updates.position !== undefined) updateData.position = updates.position;
    updateData.version = existing.version + 1;

    const [folder] = await db.update(schema.folders)
      .set(updateData)
      .where(eq(schema.folders.id, folderId))
      .returning({
        id: schema.folders.id,
        name: schema.folders.name,
        icon: schema.folders.icon,
        color: schema.folders.color,
        position: schema.folders.position,
        workspaceId: schema.folders.workspaceId,
        isShared: schema.folders.isShared,
        createdAt: schema.folders.createdAt,
        updatedAt: schema.folders.updatedAt,
        version: schema.folders.version
      });

    return c.json({
      success: true,
      data: { folder }
    });
  } catch (err) {
    return c.json({ success: false, error: err.message }, 500);
  }
});

/**
 * Delete Folder (Soft Delete)
 * DELETE /api/folders/:id
 */
foldersRouter.delete('/:id', async (c) => {
  const db = getDb(c);
  const authUser = c.get('user');
  const folderId = parseInt(c.req.param('id'), 10);

  try {
    const existing = await findAccessible(db.query.folders, schema.folders, authUser, folderId, WRITE);

    if (!existing) {
      return c.json({ success: false, error: { message: 'Folder not found' } }, 404);
    }

    const now = new Date().toISOString();

    // Soft-delete associated paper_folders
    await db.update(schema.paperFolders)
      .set({ deletedAt: now })
      .where(and(
        eq(schema.paperFolders.folderId, folderId),
        isNull(schema.paperFolders.deletedAt)
      ));

    // Soft-delete the folder
    await db.update(schema.folders)
      .set({
        deletedAt: now,
        version: existing.version + 1
      })
      .where(eq(schema.folders.id, folderId));

    return c.json({
      success: true,
      message: 'Folder deleted successfully'
    });
  } catch (err) {
    return c.json({ success: false, error: err.message }, 500);
  }
});

const FOLDER_LIBRARY_COLUMNS = { id: true, userId: true };

/**
 * Get Papers in Folder
 * GET /api/folders/:id/papers
 */
foldersRouter.get('/:id/papers', async (c) => {
  const db = getDb(c);
  const authUser = c.get('user');
  const folderId = parseInt(c.req.param('id'), 10);

  try {
    const folder = await findAccessible(db.query.folders, schema.folders, authUser, folderId, READ, FOLDER_LIBRARY_COLUMNS);
    if (!folder) {
      return c.json({ success: false, error: { message: 'Folder not found' } }, 404);
    }

    const records = await db.query.paperFolders.findMany({
      where: and(
        eq(schema.paperFolders.folderId, folder.id),
        inLibrary(schema.paperFolders, libraryOf(folder)),
        isNull(schema.paperFolders.deletedAt)
      ),
      columns: {
        paperId: true
      }
    });

    return c.json({
      success: true,
      data: { paperIds: records.map(r => r.paperId) }
    });
  } catch (err) {
    return c.json({ success: false, error: err.message }, 500);
  }
});

/**
 * Add Paper to Folder
 * POST /api/folders/:id/papers
 */
foldersRouter.post('/:id/papers', async (c) => {
  const db = getDb(c);
  const authUser = c.get('user');
  const folderId = parseInt(c.req.param('id'), 10);
  const body = await c.req.json().catch(() => ({}));

  if (!body.paperId) {
    return c.json({ success: false, error: { message: 'paperId is required' } }, 400);
  }

  try {
    // Filing changes the folder; the paper only has to be visible. Both must
    // live in the same library: items are never linked across libraries.
    const [folder, paper] = await Promise.all([
      findAccessible(db.query.folders, schema.folders, authUser, folderId, WRITE, FOLDER_LIBRARY_COLUMNS),
      findAccessible(db.query.papers, schema.papers, authUser, parseInt(body.paperId, 10), READ, FOLDER_LIBRARY_COLUMNS),
    ]);
    if (!folder || !paper || !sameLibrary(libraryOf(folder), libraryOf(paper))) {
      return c.json({ success: false, error: { message: 'Folder or paper not found' } }, 404);
    }
    const library = libraryOf(folder);

    // Check if association already exists
    const existing = await db.query.paperFolders.findFirst({
      where: and(
        eq(schema.paperFolders.paperId, paper.id),
        eq(schema.paperFolders.folderId, folder.id),
        inLibrary(schema.paperFolders, library),
        isNull(schema.paperFolders.deletedAt)
      )
    });

    if (existing) {
      return c.json({ success: true, data: { id: existing.id } });
    }

    const [record] = await db.insert(schema.paperFolders).values({
      paperId: paper.id,
      folderId: folder.id,
      ...libraryFields(library)
    }).returning({
      id: schema.paperFolders.id,
      paperId: schema.paperFolders.paperId,
      folderId: schema.paperFolders.folderId,
      addedAt: schema.paperFolders.addedAt
    });

    // Bump folder's updatedAt so ?since= delta queries capture membership changes.
    await db.update(schema.folders)
      .set({ updatedAt: new Date().toISOString() })
      .where(eq(schema.folders.id, folder.id));

    return c.json({
      success: true,
      data: record
    }, 201);
  } catch (err) {
    return c.json({ success: false, error: err.message }, 500);
  }
});

/**
 * Remove Paper from Folder
 * DELETE /api/folders/:id/papers/:paperId
 */
foldersRouter.delete('/:id/papers/:paperId', async (c) => {
  const db = getDb(c);
  const authUser = c.get('user');
  const folderId = parseInt(c.req.param('id'), 10);
  const paperId = parseInt(c.req.param('paperId'), 10);

  try {
    const folder = await findAccessible(db.query.folders, schema.folders, authUser, folderId, WRITE, FOLDER_LIBRARY_COLUMNS);
    // Removing from a folder the caller cannot change is a no-op, as before
    if (folder) {
      const now = new Date().toISOString();

      await db.update(schema.paperFolders)
        .set({ deletedAt: now })
        .where(and(
          eq(schema.paperFolders.paperId, paperId),
          eq(schema.paperFolders.folderId, folder.id),
          inLibrary(schema.paperFolders, libraryOf(folder)),
          isNull(schema.paperFolders.deletedAt)
        ));

      // Bump folder's updatedAt so ?since= delta queries capture membership changes.
      await db.update(schema.folders)
        .set({ updatedAt: now })
        .where(eq(schema.folders.id, folder.id));
    }

    return c.json({
      success: true,
      message: 'Paper removed from folder'
    });
  } catch (err) {
    return c.json({ success: false, error: err.message }, 500);
  }
});

export default foldersRouter;
