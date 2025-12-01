import { describe, it, expect, vi, beforeEach } from 'vitest';
import { searchPapers } from '../../../src/controllers/papers/papers-search.controller.js';
import { prisma } from '../../../src/lib/prisma.js';

// Mock Prisma
vi.mock('../../../src/lib/prisma.js', () => ({
    prisma: {
        paper: {
            count: vi.fn(),
            findMany: vi.fn(),
        }
    }
}));

describe('Papers Search Controller', () => {
    let req, res, next;

    beforeEach(() => {
        req = {
            user: { id: 1 },
            query: {}
        };
        res = {
            json: vi.fn(),
            status: vi.fn().mockReturnThis(),
        };
        next = vi.fn();
        vi.clearAllMocks();
    });

    describe('searchPapers', () => {
        it('should return papers matching search query', async () => {
            req.query.q = 'test';
            const mockPapers = [{ id: 1, title: 'Test Paper' }];

            prisma.paper.count.mockResolvedValue(1);
            prisma.paper.findMany.mockResolvedValue(mockPapers);

            await searchPapers(req, res, next);

            expect(prisma.paper.findMany).toHaveBeenCalledWith(expect.objectContaining({
                where: expect.objectContaining({
                    OR: expect.arrayContaining([
                        { title: { contains: 'test', mode: 'insensitive' } }
                    ])
                })
            }));
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
                success: true,
                data: expect.objectContaining({
                    papers: mockPapers,
                    pagination: expect.objectContaining({ total: 1 })
                })
            }));
        });

        it('should filter by status', async () => {
            req.query.status = 'Reading';

            prisma.paper.count.mockResolvedValue(0);
            prisma.paper.findMany.mockResolvedValue([]);

            await searchPapers(req, res, next);

            expect(prisma.paper.findMany).toHaveBeenCalledWith(expect.objectContaining({
                where: expect.objectContaining({
                    status: 'Reading'
                })
            }));
        });

        it('should filter by tag', async () => {
            req.query.tag = 'ml';

            prisma.paper.count.mockResolvedValue(0);
            prisma.paper.findMany.mockResolvedValue([]);

            await searchPapers(req, res, next);

            expect(prisma.paper.findMany).toHaveBeenCalledWith(expect.objectContaining({
                where: expect.objectContaining({
                    tags: { has: 'ml' }
                })
            }));
        });

        it('should handle pagination', async () => {
            req.query.page = '2';
            req.query.limit = '10';

            prisma.paper.count.mockResolvedValue(20);
            prisma.paper.findMany.mockResolvedValue([]);

            await searchPapers(req, res, next);

            expect(prisma.paper.findMany).toHaveBeenCalledWith(expect.objectContaining({
                skip: 10,
                take: 10
            }));
        });

        it('should handle errors', async () => {
            const error = new Error('Database error');
            prisma.paper.count.mockRejectedValue(error);

            await searchPapers(req, res, next);

            expect(next).toHaveBeenCalledWith(error);
        });
    });
});
