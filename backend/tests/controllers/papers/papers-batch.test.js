import { describe, it, expect, vi, beforeEach } from 'vitest';
import { batchOperations } from '../../../src/controllers/papers/papers-batch.controller.js';
import { prisma } from '../../../src/lib/prisma.js';

// Mock dependencies
vi.mock('../../../src/lib/prisma.js');

describe('Papers Batch Controller', () => {
    let req, res, next;

    beforeEach(() => {
        req = {
            body: {},
            user: { id: 1 }
        };
        res = {
            status: vi.fn().mockReturnThis(),
            json: vi.fn()
        };
        next = vi.fn();
        vi.clearAllMocks();
    });

    describe('batchOperations', () => {
        it('should return 400 if operations array is missing or invalid', async () => {
            req.body = {};
            await batchOperations(req, res, next);
            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
                success: false,
                error: expect.objectContaining({ message: 'Invalid operations array' })
            }));

            req.body = { operations: 'invalid' };
            await batchOperations(req, res, next);
            expect(res.status).toHaveBeenCalledWith(400);
        });

        it('should handle batch delete successfully (soft delete)', async () => {
            req.body = {
                operations: [
                    { type: 'delete', id: 1 },
                    { type: 'delete', id: 2 }
                ]
            };

            // Mock transaction
            prisma.$transaction.mockImplementation(async (callback) => {
                return callback(prisma);
            });

            // Mock findFirst to return paper for delete check
            prisma.paper.findFirst.mockResolvedValue({ id: 1, userId: 1, pdfSizeBytes: 1000 });

            // Mock updates
            prisma.paper.update.mockResolvedValue({});
            prisma.user.update.mockResolvedValue({});

            await batchOperations(req, res, next);

            // Should call update (soft delete) for each paper
            expect(prisma.paper.update).toHaveBeenCalledTimes(2);
            expect(prisma.paper.update).toHaveBeenCalledWith(expect.objectContaining({
                where: { id: 1 },
                data: expect.objectContaining({ deletedAt: expect.any(Date) })
            }));

            // Should update user storage
            expect(prisma.user.update).toHaveBeenCalledTimes(2);

            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
                success: true,
                data: expect.objectContaining({
                    results: expect.arrayContaining([
                        expect.objectContaining({ id: 1, success: true, type: 'delete' }),
                        expect.objectContaining({ id: 2, success: true, type: 'delete' })
                    ])
                })
            }));
        });

        it('should handle batch update successfully', async () => {
            req.body = {
                operations: [
                    { type: 'update', id: 1, data: { tags: ['new-tag'] } }
                ]
            };

            prisma.$transaction.mockImplementation(async (callback) => {
                return callback(prisma);
            });

            // Mock findFirst for existence check
            prisma.paper.findFirst.mockResolvedValue({ id: 1, userId: 1, tags: ['old'] });

            // Mock update
            prisma.paper.update.mockResolvedValue({ id: 1, tags: ['new-tag'] });

            await batchOperations(req, res, next);

            expect(prisma.paper.update).toHaveBeenCalledWith(expect.objectContaining({
                where: { id: 1 },
                data: expect.objectContaining({ tags: ['new-tag'] })
            }));

            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
                success: true,
                data: expect.objectContaining({
                    results: expect.arrayContaining([
                        expect.objectContaining({ id: 1, success: true, type: 'update' })
                    ])
                })
            }));
        });

        it('should handle duplicate DOI error during update', async () => {
            req.body = {
                operations: [
                    { type: 'update', id: 1, data: { doi: 'duplicate-doi' } }
                ]
            };

            prisma.$transaction.mockImplementation(async (callback) => {
                return callback(prisma);
            });

            // Mock findFirst for existence check
            prisma.paper.findFirst
                .mockResolvedValueOnce({ id: 1, userId: 1, doi: 'original-doi' }) // Existing paper
                .mockResolvedValueOnce({ id: 2, userId: 1, doi: 'duplicate-doi' }); // Duplicate found

            await batchOperations(req, res, next);

            // Should NOT call update
            expect(prisma.paper.update).not.toHaveBeenCalled();

            // Should return success: true (batch processed) but with error in results
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
                success: true,
                data: expect.objectContaining({
                    results: expect.arrayContaining([
                        expect.objectContaining({
                            id: 1,
                            success: false,
                            error: expect.stringContaining('already exists')
                        })
                    ])
                })
            }));
        });
    });
});
