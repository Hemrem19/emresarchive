/**
 * Papers Utilities
 * Shared constants and helper functions for papers controllers
 */

import { prisma } from '../../lib/prisma.js';

/**
 * Standard paper select fields for Prisma queries
 */
export const PAPER_SELECT_FIELDS = {
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
    summary: true,
    rating: true,
    readingProgress: true,
    createdAt: true,
    updatedAt: true,
    version: true
};

/**
 * Build Prisma where clause for paper queries
 * @param {number} userId - User ID
 * @param {object} filters - Filter options { status, tag, doi }
 * @returns {object} Prisma where clause
 */
export function buildPaperWhereClause(userId, filters = {}) {
    const where = {
        userId,
        deletedAt: null
    };

    if (filters.status) {
        where.status = filters.status;
    }

    if (filters.tag) {
        where.tags = {
            has: filters.tag
        };
    }

    if (filters.doi) {
        where.doi = filters.doi;
    }

    return where;
}

/**
 * Check if paper exists and belongs to user
 * @param {number} paperId - Paper ID
 * @param {number} userId - User ID
 * @returns {Promise<object|null>} Paper or null
 */
export async function checkPaperExists(paperId, userId) {
    return await prisma.paper.findFirst({
        where: {
            id: paperId,
            userId,
            deletedAt: null
        }
    });
}

/**
 * Update user storage quota
 * @param {number} userId - User ID
 * @param {bigint} sizeDelta - Change in bytes (can be negative)
 */
export async function updateUserStorage(userId, sizeDelta) {
    if (sizeDelta === 0 || sizeDelta === BigInt(0)) {
        return;
    }

    await prisma.user.update({
        where: { id: userId },
        data: {
            storageUsedBytes: {
                increment: sizeDelta
            }
        }
    });
}

/**
 * Check for duplicate DOI and handle conflicts
 * @param {string} doi - DOI to check
 * @param {number} userId - User ID
 * @param {number} excludeId - Paper ID to exclude (for updates)
 * @returns {Promise<object>} { exists: boolean, paper: object|null, isActive: boolean }
 */
export async function checkDuplicateDoi(doi, userId, excludeId = null) {
    const where = {
        doi,
        userId
    };

    if (excludeId) {
        where.NOT = { id: excludeId };
    }

    const duplicate = await prisma.paper.findFirst({
        where
    });

    if (!duplicate) {
        return { exists: false, paper: null, isActive: false };
    }

    return {
        exists: true,
        paper: duplicate,
        isActive: !duplicate.deletedAt
    };
}
