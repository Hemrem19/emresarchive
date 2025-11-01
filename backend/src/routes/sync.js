/**
 * Sync Routes
 * Handles full and incremental sync operations
 */

import express from 'express';
import {
  fullSync,
  incrementalSync,
  getSyncStatus
} from '../controllers/sync.js';
import { authenticate } from '../middleware/auth.js';
import { validate, incrementalSyncSchema } from '../lib/validation.js';

const router = express.Router();

// All routes require authentication
router.use(authenticate);

router.get('/full', fullSync);
router.post('/incremental', validate(incrementalSyncSchema), incrementalSync);
router.get('/status', getSyncStatus);

export default router;

