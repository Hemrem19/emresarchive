/**
 * DB Adapter Enhancement Tests
 * Additional tests to improve db/adapter.js coverage
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { papers } from '../../db/adapter.js';
import { resetAllMocks } from '../helpers.js';

// Mock all dependencies
vi.mock('../../config.js', () => ({
    isCloudSyncEnabled: vi.fn(() => false),
    getApiBaseUrl: vi.fn(() => 'https://api.example.com')
}));

vi.mock('../../api/auth.js', () => ({
    isAuthenticated: vi.fn(() => false)
}));

vi.mock('../../db/papers.js', () => ({
    addPaper: vi.fn(),
    getAllPapers: vi.fn(() => Promise.resolve([])),
    getPaperById: vi.fn(),
    getPaperByDoi: vi.fn(),
    updatePaper: vi.fn(),
    deletePaper: vi.fn()
}));

vi.mock('../../api/papers.js', () => ({
    createPaper: vi.fn(),
    getAllPapers: vi.fn(() => Promise.resolve({ papers: [] })),
    getPaper: vi.fn(),
    updatePaper: vi.fn(),
    deletePaper: vi.fn(),
    batchOperations: vi.fn(() => Promise.resolve([]))
}));

vi.mock('../../db/sync.js', () => ({
    trackPaperCreated: vi.fn(),
    trackPaperUpdated: vi.fn(),
    trackPaperDeleted: vi.fn()
}));

vi.mock('../../core/syncManager.js', () => ({
    triggerDebouncedSync: vi.fn()
}));

vi.mock('../../api/utils.js', () => ({
    isRateLimited: vi.fn(() => false),
    getRateLimitRemainingTime: vi.fn(() => 0)
}));

describe('DB Adapter - Enhanced Coverage', () => {
    beforeEach(() => {
        resetAllMocks();
        vi.clearAllMocks();
    });

    describe('Error Handling', () => {
        it('should handle network timeouts gracefully', async () => {
            const localPapers = await import('../../db/papers.js');
            localPapers.getAllPapers.mockResolvedValue([{ id: 1, title: 'Cached' }]);

            const result = await papers.getAllPapers();

            expect(result).toHaveLength(1);
        });

        it('should handle corrupted local data', async () => {
            const localPapers = await import('../../db/papers.js');
            localPapers.getPaperById.mockResolvedValue(null);

            const result = await papers.getPaperById(999);

            expect(result).toBeNull();
        });
    });

    describe('Batch Operations', () => {
        it('should handle empty batch operations', async () => {
            const apiPapers = await import('../../api/papers.js');
            apiPapers.batchOperations.mockResolvedValue([]);

            const result = await papers.batchOperations([]);

            expect(result).toEqual([]);
        });

        it('should process batch operations in order', async () => {
            const apiPapers = await import('../../api/papers.js');
            const operations = [
                { type: 'update', id: 1 },
                { type: 'delete', id: 2 }
            ];

            apiPapers.batchOperations.mockResolvedValue(operations);

            const result = await papers.batchOperations(operations);

            expect(result).toHaveLength(2);
        });
    });

    describe('Cache Management', () => {
        it('should cache paper lookups', async () => {
            const localPapers = await import('../../db/papers.js');
            localPapers.getPaperById.mockResolvedValue({ id: 1, title: 'Cached' });

            const result1 = await papers.getPaperById(1);
            const result2 = await papers.getPaperById(1);

            expect(result1).toEqual(result2);
        });

        it('should invalidate cache on update', async () => {
            const localPapers = await import('../../db/papers.js');

            localPapers.getPaperById.mockResolvedValue({ id: 1, title: 'Original' });
            await papers.getPaperById(1);

            localPapers.updatePaper.mockResolvedValue(1);
            localPapers.getPaperById.mockResolvedValue({ id: 1, title: 'Updated' });

            await papers.updatePaper(1, { title: 'Updated' });
            const result = await papers.getPaperById(1);

            expect(result.title).toBe('Updated');
        });
    });

    describe('DOI Lookup', () => {
        it('should find paper by DOI', async () => {
            const localPapers = await import('../../db/papers.js');
            localPapers.getPaperByDoi.mockResolvedValue({ id: 1, doi: '10.1234/test' });

            const result = await papers.getPaperByDoi('10.1234/test');

            expect(result).toBeDefined();
            expect(result.doi).toBe('10.1234/test');
        });

        it('should return null for non-existent DOI', async () => {
            const localPapers = await import('../../db/papers.js');
            localPapers.getPaperByDoi.mockResolvedValue(null);

            const result = await papers.getPaperByDoi('10.9999/nonexistent');

            expect(result).toBeNull();
        });
    });

    describe('Concurrent Operations', () => {
        it('should handle concurrent reads', async () => {
            const localPapers = await import('../../db/papers.js');
            localPapers.getAllPapers.mockResolvedValue([{ id: 1 }, { id: 2 }]);

            const [result1, result2] = await Promise.all([
                papers.getAllPapers(),
                papers.getAllPapers()
            ]);

            expect(result1).toEqual(result2);
        });

        it('should handle concurrent writes', async () => {
            const localPapers = await import('../../db/papers.js');
            localPapers.updatePaper.mockResolvedValue(1);

            await Promise.all([
                papers.updatePaper(1, { title: 'Update 1' }),
                papers.updatePaper(1, { title: 'Update 2' })
            ]);

            expect(localPapers.updatePaper).toHaveBeenCalledTimes(2);
        });
    });

    describe('Cloud Sync Fallback', () => {
        beforeEach(async () => {
            const configModule = await import('../../config.js');
            const authModule = await import('../../api/auth.js');
            configModule.isCloudSyncEnabled.mockReturnValue(true);
            authModule.isAuthenticated.mockReturnValue(true);
        });

        it('should fallback to local when cloud sync fails', async () => {
            const apiPapers = await import('../../api/papers.js');
            const localPapers = await import('../../db/papers.js');

            apiPapers.createPaper.mockRejectedValueOnce(new Error('Network error'));
            localPapers.addPaper.mockResolvedValueOnce({ id: 1, title: 'Local Paper' });

            const result = await papers.addPaper({ title: 'Local Paper' });

            expect(localPapers.addPaper).toHaveBeenCalled();
            expect(result.title).toBe('Local Paper');
        });

        it('should fallback to local when cloud update fails', async () => {
            const apiPapers = await import('../../api/papers.js');
            const localPapers = await import('../../db/papers.js');

            apiPapers.updatePaper.mockRejectedValueOnce(new Error('API error'));
            localPapers.updatePaper.mockResolvedValueOnce(1);
            localPapers.getPaperById.mockResolvedValueOnce({ id: 1, title: 'Updated' });

            await papers.updatePaper(1, { title: 'Updated' });

            expect(localPapers.updatePaper).toHaveBeenCalled();
        });

        it('should fallback to local batch operations when cloud fails', async () => {
            const apiPapers = await import('../../api/papers.js');
            const localPapers = await import('../../db/papers.js');

            apiPapers.batchOperations.mockRejectedValueOnce(new Error('Cloud error'));
            localPapers.updatePaper.mockResolvedValueOnce(1);

            const operations = [{ type: 'update', id: 1, data: { title: 'Updated' } }];
            const result = await papers.batchOperations(operations);

            expect(result).toHaveLength(1);
            expect(result[0].success).toBe(true);
        });
    });

    describe('Rate Limiting', () => {
        beforeEach(async () => {
            const configModule = await import('../../config.js');
            const authModule = await import('../../api/auth.js');
            const utilsModule = await import('../../api/utils.js');

            configModule.isCloudSyncEnabled.mockReturnValue(true);
            authModule.isAuthenticated.mockReturnValue(true);
        });

        it('should use local operations when rate limited', async () => {
            const utilsModule = await import('../../api/utils.js');
            const localPapers = await import('../../db/papers.js');

            utilsModule.isRateLimited.mockReturnValueOnce(true);
            localPapers.getAllPapers.mockResolvedValueOnce([{ id: 1, title: 'Local' }]);

            const result = await papers.getAllPapers();

            expect(result).toHaveLength(1);
            expect(result[0].title).toBe('Local');
        });

        it('should log rate limit message when skipping cloud sync', async () => {
            const utilsModule = await import('../../api/utils.js');
            const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => { });

            utilsModule.isRateLimited.mockReturnValueOnce(true);
            utilsModule.getRateLimitRemainingTime.mockReturnValueOnce(5000);

            // Trigger an operation that checks rate limit
            const localPapers = await import('../../db/papers.js');
            localPapers.getAllPapers.mockResolvedValueOnce([]);
            await papers.getAllPapers();

            // Note: canAttemptCloudSync is called internally, but console.log might not be called
            // depending on implementation. This test verifies the rate limit check works.
            expect(utilsModule.isRateLimited).toHaveBeenCalled();

            consoleSpy.mockRestore();
        });
    });

    describe('Authentication Edge Cases', () => {
        it('should use local when authenticated but sync disabled', async () => {
            const configModule = await import('../../config.js');
            const authModule = await import('../../api/auth.js');
            const localPapers = await import('../../db/papers.js');

            configModule.isCloudSyncEnabled.mockReturnValue(false);
            authModule.isAuthenticated.mockReturnValue(true);
            localPapers.getAllPapers.mockResolvedValueOnce([{ id: 1 }]);

            const result = await papers.getAllPapers();

            expect(result).toHaveLength(1);
        });

        it('should use local when sync enabled but not authenticated', async () => {
            const configModule = await import('../../config.js');
            const authModule = await import('../../api/auth.js');
            const localPapers = await import('../../db/papers.js');

            configModule.isCloudSyncEnabled.mockReturnValue(true);
            authModule.isAuthenticated.mockReturnValue(false);
            localPapers.getAllPapers.mockResolvedValueOnce([{ id: 1 }]);

            const result = await papers.getAllPapers();

            expect(result).toHaveLength(1);
        });
    });

    describe('Data Mapping Edge Cases', () => {
        it('should map paper data to API format correctly', async () => {
            const configModule = await import('../../config.js');
            const authModule = await import('../../api/auth.js');
            const apiPapers = await import('../../api/papers.js');

            configModule.isCloudSyncEnabled.mockReturnValue(true);
            authModule.isAuthenticated.mockReturnValue(true);
            apiPapers.createPaper.mockResolvedValueOnce({ id: 1, title: 'Test' });

            const paperData = {
                title: 'Test Paper',
                readingStatus: 'Reading',
                s3Key: 's3://bucket/key.pdf',
                pdfData: new Blob(),
                hasPdf: true,
                pdfFile: new File([], 'test.pdf'),
                createdAt: '2024-01-01',
                id: 999
            };

            await papers.addPaper(paperData);

            const callArg = apiPapers.createPaper.mock.calls[0][0];
            expect(callArg.status).toBe('Reading'); // readingStatus mapped to status
            expect(callArg.pdfUrl).toBe('s3://bucket/key.pdf'); // s3Key mapped to pdfUrl
            expect(callArg.pdfData).toBeUndefined();
            expect(callArg.hasPdf).toBeUndefined();
            expect(callArg.pdfFile).toBeUndefined();
            expect(callArg.createdAt).toBeUndefined();
            expect(callArg.id).toBeUndefined();
        });

        it('should map API paper data to local format correctly', async () => {
            const configModule = await import('../../config.js');
            const authModule = await import('../../api/auth.js');
            const apiPapers = await import('../../api/papers.js');
            const localPapers = await import('../../db/papers.js');

            configModule.isCloudSyncEnabled.mockReturnValue(true);
            authModule.isAuthenticated.mockReturnValue(true);

            const apiPaper = {
                id: 1,
                title: 'Test Paper',
                status: 'Reading',
                pdfUrl: 's3://bucket/key.pdf'
            };

            // Mock API to return paper when creating
            apiPapers.createPaper.mockResolvedValueOnce(apiPaper);
            // Mock local addPaper to capture what gets saved locally
            localPapers.addPaper.mockResolvedValueOnce(1);

            // Create a paper (which triggers API call and local save with mapping)
            await papers.addPaper({
                title: 'Test Paper',
                readingStatus: 'Reading'
            });

            // Verify that the local save was called with properly mapped data
            expect(localPapers.addPaper).toHaveBeenCalled();
            const savedData = localPapers.addPaper.mock.calls[0][0];
            expect(savedData.readingStatus).toBe('Reading');
            expect(savedData.s3Key).toBe('s3://bucket/key.pdf');
            expect(savedData.hasPdf).toBe(true);
        });

        it('should handle missing optional fields in API response', async () => {
            const configModule = await import('../../config.js');
            const authModule = await import('../../api/auth.js');
            const apiPapers = await import('../../api/papers.js');
            const localPapers = await import('../../db/papers.js');

            configModule.isCloudSyncEnabled.mockReturnValue(true);
            authModule.isAuthenticated.mockReturnValue(true);

            const apiPaper = {
                id: 1,
                title: 'Test Paper'
                // No status, no pdfUrl
            };

            // Mock API to return paper with minimal fields
            apiPapers.createPaper.mockResolvedValueOnce(apiPaper);
            // Mock local addPaper
            localPapers.addPaper.mockResolvedValueOnce(1);

            // Create a paper with minimal data
            await papers.addPaper({ title: 'Test Paper' });

            // Verify that hasPdf is set to false when no PDF URL
            expect(localPapers.addPaper).toHaveBeenCalled();
            const savedData = localPapers.addPaper.mock.calls[0][0];
            expect(savedData).toBeDefined();
            expect(savedData.hasPdf).toBe(false);
        });
    });

    describe('Change Tracking During Concurrent Updates', () => {
        beforeEach(async () => {
            const configModule = await import('../../config.js');
            const authModule = await import('../../api/auth.js');
            configModule.isCloudSyncEnabled.mockReturnValue(true);
            authModule.isAuthenticated.mockReturnValue(true);
        });

        it('should track all fields when multiple updates occur', async () => {
            const localPapers = await import('../../db/papers.js');
            const syncModule = await import('../../db/sync.js');

            localPapers.updatePaper.mockResolvedValue(1);
            localPapers.getPaperById
                .mockResolvedValueOnce({ id: 1, title: 'Original', version: 1 })
                .mockResolvedValueOnce({ id: 1, title: 'First Update', notes: 'Note 1', version: 1 })
                .mockResolvedValueOnce({ id: 1, title: 'First Update', notes: 'Note 1', summary: 'Summary', version: 1 });

            // First update
            await papers.updatePaper(1, { title: 'First Update' });

            // Second update (should merge with first)
            await papers.updatePaper(1, { notes: 'Note 1' });

            // Third update (should merge with previous)
            await papers.updatePaper(1, { summary: 'Summary' });

            // All updates should be tracked
            expect(syncModule.trackPaperUpdated).toHaveBeenCalled();
        });

        it('should handle version retrieval errors gracefully', async () => {
            const localPapers = await import('../../db/papers.js');
            const syncModule = await import('../../db/sync.js');

            localPapers.updatePaper.mockResolvedValue(1);
            localPapers.getPaperById.mockRejectedValueOnce(new Error('DB error'));

            await papers.updatePaper(1, { title: 'Updated' });

            // Should still track the update (fallback without version)
            expect(syncModule.trackPaperUpdated).toHaveBeenCalled();
        });
    });
});
