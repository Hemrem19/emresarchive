/**
 * User Controller
 * Handles user profile, settings, and data management
 */

import { prisma } from '../lib/prisma.js';

// TODO: Implement user logic
export const getStats = async (req, res, next) => {
  try {
    const userId = req.user.id;

    const [paperCount, collectionCount, annotationCount, user] = await Promise.all([
      prisma.paper.count({ where: { userId, deletedAt: null } }),
      prisma.collection.count({ where: { userId } }),
      prisma.annotation.count({ where: { userId } }),
      prisma.user.findUnique({ where: { id: userId }, select: { storageUsedBytes: true } })
    ]);

    res.json({
      success: true,
      data: {
        stats: {
          papers: paperCount,
          collections: collectionCount,
          annotations: annotationCount,
          storageUsedBytes: user?.storageUsedBytes?.toString() || '0'
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

export const getSessions = async (req, res, next) => {
  res.status(501).json({
    success: false,
    error: { message: 'Not implemented yet' }
  });
};

export const revokeSession = async (req, res, next) => {
  res.status(501).json({
    success: false,
    error: { message: 'Not implemented yet' }
  });
};

export const updateSettings = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { name, settings } = req.body;

    const updateData = {};
    if (name !== undefined) updateData.name = name;
    if (settings !== undefined) updateData.settings = settings;

    const user = await prisma.user.update({
      where: { id: userId },
      data: updateData,
      select: {
        id: true,
        email: true,
        name: true,
        settings: true
      }
    });

    res.json({
      success: true,
      data: { user }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Clear All User Data
 * DELETE /api/user/data
 * Permanently deletes all papers, collections, and annotations for the authenticated user
 * Uses hard delete to ensure unique constraints don't block re-imports
 */
export const clearAllData = async (req, res, next) => {
  try {
    const userId = req.user.id;

    // Use HARD delete (deleteMany) instead of soft delete
    // This ensures unique constraints don't block re-importing papers with same DOIs

    // Delete all annotations first (foreign key dependency)
    const deletedAnnotations = await prisma.annotation.deleteMany({
      where: { userId }
    });

    // Delete all papers (no soft-deleted or active distinction)
    const deletedPapers = await prisma.paper.deleteMany({
      where: { userId }
    });

    // Delete all collections
    const deletedCollections = await prisma.collection.deleteMany({
      where: { userId }
    });

    console.log(`Permanently cleared all data for user ${userId}: ${deletedPapers.count} papers, ${deletedCollections.count} collections, ${deletedAnnotations.count} annotations`);

    res.json({
      success: true,
      data: {
        deleted: {
          papers: deletedPapers.count,
          collections: deletedCollections.count,
          annotations: deletedAnnotations.count
        },
        message: 'All user data has been permanently cleared'
      }
    });
  } catch (error) {
    console.error('Error clearing user data:', error);
    next(error);
  }
};

