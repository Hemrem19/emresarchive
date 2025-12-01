import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import { prisma } from '../../src/lib/prisma.js';

// Mock dependencies
vi.mock('../../src/lib/prisma.js');

// Mock authentication middleware
vi.mock('../../src/middleware/auth.js', () => ({
    authenticate: (req, res, next) => {
        req.user = { id: 1, email: 'test@example.com' };
        next();
    }
}));

// Import app after mocks
import app from '../../src/server.js';

describe('Sync Routes', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('GET /api/sync/full', () => {
        it('should return full sync data', async () => {
            const mockPapers = [{ id: 1, title: 'Paper 1' }];
            const mockCollections = [{ id: 1, name: 'Col 1' }];
            const mockAnnotations = [{ id: 1, content: 'Note' }];

            prisma.paper.findMany.mockResolvedValue(mockPapers);
            prisma.collection.findMany.mockResolvedValue(mockCollections);
            prisma.annotation.findMany.mockResolvedValue(mockAnnotations);
            prisma.syncLog.create.mockResolvedValue({});
            prisma.user.update.mockResolvedValue({});

            const res = await request(app)
                .get('/api/sync/full')
                .expect(200);

            expect(res.body.success).toBe(true);
            expect(res.body.data.papers).toHaveLength(1);
        });
    });

    describe('POST /api/sync/incremental', () => {
        it('should process incremental sync', async () => {
            const syncData = {
                lastSyncedAt: new Date().toISOString(),
                clientId: 'test-client',
                changes: {
                    papers: { created: [], updated: [], deleted: [] },
                    collections: { created: [], updated: [], deleted: [] },
                    annotations: { created: [], updated: [], deleted: [] }
                }
            };

            // Mock transaction
            prisma.$transaction.mockImplementation(async (callback) => {
                return callback(prisma);
            });

            // Mock findMany for response
            prisma.paper.findMany.mockResolvedValue([]);
            prisma.collection.findMany.mockResolvedValue([]);
            prisma.annotation.findMany.mockResolvedValue([]);
            prisma.syncLog.create.mockResolvedValue({});
            prisma.user.update.mockResolvedValue({});

            const res = await request(app)
                .post('/api/sync/incremental')
                .send(syncData)
                .expect(200);

            expect(res.body.success).toBe(true);
        });

        it('should fail with invalid data', async () => {
            await request(app)
                .post('/api/sync/incremental')
                .send({})
                .expect(422);
        });
    });

    describe('GET /api/sync/status', () => {
        it('should return sync status', async () => {
            prisma.paper.count.mockResolvedValue(10);
            prisma.collection.count.mockResolvedValue(5);
            prisma.annotation.count.mockResolvedValue(20);
            prisma.user.findUnique.mockResolvedValue({ lastSyncedAt: new Date() });
            prisma.syncLog.findFirst.mockResolvedValue({ action: 'full' });

            const res = await request(app)
                .get('/api/sync/status')
                .expect(200);

            expect(res.body.success).toBe(true);
            expect(res.body.data.counts.papers).toBe(10);
        });
    });
});
