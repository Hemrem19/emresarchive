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

    // Track mappings between client/local paper IDs and server IDs
    const localPaperIdToServerId = new Map();
    const paperLookupCache = new Map(); // cache to avoid repeated DB lookups

    const recordPaperIdMapping = (originalId, serverId) => {
      if (originalId === undefined || originalId === null) return;
      const key = String(originalId);
      localPaperIdToServerId.set(key, serverId);
    };

    const resolvePaperId = async (rawId) => {
      if (rawId === undefined || rawId === null) {
        return null;
      }

      const key = String(rawId);

      if (localPaperIdToServerId.has(key)) {
        return localPaperIdToServerId.get(key);
      }

      if (paperLookupCache.has(key)) {
        return paperLookupCache.get(key);
      }

      const numericId = Number(rawId);
      if (!Number.isNaN(numericId)) {
        const existingPaper = await prisma.paper.findFirst({
          where: { id: numericId, userId },
          select: { id: true }
        });

        if (existingPaper) {
          localPaperIdToServerId.set(key, existingPaper.id);
          paperLookupCache.set(key, existingPaper.id);
          return existingPaper.id;
        }
      }

      paperLookupCache.set(key, null);
      return null;
    };

    // Process client changes (apply to server)
    const appliedChanges = {
      papers: { created: 0, updated: 0, deleted: 0, conflicts: [] },
      collections: { created: 0, updated: 0, deleted: 0, conflicts: [] },
      annotations: { created: 0, updated: 0, deleted: 0, conflicts: [] }
    };

    // Process papers
    for (const paper of changes.papers?.created || []) {
      try {
        // Extract only valid Prisma fields, exclude client-only metadata
        const { localId, id, createdAt, updatedAt, clientId: clientIdFromClient, ...validFields } = paper;
        const paperClientId = clientIdFromClient || clientId || null;

        // If a DOI exists, attempt to upsert by DOI (unique per user)
        if (validFields.doi) {
          const existingPaper = await prisma.paper.findFirst({
            where: {
              userId,
              doi: validFields.doi
            }
          });

          if (existingPaper) {
            await prisma.paper.update({
              where: { id: existingPaper.id },
              data: {
                ...validFields,
                version: existingPaper.version + 1,
                clientId: paperClientId || existingPaper.clientId || null,
                updatedAt: undefined // let Prisma handle updatedAt
              }
            });
            recordPaperIdMapping(localId, existingPaper.id);
            recordPaperIdMapping(id, existingPaper.id);
            recordPaperIdMapping(existingPaper.id, existingPaper.id);
            appliedChanges.papers.updated++;
            continue;
          }
        }

        // Map related paper IDs to server IDs if we have them
        if (Array.isArray(validFields.relatedPaperIds) && validFields.relatedPaperIds.length > 0) {
          const mappedRelated = [];
          for (const relatedId of validFields.relatedPaperIds) {
            const resolved = await resolvePaperId(relatedId);
            if (resolved) {
              mappedRelated.push(resolved);
            }
          }
          if (mappedRelated.length > 0) {
            validFields.relatedPaperIds = mappedRelated;
          }
        }

        const createdPaper = await prisma.paper.create({
          data: {
            ...validFields,
            userId,
            version: 1,
            ...(paperClientId ? { clientId: paperClientId } : {})
          }
        });
        recordPaperIdMapping(localId, createdPaper.id);
        recordPaperIdMapping(id, createdPaper.id);
        recordPaperIdMapping(createdPaper.id, createdPaper.id);
        appliedChanges.papers.created++;
      } catch (error) {
        appliedChanges.papers.conflicts.push({ id: paper.id || paper.localId, reason: error.message });
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
          const { id, version, clientId: updateClientId, createdAt, updatedAt, ...updateData } = paperUpdate;
          recordPaperIdMapping(id, existing.id);

          if (Array.isArray(updateData.relatedPaperIds) && updateData.relatedPaperIds.length > 0) {
            const mappedRelated = [];
            for (const relatedId of updateData.relatedPaperIds) {
              const resolved = await resolvePaperId(relatedId);
              if (resolved) {
                mappedRelated.push(resolved);
              }
            }
            updateData.relatedPaperIds = mappedRelated;
          }

          await prisma.paper.update({
            where: { id },
            data: {
              ...updateData,
              version: existing.version + 1,
              clientId: updateClientId || clientId || existing.clientId || null
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
            deletedAt: new Date(),
            clientId
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
        // Extract only valid Prisma fields, exclude localId, clientId, and other client-only fields
        const { clientId: _collectionClientId, ...collectionWithoutClientId } = collection;
        const { localId, id, createdAt, updatedAt, ...validFields } = collectionWithoutClientId;
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
          const { id, version, clientId: updateClientId, createdAt, updatedAt, ...updateData } = collectionUpdate;
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
    const sanitizeAnnotationPayload = async (annotation, { isUpdate = false } = {}) => {
      const {
        clientId: _annotationClientId,
        localId,
        id,
        createdAt,
        updatedAt,
        textContent,
        content,
        rects,
        position,
        rotation,
        scale,
        width,
        height,
        selectionBounds,
        boundingRect,
        metadata,
        paperId: rawPaperId,
        ...rest
      } = annotation;

      const sanitized = {};

      const paperIdProvided = rawPaperId !== undefined || rest.paperId !== undefined;
      if (!isUpdate || paperIdProvided) {
        const targetPaperId = rawPaperId ?? rest.paperId;
        if (targetPaperId !== undefined) {
          const resolvedPaperId = await resolvePaperId(targetPaperId);
          if (!resolvedPaperId) {
            return { error: `Paper ${targetPaperId} not found`, localId, id };
          }
          sanitized.paperId = resolvedPaperId;
        } else if (!isUpdate) {
          return { error: 'Missing paperId', localId, id };
        }
      }

      if (!isUpdate || rest.type !== undefined) {
        if (!rest.type && !isUpdate) {
          return { error: 'Missing annotation type', localId, id };
        }
        if (rest.type !== undefined) {
          sanitized.type = rest.type;
        }
      }

      if (!isUpdate || rest.pageNumber !== undefined) {
        if ((rest.pageNumber === undefined || rest.pageNumber === null) && !isUpdate) {
          return { error: 'Missing page number', localId, id };
        }
        if (rest.pageNumber !== undefined) {
          sanitized.pageNumber = rest.pageNumber;
        }
      }

      if (!isUpdate || rest.color !== undefined) {
        if (rest.color !== undefined) {
          sanitized.color = rest.color;
        }
      }

      if (position !== undefined && position !== null) {
        sanitized.position = position;
      } else if (rects) {
        sanitized.position = { rects };
      } else if (rest.position) {
        sanitized.position = rest.position;
      }

      if (!isUpdate || content !== undefined || textContent !== undefined || rest.content !== undefined) {
        if (content !== undefined && content !== null) {
          sanitized.content = content;
        } else if (textContent !== undefined) {
          sanitized.content = textContent;
        } else if (rest.content !== undefined) {
          sanitized.content = rest.content;
        }
      }

      if (!isUpdate) {
        if (!sanitized.type) {
          return { error: 'Missing annotation type', localId, id };
        }
        if (sanitized.pageNumber === undefined || sanitized.pageNumber === null) {
          return { error: 'Missing page number', localId, id };
        }
      }

      return { sanitized, localId, id };
    };

    for (const annotation of changes.annotations?.created || []) {
      try {
        const { sanitized, error, localId, id } = await sanitizeAnnotationPayload(annotation);

        if (error) {
          appliedChanges.annotations.conflicts.push({
            id: id || localId,
            reason: error
          });
          continue;
        }

        await prisma.annotation.create({
          data: {
            ...sanitized,
            userId,
            version: 1
          }
        });
        appliedChanges.annotations.created++;
      } catch (error) {
        appliedChanges.annotations.conflicts.push({ id: annotation.id || annotation.localId, reason: error.message });
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
          const { sanitized, error } = await sanitizeAnnotationPayload(annotationUpdate, { isUpdate: true });

          if (error) {
            appliedChanges.annotations.conflicts.push({
              id: annotationUpdate.id,
              reason: error
            });
            continue;
          }

          await prisma.annotation.update({
            where: { id },
            data: {
              ...sanitized,
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
