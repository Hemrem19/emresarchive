import { prisma } from '../lib/prisma.js';

/**
 * Batch Import
 * POST /api/import/batch-import
 * Body: { papers: [], collections: [], annotations: [] }
 * 
 * Imports multiple papers, collections, and annotations in a single transaction
 */
export const batchImport = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { papers = [], collections = [], annotations = [] } = req.body;

    // Validate input
    if (!Array.isArray(papers) || !Array.isArray(collections) || !Array.isArray(annotations)) {
      return res.status(400).json({
        success: false,
        error: { message: 'Invalid input: papers, collections, and annotations must be arrays' }
      });
    }

    // Limit batch size to prevent timeouts
    const totalItems = papers.length + collections.length + annotations.length;
    if (totalItems > 1000) {
      return res.status(400).json({
        success: false,
        error: { message: 'Batch size limit exceeded (max 1000 items total)' }
      });
    }

    const results = {
      papers: { success: 0, failed: 0, errors: [] },
      collections: { success: 0, failed: 0, errors: [] },
      annotations: { success: 0, failed: 0, errors: [] }
    };

    // Use transaction for atomicity
    await prisma.$transaction(async (tx) => {
      // Import papers
      for (let i = 0; i < papers.length; i++) {
        const paperData = papers[i];
        try {
          // Check for duplicate DOI
          let existingPaper = null;
          if (paperData.doi) {
            existingPaper = await tx.paper.findFirst({
              where: { doi: paperData.doi, userId }
            });
          }

          if (existingPaper) {
            // If paper exists and is deleted, restore it
            if (existingPaper.deletedAt) {
              await tx.paper.update({
                where: { id: existingPaper.id },
                data: {
                  title: paperData.title,
                  authors: paperData.authors || [],
                  year: paperData.year || null,
                  journal: paperData.journal || null,
                  doi: paperData.doi,
                  abstract: paperData.abstract || null,
                  tags: paperData.tags || [],
                  status: paperData.status || 'To Read',
                  relatedPaperIds: paperData.relatedPaperIds || [],
                  notes: paperData.notes || null,
                  readingProgress: paperData.readingProgress || null,
                  pdfUrl: paperData.pdfUrl || null,
                  pdfSizeBytes: paperData.pdfSizeBytes ? BigInt(paperData.pdfSizeBytes) : null,
                  deletedAt: null,
                  version: { increment: 1 },
                  createdAt: new Date()
                }
              });
              results.papers.success++;
            } else {
              // Active paper exists, skip
              results.papers.failed++;
              results.papers.errors.push({ index: i, error: `Paper with DOI ${paperData.doi} already exists` });
            }
          } else {
            // Create new paper
            await tx.paper.create({
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
                pdfUrl: paperData.pdfUrl || null,
                pdfSizeBytes: paperData.pdfSizeBytes ? BigInt(paperData.pdfSizeBytes) : null,
                clientId: paperData.clientId || null,
                version: 1
              }
            });
            results.papers.success++;

            // Update user storage if PDF uploaded
            if (paperData.pdfSizeBytes) {
              await tx.user.update({
                where: { id: userId },
                data: {
                  storageUsedBytes: {
                    increment: BigInt(paperData.pdfSizeBytes)
                  }
                }
              });
            }
          }
        } catch (paperError) {
          console.error(`Error importing paper at index ${i}:`, paperError);
          results.papers.failed++;
          results.papers.errors.push({ index: i, error: paperError.message });
        }
      }

      // Import collections
      for (let i = 0; i < collections.length; i++) {
        const collectionData = collections[i];
        try {
          await tx.collection.create({
            data: {
              userId,
              name: collectionData.name,
              description: collectionData.description || null,
              paperIds: collectionData.paperIds || [],
              clientId: collectionData.clientId || null,
              version: 1
            }
          });
          results.collections.success++;
        } catch (collectionError) {
          console.error(`Error importing collection at index ${i}:`, collectionError);
          results.collections.failed++;
          results.collections.errors.push({ index: i, error: collectionError.message });
        }
      }

      // Import annotations
      for (let i = 0; i < annotations.length; i++) {
        const annotationData = annotations[i];
        try {
          await tx.annotation.create({
            data: {
              userId,
              paperId: annotationData.paperId,
              type: annotationData.type,
              content: annotationData.content || null,
              position: annotationData.position || null,
              color: annotationData.color || null,
              pageNumber: annotationData.pageNumber || null,
              clientId: annotationData.clientId || null,
              version: 1
            }
          });
          results.annotations.success++;
        } catch (annotationError) {
          console.error(`Error importing annotation at index ${i}:`, annotationError);
          results.annotations.failed++;
          results.annotations.errors.push({ index: i, error: annotationError.message });
        }
      }
    });

    // Update last synced timestamp
    await prisma.user.update({
      where: { id: userId },
      data: { lastSyncedAt: new Date() }
    });

    res.json({
      success: true,
      data: {
        results,
        summary: {
          totalSuccess: results.papers.success + results.collections.success + results.annotations.success,
          totalFailed: results.papers.failed + results.collections.failed + results.annotations.failed
        }
      }
    });

  } catch (error) {
    console.error('Batch import error:', error);
    next(error);
  }
};

