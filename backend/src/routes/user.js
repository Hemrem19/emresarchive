import { Hono } from 'hono';
import { drizzle } from 'drizzle-orm/d1';
import * as schema from '../../drizzle/schema.js';
import { eq, and, or, inArray, isNull, count } from 'drizzle-orm';
import { authenticate } from '../middleware/auth.js';

const user = new Hono();

// All routes require authentication
user.use('*', authenticate);

// Helper
const getDb = (c) => drizzle(c.env.citavers_db, { schema });

/**
 * Get User Stats
 * GET /api/user/stats
 */
user.get('/stats', async (c) => {
  const db = getDb(c);
  const authUser = c.get('user');

  try {
    const countLive = async (table) => {
      const [row] = await db.select({ value: count() }).from(table)
        .where(and(eq(table.userId, authUser.id), isNull(table.deletedAt)));
      return row.value;
    };
    const [papers, folders, annotations] = await Promise.all([
      countLive(schema.papers),
      countLive(schema.folders),
      countLive(schema.annotations),
    ]);

    return c.json({
      success: true,
      data: {
        stats: {
          papers,
          folders,
          collections: folders, // legacy key; collections became folders
          annotations,
          storageUsedBytes: authUser.storageUsedBytes?.toString() || '0'
        }
      }
    });
  } catch (err) {
    return c.json({ success: false, error: err.message }, 500);
  }
});

user.get('/sessions', async (c) => {
  return c.json({ success: false, error: { message: 'Not implemented yet' } }, 501);
});

user.delete('/sessions/:id', async (c) => {
  return c.json({ success: false, error: { message: 'Not implemented yet' } }, 501);
});

/**
 * Update Settings
 * PUT /api/user/settings
 */
user.put('/settings', async (c) => {
  const db = getDb(c);
  const authUser = c.get('user');
  
  const body = await c.req.json().catch(() => ({}));
  const { name, settings } = body;

  const updateData = {};
  if (name !== undefined) updateData.name = name;
  if (settings !== undefined) updateData.settings = settings;

  try {
    const [updatedUser] = await db.update(schema.users)
      .set(updateData)
      .where(eq(schema.users.id, authUser.id))
      .returning({
        id: schema.users.id,
        email: schema.users.email,
        name: schema.users.name,
        settings: schema.users.settings
      });

    return c.json({
      success: true,
      data: { user: updatedUser }
    });
  } catch (err) {
    return c.json({ success: false, error: err.message }, 500);
  }
});

/**
 * Clear All User Data
 * DELETE /api/user/data
 *
 * D1 deletes run as one batch (a single transaction), so a failure leaves
 * nothing half-deleted. PDFs in R2 are removed afterwards, best effort.
 */
user.delete('/data', async (c) => {
  const db = getDb(c);
  const authUser = c.get('user');
  const userId = authUser.id;

  try {
    const userPaperIds = db.select({ id: schema.papers.id }).from(schema.papers).where(eq(schema.papers.userId, userId));
    const deleted = await db.batch([
      db.delete(schema.paperFolders).where(eq(schema.paperFolders.userId, userId)).returning({ id: schema.paperFolders.id }),
      db.delete(schema.annotations).where(eq(schema.annotations.userId, userId)).returning({ id: schema.annotations.id }),
      db.delete(schema.paperConnections)
        .where(or(inArray(schema.paperConnections.fromPaperId, userPaperIds), inArray(schema.paperConnections.toPaperId, userPaperIds)))
        .returning({ id: schema.paperConnections.id }),
      db.delete(schema.networkGraphs).where(eq(schema.networkGraphs.userId, userId)).returning({ id: schema.networkGraphs.id }),
      db.delete(schema.papers).where(eq(schema.papers.userId, userId)).returning({ id: schema.papers.id }),
      db.delete(schema.folders).where(eq(schema.folders.userId, userId)).returning({ id: schema.folders.id }),
      db.update(schema.users).set({ storageUsedBytes: 0 }).where(eq(schema.users.id, userId)),
    ]);
    const [paperFolders, annotations, , , papers, folders] = deleted.map((rows) => rows?.length ?? 0);

    let pdfs = 0;
    try {
      pdfs = await deleteUserPdfs(c.env, userId);
    } catch (err) {
      console.error('[user] PDF cleanup failed:', err.message);
    }

    return c.json({
      success: true,
      data: {
        deleted: {
          papers,
          folders,
          collections: folders, // legacy key; collections became folders
          paperFolders,
          annotations,
          pdfs
        },
        message: 'All user data has been permanently cleared'
      }
    });
  } catch (err) {
    console.error('[user] clear data failed:', err);
    return c.json({ success: false, error: { message: 'Failed to clear data. Nothing was deleted.' } }, 500);
  }
});

// Removes every object under papers/{userId}/ (the key layout used for uploads)
async function deleteUserPdfs(env, userId) {
  if (!env.PDF_BUCKET) return 0;
  let removed = 0;
  let cursor;
  do {
    const page = await env.PDF_BUCKET.list({ prefix: `papers/${userId}/`, cursor, limit: 1000 });
    const keys = page.objects.map((o) => o.key);
    if (keys.length) {
      await env.PDF_BUCKET.delete(keys);
      removed += keys.length;
    }
    cursor = page.truncated ? page.cursor : undefined;
  } while (cursor);
  return removed;
}

export default user;
