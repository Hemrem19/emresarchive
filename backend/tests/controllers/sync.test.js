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
            count: vi.fn(),
        },
        collection: {
            findFirst: vi.fn(),
            create: vi.fn(),
            update: vi.fn(),
            findMany: vi.fn(),
            count: vi.fn(),
        },
        annotation: {
            findFirst: vi.fn(),
            create: vi.fn(),
            update: vi.fn(),
            findMany: vi.fn(),
            count: vi.fn(),
        },
        user: {
            update: vi.fn(),
            findUnique: vi.fn(),
        },
        syncLog: {
            create: vi.fn(),
            findFirst: vi.fn(),
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
        prisma.paper.count.mockResolvedValue(0);
        prisma.collection.count.mockResolvedValue(0);
        prisma.annotation.count.mockResolvedValue(0);
        prisma.user.findUnique.mockResolvedValue({ lastSyncedAt: new Date() });
        prisma.syncLog.findFirst.mockResolvedValue(null);
    });

    describe('fullSync', () => {
        it('should return all user data', async () => {
            const mockPapers = [{ id: 1, title: 'Paper 1' }];
            const mockCollections = [{ id: 1, name: 'Collection 1' }];
            const mockAnnotations = [{ id: 1, content: 'Note 1' }];

            prisma.paper.findMany.mockResolvedValue(mockPapers);
            prisma.collection.findMany.mockResolvedValue(mockCollections);
            prisma.annotation.findMany.mockResolvedValue(mockAnnotations);

            await import('../../src/controllers/sync.js').then(module => module.fullSync(req, res, next));

            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
                success: true,
                data: expect.objectContaining({
                    papers: mockPapers,
                    collections: mockCollections,
                    annotations: mockAnnotations,
                    syncedAt: expect.any(String)
                })
            }));
            expect(prisma.user.update).toHaveBeenCalled();
            expect(prisma.syncLog.create).toHaveBeenCalledWith(expect.objectContaining({
                data: expect.objectContaining({ action: 'full' })
            }));
        });

        it('should handle errors', async () => {
            const error = new Error('DB Error');
            prisma.paper.findMany.mockRejectedValue(error);

            await import('../../src/controllers/sync.js').then(module => module.fullSync(req, res, next));

            expect(next).toHaveBeenCalledWith(error);
        });
    });

    describe('getSyncStatus', () => {
        it('should return sync status and counts', async () => {
            prisma.paper.count.mockResolvedValue(5);
            prisma.collection.count.mockResolvedValue(2);
            prisma.annotation.count.mockResolvedValue(10);

            const lastSyncedAt = new Date();
            prisma.user.findUnique.mockResolvedValue({ lastSyncedAt });

            await import('../../src/controllers/sync.js').then(module => module.getSyncStatus(req, res, next));

            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
                success: true,
                data: expect.objectContaining({
                    lastSyncedAt: lastSyncedAt.toISOString(),
                    counts: {
                        papers: 5,
                        collections: 2,
                        annotations: 10
                    }
                })
            }));
        });

        it('should handle errors', async () => {
            prisma.user.findUnique.mockRejectedValue(new Error('DB Error'));
            await import('../../src/controllers/sync.js').then(module => module.getSyncStatus(req, res, next));
            expect(next).toHaveBeenCalled();
        });
    });

    describe('incrementalSync - Collections', () => {
        it('should create new collection', async () => {
            req.body.changes.collections.created = [{ id: 'new-col', name: 'New Collection' }];

            await incrementalSync(req, res, next);

            expect(prisma.collection.create).toHaveBeenCalledWith(expect.objectContaining({
                data: expect.objectContaining({
                    name: 'New Collection',
                    userId: 1,
                    version: 1
                })
            }));
        });

        it('should update existing collection if version is newer', async () => {
            req.body.changes.collections.updated = [{ id: 'col-1', name: 'Updated Name', version: 2 }];
            prisma.collection.findFirst.mockResolvedValue({ id: 'col-1', version: 1 });

            await incrementalSync(req, res, next);

            expect(prisma.collection.update).toHaveBeenCalledWith(expect.objectContaining({
                where: { id: 'col-1' },
                data: expect.objectContaining({
                    name: 'Updated Name',
                    version: 2
                })
            }));
        });

        it('should delete collection', async () => {
            req.body.changes.collections.deleted = ['col-1'];

            await incrementalSync(req, res, next);

            expect(prisma.collection.update).toHaveBeenCalledWith(expect.objectContaining({
                where: { id: 'col-1', userId: 1 },
                data: expect.objectContaining({ deletedAt: expect.any(Date) })
            }));
        });
    });

    describe('incrementalSync - Annotations', () => {
        it('should update annotation content', async () => {
            req.body.changes.annotations.updated = [{ id: 'ann-1', content: 'Updated Note', version: 2 }];
            prisma.annotation.findFirst.mockResolvedValue({ id: 'ann-1', version: 1 });

            await incrementalSync(req, res, next);

            expect(prisma.annotation.update).toHaveBeenCalledWith(expect.objectContaining({
                where: { id: 'ann-1' },
                data: expect.objectContaining({
                    content: 'Updated Note',
                    version: 2
                })
            }));
        });

        it('should delete annotation', async () => {
            req.body.changes.annotations.deleted = ['ann-1'];

            await incrementalSync(req, res, next);

            expect(prisma.annotation.update).toHaveBeenCalledWith(expect.objectContaining({
                where: { id: 'ann-1', userId: 1 },
                data: expect.objectContaining({ deletedAt: expect.any(Date) })
            }));
        });
    });

    describe('incrementalSync - Edge Cases', () => {
        it('should detect duplicate DOIs within the same batch', async () => {
            req.body.changes.papers.created = [
                { id: 'p1', title: 'Paper 1', doi: '10.1000/dup' },
                { id: 'p2', title: 'Paper 2', doi: '10.1000/dup' } // Duplicate
            ];

            await incrementalSync(req, res, next);

            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
                data: expect.objectContaining({
                    appliedChanges: expect.objectContaining({
                        papers: expect.objectContaining({
                            created: 1, // Only first one created
                            conflicts: expect.arrayContaining([
                                expect.objectContaining({
                                    id: 'p2',
                                    reason: 'Duplicate DOI in same batch'
                                })
                            ])
                        })
                    })
                })
            }));
        });

        it('should skip creation if paper with DOI already exists (manual check)', async () => {
            req.body.changes.papers.created = [{ id: 'p1', title: 'Paper 1', doi: '10.1000/exists' }];

            prisma.paper.findFirst.mockResolvedValue({ id: 'existing-id' }); // Exists

            await incrementalSync(req, res, next);

            expect(prisma.paper.create).not.toHaveBeenCalled();
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
                data: expect.objectContaining({
                    appliedChanges: expect.objectContaining({
                        papers: expect.objectContaining({
                            conflicts: expect.arrayContaining([
                                expect.objectContaining({
                                    reason: 'Paper with this DOI already exists'
                                })
                            ])
                        })
                    })
                })
            }));
        });
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
