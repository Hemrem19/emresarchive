/**
 * Tests for db/adapter.js
 * Database adapter: routing between cloud API and local IndexedDB
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { papers, collections, annotations, isCloudSyncAvailable } from '../../db/adapter.js';
import { resetAllMocks, setMockAuth, clearMockAuth, setMockSyncEnabled, clearMockSync } from '../helpers.js';

// Mock dependencies
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

vi.mock('../../db/collections.js', () => ({
    addCollection: vi.fn(),
    getAllCollections: vi.fn(() => Promise.resolve([])),
    getCollectionById: vi.fn(),
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

vi.mock('../../api/papers.js', () => ({
    createPaper: vi.fn(),
    getAllPapers: vi.fn(() => Promise.resolve({ papers: [] })),
    getPaper: vi.fn(),
    updatePaper: vi.fn(),
    deletePaper: vi.fn(),
    searchPapers: vi.fn(() => Promise.resolve({ papers: [] })),
    getUploadUrl: vi.fn(),
    uploadPdf: vi.fn()
}));

vi.mock('../../api/collections.js', () => ({
    createCollection: vi.fn(),
    getAllCollections: vi.fn(() => Promise.resolve({ collections: [] })),
    getCollection: vi.fn(),
    updateCollection: vi.fn(),
    deleteCollection: vi.fn()
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

describe('db/adapter.js - Cloud Sync Detection', () => {
    beforeEach(() => {
        resetAllMocks();
        clearMockSync();
        vi.clearAllMocks();
    });

    it('should return true when cloud sync enabled and authenticated', async () => {
        const { isCloudSyncEnabled } = await import('../../config.js');
        const { isAuthenticated } = await import('../../api/auth.js');
        
        isCloudSyncEnabled.mockReturnValue(true);
        isAuthenticated.mockReturnValue(true);
        
        expect(isCloudSyncAvailable()).toBe(true);
    });

    it('should return false when cloud sync disabled', async () => {
        const { isCloudSyncEnabled } = await import('../../config.js');
        
        isCloudSyncEnabled.mockReturnValue(false);
        
        expect(isCloudSyncAvailable()).toBe(false);
    });

    it('should return false when not authenticated', async () => {
        const { isCloudSyncEnabled } = await import('../../config.js');
        const { isAuthenticated } = await import('../../api/auth.js');
        
        isCloudSyncEnabled.mockReturnValue(true);
        isAuthenticated.mockReturnValue(false);
        
        expect(isCloudSyncAvailable()).toBe(false);
    });
});

describe('db/adapter.js - Paper Operations - Cloud Mode', () => {
    beforeEach(async () => {
        resetAllMocks();
        clearMockSync();
        vi.clearAllMocks();
        
        const { isCloudSyncEnabled } = await import('../../config.js');
        const { isAuthenticated } = await import('../../api/auth.js');
        
        isCloudSyncEnabled.mockReturnValue(true);
        isAuthenticated.mockReturnValue(true);
    });

    describe('addPaper', () => {
        it('should create paper via API in cloud mode', async () => {
            const apiPapers = await import('../../api/papers.js');
            const localPapers = await import('../../db/papers.js');
            const { triggerDebouncedSync } = await import('../../core/syncManager.js');
            
            apiPapers.createPaper.mockResolvedValue({ id: 1, title: 'Test Paper', status: 'Reading' });
            localPapers.addPaper.mockResolvedValue(1);
            
            const paperData = {
                title: 'Test Paper',
                readingStatus: 'Reading',
                authors: ['Author']
            };
            
            const result = await papers.addPaper(paperData);
            
            expect(apiPapers.createPaper).toHaveBeenCalledWith(
                expect.objectContaining({
                    status: 'Reading', // readingStatus mapped to status
                    title: 'Test Paper'
                })
            );
            expect(localPapers.addPaper).toHaveBeenCalled();
            expect(triggerDebouncedSync).toHaveBeenCalled();
            expect(result).toBe(1);
        });

        it('should map readingStatus to status in cloud mode', async () => {
            const apiPapers = await import('../../api/papers.js');
            
            apiPapers.createPaper.mockResolvedValue({ id: 1, title: 'Test', status: 'Reading' });
            
            await papers.addPaper({
                title: 'Test',
                readingStatus: 'Reading',
                authors: []
            });
            
            const call = apiPapers.createPaper.mock.calls[0][0];
            expect(call.status).toBe('Reading');
            expect(call.readingStatus).toBeUndefined();
        });

        it('should map s3Key to pdfUrl in cloud mode', async () => {
            const apiPapers = await import('../../api/papers.js');
            
            apiPapers.createPaper.mockResolvedValue({ id: 1, title: 'Test', pdfUrl: 'papers/1/test.pdf' });
            
            await papers.addPaper({
                title: 'Test',
                s3Key: 'papers/1/test.pdf',
                authors: []
            });
            
            const call = apiPapers.createPaper.mock.calls[0][0];
            expect(call.pdfUrl).toBe('papers/1/test.pdf');
            expect(call.s3Key).toBeUndefined();
        });

        it('should remove local-only fields in cloud mode', async () => {
            const apiPapers = await import('../../api/papers.js');
            const localPapers = await import('../../db/papers.js');
            
            apiPapers.createPaper.mockResolvedValue({ id: 1, title: 'Test', authors: [] });
            localPapers.addPaper.mockResolvedValue(1);
            
            // Test with data that doesn't trigger File upload path
            // (ArrayBuffer, not File object)
            await papers.addPaper({
                title: 'Test',
                pdfData: new ArrayBuffer(100), // ArrayBuffer doesn't trigger File upload
                pdfFile: null, // Not a File object
                hasPdf: true,
                id: 999,
                createdAt: new Date(),
                updatedAt: new Date(),
                authors: []
            });
            
            // mapPaperDataToApi should remove local-only fields
            const call = apiPapers.createPaper.mock.calls[0][0];
            // These fields should be removed by mapPaperDataToApi
            expect(call.pdfData).toBeUndefined();
            expect(call.pdfFile).toBeUndefined();
            expect(call.hasPdf).toBeUndefined();
            expect(call.id).toBeUndefined();
            expect(call.createdAt).toBeUndefined();
            // Note: mapPaperDataToApi doesn't delete updatedAt (only createdAt and id)
            // Title should still be there
            expect(call.title).toBe('Test');
        });

        it('should fallback to local on cloud error', async () => {
            const apiPapers = await import('../../api/papers.js');
            const localPapers = await import('../../db/papers.js');
            const { trackPaperCreated } = await import('../../db/sync.js');
            const { triggerDebouncedSync } = await import('../../core/syncManager.js');
            
            apiPapers.createPaper.mockRejectedValue(new Error('Cloud error'));
            localPapers.addPaper.mockResolvedValue(2);
            
            const paperData = { title: 'Test', authors: [] };
            const result = await papers.addPaper(paperData);
            
            expect(localPapers.addPaper).toHaveBeenCalledWith(paperData);
            expect(trackPaperCreated).toHaveBeenCalled();
            expect(triggerDebouncedSync).toHaveBeenCalled();
            expect(result).toBe(2);
        });
    });

    describe('getAllPapers', () => {
        it('should fetch papers from API in cloud mode', async () => {
            const apiPapers = await import('../../api/papers.js');
            
            const apiPapersList = [
                { id: 1, title: 'Paper 1', status: 'Reading', pdfUrl: 'papers/1/test.pdf' },
                { id: 2, title: 'Paper 2', status: 'Read' }
            ];
            
            apiPapers.getAllPapers.mockResolvedValue({ papers: apiPapersList });
            
            const result = await papers.getAllPapers();
            
            expect(apiPapers.getAllPapers).toHaveBeenCalled();
            expect(result).toHaveLength(2);
            expect(result[0]).toHaveProperty('readingStatus', 'Reading');
            expect(result[0]).toHaveProperty('s3Key', 'papers/1/test.pdf');
            expect(result[0]).toHaveProperty('hasPdf', true);
        });

        it('should fallback to local on API error', async () => {
            const apiPapers = await import('../../api/papers.js');
            const localPapers = await import('../../db/papers.js');
            
            apiPapers.getAllPapers.mockRejectedValue(new Error('API error'));
            localPapers.getAllPapers.mockResolvedValue([{ id: 1, title: 'Local Paper', authors: [] }]);
            
            const result = await papers.getAllPapers();
            
            expect(localPapers.getAllPapers).toHaveBeenCalled();
            expect(result).toHaveLength(1);
        });
    });

    describe('updatePaper', () => {
        it('should update paper via API in cloud mode', async () => {
            const apiPapers = await import('../../api/papers.js');
            const localPapers = await import('../../db/papers.js');
            const { triggerDebouncedSync } = await import('../../core/syncManager.js');
            
            apiPapers.updatePaper.mockResolvedValue({ id: 1, title: 'Updated', status: 'Reading' });
            localPapers.updatePaper.mockResolvedValue(1);
            localPapers.getPaperById.mockResolvedValue({ id: 1, title: 'Updated' });
            
            await papers.updatePaper(1, { title: 'Updated', readingStatus: 'Reading' });
            
            expect(apiPapers.updatePaper).toHaveBeenCalledWith(
                1,
                expect.objectContaining({
                    status: 'Reading',
                    title: 'Updated'
                })
            );
            expect(triggerDebouncedSync).toHaveBeenCalled();
        });

        it('should fallback to local on cloud error', async () => {
            const apiPapers = await import('../../api/papers.js');
            const localPapers = await import('../../db/papers.js');
            const { trackPaperUpdated } = await import('../../db/sync.js');
            
            apiPapers.updatePaper.mockRejectedValue(new Error('Cloud error'));
            localPapers.updatePaper.mockResolvedValue(1);
            localPapers.getPaperById.mockResolvedValue({ id: 1, title: 'Updated' });
            
            await papers.updatePaper(1, { title: 'Updated' });
            
            expect(localPapers.updatePaper).toHaveBeenCalled();
            expect(trackPaperUpdated).toHaveBeenCalledWith(1, { title: 'Updated' });
        });
    });

    describe('deletePaper', () => {
        it('should delete paper via API in cloud mode', async () => {
            const apiPapers = await import('../../api/papers.js');
            const localPapers = await import('../../db/papers.js');
            const { triggerDebouncedSync } = await import('../../core/syncManager.js');
            
            apiPapers.deletePaper.mockResolvedValue();
            localPapers.deletePaper.mockResolvedValue();
            
            await papers.deletePaper(1);
            
            expect(apiPapers.deletePaper).toHaveBeenCalledWith(1);
            expect(localPapers.deletePaper).toHaveBeenCalled();
            expect(triggerDebouncedSync).toHaveBeenCalled();
        });

        it('should handle 404 errors gracefully', async () => {
            const apiPapers = await import('../../api/papers.js');
            const localPapers = await import('../../db/papers.js');
            
            apiPapers.deletePaper.mockRejectedValue(new Error('Paper not found'));
            localPapers.deletePaper.mockResolvedValue();
            
            await papers.deletePaper(1);
            
            expect(localPapers.deletePaper).toHaveBeenCalledWith(1);
        });

        it('should fallback to local on cloud error', async () => {
            const apiPapers = await import('../../api/papers.js');
            const localPapers = await import('../../db/papers.js');
            const { trackPaperDeleted } = await import('../../db/sync.js');
            
            apiPapers.deletePaper.mockRejectedValue(new Error('Cloud error'));
            localPapers.deletePaper.mockResolvedValue();
            
            await papers.deletePaper(1);
            
            expect(localPapers.deletePaper).toHaveBeenCalled();
            expect(trackPaperDeleted).toHaveBeenCalledWith(1);
        });
    });
});

describe('db/adapter.js - Paper Operations - Local Mode', () => {
    beforeEach(async () => {
        resetAllMocks();
        clearMockSync();
        vi.clearAllMocks();
        
        const { isCloudSyncEnabled } = await import('../../config.js');
        
        isCloudSyncEnabled.mockReturnValue(false);
    });

    it('should use local storage when cloud sync disabled', async () => {
        const localPapers = await import('../../db/papers.js');
        const apiPapers = await import('../../api/papers.js');
        
        localPapers.addPaper.mockResolvedValue(1);
        
        const result = await papers.addPaper({ title: 'Test', authors: [] });
        
        expect(localPapers.addPaper).toHaveBeenCalled();
        expect(apiPapers.createPaper).not.toHaveBeenCalled();
        expect(result).toBe(1);
    });

    it('should not track changes when cloud sync enabled but not authenticated', async () => {
        const { isCloudSyncEnabled } = await import('../../config.js');
        const { isAuthenticated } = await import('../../api/auth.js');
        const localPapers = await import('../../db/papers.js');
        const { trackPaperCreated } = await import('../../db/sync.js');
        const { triggerDebouncedSync } = await import('../../core/syncManager.js');
        
        isCloudSyncEnabled.mockReturnValue(true);
        isAuthenticated.mockReturnValue(false);
        localPapers.addPaper.mockResolvedValue(1);
        
        await papers.addPaper({ title: 'Test', authors: [] });
        
        // When cloud sync is enabled but not authenticated, it falls back to local-only
        // and only tracks if both enabled AND authenticated
        expect(localPapers.addPaper).toHaveBeenCalled();
        expect(trackPaperCreated).not.toHaveBeenCalled(); // Not authenticated, so no tracking
        expect(triggerDebouncedSync).not.toHaveBeenCalled();
    });
});

describe('db/adapter.js - Collection Operations', () => {
    beforeEach(async () => {
        resetAllMocks();
        clearMockSync();
        vi.clearAllMocks();
        
        const { isCloudSyncEnabled } = await import('../../config.js');
        const { isAuthenticated } = await import('../../api/auth.js');
        
        isCloudSyncEnabled.mockReturnValue(true);
        isAuthenticated.mockReturnValue(true);
    });

    it('should create collection via API in cloud mode', async () => {
        const apiCollections = await import('../../api/collections.js');
        const localCollections = await import('../../db/collections.js');
        const { triggerDebouncedSync } = await import('../../core/syncManager.js');
        
        apiCollections.createCollection.mockResolvedValue({ id: 1, name: 'Test Collection' });
        localCollections.addCollection.mockResolvedValue(1);
        
        const result = await collections.addCollection({ name: 'Test Collection' });
        
        expect(apiCollections.createCollection).toHaveBeenCalled();
        expect(localCollections.addCollection).toHaveBeenCalled();
        expect(triggerDebouncedSync).toHaveBeenCalled();
        expect(result).toBe(1);
    });

    it('should fallback to local on cloud error', async () => {
        const apiCollections = await import('../../api/collections.js');
        const localCollections = await import('../../db/collections.js');
        const { trackCollectionCreated } = await import('../../db/sync.js');
        
        apiCollections.createCollection.mockRejectedValue(new Error('Cloud error'));
        localCollections.addCollection.mockResolvedValue(2);
        
        const result = await collections.addCollection({ name: 'Test' });
        
        expect(localCollections.addCollection).toHaveBeenCalled();
        expect(trackCollectionCreated).toHaveBeenCalled();
        expect(result).toBe(2);
    });
});

describe('db/adapter.js - Annotation Operations', () => {
    beforeEach(async () => {
        resetAllMocks();
        clearMockSync();
        vi.clearAllMocks();
        
        const { isCloudSyncEnabled } = await import('../../config.js');
        const { isAuthenticated } = await import('../../api/auth.js');
        
        isCloudSyncEnabled.mockReturnValue(true);
        isAuthenticated.mockReturnValue(true);
    });

    it('should create annotation via API in cloud mode', async () => {
        const apiAnnotations = await import('../../api/annotations.js');
        const localAnnotations = await import('../../db/annotations.js');
        const { triggerDebouncedSync } = await import('../../core/syncManager.js');
        
        apiAnnotations.createAnnotation.mockResolvedValue({ id: 1, paperId: 1, type: 'highlight' });
        localAnnotations.addAnnotation.mockResolvedValue(1);
        
        const result = await annotations.addAnnotation({ paperId: 1, type: 'highlight' });
        
        expect(apiAnnotations.createAnnotation).toHaveBeenCalled();
        expect(localAnnotations.addAnnotation).toHaveBeenCalled();
        expect(triggerDebouncedSync).toHaveBeenCalled();
        expect(result).toBe(1);
    });

    it('should fallback to local on cloud error', async () => {
        const apiAnnotations = await import('../../api/annotations.js');
        const localAnnotations = await import('../../db/annotations.js');
        const { trackAnnotationCreated } = await import('../../db/sync.js');
        
        apiAnnotations.createAnnotation.mockRejectedValue(new Error('Cloud error'));
        localAnnotations.addAnnotation.mockResolvedValue(2);
        
        const result = await annotations.addAnnotation({ paperId: 1, type: 'highlight' });
        
        expect(localAnnotations.addAnnotation).toHaveBeenCalled();
        expect(trackAnnotationCreated).toHaveBeenCalled();
        expect(result).toBe(2);
    });
});

