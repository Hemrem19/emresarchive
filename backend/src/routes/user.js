import { Hono } from 'hono';
import { drizzle } from 'drizzle-orm/d1';
import * as schema from '../../drizzle/schema.js';
import { eq, count } from 'drizzle-orm';
import { authenticate } from '../middleware/auth.js';

const user = new Hono();

// All routes require authentication
user.use('*', authenticate);

// Helper
const getDb = (c) => drizzle(c.env.DB, { schema });

/**
 * Get User Stats
 * GET /api/user/stats
 */
user.get('/stats', async (c) => {
  const db = getDb(c);
  const authUser = c.get('user');

  try {
    const papersResult = await db.select({ value: count() }).from(schema.papers).where(eq(schema.papers.userId, authUser.id));
    const collectionsResult = await db.select({ value: count() }).from(schema.collections).where(eq(schema.collections.userId, authUser.id));
    const annotationsResult = await db.select({ value: count() }).from(schema.annotations).where(eq(schema.annotations.userId, authUser.id));

    return c.json({
      success: true,
      data: {
        stats: {
          papers: papersResult[0].value,
          collections: collectionsResult[0].value,
          annotations: annotationsResult[0].value,
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
 */
user.delete('/data', async (c) => {
  const db = getDb(c);
  const authUser = c.get('user');

  try {
    const annotationsDelete = await db.delete(schema.annotations).where(eq(schema.annotations.userId, authUser.id)).returning({ id: schema.annotations.id });
    const papersDelete = await db.delete(schema.papers).where(eq(schema.papers.userId, authUser.id)).returning({ id: schema.papers.id });
    const collectionsDelete = await db.delete(schema.collections).where(eq(schema.collections.userId, authUser.id)).returning({ id: schema.collections.id });

    // Assuming deletions cascaded conceptually, return counts based on returning results
    return c.json({
      success: true,
      data: {
        deleted: {
          papers: papersDelete.length,
          collections: collectionsDelete.length,
          annotations: annotationsDelete.length
        },
        message: 'All user data has been permanently cleared'
      }
    });
  } catch (err) {
    return c.json({ success: false, error: err.message }, 500);
  }
});

export default user;
