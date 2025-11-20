/**
 * Tests for Backend Papers Controller - DOI Conflict Resolution
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createPaper, updatePaper } from '../src/controllers/papers.js';
import { prisma } from '../src/lib/prisma.js';

// Mock prisma
vi.mock('../src/lib/prisma.js', () => ({
    prisma: {
        paper: {
            findFirst: vi.fn(),
            create: vi.fn(),
            update: vi.fn(),
            delete: vi.fn()
        },
        user: {
            update: vi.fn()
        }
    }
}));

describe('Backend Papers Controller - DOI Conflict Resolution', () => {
    let req, res, next;

    beforeEach(() => {
        vi.clearAllMocks();
        req = {
            user: { id: 1 },
            body: {
                title: 'New Paper',
                doi: '10.1234/test',
                authors: ['Author A']
            }
        };
        res = {
            status: vi.fn().mockReturnThis(),
            json: vi.fn()
        };
        next = vi.fn();
    });

    describe('createPaper', () => {
        it('should restore a deleted paper if DOI matches', async () => {
            // Mock finding a DELETED paper with same DOI
            prisma.paper.findFirst.mockResolvedValue({
                id: 999,
                doi: '10.1234/test',
                userId: 1,
                deletedAt: new Date('2023-01-01') // It is deleted
            });

            // Mock successful update (restore)
            prisma.paper.update.mockResolvedValue({
                id: 999,
                title: 'New Paper',
                deletedAt: null,
                version: 2
            });

            await createPaper(req, res, next);

            // Should find existing (deleted) paper
            expect(prisma.paper.findFirst).toHaveBeenCalled();
            
            // Should NOT create new paper
            expect(prisma.paper.create).not.toHaveBeenCalled();
            
            // Should UPDATE existing paper to restore it
            expect(prisma.paper.update).toHaveBeenCalledWith({
                where: { id: 999 },
                data: expect.objectContaining({
                    deletedAt: null, // Should un-delete
                    title: 'New Paper', // Should update title
                    createdAt: expect.any(Date) // Should reset created time
                }),
                select: expect.anything()
            });

            expect(res.status).toHaveBeenCalledWith(201);
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
        });

        it('should reject if active paper with same DOI exists', async () => {
            // Mock finding an ACTIVE paper
            prisma.paper.findFirst.mockResolvedValue({
                id: 888,
                doi: '10.1234/test',
                userId: 1,
                deletedAt: null // Active!
            });

            await createPaper(req, res, next);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
                error: expect.objectContaining({ message: expect.stringContaining('already exists') })
            }));
            
            expect(prisma.paper.update).not.toHaveBeenCalled();
            expect(prisma.paper.create).not.toHaveBeenCalled();
        });

        it('should create new paper if no DOI conflict', async () => {
            prisma.paper.findFirst.mockResolvedValue(null);
            prisma.paper.create.mockResolvedValue({ id: 100, title: 'New Paper' });

            await createPaper(req, res, next);

            expect(prisma.paper.create).toHaveBeenCalled();
            expect(res.status).toHaveBeenCalledWith(201);
        });
    });

    describe('updatePaper', () => {
        beforeEach(() => {
            req.params = { id: '100' };
            req.body = { doi: '10.1234/new-doi' };
        });

        it('should hard-delete conflicting deleted paper during update', async () => {
            // Mock finding current paper
            prisma.paper.findFirst
                .mockResolvedValueOnce({ id: 100, userId: 1, doi: '10.1234/old' })
                // Mock finding conflicting paper (which is deleted)
                .mockResolvedValueOnce({ 
                    id: 999, 
                    userId: 1, 
                    doi: '10.1234/new-doi',
                    deletedAt: new Date() // Deleted!
                });

            // Mock successful update
            prisma.paper.update.mockResolvedValue({ id: 100, doi: '10.1234/new-doi' });

            await updatePaper(req, res, next);

            // Should delete the conflicting deleted paper (id 999)
            expect(prisma.paper.delete).toHaveBeenCalledWith({
                where: { id: 999 }
            });

            // Should proceed with update of current paper (id 100)
            expect(prisma.paper.update).toHaveBeenCalledWith({
                where: { id: 100 },
                data: expect.objectContaining({ doi: '10.1234/new-doi' }),
                select: expect.anything()
            });
        });

        it('should reject update if conflicting paper is active', async () => {
            // Mock finding current paper
            prisma.paper.findFirst
                .mockResolvedValueOnce({ id: 100, userId: 1, doi: '10.1234/old' })
                // Mock finding conflicting paper (Active!)
                .mockResolvedValueOnce({ 
                    id: 888, 
                    userId: 1, 
                    doi: '10.1234/new-doi',
                    deletedAt: null 
                });

            await updatePaper(req, res, next);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(prisma.paper.delete).not.toHaveBeenCalled();
            expect(prisma.paper.update).not.toHaveBeenCalled();
        });
    });
});

