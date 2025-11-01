/**
 * Annotations Routes
 * Handles annotation update and delete operations
 * 
 * Note: GET and POST for annotations are nested under /api/papers/:id/annotations
 * This router only handles PUT and DELETE operations on individual annotations
 */

import express from 'express';
import {
  getAnnotation,
  updateAnnotation,
  deleteAnnotation
} from '../controllers/annotations.js';
import { authenticate } from '../middleware/auth.js';
import { validate, annotationUpdateSchema } from '../lib/validation.js';

const router = express.Router();

// All routes require authentication
router.use(authenticate);

router.get('/:id', getAnnotation);
router.put('/:id', validate(annotationUpdateSchema), updateAnnotation);
router.delete('/:id', deleteAnnotation);

export default router;

