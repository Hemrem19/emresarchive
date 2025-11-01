/**
 * Collections Controller
 * Handles all collection CRUD operations
 */

import { prisma } from '../lib/prisma.js';

/**
 * Get All Collections
 * GET /api/collections
 */
export const getAllCollections = async (req, res, next) => {
  try {
    const userId = req.user.id;

    // Get all non-deleted collections
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

    res.json({
      success: true,
      data: { collections }
    });

  } catch (error) {
    next(error);
  }
};

/**
 * Get Single Collection
 * GET /api/collections/:id
 */
export const getCollection = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const collectionId = parseInt(req.params.id);

    const collection = await prisma.collection.findFirst({
      where: {
        id: collectionId,
        userId,
        deletedAt: null
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

    if (!collection) {
      return res.status(404).json({
        success: false,
        error: { message: 'Collection not found' }
      });
    }

    res.json({
      success: true,
      data: { collection }
    });

  } catch (error) {
    next(error);
  }
};

/**
 * Create Collection
 * POST /api/collections
 */
export const createCollection = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const collectionData = req.body;

    // Create collection
    const collection = await prisma.collection.create({
      data: {
        userId,
        name: collectionData.name,
        icon: collectionData.icon || 'folder',
        color: collectionData.color || 'text-primary',
        filters: collectionData.filters || {},
        version: 1
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

    res.status(201).json({
      success: true,
      data: { collection }
    });

  } catch (error) {
    next(error);
  }
};

/**
 * Update Collection
 * PUT /api/collections/:id
 */
export const updateCollection = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const collectionId = parseInt(req.params.id);
    const updates = req.body;

    // Check if collection exists and belongs to user
    const existing = await prisma.collection.findFirst({
      where: {
        id: collectionId,
        userId,
        deletedAt: null
      }
    });

    if (!existing) {
      return res.status(404).json({
        success: false,
        error: { message: 'Collection not found' }
      });
    }

    // Build update data
    const updateData = {};
    if (updates.name !== undefined) updateData.name = updates.name;
    if (updates.icon !== undefined) updateData.icon = updates.icon;
    if (updates.color !== undefined) updateData.color = updates.color;
    if (updates.filters !== undefined) updateData.filters = updates.filters;

    // Increment version for conflict resolution
    updateData.version = { increment: 1 };

    // Update collection
    const collection = await prisma.collection.update({
      where: { id: collectionId },
      data: updateData,
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

    res.json({
      success: true,
      data: { collection }
    });

  } catch (error) {
    next(error);
  }
};

/**
 * Delete Collection (Soft Delete)
 * DELETE /api/collections/:id
 */
export const deleteCollection = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const collectionId = parseInt(req.params.id);

    // Check if collection exists and belongs to user
    const collection = await prisma.collection.findFirst({
      where: {
        id: collectionId,
        userId,
        deletedAt: null
      }
    });

    if (!collection) {
      return res.status(404).json({
        success: false,
        error: { message: 'Collection not found' }
      });
    }

    // Soft delete (set deletedAt timestamp)
    await prisma.collection.update({
      where: { id: collectionId },
      data: {
        deletedAt: new Date(),
        version: { increment: 1 }
      }
    });

    res.json({
      success: true,
      message: 'Collection deleted successfully'
    });

  } catch (error) {
    next(error);
  }
};

