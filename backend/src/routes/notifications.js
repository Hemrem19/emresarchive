import { Hono } from 'hono';
import { drizzle } from 'drizzle-orm/d1';
import * as schema from '../../drizzle/schema.js';
import { authenticate } from '../middleware/auth.js';
import { listNotifications, markRead } from '../services/notifications.js';

/**
 * The signed-in person's notifications (see services/notifications.js).
 *
 *   GET  /api/notifications        { items, unread }, newest first
 *   POST /api/notifications/read   { ids? } marks those read; without ids, all
 */
const notifications = new Hono();
notifications.use('*', authenticate);

const getDb = (c) => drizzle(c.env.citavers_db, { schema });

notifications.get('/', async (c) => {
    const data = await listNotifications(getDb(c), c.get('user'));
    return c.json({ success: true, data });
});

notifications.post('/read', async (c) => {
    const body = await c.req.json().catch(() => ({}));
    await markRead(getDb(c), c.get('user'), body.ids);
    return c.json({ success: true });
});

export default notifications;
