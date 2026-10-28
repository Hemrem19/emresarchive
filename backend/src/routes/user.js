import { Hono } from 'hono';
import { drizzle } from 'drizzle-orm/d1';
import * as schema from '../../drizzle/schema.js';
import { eq, or, inArray, count, sql } from 'drizzle-orm';
import { liveOwnedBy, ownedBy, personalLibrary, storagePrefix } from '../lib/access.js';
import { authenticate } from '../middleware/auth.js';
import { deleteObjects, isStorageConfigured, listObjects } from '../lib/storage.js';
import { endSessions, listSessions } from '../services/sessions.js';
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

/**
 * Signed-in devices
 * GET /api/user/sessions
 */
user.get('/sessions', async (c) => {
  const sessions = await listSessions(getDb(c), c.get('user').id, c.get('sessionId'));
  return c.json({ success: true, data: { sessions } });
});

/**
 * Sign out every device except this one
 * DELETE /api/user/sessions
 */
user.delete('/sessions', async (c) => {
  const current = c.get('sessionId');
  if (!current) {
    return c.json({ success: false, error: { message: 'Please sign in again first.' } }, 409);
  }
  const ended = await endSessions(c.env, getDb(c), c.get('user').id, { allBut: current });
  return c.json({ success: true, data: { ended: ended.length } });
});

/**
 * Sign out one device
 * DELETE /api/user/sessions/:id
 */
user.delete('/sessions/:id', async (c) => {
  const id = Number(c.req.param('id'));
  const ended = Number.isInteger(id) ? await endSessions(c.env, getDb(c), c.get('user').id, { ids: [id] }) : [];
  if (!ended.length) return c.json({ success: false, error: { message: 'Session not found' } }, 404);
  return c.json({ success: true, data: { ended: 1, current: id === c.get('sessionId') } });
});

/**
 * Preferences that follow the user across devices. Only these keys are kept,
 * so the column stays small and holds nothing the app does not read.
 */
const SETTINGS = {
  readingStatusOrder: (v) => Array.isArray(v) && v.length <= 20
    && v.every((s) => typeof s === 'string' && s.trim() && s.length <= 40),
  currentSortBy: (v) => typeof v === 'string' && /^[\w-]{1,40}$/.test(v),
  itemsPerPage: (v) => Number.isInteger(v) && v >= 1 && v <= 500,
};

/** The valid settings in `input`, or null when anything in it is unknown or malformed. */
export function parseSettings(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return null;
  const entries = Object.entries(input);
  if (!entries.every(([k, v]) => Object.hasOwn(SETTINGS, k) && SETTINGS[k](v))) return null;
  return Object.fromEntries(entries);
}

/**
 * Update the display name and/or merge preferences into the stored ones
 * PUT /api/user/settings
 * Body: { name?, settings? }
 */
user.put('/settings', async (c) => {
  const body = await c.req.json().catch(() => ({}));
  const updateData = {};

  if (body.name !== undefined) {
    const name = typeof body.name === 'string' ? body.name.trim() : '';
    if (!name || name.length > 100) return c.json({ success: false, error: { message: 'Name must be 1–100 characters' } }, 400);
    updateData.name = name;
  }
  if (body.settings !== undefined) {
    const settings = parseSettings(body.settings);
    if (!settings) return c.json({ success: false, error: { message: 'Invalid settings' } }, 400);
    // Merge, so a device sending one preference keeps the others
    updateData.settings = sql`json_patch(${schema.users.settings}, ${JSON.stringify(settings)})`;
  }
  if (!Object.keys(updateData).length) return c.json({ success: false, error: { message: 'Nothing to update' } }, 400);

  try {
    const [updated] = await getDb(c).update(schema.users)
      .set(updateData)
      .where(eq(schema.users.id, c.get('user').id))
      .returning({ name: schema.users.name, settings: schema.users.settings });
    return c.json({ success: true, data: updated });
  } catch (err) {
    console.error('Settings update error:', err);
    return c.json({ success: false, error: { message: 'Failed to save settings' } }, 500);
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
