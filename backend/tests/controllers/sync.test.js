import { describe, it, expect, vi, beforeEach } from 'vitest';
import { incrementalSync } from '../../src/controllers/sync.js';
import { prisma } from '../../src/lib/prisma.js';

// Mock Prisma
vi.mock('../../src/lib/prisma.js', () => ({
    prisma: {
        paper: {
            findFirst: vi.fn(),
            create: vi.fn(),
            update: vi.fn(),
            findMany: vi.fn(),
        },
        collection: {
            findFirst: vi.fn(),
            create: vi.fn(),
            update: vi.fn(),
            findMany: vi.fn(),
        },
        annotation: {
            findFirst: vi.fn(),
            create: vi.fn(),
            update: vi.fn(),
            findMany: vi.fn(),
        },
        user: {
            update: vi.fn(),
        },
        syncLog: {
            create: vi.fn(),
        },
        $transaction: vi.fn((callback) => callback(prisma)),
    }
}));

describe('Sync Controller - Advanced', () => {
    let req, res, next;

    beforeEach(() => {
        req = {
            user: { id: 1 },
            body: {
                clientId: 'test-client',
                changes: {
                    papers: { created: [], updated: [], deleted: [] },
                    collections: { created: [], updated: [], deleted: [] },
                    annotations: { created: [], updated: [], deleted: [] }
                }
            }
        };
        res = {
            json: vi.fn(),
            status: vi.fn().mockReturnThis(),
        };
        next = vi.fn();
        vi.clearAllMocks();

        // Default mocks
        prisma.paper.findMany.mockResolvedValue([]);
        prisma.collection.findMany.mockResolvedValue([]);
        prisma.annotation.findMany.mockResolvedValue([]);
        prisma.user.update.mockResolvedValue({});
        prisma.syncLog.create.mockResolvedValue({});
    });

    describe('incrementalSync - Conflict Resolution', () => {
        it('should apply update if client version >= server version', async () => {
            req.body.changes.papers.updated = [{ id: 1, title: 'New Title', version: 2 }];

            prisma.paper.findFirst.mockResolvedValue({ id: 1, version: 2 }); // Server has version 2

            await incrementalSync(req, res, next);

            expect(prisma.paper.update).toHaveBeenCalledWith(expect.objectContaining({
                where: { id: 1 },
                data: expect.objectContaining({
                    title: 'New Title',
                    version: 3 // Should increment
                })
            }));
        });

        it('should REJECT update if client version < server version', async () => {
            req.body.changes.papers.updated = [{ id: 1, title: 'Old Update', version: 1 }];

            prisma.paper.findFirst.mockResolvedValue({ id: 1, version: 2 }); // Server has version 2

            await incrementalSync(req, res, next);

            expect(prisma.paper.update).not.toHaveBeenCalled();
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
                data: expect.objectContaining({
                    appliedChanges: expect.objectContaining({
                        papers: expect.objectContaining({
                            conflicts: expect.arrayContaining([
                                expect.objectContaining({ reason: expect.stringContaining('Version conflict') })
                            ])
                        })
                    })
                })
            }));
        });
    });

    describe('incrementalSync - Duplicate DOI Handling', () => {
        it('should handle duplicate DOI error (P2002)', async () => {
            req.body.changes.papers.created = [{ title: 'Duplicate', doi: '10.1234/dup' }];

            const error = new Error('Unique constraint failed');
            error.code = 'P2002';
            prisma.paper.create.mockRejectedValue(error);

            await incrementalSync(req, res, next);

            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
                data: expect.objectContaining({
                    appliedChanges: expect.objectContaining({
                        papers: expect.objectContaining({
                            conflicts: expect.arrayContaining([
                                expect.objectContaining({ reason: 'Duplicate DOI' })
                            ])
                        })
                    })
                })
            }));
        });
    });

    describe('incrementalSync - Annotation Foreign Key', () => {
        it('should skip annotation if referenced paper does not exist', async () => {
            req.body.changes.annotations.created = [{ content: 'Note', paperId: 999 }];

            prisma.paper.findFirst.mockResolvedValue(null); // Paper not found

            await incrementalSync(req, res, next);

            expect(prisma.annotation.create).not.toHaveBeenCalled();
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
                data: expect.objectContaining({
                    appliedChanges: expect.objectContaining({
                        annotations: expect.objectContaining({
                            conflicts: expect.arrayContaining([
                                expect.objectContaining({ reason: expect.stringContaining('Referenced paper') })
                            ])
                        })
                    })
                })
            }));
        });
    });

    describe('incrementalSync - Server Changes Retrieval', () => {
        it('should return server changes since lastSyncedAt', async () => {
            const lastSyncedAt = new Date('2023-01-01').toISOString();
            req.body.lastSyncedAt = lastSyncedAt;

            const mockServerPapers = [{ id: 2, title: 'New Server Paper' }];
            prisma.paper.findMany.mockImplementation((args) => {
                if (args.where.updatedAt) return Promise.resolve(mockServerPapers); // Server changes
                return Promise.resolve([]); // Deleted items
            });
            prisma.collection.findMany.mockResolvedValue([]);
            prisma.annotation.findMany.mockResolvedValue([]);

            await incrementalSync(req, res, next);

            expect(prisma.paper.findMany).toHaveBeenCalledWith(expect.objectContaining({
                where: expect.objectContaining({
                    updatedAt: { gte: expect.any(Date) }
                })
            }));
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
                data: expect.objectContaining({
                    serverChanges: expect.objectContaining({
                        papers: mockServerPapers
                    })
                })
            }));
        });
    });
});
