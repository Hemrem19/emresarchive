/**
 * Unit Tests for User Controller
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
    getStats,
    getSessions,
    revokeSession,
    updateSettings,
    clearAllData
} from '../../src/controllers/user.js';
import { mockRequest, mockResponse, mockNext, sampleData } from '../helpers.js';

// Mock Prisma
vi.mock('../../src/lib/prisma.js', () => ({
    prisma: {
        user: {
            findUnique: vi.fn(),
            update: vi.fn()
        },
        paper: {
            count: vi.fn(),
            deleteMany: vi.fn()
        },
        collection: {
            count: vi.fn(),
            deleteMany: vi.fn()
        },
        annotation: {
            count: vi.fn(),
            deleteMany: vi.fn()
        }
    }
}));

import { prisma } from '../../src/lib/prisma.js';

describe('User Controller', () => {
    let req, res, next;

    beforeEach(() => {
        vi.clearAllMocks();
        req = mockRequest();
        res = mockResponse();
        next = mockNext();
        req.user = sampleData.user();
    });

    describe('getStats', () => {
        it('should return user statistics', async () => {
            prisma.paper.count.mockResolvedValue(10);
            prisma.collection.count.mockResolvedValue(3);
            prisma.annotation.count.mockResolvedValue(25);
            prisma.user.findUnique.mockResolvedValue({
                storageUsedBytes: BigInt(1024000)
            });

            await getStats(req, res, next);

            expect(res.json).toHaveBeenCalledWith({
                success: true,
                data: {
                    stats: {
                        papers: 10,
                        collections: 3,
                        annotations: 25,
                        storageUsedBytes: '1024000'
                    }
                }
            });
        });

        it('should default storage to 0 when null', async () => {
            prisma.paper.count.mockResolvedValue(0);
            prisma.collection.count.mockResolvedValue(0);
            prisma.annotation.count.mockResolvedValue(0);
            prisma.user.findUnique.mockResolvedValue({
                storageUsedBytes: null
            });

            await getStats(req, res, next);

            const jsonCall = res.json.mock.calls[0][0];
            expect(jsonCall.data.stats.storageUsedBytes).toBe('0');
        });

        it('should only count non-deleted papers', async () => {
            await getStats(req, res, next);

            expect(prisma.paper.count).toHaveBeenCalledWith({
                where: { userId: req.user.id, deletedAt: null }
            });
        });

        it('should handle database errors', async () => {
            const error = new Error('Database error');
            prisma.paper.count.mockRejectedValue(error);

            await getStats(req, res, next);

            expect(next).toHaveBeenCalledWith(error);
        });
    });

    describe('getSessions', () => {
        it('should return not implemented error', async () => {
            await getSessions(req, res, next);

            expect(res.status).toHaveBeenCalledWith(501);
            expect(res.json).toHaveBeenCalledWith({
                success: false,
                error: { message: 'Not implemented yet' }
            });
        });
    });

    describe('revokeSession', () => {
        it('should return not implemented error', async () => {
            await revokeSession(req, res, next);

            expect(res.status).toHaveBeenCalledWith(501);
            expect(res.json).toHaveBeenCalledWith({
                success: false,
                error: { message: 'Not implemented yet' }
            });
        });
    });

    describe('updateSettings', () => {
        it('should update user name', async () => {
            const updatedUser = {
                ...sampleData.user(),
                name: 'Updated Name'
            };

            req.body = { name: 'Updated Name' };
            prisma.user.update.mockResolvedValue(updatedUser);

            await updateSettings(req, res, next);

            expect(prisma.user.update).toHaveBeenCalledWith({
                where: { id: req.user.id },
                data: { name: 'Updated Name' },
                select: {
                    id: true,
                    email: true,
                    name: true,
                    settings: true
                }
            });

            expect(res.json).toHaveBeenCalledWith({
                success: true,
                data: { user: updatedUser }
            });
        });

        it('should update user settings', async () => {
            const updatedUser = {
                ...sampleData.user(),
                settings: { theme: 'dark', notifications: true }
            };

            req.body = {
                settings: { theme: 'dark', notifications: true }
            };
            prisma.user.update.mockResolvedValue(updatedUser);

            await updateSettings(req, res, next);

            expect(prisma.user.update).toHaveBeenCalledWith({
                where: { id: req.user.id },
                data: {
                    settings: { theme: 'dark', notifications: true }
                },
                select: expect.any(Object)
            });
        });

        it('should update both name and settings', async () => {
            const updatedUser = sampleData.user();

            req.body = {
                name: 'New Name',
                settings: { theme: 'light' }
            };
            prisma.user.update.mockResolvedValue(updatedUser);

            await updateSettings(req, res, next);

            expect(prisma.user.update).toHaveBeenCalledWith({
                where: { id: req.user.id },
                data: {
                    name: 'New Name',
                    settings: { theme: 'light' }
                },
                select: expect.any(Object)
            });
        });

        it('should handle update errors', async () => {
            req.body = { name: 'Test' };
            const error = new Error('Update failed');
            prisma.user.update.mockRejectedValue(error);

            await updateSettings(req, res, next);

            expect(next).toHaveBeenCalledWith(error);
        });
    });

    describe('clearAllData', () => {
        it('should permanently delete all user data', async () => {
            prisma.annotation.deleteMany.mockResolvedValue({ count: 25 });
            prisma.paper.deleteMany.mockResolvedValue({ count: 10 });
            prisma.collection.deleteMany.mockResolvedValue({ count: 3 });

            await clearAllData(req, res, next);

            expect(prisma.annotation.deleteMany).toHaveBeenCalledWith({
                where: { userId: req.user.id }
            });
            expect(prisma.paper.deleteMany).toHaveBeenCalledWith({
                where: { userId: req.user.id }
            });
            expect(prisma.collection.deleteMany).toHaveBeenCalledWith({
                where: { userId: req.user.id }
            });

            expect(res.json).toHaveBeenCalledWith({
                success: true,
                data: {
                    deleted: {
                        papers: 10,
                        collections: 3,
                        annotations: 25
                    },
                    message: 'All user data has been permanently cleared'
                }
            });
        });

        it('should delete annotations first (foreign key dependency)', async () => {
            const deletionOrder = [];

            prisma.annotation.deleteMany.mockImplementation(() => {
                deletionOrder.push('annotations');
                return Promise.resolve({ count: 5 });
            });

            prisma.paper.deleteMany.mockImplementation(() => {
                deletionOrder.push('papers');
                return Promise.resolve({ count: 2 });
            });

            prisma.collection.deleteMany.mockImplementation(() => {
                deletionOrder.push('collections');
                return Promise.resolve({ count: 1 });
            });

            await clearAllData(req, res, next);

            expect(deletionOrder).toEqual(['annotations', 'papers', 'collections']);
        });

        it('should handle deletion errors', async () => {
            const error = new Error('Deletion failed');
            prisma.annotation.deleteMany.mockRejectedValue(error);

            await clearAllData(req, res, next);

            expect(next).toHaveBeenCalledWith(error);
        });

        it('should return zero counts when no data exists', async () => {
            prisma.annotation.deleteMany.mockResolvedValue({ count: 0 });
            prisma.paper.deleteMany.mockResolvedValue({ count: 0 });
            prisma.collection.deleteMany.mockResolvedValue({ count: 0 });

            await clearAllData(req, res, next);

            const jsonCall = res.json.mock.calls[0][0];
            expect(jsonCall.data.deleted).toEqual({
                papers: 0,
                collections: 0,
                annotations: 0
            });
        });
    });
});
