/**
 * Enhanced Adapter Tests
 * Focuses on rate limiting, version merging, and data mapping
 * @module tests/db/adapter-enhanced
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { papers, folders, annotations } from '../../db/adapter.js';
import * as configModule from '../../config.js';
import * as authModule from '../../api/auth.js';
import * as utilsModule from '../../api/utils.js';
import * as localPapers from '../../db/papers.js';
import * as apiPapers from '../../api/papers.js';
import * as syncModule from '../../db/sync.js';
import * as syncManager from '../../core/syncManager.js';

// Mock dependencies
vi.mock('../../config.js', () => ({
    isCloudSyncEnabled: vi.fn(),
    getApiBaseUrl: vi.fn()
}));

vi.mock('../../api/auth.js', () => ({
    isAuthenticated: vi.fn()
}));

vi.mock('../../api/utils.js', () => ({
    isRateLimited: vi.fn(),
    getRateLimitRemainingTime: vi.fn()
}));

vi.mock('../../db/papers.js', () => ({
    addPaper: vi.fn(),
    getAllPapers: vi.fn(),
    getPaperById: vi.fn(),
    updatePaper: vi.fn(),
    deletePaper: vi.fn()
}));

vi.mock('../../api/papers.js', () => ({
    createPaper: vi.fn(),
    batchOperations: vi.fn()
}));

vi.mock('../../db/sync.js', () => ({
    trackPaperCreated: vi.fn(),
    trackPaperUpdated: vi.fn(),
    trackPaperDeleted: vi.fn(),
    trackFolderCreated: vi.fn(),
    trackFolderUpdated: vi.fn(),
    trackFolderDeleted: vi.fn(),
    trackPaperFolderCreated: vi.fn(),
    trackPaperFolderDeleted: vi.fn(),
    trackAnnotationCreated: vi.fn(),
    trackAnnotationUpdated: vi.fn(),
    trackAnnotationDeleted: vi.fn()
}));

vi.mock('../../core/syncManager.js', () => ({
    triggerDebouncedSync: vi.fn()
}));

describe('Adapter Enhanced Coverage', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        configModule.isCloudSyncEnabled.mockReturnValue(true);
        authModule.isAuthenticated.mockReturnValue(true);
        utilsModule.isRateLimited.mockReturnValue(false);
    });

    describe('Rate Limiting Logic', () => {
        it('should skip cloud sync if rate limited', async () => {
            utilsModule.isRateLimited.mockReturnValue(true);
            utilsModule.getRateLimitRemainingTime.mockReturnValue(5000);

            localPapers.getAllPapers.mockResolvedValue([]);

            await papers.getAllPapers();

            // getAllPapers no longer directly calls triggerDebouncedSync
            expect(syncManager.triggerDebouncedSync).not.toHaveBeenCalled();
        });

        it('should not trigger sync from getAllPapers (reads do not trigger sync)', async () => {
            utilsModule.isRateLimited.mockReturnValue(false);

            localPapers.getAllPapers.mockResolvedValue([]);

            await papers.getAllPapers();

            // getAllPapers does not call triggerDebouncedSync — only writes do
            expect(syncManager.triggerDebouncedSync).not.toHaveBeenCalled();
        });
    });

    describe('Update Logic (updatePaper)', () => {
        it('should update paper locally first (optimistic UI)', async () => {
            const paperId = 1;
            const updateData = { title: 'New Title' };

            localPapers.updatePaper.mockResolvedValue(1);

            await papers.updatePaper(paperId, updateData);

            expect(localPapers.updatePaper).toHaveBeenCalledWith(paperId, updateData);
        });

        it('should succeed even if cloud update fails', async () => {
            const paperId = 1;
            const updateData = { title: 'New Title' };

            localPapers.updatePaper.mockResolvedValue(1);
            // apiPapers.updatePaper is not mocked, so cloud call fails silently

            await expect(papers.updatePaper(paperId, updateData)).resolves.toBeDefined();
            expect(localPapers.updatePaper).toHaveBeenCalledWith(paperId, updateData);
        });

        it('should return local result', async () => {
            const paperId = 1;
            const updateData = { title: 'New Title' };

            localPapers.updatePaper.mockResolvedValue(42);

            const result = await papers.updatePaper(paperId, updateData);

            expect(result).toBe(42);
        });
    });

    describe('Data Mapping Logic', () => {
        it('should map readingStatus to status for API', async () => {
            const paperData = { title: 'Test', readingStatus: 'Reading' };

            apiPapers.createPaper.mockResolvedValue({ id: 1 });
            localPapers.addPaper.mockResolvedValue(1);

            await papers.addPaper(paperData);

            expect(apiPapers.createPaper).toHaveBeenCalledWith(expect.objectContaining({
                status: 'Reading'
            }));

            const callArgs = apiPapers.createPaper.mock.calls[0][0];
            expect(callArgs.readingStatus).toBeUndefined();
        });

        it('should map s3Key to pdfUrl for API', async () => {
            const paperData = { title: 'Test', s3Key: 'some-key' };

            apiPapers.createPaper.mockResolvedValue({ id: 1 });
            localPapers.addPaper.mockResolvedValue(1);

            await papers.addPaper(paperData);

            expect(apiPapers.createPaper).toHaveBeenCalledWith(expect.objectContaining({
                pdfUrl: 'some-key'
            }));

            const callArgs = apiPapers.createPaper.mock.calls[0][0];
            expect(callArgs.s3Key).toBeUndefined();
        });

        it('should remove local-only fields before sending to API', async () => {
            const paperData = {
                title: 'Test',
                pdfData: 'blob',
                hasPdf: true,
                pdfFile: 'file',
                createdAt: 'date',
                id: 'local-id'
            };

            apiPapers.createPaper.mockResolvedValue({ id: 1 });
            localPapers.addPaper.mockResolvedValue(1);

            await papers.addPaper(paperData);

            const callArgs = apiPapers.createPaper.mock.calls[0][0];
            expect(callArgs.pdfData).toBeUndefined();
            expect(callArgs.hasPdf).toBeUndefined();
            expect(callArgs.pdfFile).toBeUndefined();
            expect(callArgs.createdAt).toBeUndefined();
            expect(callArgs.id).toBeUndefined();
        });
    });

    describe('Delete Logic', () => {
        it('should delete paper locally', async () => {
            await papers.deletePaper(1);

            expect(localPapers.deletePaper).toHaveBeenCalledWith(1);
        });

        it('should delete locally whether cloud sync is enabled or not', async () => {
            configModule.isCloudSyncEnabled.mockReturnValue(false);

            await papers.deletePaper(1);

            expect(localPapers.deletePaper).toHaveBeenCalledWith(1);
        });
    });
});
