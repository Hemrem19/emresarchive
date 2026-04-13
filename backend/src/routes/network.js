import { Hono } from 'hono';
import { authenticate } from '../middleware/auth.js';

const network = new Hono();
network.use('*', authenticate);
network.get('/', (c) => c.json({ success: false, message: 'Not Implemented' }, 501));

export default network;
