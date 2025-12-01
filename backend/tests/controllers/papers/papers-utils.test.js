import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
    buildPaperWhereClause,
    checkPaperExists,
    updateUserStorage,
    checkDuplicateDoi
} from '../../../src/controllers/papers/papers.utils.js';
import { prisma } from '../../../src/lib/prisma.js';

// Mock Prisma
vi.mock('../../../src/lib/prisma.js', () => ({
    prisma: {
        paper: {
            findFirst: vi.fn(),
        },
        user: {
            update: vi.fn(),
        }
    }
}));

describe('Papers Utilities', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('buildPaperWhereClause', () => {
        it('should return basic where clause with userId', () => {
            const where = buildPaperWhereClause(1);
            expect(where).toEqual({
                userId: 1,
                deletedAt: null
            });
        });

        it('should add status filter', () => {
            const where = buildPaperWhereClause(1, { status: 'Reading' });
            expect(where.status).toBe('Reading');
        });

        it('should add tag filter', () => {
            const where = buildPaperWhereClause(1, { tag: 'ml' });
            expect(where.tags).toEqual({ has: 'ml' });
        });

        it('should add doi filter', () => {
            const where = buildPaperWhereClause(1, { doi: '10.1234/test' });
            expect(where.doi).toBe('10.1234/test');
        });
    });

    describe('checkPaperExists', () => {
        it('should return paper if found', async () => {
            const mockPaper = { id: 1, title: 'Test' };
            prisma.paper.findFirst.mockResolvedValue(mockPaper);

            const result = await checkPaperExists(1, 1);
            expect(result).toEqual(mockPaper);
            expect(prisma.paper.findFirst).toHaveBeenCalledWith({
                where: { id: 1, userId: 1, deletedAt: null }
            });
        });

        it('should return null if not found', async () => {
            prisma.paper.findFirst.mockResolvedValue(null);
            const result = await checkPaperExists(999, 1);
            expect(result).toBeNull();
        });
    });

    describe('updateUserStorage', () => {
        it('should increment storage used', async () => {
            await updateUserStorage(1, 1000);
            expect(prisma.user.update).toHaveBeenCalledWith({
                where: { id: 1 },
                data: { storageUsedBytes: { increment: 1000 } }
            });
        });

        it('should handle BigInt', async () => {
            await updateUserStorage(1, BigInt(1000));
            expect(prisma.user.update).toHaveBeenCalledWith({
                where: { id: 1 },
                data: { storageUsedBytes: { increment: BigInt(1000) } }
            });
        });

        it('should do nothing if delta is 0', async () => {
            await updateUserStorage(1, 0);
            expect(prisma.user.update).not.toHaveBeenCalled();
        });
    });

    describe('checkDuplicateDoi', () => {
        it('should return exists false if no duplicate', async () => {
            prisma.paper.findFirst.mockResolvedValue(null);
            const result = await checkDuplicateDoi('10.1234/test', 1);
            expect(result.exists).toBe(false);
        });

        it('should return exists true if duplicate found', async () => {
            const mockPaper = { id: 2, deletedAt: null };
            prisma.paper.findFirst.mockResolvedValue(mockPaper);

            const result = await checkDuplicateDoi('10.1234/test', 1);
            expect(result.exists).toBe(true);
            expect(result.isActive).toBe(true);
        });

        it('should exclude specific ID', async () => {
            prisma.paper.findFirst.mockResolvedValue(null);
            await checkDuplicateDoi('10.1234/test', 1, 99);

            expect(prisma.paper.findFirst).toHaveBeenCalledWith(expect.objectContaining({
                where: expect.objectContaining({
                    NOT: { id: 99 }
                })
            }));
        });
    });
});
