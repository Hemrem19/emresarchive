import { Hono } from 'hono';
import { drizzle } from 'drizzle-orm/d1';
import * as schema from '../../drizzle/schema.js';
import { eq, and, isNull, desc } from 'drizzle-orm';
import { authenticate } from '../middleware/auth.js';

const collections = new Hono();

// All routes require authentication
collections.use('*', authenticate);

// Helper
const getDb = (c) => drizzle(c.env.citavers_db, { schema });

/**
 * Get All Collections
 * GET /api/collections
 */
collections.get('/', async (c) => {
  const db = getDb(c);
  const authUser = c.get('user');

  try {
    const userCollections = await db.query.collections.findMany({
      where: and(
        eq(schema.collections.userId, authUser.id),
        isNull(schema.collections.deletedAt)
      ),
      orderBy: [desc(schema.collections.updatedAt)],
      columns: {
        id: true,
        name: true,
        icon: true,
        color: true,
        filters: true,
        createdAt: true,
        updatedAt: true,
        version: true
      }
    });

    return c.json({
      success: true,
      data: { collections: userCollections }
    });
  } catch (err) {
    return c.json({ success: false, error: err.message }, 500);
  }
});

/**
 * Get Single Collection
 * GET /api/collections/:id
 */
collections.get('/:id', async (c) => {
  const db = getDb(c);
  const authUser = c.get('user');
  const collectionId = parseInt(c.req.param('id'), 10);

  try {
    const collection = await db.query.collections.findFirst({
      where: and(
        eq(schema.collections.id, collectionId),
        eq(schema.collections.userId, authUser.id),
        isNull(schema.collections.deletedAt)
      ),
      columns: {
        id: true,
        name: true,
        icon: true,
        color: true,
        filters: true,
        createdAt: true,
        updatedAt: true,
        version: true
      }
    });

    if (!collection) {
      return c.json({ success: false, error: { message: 'Collection not found' } }, 404);
    }

    return c.json({
      success: true,
      data: { collection }
    });
  } catch (err) {
    return c.json({ success: false, error: err.message }, 500);
  }
});

/**
 * Create Collection
 * POST /api/collections
 */
collections.post('/', async (c) => {
  const db = getDb(c);
  const authUser = c.get('user');
  const body = await c.req.json().catch(() => ({}));

  try {
    const [collection] = await db.insert(schema.collections).values({
      userId: authUser.id,
      name: body.name,
      icon: body.icon || 'folder',
      color: body.color || 'text-primary',
      filters: body.filters || {},
      version: 1
    }).returning({
      id: schema.collections.id,
      name: schema.collections.name,
      icon: schema.collections.icon,
      color: schema.collections.color,
      filters: schema.collections.filters,
      createdAt: schema.collections.createdAt,
      updatedAt: schema.collections.updatedAt,
      version: schema.collections.version
    });

    return c.json({
      success: true,
      data: { collection }
    }, 201);
  } catch (err) {
    return c.json({ success: false, error: err.message }, 500);
  }
});

/**
 * Update Collection
 * PUT /api/collections/:id
 */
collections.put('/:id', async (c) => {
  const db = getDb(c);
  const authUser = c.get('user');
  const collectionId = parseInt(c.req.param('id'), 10);
  const updates = await c.req.json().catch(() => ({}));

  try {
    const existing = await db.query.collections.findFirst({
      where: and(
        eq(schema.collections.id, collectionId),
        eq(schema.collections.userId, authUser.id),
        isNull(schema.collections.deletedAt)
      )
    });

    if (!existing) {
      return c.json({ success: false, error: { message: 'Collection not found' } }, 404);
    }

    const updateData = { updatedAt: new Date().toISOString() };
    if (updates.name !== undefined) updateData.name = updates.name;
    if (updates.icon !== undefined) updateData.icon = updates.icon;
    if (updates.color !== undefined) updateData.color = updates.color;
    if (updates.filters !== undefined) updateData.filters = updates.filters;
    updateData.version = existing.version + 1;

    const [collection] = await db.update(schema.collections)
      .set(updateData)
      .where(eq(schema.collections.id, collectionId))
      .returning({
        id: schema.collections.id,
        name: schema.collections.name,
        icon: schema.collections.icon,
        color: schema.collections.color,
        filters: schema.collections.filters,
        createdAt: schema.collections.createdAt,
        updatedAt: schema.collections.updatedAt,
        version: schema.collections.version
      });

    return c.json({
      success: true,
      data: { collection }
    });
  } catch (err) {
    return c.json({ success: false, error: err.message }, 500);
  }
});

/**
 * Delete Collection (Soft Delete)
 * DELETE /api/collections/:id
 */
collections.delete('/:id', async (c) => {
  const db = getDb(c);
  const authUser = c.get('user');
  const collectionId = parseInt(c.req.param('id'), 10);

  try {
    const existing = await db.query.collections.findFirst({
      where: and(
        eq(schema.collections.id, collectionId),
        eq(schema.collections.userId, authUser.id),
        isNull(schema.collections.deletedAt)
      )
    });

    if (!existing) {
      return c.json({ success: false, error: { message: 'Collection not found' } }, 404);
    }

    await db.update(schema.collections)
      .set({
        deletedAt: new Date().toISOString(),
        version: existing.version + 1
      })
      .where(eq(schema.collections.id, collectionId));

    return c.json({
      success: true,
      message: 'Collection deleted successfully'
    });
  } catch (err) {
    return c.json({ success: false, error: err.message }, 500);
  }
});

export default collections;
