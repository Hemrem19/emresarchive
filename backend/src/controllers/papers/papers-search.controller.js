/**
 * Papers Search Controller
 * Handles search operations for papers
 */

import { prisma } from '../../lib/prisma.js';
import { PAPER_SELECT_FIELDS } from './papers.utils.js';

/**
 * Search Papers
 * GET /api/papers/search?q=query&status=Reading&tag=ml
 */
export const searchPapers = async (req, res, next) => {
    try {
        const userId = req.user.id;
        const { q, status, tag, page = 1, limit = 25 } = req.query;

        const pageNum = parseInt(page);
        const limitNum = parseInt(limit);
        const skip = (pageNum - 1) * limitNum;

        // Build where clause
        const where = {
            userId,
            deletedAt: null
        };

        if (status) {
            where.status = status;
        }

        if (tag) {
            where.tags = {
                has: tag
            };
        }

        // Text search (title, authors, abstract, notes)
        if (q) {
            const searchTerm = q.trim();
            where.OR = [
                { title: { contains: searchTerm, mode: 'insensitive' } },
                { abstract: { contains: searchTerm, mode: 'insensitive' } },
                { notes: { contains: searchTerm, mode: 'insensitive' } }
            ];

            // Also search in authors array (exact match)
            if (searchTerm) {
                where.OR.push({
                    authors: {
                        has: searchTerm
                    }
                });
            }
        }

        // Get total count
        const total = await prisma.paper.count({ where });

        // Get papers
        const papers = await prisma.paper.findMany({
            where,
            skip,
            take: limitNum,
            orderBy: {
                updatedAt: 'desc'
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
