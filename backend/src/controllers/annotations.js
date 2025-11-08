/**
 * Annotations Controller
 * Handles all annotation CRUD operations
 */

import { prisma } from '../lib/prisma.js';

/**
 * Get Annotations for a Paper
 * GET /api/papers/:id/annotations
 */
export const getAnnotations = async (req, res, next) => {
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

    // Get all non-deleted annotations for this paper
    const annotations = await prisma.annotation.findMany({
      where: {
        paperId,
        userId,
        deletedAt: null
      },
      orderBy: {
        createdAt: 'desc'
      },
      select: {
        id: true,
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

    res.json({
      success: true,
      data: { annotations }
    });

  } catch (error) {
    next(error);
  }
};

/**
 * Get Single Annotation
 * GET /api/annotations/:id
 */
export const getAnnotation = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const annotationId = parseInt(req.params.id);

    const annotation = await prisma.annotation.findFirst({
      where: {
        id: annotationId,
        userId,
        deletedAt: null
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

    if (!annotation) {
      return res.status(404).json({
        success: false,
        error: { message: 'Annotation not found' }
      });
    }

    res.json({
      success: true,
      data: { annotation }
    });

  } catch (error) {
    next(error);
  }
};

/**
 * Create Annotation
 * POST /api/papers/:id/annotations
 */
export const createAnnotation = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const paperId = parseInt(req.params.id);
    const annotationData = req.body;

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

    // Create annotation
    // Filter out fields that don't exist in Prisma schema (localId, clientId, etc.)
    const annotation = await prisma.annotation.create({
      data: {
        paperId,
        userId,
        type: annotationData.type,
        pageNumber: annotationData.pageNumber || null,
        position: annotationData.position || null,
        content: annotationData.content || null,
        color: annotationData.color || null,
        version: 1
        // Note: localId and clientId are not stored in database
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

    res.status(201).json({
      success: true,
      data: { annotation }
    });

  } catch (error) {
    next(error);
  }
};

/**
 * Update Annotation
 * PUT /api/annotations/:id
 */
export const updateAnnotation = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const annotationId = parseInt(req.params.id);
    const updates = req.body;

    // Check if annotation exists and belongs to user
    const existing = await prisma.annotation.findFirst({
      where: {
        id: annotationId,
        userId,
        deletedAt: null
      }
    });

    if (!existing) {
      return res.status(404).json({
        success: false,
        error: { message: 'Annotation not found' }
      });
    }

    // Build update data
    const updateData = {};
    if (updates.type !== undefined) updateData.type = updates.type;
    if (updates.pageNumber !== undefined) updateData.pageNumber = updates.pageNumber;
    if (updates.position !== undefined) updateData.position = updates.position;
    if (updates.content !== undefined) updateData.content = updates.content;
    if (updates.color !== undefined) updateData.color = updates.color;

    // Increment version for conflict resolution
    updateData.version = { increment: 1 };

    // Update annotation
    const annotation = await prisma.annotation.update({
      where: { id: annotationId },
      data: updateData,
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

    res.json({
      success: true,
      data: { annotation }
    });

  } catch (error) {
    next(error);
  }
};

/**
 * Delete Annotation (Soft Delete)
 * DELETE /api/annotations/:id
 */
export const deleteAnnotation = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const annotationId = parseInt(req.params.id);

    // Check if annotation exists and belongs to user
    const annotation = await prisma.annotation.findFirst({
      where: {
        id: annotationId,
        userId,
        deletedAt: null
      }
    });

    if (!annotation) {
      return res.status(404).json({
        success: false,
        error: { message: 'Annotation not found' }
      });
    }

    // Soft delete (set deletedAt timestamp)
    await prisma.annotation.update({
      where: { id: annotationId },
      data: {
        deletedAt: new Date(),
        version: { increment: 1 }
      }
    });

    res.json({
      success: true,
      message: 'Annotation deleted successfully'
    });

  } catch (error) {
    next(error);
  }
};

