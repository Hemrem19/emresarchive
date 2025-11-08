/**
 * User Controller
 * Handles user profile, settings, and data management
 */

import { prisma } from '../lib/prisma.js';

// TODO: Implement user logic
export const getStats = async (req, res, next) => {
  res.status(501).json({
    success: false,
    error: { message: 'Not implemented yet' }
  });
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
  res.status(501).json({
    success: false,
    error: { message: 'Not implemented yet' }
  });
};

/**
 * Clear All User Data
 * DELETE /api/user/data
 * Deletes all papers, collections, and annotations for the authenticated user
 */
export const clearAllData = async (req, res, next) => {
  try {
    const userId = req.user.id;

    // Use soft delete (set deletedAt) for all entities
    // This is safer and allows potential recovery
    const now = new Date();

    // Delete all annotations
    const deletedAnnotations = await prisma.annotation.updateMany({
      where: { 
        userId,
        deletedAt: null
      },
      data: {
        deletedAt: now
      }
    });

    // Delete all papers (cascade will handle related data)
    const deletedPapers = await prisma.paper.updateMany({
      where: { 
        userId,
        deletedAt: null
      },
      data: {
        deletedAt: now
      }
    });

    // Delete all collections
    const deletedCollections = await prisma.collection.updateMany({
      where: { 
        userId,
        deletedAt: null
      },
      data: {
        deletedAt: now
      }
    });

    console.log(`Cleared all data for user ${userId}: ${deletedPapers.count} papers, ${deletedCollections.count} collections, ${deletedAnnotations.count} annotations`);

    res.json({
      success: true,
      data: {
        deleted: {
          papers: deletedPapers.count,
          collections: deletedCollections.count,
          annotations: deletedAnnotations.count
        },
        message: 'All user data has been cleared successfully'
      }
    });
  } catch (error) {
    console.error('Error clearing user data:', error);
    next(error);
  }
};

