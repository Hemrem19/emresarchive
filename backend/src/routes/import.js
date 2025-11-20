/**
 * Import API Routes
 */

import express from 'express';
import { batchImport } from '../controllers/import.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

// All import routes require authentication
router.use(authenticate);

// Batch import endpoint
router.post('/batch-import', batchImport);

export default router;

