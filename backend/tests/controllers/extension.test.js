/**
 * Unit Tests for Extension Controller
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { savePaper } from '../../src/controllers/extension.js';
import { mockRequest, mockResponse, mockNext, sampleData } from '../helpers.js';

// Mock Prisma
vi.mock('../../src/lib/prisma.js', () => ({
    prisma: {
        paper: {
            findFirst: vi.fn(),
            create: vi.fn()
        }
    }
}));

// Mock Metadata Library
vi.mock('../../src/lib/metadata.js', () => ({
    fetchDoiMetadata: vi.fn(),
    fetchArxivMetadata: vi.fn()
}));

import { prisma } from '../../src/lib/prisma.js';
import { fetchDoiMetadata, fetchArxivMetadata } from '../../src/lib/metadata.js';

describe('Extension Controller', () => {
    let req, res, next;

    beforeEach(() => {
        vi.clearAllMocks();
        req = mockRequest();
        res = mockResponse();
        next = mockNext();
        req.user = sampleData.user();
    });

    describe('savePaper', () => {
        it('should save paper using DOI', async () => {
            req.body = {
                doi: '10.1234/test',
                tags: ['research']
            };

            const mockMetadata = {
                title: 'Test Paper',
                authors: ['Author A'],
                year: 2024,
                doi: '10.1234/test',
                journal: 'Journal of Testing',
                url: 'http://doi.org/10.1234/test',
                tags: [],
                notes: ''
            };

            fetchDoiMetadata.mockResolvedValue(mockMetadata);
            prisma.paper.findFirst.mockResolvedValue(null); // No duplicate
            prisma.paper.create.mockResolvedValue({ ...mockMetadata, id: 1 });

            await savePaper(req, res, next);

            expect(fetchDoiMetadata).toHaveBeenCalledWith('10.1234/test');
            expect(prisma.paper.create).toHaveBeenCalledWith({
                data: expect.objectContaining({
                    title: 'Test Paper',
                    doi: '10.1234/test',
                    tags: ['research'],
                    clientId: 'extension'
                })
            });

            expect(res.json).toHaveBeenCalledWith({
                success: true,
                data: expect.any(Object)
            });
        });

        it('should save paper using arXiv ID', async () => {
            req.body = {
                arxivId: '2401.12345',
                notes: 'Interesting'
            };

            const mockMetadata = {
                title: 'ArXiv Paper',
                authors: ['Author B'],
                year: 2024,
                doi: '10.48550/arXiv.2401.12345',
                url: 'http://arxiv.org/abs/2401.12345',
                pdfUrl: 'http://arxiv.org/pdf/2401.12345',
                tags: [],
                notes: 'Abstract'
            };

            fetchArxivMetadata.mockResolvedValue(mockMetadata);
            prisma.paper.findFirst.mockResolvedValue(null);
            prisma.paper.create.mockResolvedValue({ ...mockMetadata, id: 1 });

            await savePaper(req, res, next);

            expect(fetchArxivMetadata).toHaveBeenCalledWith('2401.12345');
            expect(prisma.paper.create).toHaveBeenCalledWith({
                data: expect.objectContaining({
                    title: 'ArXiv Paper',
                    pdfUrl: 'http://arxiv.org/pdf/2401.12345',
                    notes: 'Interesting' // Should override metadata notes if provided? 
                    // Code says: notes: data.notes || metadata.notes
                })
            });
        });

        it('should fallback to title if no DOI/arXiv', async () => {
            req.body = {
                title: 'Manual Entry',
                url: 'http://example.com'
            };

            prisma.paper.create.mockResolvedValue({ id: 1, title: 'Manual Entry' });

            await savePaper(req, res, next);

            expect(fetchDoiMetadata).not.toHaveBeenCalled();
            expect(fetchArxivMetadata).not.toHaveBeenCalled();

            expect(prisma.paper.create).toHaveBeenCalledWith({
                data: expect.objectContaining({
                    title: 'Manual Entry',
                    url: 'http://example.com',
                    authors: ['Unknown']
                })
            });
        });

        it('should validate required fields', async () => {
            req.body = { url: 'http://example.com' }; // Missing title/doi/arxivId

            await savePaper(req, res, next);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
                success: false,
                error: { message: expect.stringContaining('required') }
            }));
        });

        it('should handle metadata fetch errors', async () => {
            req.body = { doi: '10.1234/invalid' };

            fetchDoiMetadata.mockRejectedValue(new Error('Not Found'));

            await savePaper(req, res, next);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
                success: false,
                error: { message: expect.stringContaining('Metadata fetch failed') }
            }));
        });

        it('should detect duplicates', async () => {
            req.body = { doi: '10.1234/exists' };

            const mockMetadata = { doi: '10.1234/exists' };
            fetchDoiMetadata.mockResolvedValue(mockMetadata);

            prisma.paper.findFirst.mockResolvedValue({ id: 1, title: 'Existing' });

            await savePaper(req, res, next);

            expect(res.status).toHaveBeenCalledWith(409);
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
                success: false,
                error: { message: expect.stringContaining('already exists') }
            }));
        });

        it('should handle Zod validation errors', async () => {
            req.body = {
                doi: 123 // Invalid type, should be string
            };

            await savePaper(req, res, next);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
                success: false,
                error: expect.objectContaining({ message: 'Invalid input' })
            }));
        });
    });
});
