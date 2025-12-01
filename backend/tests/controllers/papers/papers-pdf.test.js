import { describe, it, expect, vi, beforeEach, beforeAll } from 'vitest';

describe('Papers PDF Controller', () => {
    let getUploadUrl, uploadPdfDirect, getPdfDownloadUrl, proxyPdfStream;
    let prisma, s3Lib;
    let req, res, next;

    beforeAll(async () => {
        // Mock dependencies using vi.doMock
        vi.doMock('../../../src/lib/prisma.js', () => ({
            prisma: {
                paper: {
                    findFirst: vi.fn()
                }
            }
        }));

        vi.doMock('../../../src/lib/s3.js', () => {
            return {
                getPresignedUploadUrl: vi.fn(),
                generatePdfKey: vi.fn((userId, paperId, filename) => `papers/${userId}/${paperId}/${filename}`),
                isS3Configured: vi.fn().mockReturnValue(true),
                uploadFileToS3: vi.fn().mockResolvedValue({}),
                getPresignedDownloadUrl: vi.fn(),
                extractS3Key: vi.fn((url) => url.split('/').pop()),
                getS3ObjectStream: vi.fn(),
            };
        });

        // Import dependencies to access mocks
        // We need to import them dynamically to ensure they use the mocks
        prisma = (await import('../../../src/lib/prisma.js')).prisma;
        s3Lib = await import('../../../src/lib/s3.js');

        // Import controller AFTER mocks are set up
        const controller = await import('../../../src/controllers/papers/papers-pdf.controller.js');
        getUploadUrl = controller.getUploadUrl;
        uploadPdfDirect = controller.uploadPdfDirect;
        getPdfDownloadUrl = controller.getPdfDownloadUrl;
        proxyPdfStream = controller.proxyPdfStream;
    });

    beforeEach(() => {
        req = {
            body: {},
            user: { id: 1 },
            params: {},
            query: {},
            file: null
        };
        res = {
            status: vi.fn().mockReturnThis(),
            json: vi.fn(),
            setHeader: vi.fn(),
            send: vi.fn()
        };
        next = vi.fn();
        vi.clearAllMocks();

        // Default S3 config
        if (s3Lib && s3Lib.isS3Configured) {
            s3Lib.isS3Configured.mockReturnValue(true);
        }
    });

    describe('getUploadUrl', () => {
        it('should return 400 if required fields are missing', async () => {
            req.body = { filename: 'test.pdf' }; // Missing size and contentType
            await getUploadUrl(req, res, next);
            expect(res.status).toHaveBeenCalledWith(400);
        });

        it('should return 400 if content type is not PDF', async () => {
            req.body = { filename: 'test.txt', size: 100, contentType: 'text/plain' };
            await getUploadUrl(req, res, next);
            expect(res.status).toHaveBeenCalledWith(400);
        });

        it('should return 503 if S3 is not configured', async () => {
            s3Lib.isS3Configured.mockReturnValue(false);
            req.body = { filename: 'test.pdf', size: 100, contentType: 'application/pdf' };

            await getUploadUrl(req, res, next);

            expect(res.status).toHaveBeenCalledWith(503);
        });

        it('should return presigned URL successfully', async () => {
            req.body = { filename: 'test.pdf', size: 100, contentType: 'application/pdf' };
            s3Lib.getPresignedUploadUrl.mockResolvedValue({ url: 'https://s3.url', fields: {} });

            await getUploadUrl(req, res, next);

            expect(s3Lib.getPresignedUploadUrl).toHaveBeenCalled();
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
                success: true,
                data: expect.objectContaining({ uploadUrl: 'https://s3.url' })
            }));
        });
    });

    describe('uploadPdfDirect', () => {
        it('should return 400 if no file uploaded', async () => {
            await uploadPdfDirect(req, res, next);
            expect(res.status).toHaveBeenCalledWith(400);
        });

        it('should return 400 if file is not PDF', async () => {
            req.file = { mimetype: 'text/plain' };
            await uploadPdfDirect(req, res, next);
            expect(res.status).toHaveBeenCalledWith(400);
        });

        it('should upload file successfully', async () => {
            req.file = {
                mimetype: 'application/pdf',
                buffer: Buffer.from('test'),
                originalname: 'test.pdf',
                size: 4
            };

            await uploadPdfDirect(req, res, next);

            expect(s3Lib.uploadFileToS3).toHaveBeenCalled();
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
                success: true,
                data: expect.objectContaining({ filename: 'test.pdf' })
            }));
        });
    });

    describe('getPdfDownloadUrl', () => {
        it('should return 404 if paper not found', async () => {
            req.params.id = 1;
            prisma.paper.findFirst.mockResolvedValue(null);

            await getPdfDownloadUrl(req, res, next);

            expect(res.status).toHaveBeenCalledWith(404);
        });

        it('should return download URL successfully', async () => {
            req.params.id = 1;
            prisma.paper.findFirst.mockResolvedValue({ id: 1, pdfUrl: 'papers/1/test.pdf' });
            s3Lib.getPresignedDownloadUrl.mockResolvedValue('https://download.url');

            await getPdfDownloadUrl(req, res, next);

            expect(s3Lib.getPresignedDownloadUrl).toHaveBeenCalled();
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
                success: true,
                data: expect.objectContaining({ downloadUrl: 'https://download.url' })
            }));
        });
    });

    describe('proxyPdfStream', () => {
        it('should stream PDF successfully', async () => {
            req.params.id = 1;
            prisma.paper.findFirst.mockResolvedValue({ id: 1, pdfUrl: 'papers/1/test.pdf' });

            // Mock async iterator for stream
            const mockStream = {
                [Symbol.asyncIterator]: async function* () {
                    yield Buffer.from('chunk1');
                    yield Buffer.from('chunk2');
                }
            };
            s3Lib.getS3ObjectStream.mockResolvedValue(mockStream);

            await proxyPdfStream(req, res, next);

            expect(res.setHeader).toHaveBeenCalledWith('Content-Type', 'application/pdf');
            expect(res.send).toHaveBeenCalled();
        });
    });
});
