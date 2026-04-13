import { Hono } from 'hono';
import { authenticate } from '../middleware/auth.js';

const importRouter = new Hono();
importRouter.use('*', authenticate);
importRouter.post('/file', (c) => c.json({ success: false, message: 'Not Implemented' }, 501));

export default importRouter;
