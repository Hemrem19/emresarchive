/**
 * Papers Controller
 * Handles all paper CRUD operations
 */

import { prisma } from '../lib/prisma.js';

/**
 * Get All Papers
 * GET /api/papers
 * Query params: page, limit, status, tag, sortBy, sortOrder
 */
export const getAllPapers = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const {
      page = 1,
      limit = 25,
      status,
      tag,
      sortBy = 'updatedAt',
      sortOrder = 'desc'
    } = req.query;

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    // Build where clause
    const where = {
      userId,
      deletedAt: null // Only non-deleted papers
    };

    if (status) {
      where.status = status;
    }

    if (tag) {
      where.tags = {
        has: tag
      };
    }

    // Get total count
    const total = await prisma.paper.count({ where });

    // Get papers
    const papers = await prisma.paper.findMany({
      where,
      skip,
      take: limitNum,
      orderBy: {
        [sortBy]: sortOrder
      },
      select: {
        id: true,
        title: true,
        authors: true,
        year: true,
        journal: true,
        doi: true,
        abstract: true,
        tags: true,
        status: true,
        relatedPaperIds: true,
        pdfUrl: true,
        pdfSizeBytes: true,
        notes: true,
        readingProgress: true,
        createdAt: true,
        updatedAt: true,
        version: true
      }
    });

    res.json({
      success: true,
      data: {
        papers,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          totalPages: Math.ceil(total / limitNum)
        }
      }
    });

  } catch (error) {
    next(error);
  }
};

/**
 * Get Single Paper
 * GET /api/papers/:id
 */
export const getPaper = async (req, res, next) => {
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
        title: true,
        authors: true,
        year: true,
        journal: true,
        doi: true,
        abstract: true,
        tags: true,
        status: true,
        relatedPaperIds: true,
        pdfUrl: true,
        pdfSizeBytes: true,
        notes: true,
        readingProgress: true,
        createdAt: true,
        updatedAt: true,
        version: true
      }
    });

    if (!paper) {
      return res.status(404).json({
        success: false,
        error: { message: 'Paper not found' }
      });
    }

    res.json({
      success: true,
      data: { paper }
    });

  } catch (error) {
    next(error);
  }
};

/**
 * Create Paper
 * POST /api/papers
 */
export const createPaper = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const paperData = req.body;

    // Check for duplicate DOI (if provided)
    if (paperData.doi) {
      const existing = await prisma.paper.findFirst({
        where: {
          doi: paperData.doi,
          userId,
          deletedAt: null
        }
      });

      if (existing) {
        return res.status(400).json({
          success: false,
          error: { message: `A paper with DOI ${paperData.doi} already exists` }
        });
      }
    }

    // Handle PDF URL (from S3 upload)
    // pdfUrl should be the S3 key if uploaded via presigned URL
    let pdfUrl = paperData.pdfUrl || null;
    let pdfSizeBytes = paperData.pdfSizeBytes ? BigInt(paperData.pdfSizeBytes) : null;

    // If S3 key is provided separately, use it
    if (paperData.s3Key && !pdfUrl) {
      pdfUrl = paperData.s3Key;
    }

    // Create paper
    let paper;
    try {
      paper = await prisma.paper.create({
        data: {
          userId,
          title: paperData.title,
          authors: paperData.authors || [],
          year: paperData.year || null,
          journal: paperData.journal || null,
          doi: paperData.doi || null,
          abstract: paperData.abstract || null,
          tags: paperData.tags || [],
          status: paperData.status || 'To Read',
          relatedPaperIds: paperData.relatedPaperIds || [],
          notes: paperData.notes || null,
          readingProgress: paperData.readingProgress || null,
          pdfUrl,
          pdfSizeBytes,
          clientId: paperData.clientId || null,
          version: 1
        },
        select: {
          id: true,
          title: true,
          authors: true,
          year: true,
          journal: true,
          doi: true,
          abstract: true,
          tags: true,
          status: true,
          relatedPaperIds: true,
          pdfUrl: true,
          pdfSizeBytes: true,
          notes: true,
          readingProgress: true,
          createdAt: true,
          updatedAt: true,
          version: true
        }
      });

      // Update user storage if PDF uploaded
      if (paperData.pdfSizeBytes) {
        await prisma.user.update({
          where: { id: userId },
          data: {
            storageUsedBytes: {
              increment: BigInt(paperData.pdfSizeBytes)
            }
          }
        });
      }

      res.status(201).json({
        success: true,
        data: { paper }
      });

    } catch (prismaError) {
      // Handle Prisma unique constraint violation (race condition or duplicate)
      if (prismaError.code === 'P2002') {
        const target = prismaError.meta?.target || [];
        // Check if it's the userId+doi composite constraint
        // Note: Prisma returns field names as 'user_id' and 'doi' (snake_case) in meta.target
        const targetStr = JSON.stringify(target).toLowerCase();
        if ((target.includes('user_id') || target.includes('userid') || targetStr.includes('user_id')) && 
            (target.includes('doi') || targetStr.includes('doi')) && paperData.doi) {
          return res.status(400).json({
            success: false,
            error: { message: `You already have a paper with DOI ${paperData.doi} in your library` }
          });
        }
        const field = target[0] || 'field';
        // Generic unique constraint error
        return res.status(400).json({
          success: false,
          error: { message: `A record with this ${field} already exists` }
        });
      }
      // Re-throw other Prisma errors to be handled by error handler
      throw prismaError;
    }

  } catch (error) {
    next(error);
  }
};

/**
 * Update Paper
 * PUT /api/papers/:id
 */
export const updatePaper = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const paperId = parseInt(req.params.id);
    const updates = req.body;

    // Check if paper exists and belongs to user
    const existing = await prisma.paper.findFirst({
      where: {
        id: paperId,
        userId,
        deletedAt: null
      }
    });

    if (!existing) {
      return res.status(404).json({
        success: false,
        error: { message: 'Paper not found' }
      });
    }

    // Check for duplicate DOI (if changing DOI)
    if (updates.doi && updates.doi !== existing.doi) {
      const duplicate = await prisma.paper.findFirst({
        where: {
          doi: updates.doi,
          userId,
          deletedAt: null,
          NOT: { id: paperId }
        }
      });

      if (duplicate) {
        return res.status(400).json({
          success: false,
          error: { message: `A paper with DOI ${updates.doi} already exists` }
        });
      }
    }

    // Build update data
    const updateData = {};
    if (updates.title !== undefined) updateData.title = updates.title;
    if (updates.authors !== undefined) updateData.authors = updates.authors;
    if (updates.year !== undefined) updateData.year = updates.year;
    if (updates.journal !== undefined) updateData.journal = updates.journal;
    if (updates.doi !== undefined) updateData.doi = updates.doi;
    if (updates.abstract !== undefined) updateData.abstract = updates.abstract;
    if (updates.tags !== undefined) updateData.tags = updates.tags;
    if (updates.status !== undefined) updateData.status = updates.status;
    if (updates.relatedPaperIds !== undefined) updateData.relatedPaperIds = updates.relatedPaperIds;
    if (updates.notes !== undefined) updateData.notes = updates.notes;
    if (updates.readingProgress !== undefined) updateData.readingProgress = updates.readingProgress;

    // Handle PDF update
    if (updates.pdfUrl !== undefined) {
      updateData.pdfUrl = updates.pdfUrl;
      
      // Update storage if PDF size changed
      if (updates.pdfSizeBytes !== undefined) {
        const oldSize = existing.pdfSizeBytes || BigInt(0);
        const newSize = BigInt(updates.pdfSizeBytes);
        const sizeDiff = newSize - oldSize;

        updateData.pdfSizeBytes = newSize;

        if (sizeDiff !== 0) {
          await prisma.user.update({
            where: { id: userId },
            data: {
              storageUsedBytes: {
                increment: sizeDiff
              }
            }
          });
        }
      }
    }

    // Increment version for conflict resolution
    updateData.version = { increment: 1 };
    if (updates.clientId) updateData.clientId = updates.clientId;

    // Update paper
    const paper = await prisma.paper.update({
      where: { id: paperId },
      data: updateData,
      select: {
        id: true,
        title: true,
        authors: true,
        year: true,
        journal: true,
        doi: true,
        abstract: true,
        tags: true,
        status: true,
        relatedPaperIds: true,
        pdfUrl: true,
        pdfSizeBytes: true,
        notes: true,
        readingProgress: true,
        createdAt: true,
        updatedAt: true,
        version: true
      }
    });

    res.json({
      success: true,
      data: { paper }
    });

  } catch (error) {
    next(error);
  }
};

/**
 * Delete Paper (Soft Delete)
 * DELETE /api/papers/:id
 */
export const deletePaper = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const paperId = parseInt(req.params.id);

    // Check if paper exists and belongs to user
    const paper = await prisma.paper.findFirst({
      where: {
        id: paperId,
        userId,
        deletedAt: null
      }
    });

    if (!paper) {
      return res.status(404).json({
        success: false,
        error: { message: 'Paper not found' }
      });
    }

    // Soft delete (set deletedAt timestamp)
    await prisma.paper.update({
      where: { id: paperId },
      data: {
        deletedAt: new Date(),
        version: { increment: 1 }
      }
    });

    // Update user storage (subtract PDF size)
    if (paper.pdfSizeBytes) {
      await prisma.user.update({
        where: { id: userId },
        data: {
          storageUsedBytes: {
            decrement: paper.pdfSizeBytes
          }
        }
      });
    }

    res.json({
      success: true,
      message: 'Paper deleted successfully'
    });

  } catch (error) {
    next(error);
  }
};

/**
 * Search Papers
 * GET /api/papers/search?q=query&status=Reading&tag=ml
 */
export const searchPapers = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { q, status, tag, page = 1, limit = 25 } = req.query;

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    // Build where clause
    const where = {
      userId,
      deletedAt: null
    };

    if (status) {
      where.status = status;
    }

    if (tag) {
      where.tags = {
        has: tag
      };
    }

    // Text search (title, authors, abstract, notes)
    if (q) {
      const searchTerm = q.trim();
      where.OR = [
        { title: { contains: searchTerm, mode: 'insensitive' } },
        { abstract: { contains: searchTerm, mode: 'insensitive' } },
        { notes: { contains: searchTerm, mode: 'insensitive' } }
        // Authors array search - Prisma doesn't support case-insensitive array search
        // We'll search exact matches (users typically type author names correctly)
      ];
      
      // Also search in authors array (exact match)
      // This is a limitation - full-text search in arrays would need a different approach
      // For now, we search exact matches in authors
      if (searchTerm) {
        where.OR.push({
          authors: {
            has: searchTerm
          }
        });
      }
    }

    // Get total count
    const total = await prisma.paper.count({ where });

    // Get papers
    const papers = await prisma.paper.findMany({
      where,
      skip,
      take: limitNum,
      orderBy: {
        updatedAt: 'desc'
      },
      select: {
        id: true,
        title: true,
        authors: true,
        year: true,
        journal: true,
        doi: true,
        abstract: true,
        tags: true,
        status: true,
        pdfUrl: true,
        notes: true,
        readingProgress: true,
        createdAt: true,
        updatedAt: true
      }
    });

    res.json({
      success: true,
      data: {
        papers,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          totalPages: Math.ceil(total / limitNum)
        }
      }
    });

  } catch (error) {
    next(error);
  }
};

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

    // Generate presigned upload URL
    const uploadUrl = await getPresignedUploadUrl(s3Key, contentType, parseInt(size));

    res.json({
      success: true,
      data: {
        uploadUrl,
        s3Key,
        expiresIn: 3600 // 1 hour
      }
    });

  } catch (error) {
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
        downloadUrl: paper.pdfUrl
      }
    });

  } catch (error) {
    next(error);
  }
};

