/**
 * Papers Routes
 * Handles paper CRUD operations and PDF uploads
 */

import express from 'express';
import multer from 'multer';
import {
  getAllPapers,
  getPaper,
  createPaper,
  updatePaper,
  deletePaper,
  searchPapers,
  getUploadUrl,
  getPdfDownloadUrl,
  uploadPdfDirect
} from '../controllers/papers.js';
import { getAnnotations, createAnnotation } from '../controllers/annotations.js';
import { authenticate } from '../middleware/auth.js';
import { validate, paperSchema, paperUpdateSchema, annotationSchema } from '../lib/validation.js';

const router = express.Router();

// Configure multer for file uploads (memory storage)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 50 * 1024 * 1024 // 50MB max file size
  },
  fileFilter: (req, file, cb) => {
    // Only allow PDF files
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Only PDF files are allowed'), false);
    }
  }
});

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
// IMPORTANT: Upload route must be before other POST routes to avoid conflicts
router.post('/upload', upload.single('file'), uploadPdfDirect); // Direct upload endpoint (must be first)
router.post('/upload-url', getUploadUrl);
router.get('/:id/pdf', getPdfDownloadUrl);

export default router;

