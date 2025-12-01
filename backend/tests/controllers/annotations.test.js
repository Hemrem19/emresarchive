/**
 * Unit Tests for Annotations Controller
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
    getAnnotations,
    getAnnotation,
    createAnnotation,
    updateAnnotation,
    deleteAnnotation
} from '../../src/controllers/annotations.js';
import { mockRequest, mockResponse, mockNext, sampleData } from '../helpers.js';

// Mock Prisma
vi.mock('../../src/lib/prisma.js', () => ({
    prisma: {
        paper: {
            findFirst: vi.fn()
        },
        annotation: {
            findMany: vi.fn(),
            findFirst: vi.fn(),
            create: vi.fn(),
            update: vi.fn()
        }
    }
}));

import { prisma } from '../../src/lib/prisma.js';

describe('Annotations Controller', () => {
    let req, res, next;

    beforeEach(() => {
        vi.clearAllMocks();
        req = mockRequest();
        res = mockResponse();
        next = mockNext();
        req.user = sampleData.user();
    });

    describe('getAnnotations', () => {
        it('should return all annotations for a paper', async () => {
            const annotations = [
                sampleData.annotation({ id: 1, type: 'highlight' }),
                sampleData.annotation({ id: 2, type: 'note' })
            ];

            req.params.id = '1';
            prisma.paper.findFirst.mockResolvedValue(sampleData.paper());
            prisma.annotation.findMany.mockResolvedValue(annotations);

            await getAnnotations(req, res, next);

            expect(prisma.paper.findFirst).toHaveBeenCalledWith({
                where: {
                    id: 1,
                    userId: req.user.id,
                    deletedAt: null
                }
            });

            expect(prisma.annotation.findMany).toHaveBeenCalledWith({
                where: {
                    paperId: 1,
                    userId: req.user.id,
                    deletedAt: null
                },
                orderBy: {
                    createdAt: 'desc'
                },
                select: expect.any(Object)
            });

            expect(res.json).toHaveBeenCalledWith({
                success: true,
                data: { annotations }
            });
        });

        it('should return 404 if paper not found', async () => {
            req.params.id = '999';
            prisma.paper.findFirst.mockResolvedValue(null);

            await getAnnotations(req, res, next);

            expect(res.status).toHaveBeenCalledWith(404);
            expect(res.json).toHaveBeenCalledWith({
                success: false,
                error: { message: 'Paper not found' }
            });
        });

        it('should return empty array if no annotations', async () => {
            req.params.id = '1';
            prisma.paper.findFirst.mockResolvedValue(sampleData.paper());
            prisma.annotation.findMany.mockResolvedValue([]);

            await getAnnotations(req, res, next);

            expect(res.json).toHaveBeenCalledWith({
                success: true,
                data: { annotations: [] }
            });
        });

        it('should handle database errors', async () => {
            req.params.id = '1';
            const error = new Error('Database error');
            prisma.paper.findFirst.mockRejectedValue(error);

            await getAnnotations(req, res, next);

            expect(next).toHaveBeenCalledWith(error);
        });
    });

    describe('getAnnotation', () => {
        it('should return single annotation by ID', async () => {
            const annotation = sampleData.annotation();
            req.params.id = '1';

            prisma.annotation.findFirst.mockResolvedValue(annotation);

            await getAnnotation(req, res, next);

            expect(prisma.annotation.findFirst).toHaveBeenCalledWith({
                where: {
                    id: 1,
                    userId: req.user.id,
                    deletedAt: null
                },
                select: expect.any(Object)
            });

            expect(res.json).toHaveBeenCalledWith({
                success: true,
                data: { annotation }
            });
        });

        it('should return 404 when annotation not found', async () => {
            req.params.id = '999';
            prisma.annotation.findFirst.mockResolvedValue(null);

            await getAnnotation(req, res, next);

            expect(res.status).toHaveBeenCalledWith(404);
            expect(res.json).toHaveBeenCalledWith({
                success: false,
                error: { message: 'Annotation not found' }
            });
        });
    });

    describe('createAnnotation', () => {
        it('should create a new annotation', async () => {
            const newAnnotation = sampleData.annotation({
                type: 'highlight',
                pageNumber: 5,
                content: 'Important text'
            });

            req.params.id = '1';
            req.body = {
                type: 'highlight',
                pageNumber: 5,
                content: 'Important text',
                color: '#ffff00',
                position: { x: 100, y: 200, width: 300, height: 50 }
            };

            prisma.paper.findFirst.mockResolvedValue(sampleData.paper());
            prisma.annotation.create.mockResolvedValue(newAnnotation);

            await createAnnotation(req, res, next);

            expect(prisma.annotation.create).toHaveBeenCalledWith({
                data: {
                    paperId: 1,
                    userId: req.user.id,
                    type: 'highlight',
                    pageNumber: 5,
                    position: { x: 100, y: 200, width: 300, height: 50 },
                    content: 'Important text',
                    color: '#ffff00',
                    version: 1
                },
                select: expect.any(Object)
            });

            expect(res.status).toHaveBeenCalledWith(201);
            expect(res.json).toHaveBeenCalledWith({
                success: true,
                data: { annotation: newAnnotation }
            });
        });

        it('should return 404 if paper not found', async () => {
            req.params.id = '999';
            req.body = { type: 'highlight' };

            prisma.paper.findFirst.mockResolvedValue(null);

            await createAnnotation(req, res, next);

            expect(res.status).toHaveBeenCalledWith(404);
            expect(prisma.annotation.create).not.toHaveBeenCalled();
        });

        it('should handle null optional fields', async () => {
            const newAnnotation = sampleData.annotation({ type: 'bookmark' });

            req.params.id = '1';
            req.body = { type: 'bookmark' };

            prisma.paper.findFirst.mockResolvedValue(sampleData.paper());
            prisma.annotation.create.mockResolvedValue(newAnnotation);

            await createAnnotation(req, res, next);

            const createCall = prisma.annotation.create.mock.calls[0][0];
            expect(createCall.data.pageNumber).toBeNull();
            expect(createCall.data.position).toBeNull();
            expect(createCall.data.content).toBeNull();
            expect(createCall.data.color).toBeNull();
        });
    });

    describe('updateAnnotation', () => {
        it('should update an existing annotation', async () => {
            const existingAnnotation = sampleData.annotation();
            const updatedAnnotation = { ...existingAnnotation, content: 'Updated content' };

            req.params.id = '1';
            req.body = { content: 'Updated content', color: '#00ff00' };

            prisma.annotation.findFirst.mockResolvedValue(existingAnnotation);
            prisma.annotation.update.mockResolvedValue(updatedAnnotation);

            await updateAnnotation(req, res, next);

            expect(prisma.annotation.update).toHaveBeenCalledWith({
                where: { id: 1 },
                data: {
                    content: 'Updated content',
                    color: '#00ff00',
                    version: { increment: 1 }
                },
                select: expect.any(Object)
            });

            expect(res.json).toHaveBeenCalledWith({
                success: true,
                data: { annotation: updatedAnnotation }
            });
        });

        it('should return 404 when updating non-existent annotation', async () => {
            req.params.id = '999';
            req.body = { content: 'Updated' };

            prisma.annotation.findFirst.mockResolvedValue(null);

            await updateAnnotation(req, res, next);

            expect(res.status).toHaveBeenCalledWith(404);
            expect(prisma.annotation.update).not.toHaveBeenCalled();
        });

        it('should only update provided fields', async () => {
            const existingAnnotation = sampleData.annotation();

            req.params.id = '1';
            req.body = { pageNumber: 10 };

            prisma.annotation.findFirst.mockResolvedValue(existingAnnotation);
            prisma.annotation.update.mockResolvedValue(existingAnnotation);

            await updateAnnotation(req, res, next);

            expect(prisma.annotation.update).toHaveBeenCalledWith({
                where: { id: 1 },
                data: {
                    pageNumber: 10,
                    version: { increment: 1 }
                },
                select: expect.any(Object)
            });
        });

        it('should increment version on update', async () => {
            const existingAnnotation = sampleData.annotation();

            req.params.id = '1';
            req.body = { type: 'note' };

            prisma.annotation.findFirst.mockResolvedValue(existingAnnotation);
            prisma.annotation.update.mockResolvedValue(existingAnnotation);

            await updateAnnotation(req, res, next);

            const updateCall = prisma.annotation.update.mock.calls[0][0];
            expect(updateCall.data.version).toEqual({ increment: 1 });
        });
    });

    describe('deleteAnnotation', () => {
        it('should soft delete an annotation', async () => {
            const annotation = sampleData.annotation();
            req.params.id = '1';

            prisma.annotation.findFirst.mockResolvedValue(annotation);
            prisma.annotation.update.mockResolvedValue({ ...annotation, deletedAt: new Date() });

            await deleteAnnotation(req, res, next);

            expect(prisma.annotation.update).toHaveBeenCalledWith({
                where: { id: 1 },
                data: {
                    deletedAt: expect.any(Date),
                    version: { increment: 1 }
                }
            });

            expect(res.json).toHaveBeenCalledWith({
                success: true,
                message: 'Annotation deleted successfully'
            });
        });

        it('should return 404 when deleting non-existent annotation', async () => {
            req.params.id = '999';
            prisma.annotation.findFirst.mockResolvedValue(null);

            await deleteAnnotation(req, res, next);

            expect(res.status).toHaveBeenCalledWith(404);
            expect(prisma.annotation.update).not.toHaveBeenCalled();
        });

        it('should handle deletion errors', async () => {
            const annotation = sampleData.annotation();
            req.params.id = '1';

            prisma.annotation.findFirst.mockResolvedValue(annotation);
            const error = new Error('Deletion failed');
            prisma.annotation.update.mockRejectedValue(error);

            await deleteAnnotation(req, res, next);

            expect(next).toHaveBeenCalledWith(error);
        });
    });
});
