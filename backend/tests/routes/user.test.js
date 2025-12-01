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

describe('User Routes', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('GET /api/user/stats', () => {
        it('should return user stats', async () => {
            prisma.paper.count.mockResolvedValue(10);
            prisma.collection.count.mockResolvedValue(2);
            prisma.annotation.count.mockResolvedValue(5);
            prisma.user.findUnique.mockResolvedValue({ storageUsedBytes: BigInt(1024) });

            const res = await request(app)
                .get('/api/user/stats')
                .expect(200);

            expect(res.body.success).toBe(true);
            expect(res.body.data.stats.papers).toBe(10);
            expect(res.body.data.stats.storageUsedBytes).toBe('1024');
        });
    });

    describe('PUT /api/user/settings', () => {
        it('should update user settings', async () => {
            const updateData = { name: 'New Name', settings: { theme: 'dark' } };
            const updatedUser = { id: 1, ...updateData };

            prisma.user.update.mockResolvedValue(updatedUser);

            const res = await request(app)
                .put('/api/user/settings')
                .send(updateData)
                .expect(200);

            expect(res.body.success).toBe(true);
            expect(res.body.data.user.name).toBe('New Name');
        });
    });

    describe('DELETE /api/user/data', () => {
        it('should clear all user data', async () => {
            prisma.annotation.deleteMany.mockResolvedValue({ count: 5 });
            prisma.paper.deleteMany.mockResolvedValue({ count: 10 });
            prisma.collection.deleteMany.mockResolvedValue({ count: 2 });

            const res = await request(app)
                .delete('/api/user/data')
                .expect(200);

            expect(res.body.success).toBe(true);
            expect(res.body.data.deleted.papers).toBe(10);
            expect(prisma.paper.deleteMany).toHaveBeenCalledWith({ where: { userId: 1 } });
        });
    });

    describe('Unimplemented Routes', () => {
        it('GET /sessions should return 501', async () => {
            await request(app).get('/api/user/sessions').expect(501);
        });

        it('DELETE /sessions/:id should return 501', async () => {
            await request(app).delete('/api/user/sessions/1').expect(501);
        });
    });
});
