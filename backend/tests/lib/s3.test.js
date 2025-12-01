import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { createPresignedPost } from '@aws-sdk/s3-presigned-post';

// Mock AWS SDK
vi.mock('@aws-sdk/client-s3', () => ({
    S3Client: vi.fn(() => ({
        send: vi.fn()
    })),
    PutObjectCommand: vi.fn(),
    GetObjectCommand: vi.fn()
}));

vi.mock('@aws-sdk/s3-request-presigner', () => ({
    getSignedUrl: vi.fn()
}));

vi.mock('@aws-sdk/s3-presigned-post', () => ({
    createPresignedPost: vi.fn()
}));

describe('S3 Library', () => {
    const originalEnv = process.env;
    let s3Module;

    beforeEach(async () => {
        vi.resetModules();
        vi.clearAllMocks();
        process.env = { ...originalEnv };

        // Set default valid config
        process.env.S3_BUCKET_NAME = 'test-bucket';
        process.env.S3_ACCESS_KEY_ID = 'test-key';
        process.env.S3_SECRET_ACCESS_KEY = 'test-secret';
        process.env.S3_ENDPOINT = 'https://s3.amazonaws.com';

        // Re-import module for each test to pick up env vars
        s3Module = await import('../../src/lib/s3.js');
    });

    afterEach(() => {
        process.env = originalEnv;
    });

    describe('Configuration', () => {
        it('should return true if configured correctly', () => {
            expect(s3Module.isS3Configured()).toBe(true);
        });

        it('should return false if missing vars', async () => {
            vi.resetModules();
            delete process.env.S3_BUCKET_NAME;
            s3Module = await import('../../src/lib/s3.js');
            expect(s3Module.isS3Configured()).toBe(false);
        });
    });

    describe('getPresignedUploadUrl', () => {
        it('should throw error if not configured', async () => {
            vi.resetModules();
            delete process.env.S3_BUCKET_NAME;
            s3Module = await import('../../src/lib/s3.js');

            await expect(s3Module.getPresignedUploadUrl('key', 'application/pdf', 100))
                .rejects.toThrow('S3 storage is not configured');
        });

        it('should throw error if file too large', async () => {
            const largeSize = 51 * 1024 * 1024; // 51MB
            await expect(s3Module.getPresignedUploadUrl('key', 'application/pdf', largeSize))
                .rejects.toThrow('File size exceeds');
        });

        it('should use presigned POST for standard S3', async () => {
            createPresignedPost.mockResolvedValue({ url: 'http://post-url', fields: {} });

            const result = await s3Module.getPresignedUploadUrl('key', 'application/pdf', 1000);

            expect(createPresignedPost).toHaveBeenCalled();
            expect(result).toHaveProperty('url');
            expect(result).toHaveProperty('fields');
        });

        it('should fallback to PUT if POST fails (standard S3)', async () => {
            createPresignedPost.mockRejectedValue(new Error('POST failed'));
            getSignedUrl.mockResolvedValue('http://put-url');

            const result = await s3Module.getPresignedUploadUrl('key', 'application/pdf', 1000);

            expect(getSignedUrl).toHaveBeenCalled();
            expect(result).toBe('http://put-url');
        });

        it('should force PUT for Cloudflare R2', async () => {
            vi.resetModules();
            process.env.S3_ENDPOINT = 'https://account.r2.cloudflarestorage.com';
            s3Module = await import('../../src/lib/s3.js');

            getSignedUrl.mockResolvedValue('http://r2-put-url');

            const result = await s3Module.getPresignedUploadUrl('key', 'application/pdf', 1000);

            expect(createPresignedPost).not.toHaveBeenCalled();
            expect(getSignedUrl).toHaveBeenCalled();
            expect(result).toBe('http://r2-put-url');
        });
    });

    describe('getPresignedDownloadUrl', () => {
        it('should generate download URL', async () => {
            getSignedUrl.mockResolvedValue('http://download-url');

            const url = await s3Module.getPresignedDownloadUrl('key');

            expect(getSignedUrl).toHaveBeenCalled();
            expect(url).toBe('http://download-url');
        });

        it('should throw if not configured', async () => {
            vi.resetModules();
            delete process.env.S3_BUCKET_NAME;
            s3Module = await import('../../src/lib/s3.js');

            await expect(s3Module.getPresignedDownloadUrl('key'))
                .rejects.toThrow('S3 storage is not configured');
        });
    });

    describe('uploadFileToS3', () => {
        it('should upload buffer directly', async () => {
            const mockSend = vi.fn();
            S3Client.mockImplementation(() => ({ send: mockSend }));
            // Re-import to use mocked S3Client
            vi.resetModules();
            s3Module = await import('../../src/lib/s3.js');

            const buffer = Buffer.from('test content');
            await s3Module.uploadFileToS3(buffer, 'key', 'text/plain');

            expect(mockSend).toHaveBeenCalled();
            expect(PutObjectCommand).toHaveBeenCalledWith(expect.objectContaining({
                Key: 'key',
                ContentType: 'text/plain'
            }));
        });

        it('should throw if upload fails', async () => {
            const mockSend = vi.fn().mockRejectedValue(new Error('Upload failed'));
            S3Client.mockImplementation(() => ({ send: mockSend }));
            vi.resetModules();
            s3Module = await import('../../src/lib/s3.js');

            await expect(s3Module.uploadFileToS3(Buffer.from(''), 'key', 'text/plain'))
                .rejects.toThrow('Upload failed');
        });
    });
});
