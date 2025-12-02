/**
 * Final Coverage Tests for Adapter Module
 * Covers remaining utility functions and search logic
 * @module tests/db/adapter-final
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { papers, annotations } from '../../db/adapter.js';
import * as configModule from '../../config.js';
import * as authModule from '../../api/auth.js';
import * as localPapers from '../../db/papers.js';
import * as apiPapers from '../../api/papers.js';
import * as localAnnotations from '../../db/annotations.js';

// Mock dependencies
vi.mock('../../config.js', () => ({
    isCloudSyncEnabled: vi.fn(),
    getApiBaseUrl: vi.fn()
}));

vi.mock('../../api/auth.js', () => ({
    isAuthenticated: vi.fn()
}));

vi.mock('../../db/papers.js', () => ({
    getAllPapers: vi.fn(),
    addPaper: vi.fn(), // Needed for internal imports
    updatePaper: vi.fn(),
    deletePaper: vi.fn()
}));

vi.mock('../../api/papers.js', () => ({
    getUploadUrl: vi.fn(),
    uploadPdf: vi.fn(),
    getPdfDownloadUrl: vi.fn(),
    createPaper: vi.fn(),
    batchOperations: vi.fn()
}));

vi.mock('../../db/annotations.js', () => ({
    deleteAnnotationsByPaperId: vi.fn(),
    addAnnotation: vi.fn(),
    updateAnnotation: vi.fn(),
    deleteAnnotation: vi.fn()
}));

vi.mock('../../db/sync.js', () => ({
    trackPaperCreated: vi.fn(),
    trackPaperUpdated: vi.fn(),
    trackPaperDeleted: vi.fn(),
    trackAnnotationCreated: vi.fn(),
    trackAnnotationUpdated: vi.fn(),
    trackAnnotationDeleted: vi.fn()
}));

vi.mock('../../core/syncManager.js', () => ({
    triggerDebouncedSync: vi.fn()
}));

vi.mock('../../api/utils.js', () => ({
    isRateLimited: vi.fn().mockReturnValue(false),
    getRateLimitRemainingTime: vi.fn().mockReturnValue(0)
}));

describe('Adapter Final Coverage', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        configModule.isCloudSyncEnabled.mockReturnValue(true);
        authModule.isAuthenticated.mockReturnValue(true);
    });

    describe('Search Papers', () => {
        it('should filter papers by title (case insensitive)', async () => {
            localPapers.getAllPapers.mockResolvedValue([
                { title: 'Machine Learning' },
                { title: 'Deep Learning' },
                { title: 'History' }
            ]);

            const results = await papers.searchPapers('learning');
            expect(results).toHaveLength(2);
            expect(results[0].title).toBe('Machine Learning');
            expect(results[1].title).toBe('Deep Learning');
        });

        it('should filter papers by author', async () => {
            localPapers.getAllPapers.mockResolvedValue([
                { title: 'P1', authors: ['Alice', 'Bob'] },
                { title: 'P2', authors: ['Charlie'] }
            ]);

            const results = await papers.searchPapers('alice');
            expect(results).toHaveLength(1);
            expect(results[0].title).toBe('P1');
        });

        it('should filter papers by notes', async () => {
            localPapers.getAllPapers.mockResolvedValue([
                { title: 'P1', notes: 'Important paper' },
                { title: 'P2', notes: 'Just a draft' }
            ]);

            const results = await papers.searchPapers('important');
            expect(results).toHaveLength(1);
            expect(results[0].title).toBe('P1');
        });

        it('should handle missing fields gracefully', async () => {
            localPapers.getAllPapers.mockResolvedValue([
                { title: 'P1' } // No authors or notes
            ]);

            const results = await papers.searchPapers('something');
            expect(results).toHaveLength(0);
        });
    });

    describe('PDF Utilities', () => {
        it('should call API for getUploadUrl when sync enabled', async () => {
            apiPapers.getUploadUrl.mockResolvedValue({ uploadUrl: 'url' });
            const result = await papers.getUploadUrl({ filename: 'test.pdf' });
            expect(result).toEqual({ uploadUrl: 'url' });
            expect(apiPapers.getUploadUrl).toHaveBeenCalled();
        });

        it('should throw for getUploadUrl when sync disabled', async () => {
            configModule.isCloudSyncEnabled.mockReturnValue(false);
            await expect(papers.getUploadUrl({})).rejects.toThrow('Cloud sync required');
        });

        it('should call API for uploadPdf when sync enabled', async () => {
            apiPapers.uploadPdf.mockResolvedValue();
            await papers.uploadPdf('url', 'file');
            expect(apiPapers.uploadPdf).toHaveBeenCalledWith('url', 'file');
        });

        it('should throw for uploadPdf when sync disabled', async () => {
            configModule.isCloudSyncEnabled.mockReturnValue(false);
            await expect(papers.uploadPdf('url', 'file')).rejects.toThrow('Cloud sync required');
        });

        it('should call API for getPdfDownloadUrl when sync enabled', async () => {
            apiPapers.getPdfDownloadUrl.mockResolvedValue('url');
            const result = await papers.getPdfDownloadUrl(1);
            expect(result).toBe('url');
        });

        it('should throw for getPdfDownloadUrl when sync disabled', async () => {
            configModule.isCloudSyncEnabled.mockReturnValue(false);
            await expect(papers.getPdfDownloadUrl(1)).rejects.toThrow('Cloud sync required');
        });

        it('should handle API errors in PDF utils', async () => {
            apiPapers.getUploadUrl.mockRejectedValue(new Error('API Error'));
            await expect(papers.getUploadUrl({})).rejects.toThrow('Cloud sync required'); // Wrapped error

            apiPapers.uploadPdf.mockRejectedValue(new Error('API Error'));
            await expect(papers.uploadPdf('url', 'file')).rejects.toThrow('Failed to upload PDF');

            apiPapers.getPdfDownloadUrl.mockRejectedValue(new Error('API Error'));
            await expect(papers.getPdfDownloadUrl(1)).rejects.toThrow('Cloud sync required');
        });
    });

    describe('Annotation Bulk Delete', () => {
        it('should call local deleteAnnotationsByPaperId', async () => {
            localAnnotations.deleteAnnotationsByPaperId.mockResolvedValue();
            await annotations.deleteAnnotationsByPaperId(1);
            expect(localAnnotations.deleteAnnotationsByPaperId).toHaveBeenCalledWith(1);
        });
    });
});
