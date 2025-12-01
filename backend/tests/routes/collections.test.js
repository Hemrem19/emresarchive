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

describe('Collections Routes', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('GET /api/collections', () => {
        it('should return a list of collections', async () => {
            const mockCollections = [
                { id: 1, name: 'My Collection', userId: 1 }
            ];

            prisma.collection.findMany.mockResolvedValue(mockCollections);

            const res = await request(app)
                .get('/api/collections')
                .expect(200);

            expect(res.body.success).toBe(true);
            expect(res.body.data.collections).toHaveLength(1);
            expect(res.body.data.collections[0].name).toBe('My Collection');
        });
    });

    describe('POST /api/collections', () => {
        it('should create a new collection', async () => {
            const newCollection = { name: 'New Collection' };
            const createdCollection = { id: 1, ...newCollection, userId: 1 };

            prisma.collection.create.mockResolvedValue(createdCollection);

            const res = await request(app)
                .post('/api/collections')
                .send(newCollection)
                .expect(201);

            expect(res.body.success).toBe(true);
            expect(res.body.data.collection.name).toBe('New Collection');
        });

        it('should fail if name is missing', async () => {
            await request(app)
                .post('/api/collections')
                .send({})
                .expect(422);
        });
    });

    describe('PUT /api/collections/:id', () => {
        it('should update a collection', async () => {
            const updateData = { name: 'Updated Name' };
            const existingCollection = { id: 1, name: 'Old Name', userId: 1 };
            const updatedCollection = { id: 1, name: 'Updated Name', userId: 1 };

            prisma.collection.findFirst.mockResolvedValue(existingCollection);
            prisma.collection.update.mockResolvedValue(updatedCollection);

            const res = await request(app)
                .put('/api/collections/1')
                .send(updateData)
                .expect(200);

            expect(res.body.success).toBe(true);
            expect(res.body.data.collection.name).toBe('Updated Name');
        });

        it('should return 404 if collection not found', async () => {
            prisma.collection.findFirst.mockResolvedValue(null);

            await request(app)
                .put('/api/collections/999')
                .send({ name: 'Update' })
                .expect(404);
        });
    });

    describe('DELETE /api/collections/:id', () => {
        it('should soft delete a collection', async () => {
            const existingCollection = { id: 1, name: 'To Delete', userId: 1 };

            prisma.collection.findFirst.mockResolvedValue(existingCollection);
            prisma.collection.update.mockResolvedValue(existingCollection); // Mock update for soft delete

            const res = await request(app)
                .delete('/api/collections/1')
                .expect(200);

            expect(res.body.success).toBe(true);
            expect(prisma.collection.update).toHaveBeenCalledWith(expect.objectContaining({
                data: expect.objectContaining({
                    deletedAt: expect.any(Date)
                })
            }));
        });
    });
});
