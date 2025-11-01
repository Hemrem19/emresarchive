/**
 * Papers Routes
 * Handles paper CRUD operations and PDF uploads
 */

import express from 'express';
import {
  getAllPapers,
  getPaper,
  createPaper,
  updatePaper,
  deletePaper,
  searchPapers,
  getUploadUrl,
  getPdfDownloadUrl
} from '../controllers/papers.js';
import { getAnnotations, createAnnotation } from '../controllers/annotations.js';
import { authenticate } from '../middleware/auth.js';
import { validate, paperSchema, paperUpdateSchema, annotationSchema } from '../lib/validation.js';

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// Paper routes
router.get('/', getAllPapers);
router.get('/search', searchPapers);
router.get('/:id', getPaper);
router.post('/', validate(paperSchema), createPaper);
router.put('/:id', validate(paperUpdateSchema), updatePaper);
router.delete('/:id', deletePaper);

// Paper annotations routes (nested under papers)
router.get('/:id/annotations', getAnnotations);
router.post('/:id/annotations', validate(annotationSchema), createAnnotation);

// PDF routes
router.post('/upload-url', getUploadUrl);
router.get('/:id/pdf', getPdfDownloadUrl);

export default router;

