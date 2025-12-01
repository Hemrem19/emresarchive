/**
 * Unit Tests for Collections Controller
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
    getAllCollections,
    getCollection,
    createCollection,
    updateCollection,
    deleteCollection
} from '../../src/controllers/collections.js';
import { mockRequest, mockResponse, mockNext, sampleData } from '../helpers.js';

// Mock Prisma
vi.mock('../../src/lib/prisma.js', () => ({
    prisma: {
        collection: {
            findMany: vi.fn(),
            findFirst: vi.fn(),
            create: vi.fn(),
            update: vi.fn()
        }
    }
}));

import { prisma } from '../../src/lib/prisma.js';

describe('Collections Controller', () => {
    let req, res, next;

    beforeEach(() => {
        vi.clearAllMocks();
        req = mockRequest();
        res = mockResponse();
        next = mockNext();
        req.user = sampleData.user();
    });

    describe('getAllCollections', () => {
        it('should return all collections for authenticated user', async () => {
            const collections = [
                sampleData.collection({ id: 1, name: 'Collection 1' }),
                sampleData.collection({ id: 2, name: 'Collection 2' })
            ];

            prisma.collection.findMany.mockResolvedValue(collections);

            await getAllCollections(req, res, next);

            expect(prisma.collection.findMany).toHaveBeenCalledWith({
                where: {
                    userId: req.user.id,
                    deletedAt: null
                },
                orderBy: {
                    updatedAt: 'desc'
                },
                select: expect.any(Object)
            });

            expect(res.json).toHaveBeenCalledWith({
                success: true,
                data: { collections }
            });
        });

        it('should return empty array when no collections exist', async () => {
            prisma.collection.findMany.mockResolvedValue([]);

            await getAllCollections(req, res, next);

            expect(res.json).toHaveBeenCalledWith({
                success: true,
                data: { collections: [] }
            });
        });

        it('should handle database errors', async () => {
            const error = new Error('Database error');
            prisma.collection.findMany.mockRejectedValue(error);

            await getAllCollections(req, res, next);

            expect(next).toHaveBeenCalledWith(error);
        });
    });

    describe('getCollection', () => {
        it('should return single collection by ID', async () => {
            const collection = sampleData.collection();
            req.params.id = '1';

            prisma.collection.findFirst.mockResolvedValue(collection);

            await getCollection(req, res, next);

            expect(prisma.collection.findFirst).toHaveBeenCalledWith({
                where: {
                    id: 1,
                    userId: req.user.id,
                    deletedAt: null
                },
                select: expect.any(Object)
            });

            expect(res.json).toHaveBeenCalledWith({
                success: true,
                data: { collection }
            });
        });

        it('should return 404 when collection not found', async () => {
            req.params.id = '999';
            prisma.collection.findFirst.mockResolvedValue(null);

            await getCollection(req, res, next);

            expect(res.status).toHaveBeenCalledWith(404);
            expect(res.json).toHaveBeenCalledWith({
                success: false,
                error: { message: 'Collection not found' }
            });
        });

        it('should not return deleted collections', async () => {
            req.params.id = '1';
            prisma.collection.findFirst.mockResolvedValue(null);

            await getCollection(req, res, next);

            expect(res.status).toHaveBeenCalledWith(404);
        });
    });

    describe('createCollection', () => {
        it('should create a new collection', async () => {
            const newCollection = sampleData.collection();
            req.body = {
                name: 'New Collection',
                icon: 'star',
                color: 'blue',
                filters: { status: 'Reading' }
            };

            prisma.collection.create.mockResolvedValue(newCollection);

            await createCollection(req, res, next);

            expect(prisma.collection.create).toHaveBeenCalledWith({
                data: {
                    userId: req.user.id,
                    name: 'New Collection',
                    icon: 'star',
                    color: 'blue',
                    filters: { status: 'Reading' },
                    version: 1
                },
                select: expect.any(Object)
            });

            expect(res.status).toHaveBeenCalledWith(201);
            expect(res.json).toHaveBeenCalledWith({
                success: true,
                data: { collection: newCollection }
            });
        });

        it('should use default values for icon and color', async () => {
            const newCollection = sampleData.collection();
            req.body = {
                name: 'New Collection'
            };

            prisma.collection.create.mockResolvedValue(newCollection);

            await createCollection(req, res, next);

            expect(prisma.collection.create).toHaveBeenCalledWith({
                data: expect.objectContaining({
                    icon: 'folder',
                    color: 'text-primary'
                }),
                select: expect.any(Object)
            });
        });

        it('should handle creation errors', async () => {
            req.body = { name: 'Test' };
            const error = new Error('Creation failed');
            prisma.collection.create.mockRejectedValue(error);

            await createCollection(req, res, next);

            expect(next).toHaveBeenCalledWith(error);
        });
    });

    describe('updateCollection', () => {
        it('should update an existing collection', async () => {
            const existingCollection = sampleData.collection();
            const updatedCollection = { ...existingCollection, name: 'Updated Name' };

            req.params.id = '1';
            req.body = { name: 'Updated Name', color: 'red' };

            prisma.collection.findFirst.mockResolvedValue(existingCollection);
            prisma.collection.update.mockResolvedValue(updatedCollection);

            await updateCollection(req, res, next);

            expect(prisma.collection.update).toHaveBeenCalledWith({
                where: { id: 1 },
                data: {
                    name: 'Updated Name',
                    color: 'red',
                    version: { increment: 1 }
                },
                select: expect.any(Object)
            });

            expect(res.json).toHaveBeenCalledWith({
                success: true,
                data: { collection: updatedCollection }
            });
        });

        it('should return 404 when updating non-existent collection', async () => {
            req.params.id = '999';
            req.body = { name: 'Updated' };

            prisma.collection.findFirst.mockResolvedValue(null);

            await updateCollection(req, res, next);

            expect(res.status).toHaveBeenCalledWith(404);
            expect(prisma.collection.update).not.toHaveBeenCalled();
        });

        it('should only update provided fields', async () => {
            const existingCollection = sampleData.collection();

            req.params.id = '1';
            req.body = { name: 'Only Name Updated' };

            prisma.collection.findFirst.mockResolvedValue(existingCollection);
            prisma.collection.update.mockResolvedValue(existingCollection);

            await updateCollection(req, res, next);

            expect(prisma.collection.update).toHaveBeenCalledWith({
                where: { id: 1 },
                data: {
                    name: 'Only Name Updated',
                    version: { increment: 1 }
                },
                select: expect.any(Object)
            });
        });

        it('should increment version on update', async () => {
            const existingCollection = sampleData.collection();

            req.params.id = '1';
            req.body = { name: 'Updated' };

            prisma.collection.findFirst.mockResolvedValue(existingCollection);
            prisma.collection.update.mockResolvedValue(existingCollection);

            await updateCollection(req, res, next);

            const updateCall = prisma.collection.update.mock.calls[0][0];
            expect(updateCall.data.version).toEqual({ increment: 1 });
        });
    });

    describe('deleteCollection', () => {
        it('should soft delete a collection', async () => {
            const collection = sampleData.collection();
            req.params.id = '1';

            prisma.collection.findFirst.mockResolvedValue(collection);
            prisma.collection.update.mockResolvedValue({ ...collection, deletedAt: new Date() });

            await deleteCollection(req, res, next);

            expect(prisma.collection.update).toHaveBeenCalledWith({
                where: { id: 1 },
                data: {
                    deletedAt: expect.any(Date),
                    version: { increment: 1 }
                }
            });

            expect(res.json).toHaveBeenCalledWith({
                success: true,
                message: 'Collection deleted successfully'
            });
        });

        it('should return 404 when deleting non-existent collection', async () => {
            req.params.id = '999';
            prisma.collection.findFirst.mockResolvedValue(null);

            await deleteCollection(req, res, next);

            expect(res.status).toHaveBeenCalledWith(404);
            expect(prisma.collection.update).not.toHaveBeenCalled();
        });

        it('should handle deletion errors', async () => {
            const collection = sampleData.collection();
            req.params.id = '1';

            prisma.collection.findFirst.mockResolvedValue(collection);
            const error = new Error('Deletion failed');
            prisma.collection.update.mockRejectedValue(error);

            await deleteCollection(req, res, next);

            expect(next).toHaveBeenCalledWith(error);
        });
    });
});
