import { describe, it, expect, vi, beforeEach } from 'vitest';
import { batchImport } from '../../src/controllers/import.js';
import { prisma } from '../../src/lib/prisma.js';

// Mock Prisma
vi.mock('../../src/lib/prisma.js', () => ({
    prisma: {
        $transaction: vi.fn((callback) => callback(prisma)),
        paper: {
            findFirst: vi.fn(),
            update: vi.fn(),
            create: vi.fn(),
        },
        user: {
            update: vi.fn(),
        },
        collection: {
            create: vi.fn(),
        },
        annotation: {
            create: vi.fn(),
        },
    },
}));

describe('Import Controller', () => {
    let req, res, next;

    beforeEach(() => {
        req = {
            user: { id: 1 },
            body: {
                papers: [],
                collections: [],
                annotations: []
            }
        };
        res = {
            status: vi.fn().mockReturnThis(),
            json: vi.fn()
        };
        next = vi.fn();
        vi.clearAllMocks();
    });

    describe('batchImport', () => {
        it('should return 400 if input types are invalid', async () => {
            req.body = { papers: 'not-an-array' };
            await batchImport(req, res, next);
            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
                success: false,
                error: expect.objectContaining({ message: expect.stringContaining('Invalid input') })
            }));
        });

        it('should return 400 if batch size exceeds limit', async () => {
            req.body.papers = new Array(1001).fill({});
            await batchImport(req, res, next);
            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
                success: false,
                error: expect.objectContaining({ message: expect.stringContaining('Batch size limit exceeded') })
            }));
        });

        it('should successfully import a new paper', async () => {
            const paperData = { title: 'New Paper', doi: '10.1234/test' };
            req.body.papers = [paperData];

            prisma.paper.findFirst.mockResolvedValue(null); // No existing paper
            prisma.paper.create.mockResolvedValue({ id: 1, ...paperData });

            await batchImport(req, res, next);

            expect(prisma.paper.create).toHaveBeenCalled();
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
                success: true,
                data: expect.objectContaining({
                    results: expect.objectContaining({
                        papers: expect.objectContaining({ success: 1, failed: 0 })
                    })
                })
            }));
        });

        it('should skip existing active paper', async () => {
            const paperData = { title: 'Existing Paper', doi: '10.1234/test' };
            req.body.papers = [paperData];

            prisma.paper.findFirst.mockResolvedValue({ id: 1, deletedAt: null }); // Active paper exists

            await batchImport(req, res, next);

            expect(prisma.paper.create).not.toHaveBeenCalled();
            expect(prisma.paper.update).not.toHaveBeenCalled();
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
                success: true,
                data: expect.objectContaining({
                    results: expect.objectContaining({
                        papers: expect.objectContaining({
                            success: 0,
                            failed: 1,
                            errors: expect.arrayContaining([
                                expect.objectContaining({ error: expect.stringContaining('already exists') })
                            ])
                        })
                    })
                })
            }));
        });

        it('should restore deleted paper', async () => {
            const paperData = { title: 'Deleted Paper', doi: '10.1234/test' };
            req.body.papers = [paperData];

            prisma.paper.findFirst.mockResolvedValue({ id: 1, deletedAt: new Date() }); // Deleted paper exists

            await batchImport(req, res, next);

            expect(prisma.paper.update).toHaveBeenCalledWith(expect.objectContaining({
                where: { id: 1 },
                data: expect.objectContaining({ deletedAt: null })
            }));
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
                success: true,
                data: expect.objectContaining({
                    results: expect.objectContaining({
                        papers: expect.objectContaining({ success: 1 })
                    })
                })
            }));
        });

        it('should import collections', async () => {
            req.body.collections = [{ name: 'My Collection' }];

            await batchImport(req, res, next);

            expect(prisma.collection.create).toHaveBeenCalled();
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
                success: true,
                data: expect.objectContaining({
                    results: expect.objectContaining({
                        collections: expect.objectContaining({ success: 1 })
                    })
                })
            }));
        });

        it('should import annotations', async () => {
            req.body.annotations = [{ paperId: 1, content: 'Note' }];

            await batchImport(req, res, next);

            expect(prisma.annotation.create).toHaveBeenCalled();
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
                success: true,
                data: expect.objectContaining({
                    results: expect.objectContaining({
                        annotations: expect.objectContaining({ success: 1 })
                    })
                })
            }));
        });

        it('should handle errors gracefully during individual item import', async () => {
            req.body.papers = [{ title: 'Bad Paper' }];

            prisma.paper.create.mockRejectedValue(new Error('DB Error'));

            await batchImport(req, res, next);

            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
                success: true,
                data: expect.objectContaining({
                    results: expect.objectContaining({
                        papers: expect.objectContaining({
                            success: 0,
                            failed: 1,
                            errors: expect.arrayContaining([
                                expect.objectContaining({ error: 'DB Error' })
                            ])
                        })
                    })
                })
            }));
        });

        it('should update user storage if PDF size provided', async () => {
            const paperData = { title: 'PDF Paper', pdfSizeBytes: 1024 };
            req.body.papers = [paperData];

            prisma.paper.findFirst.mockResolvedValue(null);

            await batchImport(req, res, next);

            expect(prisma.user.update).toHaveBeenCalledWith(expect.objectContaining({
                where: { id: 1 },
                data: expect.objectContaining({
                    storageUsedBytes: { increment: BigInt(1024) }
                })
            }));
        });
    });
});
