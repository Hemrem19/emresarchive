/**
 * User Routes
 * Handles user profile and settings
 */

import express from 'express';
import {
  getStats,
  getSessions,
  revokeSession,
  updateSettings
} from '../controllers/user.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

// All routes require authentication
router.use(authenticate);

router.get('/stats', getStats);
router.get('/sessions', getSessions);
router.delete('/sessions/:id', revokeSession);
router.put('/settings', updateSettings);

export default router;

