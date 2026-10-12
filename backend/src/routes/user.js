import { Hono } from 'hono';
import { drizzle } from 'drizzle-orm/d1';
import * as schema from '../../drizzle/schema.js';
import { eq, or, inArray, count } from 'drizzle-orm';
import { liveOwnedBy, ownedBy, personalLibrary, storagePrefix } from '../lib/access.js';
import { authenticate } from '../middleware/auth.js';
import { deleteObjects, isStorageConfigured, listObjects } from '../lib/storage.js';
import { libraryLimit, measureLibrary, recordUsage } from '../services/storage-quota.js';

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
        .where(liveOwnedBy(table, authUser));
      return row.value;
    };
    const [papers, folders, annotations, storageUsedBytes] = await Promise.all([
      countLive(schema.papers),
      countLive(schema.folders),
      countLive(schema.annotations),
      isStorageConfigured(c.env) ? measureLibrary(c.env, personalLibrary(authUser)) : 0,
    ]);
    if (storageUsedBytes !== authUser.storageUsedBytes) await recordUsage(db, authUser, storageUsedBytes);

    return c.json({
      success: true,
      data: {
        stats: {
          papers,
          folders,
          collections: folders, // legacy key; collections became folders
          annotations,
          storageUsedBytes: String(storageUsedBytes),
          storageLimitBytes: String(libraryLimit(c.env, personalLibrary(authUser)))
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

  try {
    // Ownership operation: wipes the caller's personal library only
    const userPaperIds = db.select({ id: schema.papers.id }).from(schema.papers).where(ownedBy(schema.papers, authUser));
    const deleted = await db.batch([
      db.delete(schema.paperFolders).where(ownedBy(schema.paperFolders, authUser)).returning({ id: schema.paperFolders.id }),
      db.delete(schema.annotations).where(ownedBy(schema.annotations, authUser)).returning({ id: schema.annotations.id }),
      db.delete(schema.paperConnections)
        .where(or(inArray(schema.paperConnections.fromPaperId, userPaperIds), inArray(schema.paperConnections.toPaperId, userPaperIds)))
        .returning({ id: schema.paperConnections.id }),
      db.delete(schema.networkGraphs).where(ownedBy(schema.networkGraphs, authUser)).returning({ id: schema.networkGraphs.id }),
      db.delete(schema.papers).where(ownedBy(schema.papers, authUser)).returning({ id: schema.papers.id }),
      db.delete(schema.folders).where(ownedBy(schema.folders, authUser)).returning({ id: schema.folders.id }),
      db.update(schema.users).set({ storageUsedBytes: 0 }).where(eq(schema.users.id, authUser.id)),
    ]);
    const [paperFolders, annotations, , , papers, folders] = deleted.map((rows) => rows?.length ?? 0);

    let pdfs = 0;
    try {
      pdfs = await deleteUserPdfs(c.env, authUser);
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

// Removes every object in the user's personal library storage
async function deleteUserPdfs(env, user) {
  if (!isStorageConfigured(env)) return 0;
  const keys = [];
  for await (const object of listObjects(env, storagePrefix(personalLibrary(user)))) keys.push(object.key);
  for (let i = 0; i < keys.length; i += 1000) await deleteObjects(env, keys.slice(i, i + 1000));
  return keys.length;
}

export default user;
