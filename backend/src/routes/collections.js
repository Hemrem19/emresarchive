/**
 * Collections Routes
 * Handles collection CRUD operations
 */

import express from 'express';
import {
  getAllCollections,
  getCollection,
  createCollection,
  updateCollection,
  deleteCollection
} from '../controllers/collections.js';
import { authenticate } from '../middleware/auth.js';
import { validate, collectionSchema, collectionUpdateSchema } from '../lib/validation.js';

const router = express.Router();

// All routes require authentication
router.use(authenticate);

router.get('/', getAllCollections);
router.get('/:id', getCollection);
router.post('/', validate(collectionSchema), createCollection);
router.put('/:id', validate(collectionUpdateSchema), updateCollection);
router.delete('/:id', deleteCollection);

export default router;

