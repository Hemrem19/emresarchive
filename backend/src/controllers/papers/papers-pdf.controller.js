/**
 * Papers PDF Controller
 * Handles PDF upload, download, and streaming operations
 */

import { prisma } from '../../lib/prisma.js';

/**
 * Get Presigned Upload URL for PDF
 * POST /api/papers/upload-url
 * Body: { filename, size, contentType, paperId? }
 */
export const getUploadUrl = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { filename, size, contentType, paperId } = req.body;

    // Validate input
    if (!filename || !size || !contentType) {
      return res.status(400).json({
        success: false,
        error: { message: 'filename, size, and contentType are required' }
      });
    }

    // Validate content type
    if (contentType !== 'application/pdf') {
      return res.status(400).json({
        success: false,
        error: { message: 'Only PDF files are allowed' }
      });
    }

    // Import S3 functions
    const { getPresignedUploadUrl, generatePdfKey, isS3Configured } = await import('../lib/s3.js');

    // Check if S3 is configured
    if (!isS3Configured()) {
      return res.status(503).json({
        success: false,
        error: { message: 'S3 storage is not configured. Please configure S3 credentials.' }
      });
    }

    // Generate S3 key
    // If paperId is provided, use it; otherwise generate a temporary key
    const tempPaperId = paperId || `temp-${Date.now()}`;
    const s3Key = generatePdfKey(userId, tempPaperId, filename);

    // Generate presigned upload URL/fields (using POST instead of PUT to avoid method mismatch)
    const uploadData = await getPresignedUploadUrl(s3Key, contentType, parseInt(size));

    // uploadData can be either { url, fields } (POST) or string (PUT fallback)
    // For presigned POST, return both url and fields
    // For PUT fallback, return uploadUrl string
    if (typeof uploadData === 'object' && uploadData.url && uploadData.fields) {
      // Presigned POST
      res.json({
        success: true,
        data: {
          uploadUrl: uploadData.url,
          fields: uploadData.fields, // FormData fields to include
          s3Key,
          expiresIn: 3600 // 1 hour
        }
      });
    } else {
      // PUT fallback (string URL)
      res.json({
        success: true,
        data: {
          uploadUrl: uploadData, // String URL
          s3Key,
          expiresIn: 3600 // 1 hour
        }
      });
    }

  } catch (error) {
    next(error);
  }
};

/**
 * Upload PDF directly to S3/R2 (server-side upload)
 * POST /api/papers/upload
 * Body: multipart/form-data with 'file' field
 * Query params: paperId (optional) - if provided, uses that ID, otherwise generates temp ID
 */
export const uploadPdfDirect = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { paperId } = req.query; // Optional paperId from query params

    // Check if file was uploaded
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: { message: 'No file uploaded. Please include a PDF file in the request.' }
      });
    }

    // Validate file type
    if (req.file.mimetype !== 'application/pdf') {
      return res.status(400).json({
        success: false,
        error: { message: 'Only PDF files are allowed' }
      });
    }

    // Import S3 functions
    const { uploadFileToS3, generatePdfKey, isS3Configured } = await import('../lib/s3.js');

    // Check if S3 is configured
    if (!isS3Configured()) {
      return res.status(503).json({
        success: false,
        error: { message: 'S3 storage is not configured. Please configure S3 credentials.' }
      });
    }

    // Generate S3 key
    const tempPaperId = paperId || `temp-${Date.now()}`;
    const filename = req.file.originalname || 'upload.pdf';
    const s3Key = generatePdfKey(userId, tempPaperId, filename);

    // Upload file directly to S3/R2 (server-side, avoids presigned URL signature issues)
    try {
      await uploadFileToS3(req.file.buffer, s3Key, req.file.mimetype);
    } catch (s3Error) {
      console.error('[Upload] S3 upload error:', s3Error);
      console.error('[Upload] S3 error message:', s3Error.message);
      console.error('[Upload] S3 error stack:', s3Error.stack);
      // Re-throw with more context
      throw new Error(`S3 upload failed: ${s3Error.message || 'Unknown error'}`);
    }

    // Return S3 key and file size
    res.json({
      success: true,
      data: {
        s3Key,
        pdfSizeBytes: req.file.size,
        filename: req.file.originalname
      }
    });

  } catch (error) {
    console.error('[Upload] uploadPdfDirect error:', error);
    console.error('[Upload] Error message:', error.message);
    console.error('[Upload] Error stack:', error.stack);
    next(error);
  }
};

/**
 * Get Presigned Download URL for PDF
 * GET /api/papers/:id/pdf
 */
export const getPdfDownloadUrl = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const paperId = parseInt(req.params.id);

    const paper = await prisma.paper.findFirst({
      where: {
        id: paperId,
        userId,
        deletedAt: null
      },
      select: {
        id: true,
        pdfUrl: true
      }
    });

    if (!paper) {
      return res.status(404).json({
        success: false,
        error: { message: 'Paper not found' }
      });
    }

    if (!paper.pdfUrl) {
      return res.status(404).json({
        success: false,
        error: { message: 'PDF not found for this paper' }
      });
    }

    // Import S3 functions
    const { getPresignedDownloadUrl, extractS3Key, isS3Configured } = await import('../lib/s3.js');

    // Check if pdfUrl is an S3 key/URL
    // If S3 is configured and pdfUrl looks like an S3 key, generate presigned URL
    if (isS3Configured() && (paper.pdfUrl.startsWith('papers/') || paper.pdfUrl.includes('/r2.'))) {
      try {
        const s3Key = extractS3Key(paper.pdfUrl);
        const downloadUrl = await getPresignedDownloadUrl(s3Key);

        return res.json({
          success: true,
          data: {
            pdfUrl: paper.pdfUrl,
            downloadUrl,
            proxyUrl: `/api/papers/${paperId}/pdf-proxy`, // Proxy endpoint to avoid CORS
            expiresIn: 3600 // 1 hour
          }
        });
      } catch (s3Error) {
        // If S3 URL generation fails, fall back to direct URL
        console.error('Error generating presigned download URL:', s3Error);
      }
    }

    // Fallback: return direct URL (for legacy or non-S3 storage)
    res.json({
      success: true,
      data: {
        pdfUrl: paper.pdfUrl,
        downloadUrl: paper.pdfUrl,
        proxyUrl: `/api/papers/${paperId}/pdf-proxy` // Proxy endpoint
      }
    });

  } catch (error) {
    next(error);
  }
};

/**
 * Proxy PDF Stream (avoids CORS issues)
 * GET /api/papers/:id/pdf-proxy
 */
export const proxyPdfStream = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const paperId = parseInt(req.params.id);

    const paper = await prisma.paper.findFirst({
      where: {
        id: paperId,
        userId,
        deletedAt: null
      },
      select: {
        id: true,
        pdfUrl: true
      }
    });

    if (!paper) {
      return res.status(404).json({
        success: false,
        error: { message: 'Paper not found' }
      });
    }

    if (!paper.pdfUrl) {
      return res.status(404).json({
        success: false,
        error: { message: 'PDF not found for this paper' }
      });
    }

    // Import S3 functions
    const { getS3ObjectStream, extractS3Key, isS3Configured } = await import('../lib/s3.js');

    // If S3 is configured, fetch PDF from S3 and stream it
    if (isS3Configured() && (paper.pdfUrl.startsWith('papers/') || paper.pdfUrl.includes('/r2.'))) {
      try {
        const s3Key = extractS3Key(paper.pdfUrl);
        const response = await getS3ObjectStream(s3Key);

        // Set headers for PDF streaming
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `inline; filename="paper-${paperId}.pdf"`);
        res.setHeader('Cache-Control', 'private, max-age=3600'); // Cache for 1 hour

        // Read stream into buffer (AWS SDK v3 returns a stream)
        const chunks = [];
        for await (const chunk of response) {
          chunks.push(chunk);
        }
        const buffer = Buffer.concat(chunks);

        // Send PDF buffer to client
        res.send(buffer);

        return; // Stream is handled asynchronously
      } catch (s3Error) {
        console.error('Error fetching PDF from S3:', s3Error);
        return res.status(500).json({
          success: false,
          error: { message: 'Failed to fetch PDF from storage' }
        });
      }
    }

    // Fallback: try to fetch from direct URL (if not S3)
    // This is unlikely to work due to CORS, but included for completeness
    try {
      const response = await fetch(paper.pdfUrl);
      if (!response.ok) {
        throw new Error(`Failed to fetch PDF: ${response.status}`);
      }

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `inline; filename="paper-${paperId}.pdf"`);

      const buffer = await response.arrayBuffer();
      res.send(Buffer.from(buffer));
    } catch (fetchError) {
      console.error('Error fetching PDF from URL:', fetchError);
      res.status(500).json({
        success: false,
        error: { message: 'Failed to fetch PDF' }
      });
    }

  } catch (error) {
    next(error);
  }
};


