import { Hono } from 'hono';
import { authenticate } from '../middleware/auth.js';

const annotations = new Hono();
annotations.use('*', authenticate);

annotations.get('/', (c) => c.json({ success: true, message: 'Annotations Edge API' }));
annotations.post('/', (c) => c.json({ success: false, message: 'Not Implemented - Migrating to CRDT' }, 501));

export default annotations;
