/**
 * Tests for Backend PDF Proxy Streaming
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { proxyPdfStream } from '../src/controllers/papers.js';
import { prisma } from '../src/lib/prisma.js';
import * as s3 from '../src/lib/s3.js';

// Mock prisma
vi.mock('../src/lib/prisma.js', () => ({
    prisma: {
        paper: {
            findFirst: vi.fn()
        }
    }
}));

// Mock S3
vi.mock('../src/lib/s3.js', () => ({
    getS3ObjectStream: vi.fn(),
    extractS3Key: vi.fn(),
    isS3Configured: vi.fn().mockReturnValue(true)
}));

// Mock fetch for fallback
global.fetch = vi.fn();

describe('Backend Papers Controller - PDF Proxy', () => {
    let req, res, next;

    beforeEach(() => {
        vi.clearAllMocks();
        req = {
            user: { id: 1 },
            params: { id: '100' }
        };
        res = {
            status: vi.fn().mockReturnThis(),
            json: vi.fn(),
            setHeader: vi.fn(),
            send: vi.fn()
        };
        next = vi.fn();
    });

    it('should return 404 if paper not found', async () => {
        prisma.paper.findFirst.mockResolvedValue(null);
        await proxyPdfStream(req, res, next);
        expect(res.status).toHaveBeenCalledWith(404);
        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ error: { message: 'Paper not found' } }));
    });

    it('should return 404 if paper has no PDF URL', async () => {
        prisma.paper.findFirst.mockResolvedValue({ id: 100, pdfUrl: null });
        await proxyPdfStream(req, res, next);
        expect(res.status).toHaveBeenCalledWith(404);
        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ error: { message: 'PDF not found for this paper' } }));
    });

    it('should stream PDF from S3 when configured', async () => {
        const mockPaper = { id: 100, pdfUrl: 'papers/1/test.pdf' };
        prisma.paper.findFirst.mockResolvedValue(mockPaper);
        s3.extractS3Key.mockReturnValue('papers/1/test.pdf');
        
        // Mock stream async iterator
        const mockStream = {
            [Symbol.asyncIterator]: async function* () {
                yield Buffer.from('PDF content part 1');
                yield Buffer.from('PDF content part 2');
            }
        };
        s3.getS3ObjectStream.mockResolvedValue(mockStream);

        await proxyPdfStream(req, res, next);

        expect(s3.extractS3Key).toHaveBeenCalledWith(mockPaper.pdfUrl);
        expect(s3.getS3ObjectStream).toHaveBeenCalledWith('papers/1/test.pdf');
        
        // Verify headers
        expect(res.setHeader).toHaveBeenCalledWith('Content-Type', 'application/pdf');
        expect(res.setHeader).toHaveBeenCalledWith('Content-Disposition', 'inline; filename="paper-100.pdf"');
        expect(res.setHeader).toHaveBeenCalledWith('Cache-Control', 'private, max-age=3600');
        
        // Verify content sent (concatenated buffer)
        expect(res.send).toHaveBeenCalledWith(expect.any(Buffer));
        const sentBuffer = res.send.mock.calls[0][0];
        expect(sentBuffer.toString()).toBe('PDF content part 1PDF content part 2');
    });

    it('should handle S3 streaming errors', async () => {
        prisma.paper.findFirst.mockResolvedValue({ id: 100, pdfUrl: 'papers/1/test.pdf' });
        s3.getS3ObjectStream.mockRejectedValue(new Error('S3 Access Denied'));

        await proxyPdfStream(req, res, next);

        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ error: { message: 'Failed to fetch PDF from storage' } }));
    });

    it('should fallback to direct fetch if URL is not S3 key', async () => {
        // Disable S3 config for this test to force fallback path
        s3.isS3Configured.mockReturnValue(false);
        
        const externalUrl = 'https://example.com/paper.pdf';
        prisma.paper.findFirst.mockResolvedValue({ id: 100, pdfUrl: externalUrl });
        
        // Mock fetch response
        const mockBuffer = Buffer.from('External PDF Content');
        global.fetch.mockResolvedValue({
            ok: true,
            arrayBuffer: async () => mockBuffer
        });

        await proxyPdfStream(req, res, next);

        expect(global.fetch).toHaveBeenCalledWith(externalUrl);
        expect(res.setHeader).toHaveBeenCalledWith('Content-Type', 'application/pdf');
        expect(res.send).toHaveBeenCalledWith(expect.any(Buffer));
    });

    it('should handle fetch errors in fallback mode', async () => {
        s3.isS3Configured.mockReturnValue(false);
        prisma.paper.findFirst.mockResolvedValue({ id: 100, pdfUrl: 'https://example.com/paper.pdf' });
        
        global.fetch.mockResolvedValue({
            ok: false,
            status: 404
        });

        await proxyPdfStream(req, res, next);

        // Should catch error and return 500 (generic failure)
        // Note: implementation catches fetch error and re-throws/sends 500
        // Verify based on current implementation behavior
        expect(res.status).toHaveBeenCalledWith(500); 
    });
});

