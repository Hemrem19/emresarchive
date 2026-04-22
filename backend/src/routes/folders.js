import { Hono } from 'hono';
import { drizzle } from 'drizzle-orm/d1';
import * as schema from '../../drizzle/schema.js';
import { eq, and, isNull, asc, sql, gt, or } from 'drizzle-orm';
import { authenticate } from '../middleware/auth.js';

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
          eq(schema.folders.userId, authUser.id),
          or(gt(schema.folders.updatedAt, since), gt(schema.folders.deletedAt, since))
        )
      : and(
          eq(schema.folders.userId, authUser.id),
          isNull(schema.folders.deletedAt)
        );

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
      .where(and(
        eq(schema.paperFolders.userId, authUser.id),
        isNull(schema.paperFolders.deletedAt)
      ));

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
    const folder = await db.query.folders.findFirst({
      where: and(
        eq(schema.folders.id, folderId),
        eq(schema.folders.userId, authUser.id),
        isNull(schema.folders.deletedAt)
      ),
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
        version: true
      }
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
    const [folder] = await db.insert(schema.folders).values({
      userId: authUser.id,
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
    const existing = await db.query.folders.findFirst({
      where: and(
        eq(schema.folders.id, folderId),
        eq(schema.folders.userId, authUser.id),
        isNull(schema.folders.deletedAt)
      )
    });

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
    const existing = await db.query.folders.findFirst({
      where: and(
        eq(schema.folders.id, folderId),
        eq(schema.folders.userId, authUser.id),
        isNull(schema.folders.deletedAt)
      )
    });

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

/**
 * Get Papers in Folder
 * GET /api/folders/:id/papers
 */
foldersRouter.get('/:id/papers', async (c) => {
  const db = getDb(c);
  const authUser = c.get('user');
  const folderId = parseInt(c.req.param('id'), 10);

  try {
    const records = await db.query.paperFolders.findMany({
      where: and(
        eq(schema.paperFolders.folderId, folderId),
        eq(schema.paperFolders.userId, authUser.id),
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
    // Check if association already exists
    const existing = await db.query.paperFolders.findFirst({
      where: and(
        eq(schema.paperFolders.paperId, body.paperId),
        eq(schema.paperFolders.folderId, folderId),
        eq(schema.paperFolders.userId, authUser.id),
        isNull(schema.paperFolders.deletedAt)
      )
    });

    if (existing) {
      return c.json({ success: true, data: { id: existing.id } });
    }

    const [record] = await db.insert(schema.paperFolders).values({
      paperId: body.paperId,
      folderId,
      userId: authUser.id
    }).returning({
      id: schema.paperFolders.id,
      paperId: schema.paperFolders.paperId,
      folderId: schema.paperFolders.folderId,
      addedAt: schema.paperFolders.addedAt
    });

    // Bump folder's updatedAt so ?since= delta queries capture membership changes.
    await db.update(schema.folders)
      .set({ updatedAt: new Date().toISOString() })
      .where(and(eq(schema.folders.id, folderId), eq(schema.folders.userId, authUser.id)));

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
    const now = new Date().toISOString();

    await db.update(schema.paperFolders)
      .set({ deletedAt: now })
      .where(and(
        eq(schema.paperFolders.paperId, paperId),
        eq(schema.paperFolders.folderId, folderId),
        eq(schema.paperFolders.userId, authUser.id),
        isNull(schema.paperFolders.deletedAt)
      ));

    // Bump folder's updatedAt so ?since= delta queries capture membership changes.
    await db.update(schema.folders)
      .set({ updatedAt: now })
      .where(and(eq(schema.folders.id, folderId), eq(schema.folders.userId, authUser.id)));

    return c.json({
      success: true,
      message: 'Paper removed from folder'
    });
  } catch (err) {
    return c.json({ success: false, error: err.message }, 500);
  }
});

export default foldersRouter;
