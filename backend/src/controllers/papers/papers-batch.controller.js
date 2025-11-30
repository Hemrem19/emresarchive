/**
 * Papers Batch Controller
 * Handles batch update/delete operations for papers
 */

import { prisma } from '../../lib/prisma.js';

/**
 * Batch Operations
 * POST /api/papers/batch
 * Body: { operations: Array<{ type: 'update'|'delete', id: number, data?: object }> }
 */
export const batchOperations = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { operations } = req.body;

    if (!Array.isArray(operations) || operations.length === 0) {
      return res.status(400).json({
        success: false,
        error: { message: 'Invalid operations array' }
      });
    }

    // Limit batch size to prevent timeouts
    if (operations.length > 100) {
      return res.status(400).json({
        success: false,
        error: { message: 'Batch size limit exceeded (max 100)' }
      });
    }

    const responseData = [];

    await prisma.$transaction(async (tx) => {
      for (const op of operations) {
        const { type, id, data } = op;
        const paperId = parseInt(id);

        if (isNaN(paperId)) {
          responseData.push({ id, success: false, error: 'Invalid ID' });
          continue;
        }

        try {
          if (type === 'delete') {
            // Find first to get storage size
            const paper = await tx.paper.findFirst({
              where: { id: paperId, userId, deletedAt: null },
              select: { id: true, pdfSizeBytes: true }
            });

            if (paper) {
              await tx.paper.update({
                where: { id: paperId },
                data: { deletedAt: new Date(), version: { increment: 1 } }
              });

              if (paper.pdfSizeBytes) {
                await tx.user.update({
                  where: { id: userId },
                  data: { storageUsedBytes: { decrement: paper.pdfSizeBytes } }
                });
              }
              responseData.push({ id: paperId, success: true, type: 'delete' });
            } else {
              responseData.push({ id: paperId, success: false, error: 'Paper not found or already deleted' });
            }

          } else if (type === 'update') {
            // Check existence
            const existing = await tx.paper.findFirst({
              where: { id: paperId, userId, deletedAt: null }
            });

            if (!existing) {
              responseData.push({ id: paperId, success: false, error: 'Paper not found' });
              continue;
            }

            // Build update data
            const updateData = {};
            const allowedFields = [
              'title', 'authors', 'year', 'journal', 'doi', 'abstract',
              'tags', 'status', 'notes', 'summary', 'rating', 'readingProgress', 'relatedPaperIds'
            ];

            allowedFields.forEach(field => {
              if (data && data[field] !== undefined) updateData[field] = data[field];
            });

            // Special handling for DOI uniqueness if changed
            if (updateData.doi && updateData.doi !== existing.doi) {
              const duplicate = await tx.paper.findFirst({
                where: {
                  doi: updateData.doi,
                  userId,
                  deletedAt: null,
                  NOT: { id: paperId }
                }
              });
              if (duplicate) {
                responseData.push({ id: paperId, success: false, error: `DOI ${updateData.doi} already exists` });
                continue;
              }
            }

            if (Object.keys(updateData).length > 0) {
              updateData.version = { increment: 1 };

              const updated = await tx.paper.update({
                where: { id: paperId },
                data: updateData,
                select: { id: true, updatedAt: true, version: true }
              });
              responseData.push({ id: paperId, success: true, type: 'update', data: updated });
            } else {
              responseData.push({ id: paperId, success: true, type: 'update', message: 'No changes' });
            }
          } else {
            responseData.push({ id: paperId, success: false, error: 'Invalid operation type' });
          }
        } catch (opError) {
          console.error(`Error in batch op for paper ${paperId}:`, opError);
          responseData.push({ id: paperId, success: false, error: opError.message });
        }
      }
    });

    res.json({
      success: true,
      data: { results: responseData }
    });

  } catch (error) {
    next(error);
  }
};

