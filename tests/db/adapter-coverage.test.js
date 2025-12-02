/**
 * Adapter Coverage Tests
 * Targeted tests for db/adapter.js to reach high coverage
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { papers, collections, annotations } from '../../db/adapter.js';
import { resetAllMocks } from '../helpers.js';

// Mock dependencies
vi.mock('../../config.js', () => ({
    isCloudSyncEnabled: vi.fn(() => true),
    getApiBaseUrl: vi.fn(() => 'https://api.example.com')
}));

vi.mock('../../api/auth.js', () => ({
    isAuthenticated: vi.fn(() => true)
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
    batchOperations: vi.fn(() => Promise.resolve([])),
    getUploadUrl: vi.fn(),
    uploadPdf: vi.fn(),
    getPdfDownloadUrl: vi.fn()
}));

vi.mock('../../db/collections.js', () => ({
    addCollection: vi.fn(),
    getAllCollections: vi.fn(() => Promise.resolve([])),
    getCollectionById: vi.fn(),
    updateCollection: vi.fn(),
    deleteCollection: vi.fn()
}));

vi.mock('../../api/collections.js', () => ({
    createCollection: vi.fn(),
    getAllCollections: vi.fn(() => Promise.resolve({ collections: [] })),
    getCollection: vi.fn(),
    updateCollection: vi.fn(),
    deleteCollection: vi.fn()
}));

vi.mock('../../db/annotations.js', () => ({
    addAnnotation: vi.fn(),
    getAnnotationsByPaperId: vi.fn(() => Promise.resolve([])),
    getAnnotationById: vi.fn(),
    updateAnnotation: vi.fn(),
    deleteAnnotation: vi.fn(),
    deleteAnnotationsByPaperId: vi.fn()
}));

vi.mock('../../api/annotations.js', () => ({
    createAnnotation: vi.fn(),
    getAnnotations: vi.fn(() => Promise.resolve([])),
    getAnnotation: vi.fn(),
    updateAnnotation: vi.fn(),
    deleteAnnotation: vi.fn()
}));

vi.mock('../../db/sync.js', () => ({
    trackPaperCreated: vi.fn(),
    trackPaperUpdated: vi.fn(),
    trackPaperDeleted: vi.fn(),
    trackCollectionCreated: vi.fn(),
    trackCollectionUpdated: vi.fn(),
    trackCollectionDeleted: vi.fn(),
    trackAnnotationCreated: vi.fn(),
    trackAnnotationUpdated: vi.fn(),
    trackAnnotationDeleted: vi.fn()
}));

vi.mock('../../core/syncManager.js', () => ({
    triggerDebouncedSync: vi.fn()
}));

vi.mock('../../api/utils.js', () => ({
    isRateLimited: vi.fn(() => false),
    getRateLimitRemainingTime: vi.fn(() => 0)
}));

describe('DB Adapter Coverage', () => {
    beforeEach(async () => {
        resetAllMocks();
        vi.clearAllMocks();

        // Re-establish default mock values that might be cleared
        const configModule = await import('../../config.js');
        const authModule = await import('../../api/auth.js');

        configModule.isCloudSyncEnabled.mockReturnValue(true);
        authModule.isAuthenticated.mockReturnValue(true);
    });

    describe('PDF Upload Logic', () => {
        it('should handle PDF upload during addPaper', async () => {
            const apiPapers = await import('../../api/papers.js');
            const localPapers = await import('../../db/papers.js');

            // Mock file
            const file = new File(['test'], 'test.pdf', { type: 'application/pdf' });

            // Mock API responses
            apiPapers.getUploadUrl.mockResolvedValue({ uploadUrl: 'http://upload', s3Key: 'key' });
            apiPapers.uploadPdf.mockResolvedValue();
            apiPapers.createPaper.mockResolvedValue({ id: 1, title: 'Test', pdfUrl: 'key' });
            localPapers.addPaper.mockResolvedValue(1);

            const paperData = {
                title: 'Test',
                pdfData: file
            };

            await papers.addPaper(paperData);

            expect(apiPapers.getUploadUrl).toHaveBeenCalled();
            expect(apiPapers.uploadPdf).toHaveBeenCalled();
            expect(apiPapers.createPaper).toHaveBeenCalledWith(expect.objectContaining({
                pdfUrl: 'key'
            }));
        });

        it('should fallback when PDF upload fails', async () => {
            const apiPapers = await import('../../api/papers.js');
            const localPapers = await import('../../db/papers.js');

            const file = new File(['test'], 'test.pdf', { type: 'application/pdf' });

            // Mock upload failure
            apiPapers.getUploadUrl.mockRejectedValue(new Error('Upload failed'));
            apiPapers.createPaper.mockResolvedValue({ id: 1, title: 'Test' });
            localPapers.addPaper.mockResolvedValue(1);

            const paperData = {
                title: 'Test',
                pdfData: file
            };

            await papers.addPaper(paperData);

            // Should still create paper but without PDF
            expect(apiPapers.createPaper).toHaveBeenCalled();
            const createCall = apiPapers.createPaper.mock.calls[0][0];
            expect(createCall.pdfUrl).toBeUndefined();
        });
    });

    describe('Batch Operations Partial Failures', () => {
        it('should handle partial success in batch operations', async () => {
            const apiPapers = await import('../../api/papers.js');
            const localPapers = await import('../../db/papers.js');

            const operations = [
                { type: 'delete', id: 1 },
                { type: 'delete', id: 2 }
            ];

            // Mock API returning mixed results
            apiPapers.batchOperations.mockResolvedValue([
                { id: 1, success: true, type: 'delete' },
                { id: 2, success: false, error: 'Failed' }
            ]);

            localPapers.deletePaper.mockResolvedValue();

            const result = await papers.batchOperations(operations);

            expect(result).toHaveLength(2);
            expect(localPapers.deletePaper).toHaveBeenCalledWith(1);
            expect(localPapers.deletePaper).not.toHaveBeenCalledWith(2);
        });

        it('should handle local update failure after cloud success', async () => {
            const apiPapers = await import('../../api/papers.js');
            const localPapers = await import('../../db/papers.js');

            const operations = [{ type: 'update', id: 1, data: { title: 'New' } }];

            apiPapers.batchOperations.mockResolvedValue([
                { id: 1, success: true, type: 'update', data: { id: 1, title: 'New' } }
            ]);

            // Mock local failure
            localPapers.updatePaper.mockRejectedValue(new Error('Local DB error'));

            const result = await papers.batchOperations(operations);

            expect(result[0].localError).toBe('Local DB error');
        });

        it('should handle update type in batch operations', async () => {
            const apiPapers = await import('../../api/papers.js');
            const localPapers = await import('../../db/papers.js');

            const operations = [{ type: 'update', id: 1, data: { title: 'New' } }];

            apiPapers.batchOperations.mockResolvedValue([
                { id: 1, success: true, type: 'update', data: { id: 1, title: 'New' } }
            ]);

            localPapers.updatePaper.mockResolvedValue();

            await papers.batchOperations(operations);

            expect(localPapers.updatePaper).toHaveBeenCalled();
        });

        it('should fallback to original data if API returns no data on update', async () => {
            const apiPapers = await import('../../api/papers.js');
            const localPapers = await import('../../db/papers.js');

            const operations = [{ type: 'update', id: 1, data: { title: 'New' } }];

            apiPapers.batchOperations.mockResolvedValue([
                { id: 1, success: true, type: 'update' } // No data returned
            ]);

            localPapers.updatePaper.mockResolvedValue();

            await papers.batchOperations(operations);

            expect(localPapers.updatePaper).toHaveBeenCalledWith(1, { title: 'New' });
        });
    });

    describe('Search Papers', () => {
        it('should filter papers locally', async () => {
            const localPapers = await import('../../db/papers.js');

            localPapers.getAllPapers.mockResolvedValue([
                { title: 'Machine Learning', authors: ['Alice'] },
                { title: 'History of Art', authors: ['Bob'] },
                { title: 'AI Ethics', authors: ['Charlie'], notes: 'Important' }
            ]);

            const results = await papers.searchPapers('learning');
            expect(results).toHaveLength(1);
            expect(results[0].title).toBe('Machine Learning');

            const authorResults = await papers.searchPapers('bob');
            expect(authorResults).toHaveLength(1);
            expect(authorResults[0].authors).toContain('Bob');

            const noteResults = await papers.searchPapers('important');
            expect(noteResults).toHaveLength(1);
        });
    });

    describe('API Utilities Error Handling', () => {
        it('should throw error if cloud sync disabled/unauth for PDF ops', async () => {
            const configModule = await import('../../config.js');
            configModule.isCloudSyncEnabled.mockReturnValue(false);

            await expect(papers.getUploadUrl({})).rejects.toThrow('Cloud sync required');
            await expect(papers.uploadPdf('url', {})).rejects.toThrow('Cloud sync required');
            await expect(papers.getPdfDownloadUrl(1)).rejects.toThrow('Cloud sync required');
        });

        it('should handle API errors in PDF ops', async () => {
            const apiPapers = await import('../../api/papers.js');

            apiPapers.getUploadUrl.mockRejectedValue(new Error('API Error'));
            apiPapers.uploadPdf.mockRejectedValue(new Error('API Error'));
            apiPapers.getPdfDownloadUrl.mockRejectedValue(new Error('API Error'));

            await expect(papers.getUploadUrl({})).rejects.toThrow('Cloud sync required'); // Wrapper throws generic
            await expect(papers.uploadPdf('url', {})).rejects.toThrow('Failed to upload PDF');
            await expect(papers.getPdfDownloadUrl(1)).rejects.toThrow('Cloud sync required');
        });
    });

    describe('Collections Adapter Coverage', () => {
        it('should handle local save error during addCollection', async () => {
            const apiCollections = await import('../../api/collections.js');
            const localCollections = await import('../../db/collections.js');

            apiCollections.createCollection.mockResolvedValue({ id: 1, name: 'Test' });
            localCollections.addCollection.mockRejectedValue(new Error('Local Error'));

            // Should not throw, just log error
            await collections.addCollection({ name: 'Test' });

            expect(apiCollections.createCollection).toHaveBeenCalled();
        });

        it('should handle local update error during updateCollection', async () => {
            const apiCollections = await import('../../api/collections.js');
            const localCollections = await import('../../db/collections.js');

            apiCollections.updateCollection.mockResolvedValue({ id: 1, name: 'Updated' });
            localCollections.updateCollection.mockRejectedValue(new Error('Local Error'));

            await collections.updateCollection(1, { name: 'Updated' });

            expect(apiCollections.updateCollection).toHaveBeenCalled();
        });

        it('should handle local delete error during deleteCollection', async () => {
            const apiCollections = await import('../../api/collections.js');
            const localCollections = await import('../../db/collections.js');

            apiCollections.deleteCollection.mockResolvedValue();
            localCollections.deleteCollection.mockRejectedValue(new Error('Local Error'));

            await collections.deleteCollection(1);

            expect(apiCollections.deleteCollection).toHaveBeenCalled();
        });
    });

    describe('Annotations Adapter Coverage', () => {
        it('should handle local save error during addAnnotation', async () => {
            const apiAnnotations = await import('../../api/annotations.js');
            const localAnnotations = await import('../../db/annotations.js');

            apiAnnotations.createAnnotation.mockResolvedValue({ id: 1 });
            localAnnotations.addAnnotation.mockRejectedValue(new Error('Local Error'));

            await annotations.addAnnotation({ paperId: 1 });

            expect(apiAnnotations.createAnnotation).toHaveBeenCalled();
        });

        it('should handle local update error during updateAnnotation', async () => {
            const apiAnnotations = await import('../../api/annotations.js');
            const localAnnotations = await import('../../db/annotations.js');

            apiAnnotations.updateAnnotation.mockResolvedValue({ id: 1 });
            localAnnotations.updateAnnotation.mockRejectedValue(new Error('Local Error'));

            await annotations.updateAnnotation(1, {});

            expect(apiAnnotations.updateAnnotation).toHaveBeenCalled();
        });

        it('should handle local delete error during deleteAnnotation', async () => {
            const apiAnnotations = await import('../../api/annotations.js');
            const localAnnotations = await import('../../db/annotations.js');

            apiAnnotations.deleteAnnotation.mockResolvedValue();
            localAnnotations.deleteAnnotation.mockRejectedValue(new Error('Local Error'));

            await annotations.deleteAnnotation(1);

            expect(apiAnnotations.deleteAnnotation).toHaveBeenCalled();
        });
    });
});
