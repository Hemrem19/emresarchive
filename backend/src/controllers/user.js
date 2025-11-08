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

