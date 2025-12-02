/**
 * Full Coverage Tests for Adapter Module
 * Focuses on cloud failure fallbacks and complex batch operations
 * @module tests/db/adapter-full
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { papers, collections, annotations } from '../../db/adapter.js';
import * as configModule from '../../config.js';
import * as authModule from '../../api/auth.js';
import * as localPapers from '../../db/papers.js';
import * as apiPapers from '../../api/papers.js';
import * as localCollections from '../../db/collections.js';
import * as apiCollections from '../../api/collections.js';
import * as localAnnotations from '../../db/annotations.js';
import * as apiAnnotations from '../../api/annotations.js';
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
    getAllPapers: vi.fn()
}));

vi.mock('../../api/papers.js', () => ({
    createPaper: vi.fn(),
    batchOperations: vi.fn(),
    getUploadUrl: vi.fn(),
    uploadPdf: vi.fn()
}));

vi.mock('../../db/collections.js', () => ({
    addCollection: vi.fn(),
    updateCollection: vi.fn(),
    deleteCollection: vi.fn(),
    getAllCollections: vi.fn()
}));

vi.mock('../../api/collections.js', () => ({
    createCollection: vi.fn(),
    updateCollection: vi.fn(),
    deleteCollection: vi.fn()
}));

vi.mock('../../db/annotations.js', () => ({
    addAnnotation: vi.fn(),
    updateAnnotation: vi.fn(),
    deleteAnnotation: vi.fn(),
    deleteAnnotationsByPaperId: vi.fn()
}));

vi.mock('../../api/annotations.js', () => ({
    createAnnotation: vi.fn(),
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
    isRateLimited: vi.fn().mockReturnValue(false),
    getRateLimitRemainingTime: vi.fn().mockReturnValue(0)
}));

describe('Adapter Full Coverage', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        configModule.isCloudSyncEnabled.mockReturnValue(true);
        authModule.isAuthenticated.mockReturnValue(true);
    });

    describe('Paper Cloud Fallbacks', () => {
        it('should fallback to local add and track creation when cloud fails', async () => {
            const paperData = { title: 'Test Paper' };
            const localId = 123;

            // Mock cloud failure
            apiPapers.createPaper.mockRejectedValue(new Error('Network Error'));
            // Mock local success
            localPapers.addPaper.mockResolvedValue(localId);

            const result = await papers.addPaper(paperData);

            expect(result).toBe(localId);
            expect(localPapers.addPaper).toHaveBeenCalledWith(paperData);
            expect(syncModule.trackPaperCreated).toHaveBeenCalledWith({ ...paperData, localId });
            expect(syncManager.triggerDebouncedSync).toHaveBeenCalled();
        });

        it('should handle PDF upload failure but still create paper locally', async () => {
            const file = new File(['test'], 'test.pdf', { type: 'application/pdf' });
            const paperData = { title: 'Test Paper', pdfData: file };
            const localId = 123;

            // Mock upload failure
            apiPapers.getUploadUrl.mockRejectedValue(new Error('Upload Error'));

            // Mock cloud create failure (cascading or separate)
            apiPapers.createPaper.mockRejectedValue(new Error('Network Error'));

            localPapers.addPaper.mockResolvedValue(localId);

            const result = await papers.addPaper(paperData);

            expect(result).toBe(localId);
            // The code falls back to the original paperData when the outer try/catch catches the error
            // This means the PDF file IS preserved locally, which is actually good for offline support
            expect(localPapers.addPaper).toHaveBeenCalledWith(paperData);
            expect(syncModule.trackPaperCreated).toHaveBeenCalled();
        });
    });

    describe('Collection Cloud Fallbacks', () => {
        it('should fallback to local add and track when cloud fails', async () => {
            const collectionData = { name: 'Test Col' };
            const localId = 10;

            apiCollections.createCollection.mockRejectedValue(new Error('API Error'));
            localCollections.addCollection.mockResolvedValue(localId);

            const result = await collections.addCollection(collectionData);

            expect(result).toBe(localId);
            expect(syncModule.trackCollectionCreated).toHaveBeenCalledWith({ ...collectionData, localId });
            expect(syncManager.triggerDebouncedSync).toHaveBeenCalled();
        });

        it('should fallback to local update and track when cloud fails', async () => {
            const id = 10;
            const updateData = { name: 'Updated' };

            apiCollections.updateCollection.mockRejectedValue(new Error('API Error'));
            localCollections.updateCollection.mockResolvedValue(id);

            const result = await collections.updateCollection(id, updateData);

            expect(result).toBe(id);
            expect(syncModule.trackCollectionUpdated).toHaveBeenCalledWith(id, updateData);
            expect(syncManager.triggerDebouncedSync).toHaveBeenCalled();
        });

        it('should fallback to local delete and track when cloud fails', async () => {
            const id = 10;

            apiCollections.deleteCollection.mockRejectedValue(new Error('API Error'));
            localCollections.deleteCollection.mockResolvedValue();

            await collections.deleteCollection(id);

            expect(localCollections.deleteCollection).toHaveBeenCalledWith(id);
            expect(syncModule.trackCollectionDeleted).toHaveBeenCalledWith(id);
            expect(syncManager.triggerDebouncedSync).toHaveBeenCalled();
        });
    });

    describe('Annotation Cloud Fallbacks', () => {
        it('should fallback to local add and track when cloud fails', async () => {
            const data = { paperId: 1, content: 'Note' };
            const localId = 20;

            apiAnnotations.createAnnotation.mockRejectedValue(new Error('API Error'));
            localAnnotations.addAnnotation.mockResolvedValue(localId);

            const result = await annotations.addAnnotation(data);

            expect(result).toBe(localId);
            expect(syncModule.trackAnnotationCreated).toHaveBeenCalledWith({ ...data, localId });
            expect(syncManager.triggerDebouncedSync).toHaveBeenCalled();
        });

        it('should fallback to local update and track when cloud fails', async () => {
            const id = 20;
            const data = { content: 'Updated' };

            apiAnnotations.updateAnnotation.mockRejectedValue(new Error('API Error'));
            localAnnotations.updateAnnotation.mockResolvedValue(id);

            const result = await annotations.updateAnnotation(id, data);

            expect(result).toBe(id);
            expect(syncModule.trackAnnotationUpdated).toHaveBeenCalledWith(id, data);
            expect(syncManager.triggerDebouncedSync).toHaveBeenCalled();
        });

        it('should fallback to local delete and track when cloud fails', async () => {
            const id = 20;

            apiAnnotations.deleteAnnotation.mockRejectedValue(new Error('API Error'));
            localAnnotations.deleteAnnotation.mockResolvedValue();

            await annotations.deleteAnnotation(id);

            expect(localAnnotations.deleteAnnotation).toHaveBeenCalledWith(id);
            expect(syncModule.trackAnnotationDeleted).toHaveBeenCalledWith(id);
            expect(syncManager.triggerDebouncedSync).toHaveBeenCalled();
        });
    });

    describe('Batch Operations Fallbacks', () => {
        it('should fallback to local batch execution when cloud batch fails', async () => {
            const ops = [
                { type: 'delete', id: 1 },
                { type: 'update', id: 2, data: { title: 'New' } }
            ];

            apiPapers.batchOperations.mockRejectedValue(new Error('API Error'));

            localPapers.deletePaper.mockResolvedValue();
            localPapers.updatePaper.mockResolvedValue();

            const result = await papers.batchOperations(ops);

            // Should have executed locally
            expect(localPapers.deletePaper).toHaveBeenCalledWith(1);
            expect(localPapers.updatePaper).toHaveBeenCalledWith(2, { title: 'New' });

            // Should have tracked changes
            expect(syncModule.trackPaperDeleted).toHaveBeenCalledWith(1);
            expect(syncModule.trackPaperUpdated).toHaveBeenCalledWith(2, { title: 'New' });

            expect(result).toHaveLength(2);
            expect(result[0].success).toBe(true);
            expect(result[1].success).toBe(true);
        });

        it('should handle unknown operation types in local batch', async () => {
            const ops = [{ type: 'unknown', id: 1 }];

            // Force local execution by disabling cloud sync temporarily for this test logic path
            // Or just mock batchOperations to fail
            apiPapers.batchOperations.mockRejectedValue(new Error('API Error'));

            const result = await papers.batchOperations(ops);

            expect(result[0].success).toBe(false);
            expect(result[0].error).toBe('Unknown type');
        });

        it('should handle local errors in local batch', async () => {
            const ops = [{ type: 'delete', id: 1 }];

            apiPapers.batchOperations.mockRejectedValue(new Error('API Error'));
            localPapers.deletePaper.mockRejectedValue(new Error('Local Error'));

            const result = await papers.batchOperations(ops);

            expect(result[0].success).toBe(false);
            expect(result[0].error).toBe('Local Error');
        });
    });

    describe('Local Only Mode', () => {
        it('should perform local-only batch operations if cloud disabled', async () => {
            configModule.isCloudSyncEnabled.mockReturnValue(false);

            const ops = [{ type: 'delete', id: 1 }];
            localPapers.deletePaper.mockResolvedValue();

            await papers.batchOperations(ops);

            expect(apiPapers.batchOperations).not.toHaveBeenCalled();
            expect(localPapers.deletePaper).toHaveBeenCalledWith(1);
            // Should NOT track if cloud disabled
            expect(syncModule.trackPaperDeleted).not.toHaveBeenCalled();
        });
    });
});
