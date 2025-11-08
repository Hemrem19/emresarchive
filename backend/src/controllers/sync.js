/**
 * Sync Controller
 * Handles full and incremental sync operations
 */

import { prisma } from '../lib/prisma.js';

/**
 * Full Sync
 * GET /api/sync/full
 * Returns all papers, collections, and annotations for the authenticated user
 */
export const fullSync = async (req, res, next) => {
  try {
    const userId = req.user.id;

    // Get all papers
    const papers = await prisma.paper.findMany({
      where: {
        userId,
        deletedAt: null
      },
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

    // Get all collections
    const collections = await prisma.collection.findMany({
      where: {
        userId,
        deletedAt: null
      },
      orderBy: {
        updatedAt: 'desc'
      },
      select: {
        id: true,
        name: true,
        icon: true,
        color: true,
        filters: true,
        createdAt: true,
        updatedAt: true,
        version: true
      }
    });

    // Get all annotations (with paper IDs)
    const annotations = await prisma.annotation.findMany({
      where: {
        userId,
        deletedAt: null
      },
      orderBy: {
        updatedAt: 'desc'
      },
      select: {
        id: true,
        paperId: true,
        type: true,
        pageNumber: true,
        position: true,
        content: true,
        color: true,
        createdAt: true,
        updatedAt: true,
        version: true
      }
    });

    // Update user's lastSyncedAt
    const now = new Date();
    await prisma.user.update({
      where: { id: userId },
      data: { lastSyncedAt: now }
    });

    // Log sync operation
    await prisma.syncLog.create({
      data: {
        userId,
        entityType: 'sync',
        action: 'full',
        clientId: null
      }
    });

    res.json({
      success: true,
      data: {
        papers,
        collections,
        annotations,
        syncedAt: now.toISOString()
      }
    });

  } catch (error) {
    next(error);
  }
};

/**
 * Incremental Sync
 * POST /api/sync/incremental
 * Receives changes from client and returns changes from server since lastSyncAt
 * Implements conflict resolution (last-write-wins with version tracking)
 */
export const incrementalSync = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { lastSyncedAt, changes, clientId } = req.body;

    const syncStartTime = new Date();
    const lastSyncDate = lastSyncedAt ? new Date(lastSyncedAt) : null;

    // Process client changes (apply to server)
    const appliedChanges = {
      papers: { created: 0, updated: 0, deleted: 0, conflicts: [] },
      collections: { created: 0, updated: 0, deleted: 0, conflicts: [] },
      annotations: { created: 0, updated: 0, deleted: 0, conflicts: [] }
    };

    // Track DOIs in current batch to detect duplicates within the same import
    const seenDoisInBatch = new Set();

    // Process papers
    for (const paper of changes.papers?.created || []) {
      try {
        // Extract only valid Prisma fields, exclude localId and other client-only fields
        const { localId, id, createdAt, updatedAt, ...validFields } = paper;
        
        // Normalize DOI - convert empty strings to null and trim whitespace
        if (validFields.doi) {
          validFields.doi = validFields.doi.trim() || null;
        } else {
          validFields.doi = null;
        }
        
        // For papers WITH a DOI: check if exists first to avoid constraint violations
        if (validFields.doi) {
          // Check if we've already processed this DOI in this batch
          if (seenDoisInBatch.has(validFields.doi)) {
            appliedChanges.papers.conflicts.push({ 
              id: paper.id || paper.localId, 
              reason: 'Duplicate DOI in same batch',
              doi: validFields.doi
            });
            continue;
          }
          seenDoisInBatch.add(validFields.doi);
          
          // Check if paper with this DOI already exists in database
          const existingPaper = await prisma.paper.findFirst({
            where: { 
              userId, 
              doi: validFields.doi,
              deletedAt: null
            }
          });
          
          if (existingPaper) {
            // Paper already exists - skip it completely
            appliedChanges.papers.conflicts.push({ 
              id: paper.id || paper.localId, 
              reason: 'Paper with this DOI already exists',
              doi: validFields.doi,
              existingId: existingPaper.id
            });
            continue; // Skip creation - don't throw error
          }
        }
        
        // Create the paper (either no DOI, or DOI doesn't exist yet)
        await prisma.paper.create({
          data: {
            ...validFields,
            userId,
            clientId,
            version: 1
          }
        });
        appliedChanges.papers.created++;
      } catch (error) {
        // Only log unexpected errors (not constraint violations)
        if (error.code !== 'P2002') {
          console.error('Error processing paper during sync:', error.message);
        }
        appliedChanges.papers.conflicts.push({ 
          id: paper.id || paper.localId, 
          reason: error.code === 'P2002' ? 'Duplicate DOI' : error.message,
          doi: paper.doi || 'unknown'
        });
      }
    }

    for (const paperUpdate of changes.papers?.updated || []) {
      try {
        const existing = await prisma.paper.findFirst({
          where: { id: paperUpdate.id, userId }
        });

        if (!existing) {
          appliedChanges.papers.conflicts.push({ id: paperUpdate.id, reason: 'Not found' });
          continue;
        }

        // Conflict resolution: last-write-wins
        // If client version is >= server version, apply update
        const clientVersion = paperUpdate.version || 1;
        if (clientVersion >= existing.version) {
          const { id, version, ...updateData } = paperUpdate;
          await prisma.paper.update({
            where: { id },
            data: {
              ...updateData,
              version: existing.version + 1,
              clientId
            }
          });
          appliedChanges.papers.updated++;
        } else {
          appliedChanges.papers.conflicts.push({ 
            id: paperUpdate.id, 
            reason: 'Version conflict (server has newer version)' 
          });
        }
      } catch (error) {
        appliedChanges.papers.conflicts.push({ id: paperUpdate.id, reason: error.message });
      }
    }

    for (const paperId of changes.papers?.deleted || []) {
      try {
        await prisma.paper.update({
          where: { id: paperId, userId },
          data: {
            deletedAt: new Date()
          }
        });
        appliedChanges.papers.deleted++;
      } catch (error) {
        // Ignore if already deleted or not found
      }
    }

    // Process collections
    for (const collection of changes.collections?.created || []) {
      try {
        // Extract only valid Prisma fields, exclude localId and other client-only fields
        const { localId, id, createdAt, updatedAt, clientId: _collectionClientId, ...validFields } = collection;
        await prisma.collection.create({
          data: {
            ...validFields,
            userId,
            version: 1
          }
        });
        appliedChanges.collections.created++;
      } catch (error) {
        appliedChanges.collections.conflicts.push({ id: collection.id || collection.localId, reason: error.message });
      }
    }

    for (const collectionUpdate of changes.collections?.updated || []) {
      try {
        const existing = await prisma.collection.findFirst({
          where: { id: collectionUpdate.id, userId }
        });

        if (!existing) {
          appliedChanges.collections.conflicts.push({ id: collectionUpdate.id, reason: 'Not found' });
          continue;
        }

        const clientVersion = collectionUpdate.version || 1;
        if (clientVersion >= existing.version) {
          const { id, version, clientId: _collectionUpdateClientId, ...updateData } = collectionUpdate;
          await prisma.collection.update({
            where: { id },
            data: {
              ...updateData,
              version: existing.version + 1
            }
          });
          appliedChanges.collections.updated++;
        } else {
          appliedChanges.collections.conflicts.push({ 
            id: collectionUpdate.id, 
            reason: 'Version conflict' 
          });
        }
      } catch (error) {
        appliedChanges.collections.conflicts.push({ id: collectionUpdate.id, reason: error.message });
      }
    }

    for (const collectionId of changes.collections?.deleted || []) {
      try {
        await prisma.collection.update({
          where: { id: collectionId, userId },
          data: {
            deletedAt: new Date()
          }
        });
        appliedChanges.collections.deleted++;
      } catch (error) {
        // Ignore errors
      }
    }

    // Process annotations
    for (const annotation of changes.annotations?.created || []) {
      try {
        // Extract only valid Prisma fields, exclude localId and other client-only fields
        const { localId, id, createdAt, updatedAt, clientId: _annotationClientId, textContent, rects, position, content, ...rest } = annotation;

        // Check if the referenced paper exists before creating annotation
        if (rest.paperId) {
          const referencedPaper = await prisma.paper.findFirst({
            where: { 
              id: rest.paperId, 
              userId,
              deletedAt: null
            }
          });
          
          if (!referencedPaper) {
            // Paper doesn't exist - skip annotation creation
            appliedChanges.annotations.conflicts.push({ 
              id: annotation.id || annotation.localId, 
              reason: `Referenced paper (ID: ${rest.paperId}) does not exist`
            });
            continue;
          }
        }

        const annotationData = {
          ...rest,
          userId,
          version: 1
        };

        if (!annotationData.content) {
          annotationData.content = content ?? textContent ?? null;
        }

        if (!annotationData.position) {
          if (position) {
            annotationData.position = position;
          } else if (rects) {
            annotationData.position = { rects };
          }
        }

        await prisma.annotation.create({
          data: {
            ...annotationData
          }
        });
        appliedChanges.annotations.created++;
      } catch (error) {
        // Log specific error for foreign key violations
        if (error.code === 'P2003') {
          appliedChanges.annotations.conflicts.push({ 
            id: annotation.id || annotation.localId, 
            reason: 'Referenced paper does not exist (foreign key constraint)' 
          });
        } else {
          appliedChanges.annotations.conflicts.push({ 
            id: annotation.id || annotation.localId, 
            reason: error.message 
          });
        }
      }
    }

    for (const annotationUpdate of changes.annotations?.updated || []) {
      try {
        const existing = await prisma.annotation.findFirst({
          where: { id: annotationUpdate.id, userId }
        });

        if (!existing) {
          appliedChanges.annotations.conflicts.push({ id: annotationUpdate.id, reason: 'Not found' });
          continue;
        }

        const clientVersion = annotationUpdate.version || 1;
        if (clientVersion >= existing.version) {
          const { id, version, clientId: _annotationUpdateClientId, textContent, rects, position, content, ...updateData } = annotationUpdate;

          const annotationUpdateData = {
            ...updateData
          };

          if (content !== undefined || textContent !== undefined) {
            annotationUpdateData.content = content ?? textContent ?? null;
          }

          if (position !== undefined) {
            annotationUpdateData.position = position;
          } else if (rects !== undefined) {
            annotationUpdateData.position = rects ? { rects } : undefined;
          }

          await prisma.annotation.update({
            where: { id },
            data: {
              ...annotationUpdateData,
              version: existing.version + 1
            }
          });
          appliedChanges.annotations.updated++;
        } else {
          appliedChanges.annotations.conflicts.push({ 
            id: annotationUpdate.id, 
            reason: 'Version conflict' 
          });
        }
      } catch (error) {
        appliedChanges.annotations.conflicts.push({ id: annotationUpdate.id, reason: error.message });
      }
    }

    for (const annotationId of changes.annotations?.deleted || []) {
      try {
        await prisma.annotation.update({
          where: { id: annotationId, userId },
          data: {
            deletedAt: new Date()
          }
        });
        appliedChanges.annotations.deleted++;
      } catch (error) {
        // Ignore errors
      }
    }

    // Get server changes since lastSyncAt
    const whereCondition = lastSyncDate 
      ? { userId, updatedAt: { gt: lastSyncDate }, deletedAt: null }
      : { userId, deletedAt: null };

    const serverPapers = await prisma.paper.findMany({
      where: whereCondition,
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

    const serverCollections = await prisma.collection.findMany({
      where: whereCondition,
      select: {
        id: true,
        name: true,
        icon: true,
        color: true,
        filters: true,
        createdAt: true,
        updatedAt: true,
        version: true
      }
    });

    const serverAnnotations = await prisma.annotation.findMany({
      where: whereCondition,
      select: {
        id: true,
        paperId: true,
        type: true,
        pageNumber: true,
        position: true,
        content: true,
        color: true,
        createdAt: true,
        updatedAt: true,
        version: true
      }
    });

    // Get deleted items
    const deletedPapers = await prisma.paper.findMany({
      where: {
        userId,
        deletedAt: { not: null },
        ...(lastSyncDate && { deletedAt: { gt: lastSyncDate } })
      },
      select: { id: true }
    });

    const deletedCollections = await prisma.collection.findMany({
      where: {
        userId,
        deletedAt: { not: null },
        ...(lastSyncDate && { deletedAt: { gt: lastSyncDate } })
      },
      select: { id: true }
    });

    const deletedAnnotations = await prisma.annotation.findMany({
      where: {
        userId,
        deletedAt: { not: null },
        ...(lastSyncDate && { deletedAt: { gt: lastSyncDate } })
      },
      select: { id: true }
    });

    // Update user's lastSyncedAt
    await prisma.user.update({
      where: { id: userId },
      data: { lastSyncedAt: syncStartTime }
    });

    // Log sync operation
    await prisma.syncLog.create({
      data: {
        userId,
        entityType: 'sync',
        action: 'incremental',
        clientId
      }
    });

    res.json({
      success: true,
      data: {
        appliedChanges,
        serverChanges: {
          papers: serverPapers,
          collections: serverCollections,
          annotations: serverAnnotations,
          deleted: {
            papers: deletedPapers.map(p => p.id),
            collections: deletedCollections.map(c => c.id),
            annotations: deletedAnnotations.map(a => a.id)
          }
        },
        syncedAt: syncStartTime.toISOString()
      }
    });

  } catch (error) {
    next(error);
  }
};

/**
 * Get Sync Status
 * GET /api/sync/status
 * Returns last sync timestamp and sync metadata
 */
export const getSyncStatus = async (req, res, next) => {
  try {
    const userId = req.user.id;

    // Get user with lastSyncedAt
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        lastSyncedAt: true
      }
    });

    // Get most recent sync log for additional metadata
    const lastSyncLog = await prisma.syncLog.findFirst({
      where: { userId },
      orderBy: { syncedAt: 'desc' },
      select: {
        syncedAt: true,
        action: true,
        clientId: true
      }
    });

    // Get counts of entities
    const paperCount = await prisma.paper.count({
      where: { userId, deletedAt: null }
    });

    const collectionCount = await prisma.collection.count({
      where: { userId, deletedAt: null }
    });

    const annotationCount = await prisma.annotation.count({
      where: { userId, deletedAt: null }
    });

    // Use user's lastSyncedAt (from User table) as primary source
    // Fall back to sync log if user's lastSyncedAt is null (for backward compatibility)
    const lastSyncedAt = user?.lastSyncedAt || lastSyncLog?.syncedAt || null;

    res.json({
      success: true,
      data: {
        lastSyncedAt: lastSyncedAt ? new Date(lastSyncedAt).toISOString() : null,
        lastSyncAction: lastSyncLog?.action || null,
        lastClientId: lastSyncLog?.clientId || null,
        counts: {
          papers: paperCount,
          collections: collectionCount,
          annotations: annotationCount
        }
      }
    });

  } catch (error) {
    next(error);
  }
};
