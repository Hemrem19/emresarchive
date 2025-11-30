/**
 * Papers CRUD Controller
 * Handles Create, Read, Update, Delete operations for

 papers
 */

import { prisma } from '../../lib/prisma.js';
import {
    PAPER_SELECT_FIELDS,
    buildPaperWhereClause,
    checkPaperExists,
    updateUserStorage,
    checkDuplicateDoi
} from './papers.utils.js';

/**
 * Get All Papers
 * GET /api/papers
 * Query params: page, limit, status, tag, sortBy, sortOrder
 */
export const getAllPapers = async (req, res, next) => {
    try {
        const userId = req.user.id;
        const {
            page = 1,
            limit = 25,
            status,
            tag,
            sortBy = 'updatedAt',
            sortOrder = 'desc'
        } = req.query;

        const pageNum = parseInt(page);
        const limitNum = parseInt(limit);
        const skip = (pageNum - 1) * limitNum;

        // Build where clause
        const where = buildPaperWhereClause(userId, { status, tag, doi: req.query.doi });

        // Get total count
        const total = await prisma.paper.count({ where });

        // Get papers
        const papers = await prisma.paper.findMany({
            where,
            skip,
            take: limitNum,
            orderBy: {
                [sortBy]: sortOrder
            },
            select: PAPER_SELECT_FIELDS
        });

        res.json({
            success: true,
            data: {
                papers,
                pagination: {
                    page: pageNum,
                    limit: limitNum,
                    total,
                    totalPages: Math.ceil(total / limitNum)
                }
            }
        });

    } catch (error) {
        next(error);
    }
};

/**
 * Get Single Paper
 * GET /api/papers/:id
 */
export const getPaper = async (req, res, next) => {
    try {
        const userId = req.user.id;
        const paperId = parseInt(req.params.id);

        const paper = await prisma.paper.findFirst({
            where: {
                id: paperId,
                userId,
                deletedAt: null
            },
            select: PAPER_SELECT_FIELDS
        });

        if (!paper) {
            return res.status(404).json({
                success: false,
                error: { message: 'Paper not found' }
            });
        }

        res.json({
            success: true,
            data: { paper }
        });

    } catch (error) {
        next(error);
    }
};

/**
 * Create Paper
 * POST /api/papers
 */
export const createPaper = async (req, res, next) => {
    try {
        const userId = req.user.id;
        const paperData = req.body;

        // Handle PDF URL (from S3 upload)
        let pdfUrl = paperData.pdfUrl || null;
        let pdfSizeBytes = paperData.pdfSizeBytes ? BigInt(paperData.pdfSizeBytes) : null;

        // If S3 key is provided separately, use it
        if (paperData.s3Key && !pdfUrl) {
            pdfUrl = paperData.s3Key;
        }

        // Check for duplicate DOI (if provided)
        if (paperData.doi) {
            const { exists, paper: existing, isActive } = await checkDuplicateDoi(paperData.doi, userId);

            if (exists) {
                // If it's an active paper, return error
                if (isActive) {
                    return res.status(409).json({
                        success: false,
                        error: { message: `A paper with DOI ${paperData.doi} already exists` }
                    });
                }

                // If it's a soft-deleted paper, restore and overwrite it
                const updateData = {
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
                    summary: paperData.summary || null,
                    rating: paperData.rating || null,
                    readingProgress: paperData.readingProgress || null,
                    pdfUrl,
                    pdfSizeBytes,
                    clientId: paperData.clientId || null,
                    deletedAt: null,
                    version: { increment: 1 },
                    createdAt: new Date(),
                };

                const paper = await prisma.paper.update({
                    where: { id: existing.id },
                    data: updateData,
                    select: PAPER_SELECT_FIELDS
                });

                // Update user storage if PDF uploaded
                if (pdfSizeBytes) {
                    await updateUserStorage(userId, pdfSizeBytes);
                }

                return res.status(201).json({
                    success: true,
                    data: { paper }
                });
            }
        }

        // Create paper
        let paper;
        try {
            paper = await prisma.paper.create({
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
                    summary: paperData.summary || null,
                    rating: paperData.rating || null,
                    readingProgress: paperData.readingProgress || null,
                    pdfUrl,
                    pdfSizeBytes,
                    clientId: paperData.clientId || null,
                    version: 1
                },
                select: PAPER_SELECT_FIELDS
            });

            // Update user storage if PDF uploaded
            if (paperData.pdfSizeBytes) {
                await updateUserStorage(userId, BigInt(paperData.pdfSizeBytes));
            }

            res.status(201).json({
                success: true,
                data: { paper }
            });

        } catch (prismaError) {
            // Handle Prisma unique constraint violation
            if (prismaError.code === 'P2002') {
                const target = prismaError.meta?.target || [];
                const targetStr = JSON.stringify(target).toLowerCase();
                if ((target.includes('user_id') || target.includes('userid') || targetStr.includes('user_id')) &&
                    (target.includes('doi') || targetStr.includes('doi')) && paperData.doi) {
                    return res.status(400).json({
                        success: false,
                        error: { message: `You already have a paper with DOI ${paperData.doi} in your library` }
                    });
                }
                const field = target[0] || 'field';
                return res.status(400).json({
                    success: false,
                    error: { message: `A record with this ${field} already exists` }
                });
            }
            throw prismaError;
        }

    } catch (error) {
        next(error);
    }
};

/**
 * Update Paper
 * PUT /api/papers/:id
 */
export const updatePaper = async (req, res, next) => {
    try {
        const userId = req.user.id;
        const paperId = parseInt(req.params.id);
        const updates = req.body;

        // Check if paper exists and belongs to user
        const existing = await checkPaperExists(paperId, userId);

        if (!existing) {
            return res.status(404).json({
                success: false,
                error: { message: 'Paper not found' }
            });
        }

        // Check for duplicate DOI (if changing DOI)
        if (updates.doi && updates.doi !== existing.doi) {
            const { exists, paper: duplicate, isActive } = await checkDuplicateDoi(updates.doi, userId, paperId);

            if (exists) {
                if (isActive) {
                    return res.status(409).json({
                        success: false,
                        error: { message: `A paper with DOI ${updates.doi} already exists` }
                    });
                }

                // If duplicate is deleted, hard delete it
                await prisma.paper.delete({
                    where: { id: duplicate.id }
                });
            }
        }

        // Build update data
        const updateData = {};
        if (updates.title !== undefined) updateData.title = updates.title;
        if (updates.authors !== undefined) updateData.authors = updates.authors;
        if (updates.year !== undefined) updateData.year = updates.year;
        if (updates.journal !== undefined) updateData.journal = updates.journal;
        if (updates.doi !== undefined) updateData.doi = updates.doi;
        if (updates.abstract !== undefined) updateData.abstract = updates.abstract;
        if (updates.tags !== undefined) updateData.tags = updates.tags;
        if (updates.status !== undefined) updateData.status = updates.status;
        if (updates.relatedPaperIds !== undefined) updateData.relatedPaperIds = updates.relatedPaperIds;
        if (updates.notes !== undefined) updateData.notes = updates.notes;
        if (updates.summary !== undefined) updateData.summary = updates.summary;
        if (updates.rating !== undefined) updateData.rating = updates.rating;
        if (updates.readingProgress !== undefined) updateData.readingProgress = updates.readingProgress;

        // Handle PDF update
        if (updates.pdfUrl !== undefined) {
            updateData.pdfUrl = updates.pdfUrl;

            // Update storage if PDF size changed
            if (updates.pdfSizeBytes !== undefined) {
                const oldSize = existing.pdfSizeBytes || BigInt(0);
                const newSize = BigInt(updates.pdfSizeBytes);
                const sizeDiff = newSize - oldSize;

                updateData.pdfSizeBytes = newSize;

                if (sizeDiff !== BigInt(0)) {
                    await updateUserStorage(userId, sizeDiff);
                }
            }
        }

        // Increment version for conflict resolution
        updateData.version = { increment: 1 };
        if (updates.clientId) updateData.clientId = updates.clientId;

        // Update paper
        const paper = await prisma.paper.update({
            where: { id: paperId },
            data: updateData,
            select: PAPER_SELECT_FIELDS
        });

        res.json({
            success: true,
            data: { paper }
        });

    } catch (error) {
        next(error);
    }
};

/**
 * Delete Paper (Soft Delete)
 * DELETE /api/papers/:id
 */
export const deletePaper = async (req, res, next) => {
    try {
        const userId = req.user.id;
        const paperId = parseInt(req.params.id);

        // Check if paper exists and belongs to user
        const paper = await checkPaperExists(paperId, userId);

        if (!paper) {
            return res.status(404).json({
                success: false,
                error: { message: 'Paper not found' }
            });
        }

        // Soft delete (set deletedAt timestamp)
        await prisma.paper.update({
            where: { id: paperId },
            data: {
                deletedAt: new Date(),
                version: { increment: 1 }
            }
        });

        // Update user storage (subtract PDF size)
        if (paper.pdfSizeBytes) {
            await updateUserStorage(userId, -paper.pdfSizeBytes);
        }

        res.json({
            success: true,
            message: 'Paper deleted successfully'
        });

    } catch (error) {
        next(error);
    }
};
