/**
 * Enhanced Adapter Tests
 * Focuses on rate limiting, version merging, and data mapping
 * @module tests/db/adapter-enhanced
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { papers, collections, annotations } from '../../db/adapter.js';
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
    trackPaperUpdated: vi.fn(),
    trackPaperDeleted: vi.fn()
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

            // Trigger an operation that would normally sync
            await papers.getAllPapers();

            // Should NOT trigger sync
            expect(syncManager.triggerDebouncedSync).not.toHaveBeenCalled();
        });

        it('should trigger sync if not rate limited', async () => {
            utilsModule.isRateLimited.mockReturnValue(false);

            await papers.getAllPapers();

            expect(syncManager.triggerDebouncedSync).toHaveBeenCalled();
        });
    });

    describe('Version Merging Logic (updatePaper)', () => {
        it('should include version in update tracking if available', async () => {
            const paperId = 1;
            const updateData = { title: 'New Title' };
            const existingPaper = { id: 1, title: 'Old Title', version: 5, otherField: 'keep' };

            localPapers.updatePaper.mockResolvedValue(1);
            localPapers.getPaperById.mockResolvedValue(existingPaper);

            await papers.updatePaper(paperId, updateData);

            expect(syncModule.trackPaperUpdated).toHaveBeenCalledWith(
                paperId,
                expect.objectContaining({
                    title: 'New Title',
                    version: 5,
                    otherField: 'keep'
                })
            );
        });

        it('should track without version if paper fetch fails', async () => {
            const paperId = 1;
            const updateData = { title: 'New Title' };

            localPapers.updatePaper.mockResolvedValue(1);
            localPapers.getPaperById.mockRejectedValue(new Error('Fetch failed'));

            await papers.updatePaper(paperId, updateData);

            expect(syncModule.trackPaperUpdated).toHaveBeenCalledWith(
                paperId,
                updateData
            );
        });

        it('should track without version if paper has no version', async () => {
            const paperId = 1;
            const updateData = { title: 'New Title' };
            const existingPaper = { id: 1, title: 'Old Title' }; // No version

            localPapers.updatePaper.mockResolvedValue(1);
            localPapers.getPaperById.mockResolvedValue(existingPaper);

            await papers.updatePaper(paperId, updateData);

            expect(syncModule.trackPaperUpdated).toHaveBeenCalledWith(
                paperId,
                updateData
            );
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

    describe('Delete Tracking Logic', () => {
        it('should track deletion when cloud sync is enabled', async () => {
            await papers.deletePaper(1);

            expect(localPapers.deletePaper).toHaveBeenCalledWith(1);
            expect(syncModule.trackPaperDeleted).toHaveBeenCalledWith(1);
            expect(syncManager.triggerDebouncedSync).toHaveBeenCalled();
        });

        it('should NOT track deletion when cloud sync is disabled', async () => {
            configModule.isCloudSyncEnabled.mockReturnValue(false);

            await papers.deletePaper(1);

            expect(localPapers.deletePaper).toHaveBeenCalledWith(1);
            expect(syncModule.trackPaperDeleted).not.toHaveBeenCalled();
            expect(syncManager.triggerDebouncedSync).not.toHaveBeenCalled();
        });
    });
});
