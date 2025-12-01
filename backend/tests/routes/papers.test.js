import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import { prisma } from '../../src/lib/prisma.js';

// Mock authentication middleware BEFORE importing app
vi.mock('../../src/middleware/auth.js', () => ({
    authenticate: (req, res, next) => {
        req.user = { id: 1, email: 'test@example.com' };
        next();
    }
}));

// Mock Prisma
vi.mock('../../src/lib/prisma.js');

// Import app after mocks
import app from '../../src/server.js';

describe('Papers Routes', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('GET /api/papers', () => {
        it('should return a list of papers', async () => {
            const mockPapers = [
                { id: 1, title: 'Paper 1', userId: 1 },
                { id: 2, title: 'Paper 2', userId: 1 }
            ];

            // Mock prisma.paper.findMany
            prisma.paper.findMany.mockResolvedValue(mockPapers);
            prisma.paper.count.mockResolvedValue(2);

            const res = await request(app)
                .get('/api/papers')
                .expect('Content-Type', /json/)
                .expect(200);

            expect(res.body.success).toBe(true);
            expect(res.body.data.papers).toHaveLength(2);
            expect(res.body.data.papers[0].title).toBe('Paper 1');
            expect(prisma.paper.findMany).toHaveBeenCalledWith(expect.objectContaining({
                where: expect.objectContaining({ userId: 1 })
            }));
        });

        it('should handle errors gracefully', async () => {
            prisma.paper.findMany.mockRejectedValue(new Error('Database error'));

            const res = await request(app)
                .get('/api/papers')
                .expect('Content-Type', /json/)
                .expect(500);

            expect(res.body.success).toBe(false);
            expect(res.body.error.message).toBe('Database error');
        });
    });

    describe('GET /api/papers/:id', () => {
        it('should return a single paper', async () => {
            const mockPaper = { id: 1, title: 'Paper 1', userId: 1 };
            prisma.paper.findFirst.mockResolvedValue(mockPaper);

            const res = await request(app)
                .get('/api/papers/1')
                .expect(200);

            expect(res.body.success).toBe(true);
            expect(res.body.data.paper.title).toBe('Paper 1');
        });

        it('should return 404 if paper not found', async () => {
            prisma.paper.findFirst.mockResolvedValue(null);

            await request(app)
                .get('/api/papers/999')
                .expect(404);
        });
    });
});
