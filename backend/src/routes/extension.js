import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { savePaper } from '../controllers/extension.js';

const router = Router();

// Protected routes
router.use(authenticate);

router.post('/save', savePaper);

export default router;

