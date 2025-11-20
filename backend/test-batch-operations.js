/**
 * Tests for Backend Papers Controller - Batch Operations
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { batchOperations } from '../src/controllers/papers.js';
import { prisma } from '../src/lib/prisma.js';

// Mock prisma
vi.mock('../src/lib/prisma.js', () => ({
    prisma: {
        $transaction: vi.fn((callback) => callback(prisma)),
        paper: {
            findFirst: vi.fn(),
            update: vi.fn(),
            delete: vi.fn(),
            count: vi.fn(),
            findMany: vi.fn()
        },
        user: {
            update: vi.fn()
        }
    }
}));

describe('Backend Papers Controller - Batch Operations', () => {
    let req, res, next;

    beforeEach(() => {
        vi.clearAllMocks();
        req = {
            user: { id: 1 },
            body: {
                operations: []
            }
        };
        res = {
            status: vi.fn().mockReturnThis(),
            json: vi.fn()
        };
        next = vi.fn();
    });

    it('should return 400 if operations array is missing or empty', async () => {
        req.body.operations = [];
        await batchOperations(req, res, next);
        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: false }));

        req.body.operations = null;
        await batchOperations(req, res, next);
        expect(res.status).toHaveBeenCalledWith(400);
    });

    it('should return 400 if batch size exceeds limit', async () => {
        req.body.operations = Array(101).fill({ type: 'delete', id: 1 });
        await batchOperations(req, res, next);
        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
            error: expect.objectContaining({ message: expect.stringContaining('limit exceeded') })
        }));
    });

    it('should handle batch delete operations', async () => {
        req.body.operations = [
            { type: 'delete', id: 101 },
            { type: 'delete', id: 102 }
        ];

        // Mock finding papers
        prisma.paper.findFirst
            .mockResolvedValueOnce({ id: 101, userId: 1, pdfSizeBytes: BigInt(1000) }) // Paper 101 exists
            .mockResolvedValueOnce(null); // Paper 102 not found

        await batchOperations(req, res, next);

        expect(res.json).toHaveBeenCalledWith({
            success: true,
            data: {
                results: [
                    { id: 101, success: true, type: 'delete' },
                    { id: 102, success: false, error: 'Paper not found or already deleted' }
                ]
            }
        });

        // Verify paper 101 was soft-deleted
        expect(prisma.paper.update).toHaveBeenCalledWith({
            where: { id: 101 },
            data: expect.objectContaining({ deletedAt: expect.any(Date) })
        });

        // Verify storage was updated for paper 101
        expect(prisma.user.update).toHaveBeenCalledWith({
            where: { id: 1 },
            data: { storageUsedBytes: { decrement: BigInt(1000) } }
        });
    });

    it('should handle batch update operations', async () => {
        req.body.operations = [
            { type: 'update', id: 201, data: { status: 'Read' } },
            { type: 'update', id: 202, data: { title: 'New Title' } }
        ];

        // Mock existing papers
        prisma.paper.findFirst
            .mockResolvedValueOnce({ id: 201, userId: 1, status: 'To Read' })
            .mockResolvedValueOnce(null); // Paper 202 not found

        // Mock update result
        prisma.paper.update.mockResolvedValue({ id: 201, status: 'Read', version: 2 });

        await batchOperations(req, res, next);

        expect(res.json).toHaveBeenCalledWith({
            success: true,
            data: {
                results: [
                    { id: 201, success: true, type: 'update', data: expect.anything() },
                    { id: 202, success: false, error: 'Paper not found' }
                ]
            }
        });

        // Verify update call
        expect(prisma.paper.update).toHaveBeenCalledWith({
            where: { id: 201 },
            data: expect.objectContaining({ status: 'Read', version: { increment: 1 } }),
            select: expect.anything()
        });
    });

    it('should prevent updating duplicate DOI', async () => {
        req.body.operations = [
            { type: 'update', id: 301, data: { doi: '10.1234/duplicate' } }
        ];

        // Mock existing paper
        prisma.paper.findFirst
            // First call: check existence of paper being updated
            .mockResolvedValueOnce({ id: 301, userId: 1, doi: '10.1234/original' })
            // Second call: check for duplicate DOI
            .mockResolvedValueOnce({ id: 302, userId: 1, doi: '10.1234/duplicate' });

        await batchOperations(req, res, next);

        expect(res.json).toHaveBeenCalledWith({
            success: true,
            data: {
                results: [
                    { id: 301, success: false, error: 'DOI 10.1234/duplicate already exists' }
                ]
            }
        });

        // Should NOT call update
        expect(prisma.paper.update).not.toHaveBeenCalled();
    });

    it('should handle mixed operations and errors', async () => {
        req.body.operations = [
            { type: 'delete', id: 'invalid-id' }, // Invalid ID
            { type: 'unknown', id: 401 }, // Unknown type
            { type: 'delete', id: 402 } // Valid delete
        ];

        prisma.paper.findFirst.mockResolvedValue({ id: 402, userId: 1 });

        await batchOperations(req, res, next);

        expect(res.json).toHaveBeenCalledWith({
            success: true,
            data: {
                results: [
                    { id: 'invalid-id', success: false, error: 'Invalid ID' },
                    { id: 401, success: false, error: 'Invalid operation type' },
                    { id: 402, success: true, type: 'delete' }
                ]
            }
        });
    });
});

