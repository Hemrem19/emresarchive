/**
 * Edge Case Tests for Adapter Module
 * Targets specific uncovered branches in data mapping and error handling
 * @module tests/db/adapter-edge-cases
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { papers } from '../../db/adapter.js';
import * as configModule from '../../config.js';
import * as authModule from '../../api/auth.js';
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

vi.mock('../../db/papers.js', () => ({
    addPaper: vi.fn(),
    updatePaper: vi.fn(),
    deletePaper: vi.fn(),
    getAllPapers: vi.fn(),
    getPaperById: vi.fn()
}));

vi.mock('../../api/papers.js', () => ({
    createPaper: vi.fn(),
    batchOperations: vi.fn(),
    getUploadUrl: vi.fn(),
    uploadPdf: vi.fn()
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
    isRateLimited: vi.fn().mockReturnValue(false),
    getRateLimitRemainingTime: vi.fn().mockReturnValue(0)
}));

describe('Adapter Edge Cases', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        configModule.isCloudSyncEnabled.mockReturnValue(true);
        authModule.isAuthenticated.mockReturnValue(true);
    });

    describe('Data Mapping (via addPaper)', () => {
        it('should correctly map readingStatus to status and s3Key to pdfUrl', async () => {
            const paperData = {
                title: 'Mapping Test',
                readingStatus: 'in_progress',
                s3Key: 'test-key.pdf',
                extraField: 'should-stay'
            };

            apiPapers.createPaper.mockResolvedValue({ id: 'cloud-1' });
            localPapers.addPaper.mockResolvedValue(1);

            await papers.addPaper(paperData);

            // Verify API was called with mapped fields
            expect(apiPapers.createPaper).toHaveBeenCalledWith(expect.objectContaining({
                title: 'Mapping Test',
                status: 'in_progress', // Mapped from readingStatus
                pdfUrl: 'test-key.pdf', // Mapped from s3Key
                extraField: 'should-stay'
            }));

            // Verify original fields were removed from API call
            const apiCall = apiPapers.createPaper.mock.calls[0][0];
            expect(apiCall.readingStatus).toBeUndefined();
            expect(apiCall.s3Key).toBeUndefined();
        });

        it('should strip local-only fields before sending to API', async () => {
            const paperData = {
                title: 'Strip Test',
                pdfData: new File([], 'test.pdf'),
                hasPdf: true,
                pdfFile: 'some-file',
                createdAt: '2023-01-01',
                id: 123
            };

            apiPapers.createPaper.mockResolvedValue({ id: 'cloud-1' });
            localPapers.addPaper.mockResolvedValue(1);

            await papers.addPaper(paperData);

            const apiCall = apiPapers.createPaper.mock.calls[0][0];
            expect(apiCall.pdfData).toBeUndefined();
            expect(apiCall.hasPdf).toBeUndefined();
            expect(apiCall.pdfFile).toBeUndefined();
            expect(apiCall.createdAt).toBeUndefined();
            expect(apiCall.id).toBeUndefined();
        });
    });

    describe('Update Version Handling', () => {
        it('should include version in trackPaperUpdated if available', async () => {
            const id = 1;
            const updateData = { title: 'Updated' };
            const existingPaper = { id: 1, title: 'Old', version: 5 };

            localPapers.updatePaper.mockResolvedValue(1);
            localPapers.getPaperById.mockResolvedValue(existingPaper);

            await papers.updatePaper(id, updateData);

            expect(syncModule.trackPaperUpdated).toHaveBeenCalledWith(
                id,
                expect.objectContaining({
                    title: 'Updated',
                    version: 5
                })
            );
        });

        it('should track without version if getPaperById fails', async () => {
            const id = 1;
            const updateData = { title: 'Updated' };

            localPapers.updatePaper.mockResolvedValue(1);
            localPapers.getPaperById.mockRejectedValue(new Error('DB Error'));

            await papers.updatePaper(id, updateData);

            expect(syncModule.trackPaperUpdated).toHaveBeenCalledWith(
                id,
                updateData // No version
            );
        });
    });

    describe('Batch Operations Edge Cases', () => {
        it('should handle local update failure after cloud success', async () => {
            const ops = [{ type: 'update', id: 1, data: { title: 'New' } }];

            // Cloud success
            apiPapers.batchOperations.mockResolvedValue([
                { id: 1, success: true, type: 'update', data: { id: 1, title: 'New' } }
            ]);

            // Local failure
            localPapers.updatePaper.mockRejectedValue(new Error('Local DB Error'));

            const results = await papers.batchOperations(ops);

            expect(results[0].success).toBe(true); // Cloud succeeded
            expect(results[0].localError).toBe('Local DB Error');
        });

        it('should fallback to original operation data if cloud returns no data', async () => {
            const ops = [{ type: 'update', id: 1, data: { title: 'Fallback Data' } }];

            // Cloud success but no data returned (e.g. 204 No Content equivalent)
            apiPapers.batchOperations.mockResolvedValue([
                { id: 1, success: true, type: 'update' } // No 'data' field
            ]);

            localPapers.updatePaper.mockResolvedValue(1);

            await papers.batchOperations(ops);

            expect(localPapers.updatePaper).toHaveBeenCalledWith(1, { title: 'Fallback Data' });
        });

        it('should handle local delete failure after cloud success', async () => {
            const ops = [{ type: 'delete', id: 1 }];

            // Cloud success
            apiPapers.batchOperations.mockResolvedValue([
                { id: 1, success: true, type: 'delete' }
            ]);

            // Local failure
            localPapers.deletePaper.mockRejectedValue(new Error('Local DB Error'));

            const results = await papers.batchOperations(ops);

            // Delete errors are intentionally swallowed in the adapter (line 277)
            // so we expect success without localError
            expect(results[0].success).toBe(true);
            expect(results[0].localError).toBeUndefined();
        });
    });
});
