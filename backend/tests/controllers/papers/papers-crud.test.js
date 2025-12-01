import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getAllPapers, getPaper, createPaper, updatePaper, deletePaper } from '../../../src/controllers/papers/papers-crud.controller.js';
import { prisma } from '../../../src/lib/prisma.js';
import * as papersUtils from '../../../src/controllers/papers/papers.utils.js';

// Mock Prisma
vi.mock('../../../src/lib/prisma.js', () => ({
    prisma: {
        paper: {
            count: vi.fn(),
            findMany: vi.fn(),
            findFirst: vi.fn(),
            create: vi.fn(),
            update: vi.fn(),
            delete: vi.fn(),
        }
    }
}));

// Mock Utils
vi.mock('../../../src/controllers/papers/papers.utils.js', () => ({
    PAPER_SELECT_FIELDS: { id: true, title: true },
    buildPaperWhereClause: vi.fn(),
    checkPaperExists: vi.fn(),
    updateUserStorage: vi.fn(),
    checkDuplicateDoi: vi.fn()
}));

describe('Papers CRUD Controller', () => {
    let req, res, next;

    beforeEach(() => {
        req = {
            user: { id: 1 },
            query: {},
            params: {},
            body: {}
        };
        res = {
            status: vi.fn().mockReturnThis(),
            json: vi.fn()
        };
        next = vi.fn();
        vi.clearAllMocks();
    });

    describe('getAllPapers', () => {
        it('should return paginated papers with correct metadata', async () => {
            req.query = { page: '2', limit: '10' };
            papersUtils.buildPaperWhereClause.mockReturnValue({ userId: 1 });
            prisma.paper.count.mockResolvedValue(50);
            prisma.paper.findMany.mockResolvedValue([{ id: 1, title: 'Paper 1' }]);

            await getAllPapers(req, res, next);

            expect(prisma.paper.findMany).toHaveBeenCalledWith(expect.objectContaining({
                skip: 10,
                take: 10
            }));
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
                success: true,
                data: expect.objectContaining({
                    pagination: expect.objectContaining({
                        page: 2,
                        limit: 10,
                        total: 50,
                        totalPages: 5
                    })
                })
            }));
        });

        it('should handle errors', async () => {
            const error = new Error('DB Error');
            prisma.paper.count.mockRejectedValue(error);
            await getAllPapers(req, res, next);
            expect(next).toHaveBeenCalledWith(error);
        });
    });

    describe('getPaper', () => {
        it('should return paper if found', async () => {
            req.params.id = '1';
            const paper = { id: 1, title: 'Test' };
            prisma.paper.findFirst.mockResolvedValue(paper);

            await getPaper(req, res, next);

            expect(res.json).toHaveBeenCalledWith({
                success: true,
                data: { paper }
            });
        });

        it('should return 404 if not found', async () => {
            req.params.id = '999';
            prisma.paper.findFirst.mockResolvedValue(null);

            await getPaper(req, res, next);

            expect(res.status).toHaveBeenCalledWith(404);
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
                success: false,
                error: expect.objectContaining({ message: 'Paper not found' })
            }));
        });
    });

    describe('createPaper', () => {
        it('should create a new paper successfully', async () => {
            req.body = { title: 'New Paper', doi: '10.1234/test' };
            const createdPaper = { id: 1, ...req.body };

            papersUtils.checkDuplicateDoi.mockResolvedValue({ exists: false });
            prisma.paper.create.mockResolvedValue(createdPaper);

            await createPaper(req, res, next);

            expect(prisma.paper.create).toHaveBeenCalled();
            expect(res.status).toHaveBeenCalledWith(201);
            expect(res.json).toHaveBeenCalledWith({
                success: true,
                data: { paper: createdPaper }
            });
        });

        it('should return 409 if active paper with DOI exists', async () => {
            req.body = { title: 'Duplicate', doi: '10.1234/dup' };
            papersUtils.checkDuplicateDoi.mockResolvedValue({ exists: true, isActive: true });

            await createPaper(req, res, next);

            expect(res.status).toHaveBeenCalledWith(409);
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
                success: false,
                error: expect.objectContaining({ message: expect.stringContaining('already exists') })
            }));
        });

        it('should restore soft-deleted paper if DOI matches', async () => {
            req.body = { title: 'Restored', doi: '10.1234/deleted' };
            const existing = { id: 1, deletedAt: new Date() };
            papersUtils.checkDuplicateDoi.mockResolvedValue({ exists: true, isActive: false, paper: existing });
            prisma.paper.update.mockResolvedValue({ id: 1, title: 'Restored' });

            await createPaper(req, res, next);

            expect(prisma.paper.update).toHaveBeenCalledWith(expect.objectContaining({
                where: { id: 1 },
                data: expect.objectContaining({ deletedAt: null })
            }));
            expect(res.status).toHaveBeenCalledWith(201);
        });

        it('should update user storage if PDF size provided', async () => {
            req.body = { title: 'PDF Paper', pdfSizeBytes: 1000 };
            papersUtils.checkDuplicateDoi.mockResolvedValue({ exists: false });
            prisma.paper.create.mockResolvedValue({ id: 1 });

            await createPaper(req, res, next);

            expect(papersUtils.updateUserStorage).toHaveBeenCalledWith(1, BigInt(1000));
        });
    });

    describe('updatePaper', () => {
        it('should update paper successfully', async () => {
            req.params.id = '1';
            req.body = { title: 'Updated Title' };
            papersUtils.checkPaperExists.mockResolvedValue({ id: 1 });
            prisma.paper.update.mockResolvedValue({ id: 1, title: 'Updated Title' });

            await updatePaper(req, res, next);

            expect(prisma.paper.update).toHaveBeenCalledWith(expect.objectContaining({
                where: { id: 1 },
                data: expect.objectContaining({ title: 'Updated Title' })
            }));
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
        });

        it('should return 404 if paper does not exist', async () => {
            req.params.id = '999';
            papersUtils.checkPaperExists.mockResolvedValue(null);

            await updatePaper(req, res, next);

            expect(res.status).toHaveBeenCalledWith(404);
        });

        it('should handle DOI conflict during update', async () => {
            req.params.id = '1';
            req.body = { doi: '10.1234/conflict' };
            papersUtils.checkPaperExists.mockResolvedValue({ id: 1, doi: '10.1234/original' });
            papersUtils.checkDuplicateDoi.mockResolvedValue({ exists: true, isActive: true });

            await updatePaper(req, res, next);

            expect(res.status).toHaveBeenCalledWith(409);
        });

        it('should update storage if PDF size changes', async () => {
            req.params.id = '1';
            req.body = { pdfUrl: 'new.pdf', pdfSizeBytes: 2000 };
            papersUtils.checkPaperExists.mockResolvedValue({ id: 1, pdfSizeBytes: BigInt(1000) });
            prisma.paper.update.mockResolvedValue({ id: 1 });

            await updatePaper(req, res, next);

            // New (2000) - Old (1000) = 1000 difference
            expect(papersUtils.updateUserStorage).toHaveBeenCalledWith(1, BigInt(1000));
        });
    });

    describe('deletePaper', () => {
        it('should soft delete paper', async () => {
            req.params.id = '1';
            papersUtils.checkPaperExists.mockResolvedValue({ id: 1 });

            await deletePaper(req, res, next);

            expect(prisma.paper.update).toHaveBeenCalledWith(expect.objectContaining({
                where: { id: 1 },
                data: expect.objectContaining({ deletedAt: expect.any(Date) })
            }));
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
        });

        it('should release storage if paper had PDF', async () => {
            req.params.id = '1';
            papersUtils.checkPaperExists.mockResolvedValue({ id: 1, pdfSizeBytes: BigInt(5000) });

            await deletePaper(req, res, next);

            // Should subtract size
            expect(papersUtils.updateUserStorage).toHaveBeenCalledWith(1, BigInt(-5000));
        });

        it('should return 404 if paper not found', async () => {
            req.params.id = '999';
            papersUtils.checkPaperExists.mockResolvedValue(null);

            await deletePaper(req, res, next);

            expect(res.status).toHaveBeenCalledWith(404);
        });
    });
});
