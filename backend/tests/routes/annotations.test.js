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

describe('Annotations Routes', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('GET /api/annotations/:id', () => {
        it('should return an annotation', async () => {
            const mockAnnotation = { id: 1, content: 'Note', userId: 1 };
            prisma.annotation.findFirst.mockResolvedValue(mockAnnotation);

            const res = await request(app)
                .get('/api/annotations/1')
                .expect(200);

            expect(res.body.success).toBe(true);
            expect(res.body.data.annotation.content).toBe('Note');
        });

        it('should return 404 if not found', async () => {
            prisma.annotation.findFirst.mockResolvedValue(null);
            await request(app).get('/api/annotations/999').expect(404);
        });
    });

    describe('PUT /api/annotations/:id', () => {
        it('should update an annotation', async () => {
            const updateData = { content: 'Updated Note' };
            const existingAnnotation = { id: 1, content: 'Old Note', userId: 1 };
            const updatedAnnotation = { id: 1, content: 'Updated Note', userId: 1 };

            prisma.annotation.findFirst.mockResolvedValue(existingAnnotation);
            prisma.annotation.update.mockResolvedValue(updatedAnnotation);

            const res = await request(app)
                .put('/api/annotations/1')
                .send(updateData)
                .expect(200);

            expect(res.body.success).toBe(true);
            expect(res.body.data.annotation.content).toBe('Updated Note');
        });
    });

    describe('DELETE /api/annotations/:id', () => {
        it('should soft delete an annotation', async () => {
            const existingAnnotation = { id: 1, userId: 1 };
            prisma.annotation.findFirst.mockResolvedValue(existingAnnotation);
            prisma.annotation.update.mockResolvedValue(existingAnnotation);

            const res = await request(app)
                .delete('/api/annotations/1')
                .expect(200);

            expect(res.body.success).toBe(true);
            expect(prisma.annotation.update).toHaveBeenCalledWith(expect.objectContaining({
                data: expect.objectContaining({
                    deletedAt: expect.any(Date)
                })
            }));
        });
    });
});
