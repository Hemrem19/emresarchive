/**
 * Annotations Routes
 * Handles annotation CRUD operations for papers
 */

import express from 'express';
import {
  getAnnotations,
  getAnnotation,
  createAnnotation,
  updateAnnotation,
  deleteAnnotation
} from '../controllers/annotations.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

// All routes require authentication
router.use(authenticate);

router.get('/papers/:paperId/annotations', getAnnotations);
router.get('/:id', getAnnotation);
router.post('/papers/:paperId/annotations', createAnnotation);
router.put('/:id', updateAnnotation);
router.delete('/:id', deleteAnnotation);

export default router;

