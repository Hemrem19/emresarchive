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
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// Paper routes
router.get('/', getAllPapers);
router.get('/search', searchPapers);
router.get('/:id', getPaper);
router.post('/', createPaper);
router.put('/:id', updatePaper);
router.delete('/:id', deletePaper);

// PDF routes
router.post('/upload-url', getUploadUrl);
router.get('/:id/pdf', getPdfDownloadUrl);

export default router;

