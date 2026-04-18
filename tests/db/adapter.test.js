
/**
 * Tests for db/adapter.js
 * Database adapter: routing between cloud API and local IndexedDB
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { papers, folders, annotations, isCloudSyncAvailable } from '../../db/adapter.js';
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

vi.mock('../../db/folders.js', () => ({
    addFolder: vi.fn(),
    getAllFolders: vi.fn(() => Promise.resolve([])),
    getFolderById: vi.fn(),
    updateFolder: vi.fn(),
    deleteFolder: vi.fn()
}));

vi.mock('../../db/paperFolders.js', () => ({
    addPaperToFolder: vi.fn(),
    removePaperFromFolder: vi.fn(),
    removeAllForFolder: vi.fn(),
    removeAllForPaper: vi.fn(),
    getFolderIdsByPaperId: vi.fn(() => Promise.resolve([])),
    getPaperIdsByFolderId: vi.fn(() => Promise.resolve([])),
    getAllPaperFolders: vi.fn(() => Promise.resolve([]))
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
    uploadPdf: vi.fn(),
    batchOperations: vi.fn(() => Promise.resolve([]))
}));

vi.mock('../../api/folders.js', () => ({
    createFolder: vi.fn(),
    getAllFolders: vi.fn(() => Promise.resolve([])),
    getFolder: vi.fn(),
    updateFolder: vi.fn(),
    deleteFolder: vi.fn()
}));

vi.mock('../../api/paperFolders.js', () => ({
    addPaperToFolder: vi.fn(),
    removePaperFromFolder: vi.fn(),
    getPapersInFolder: vi.fn(() => Promise.resolve([]))
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
            const { trackPaperCreated } = await import('../../db/sync.js');
            const { triggerDebouncedSync } = await import('../../core/syncManager.js');

            apiPapers.createPaper.mockResolvedValue({ id: 1, title: 'Test Paper', status: 'Reading' });
            localPapers.addPaper.mockResolvedValue(1);

            const paperData = {
                title: 'Test Paper',
                readingStatus: 'Reading',
                authors: ['Author']
            };

            const result = await papers.addPaper(paperData);

            expect(localPapers.addPaper).toHaveBeenCalled();
            expect(trackPaperCreated).not.toHaveBeenCalled(); // Cloud success means no need to track for sync
            expect(triggerDebouncedSync).toHaveBeenCalled();
            expect(result).toBe(1);
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
        it('should return local papers in cloud mode', async () => {
            const localPapers = await import('../../db/papers.js');

            const localPapersList = [
                { id: 1, title: 'Local Paper', status: 'Reading' }
            ];

            localPapers.getAllPapers.mockResolvedValue(localPapersList);

            const result = await papers.getAllPapers();

            expect(localPapers.getAllPapers).toHaveBeenCalled();
            expect(result).toHaveLength(1);
            expect(result[0]).toHaveProperty('title', 'Local Paper');
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
        it('should update paper locally and via API in cloud mode', async () => {
            const apiPapers = await import('../../api/papers.js');
            const localPapers = await import('../../db/papers.js');

            apiPapers.updatePaper.mockResolvedValue({ id: 1, title: 'Updated', status: 'Reading' });
            localPapers.updatePaper.mockResolvedValue(1);

            await papers.updatePaper(1, { title: 'Updated', readingStatus: 'Reading' });

            expect(localPapers.updatePaper).toHaveBeenCalled();
            expect(apiPapers.updatePaper).toHaveBeenCalled();
        });

        it('should fallback to local on cloud error', async () => {
            const apiPapers = await import('../../api/papers.js');
            const localPapers = await import('../../db/papers.js');

            apiPapers.updatePaper.mockRejectedValue(new Error('Cloud error'));
            localPapers.updatePaper.mockResolvedValue(1);

            // Should not throw
            await expect(papers.updatePaper(1, { title: 'Updated' })).resolves.toBeDefined();
            expect(localPapers.updatePaper).toHaveBeenCalled();
        });
    });

    describe('deletePaper', () => {
        it('should delete paper locally and via API in cloud mode', async () => {
            const apiPapers = await import('../../api/papers.js');
            const localPapers = await import('../../db/papers.js');

            apiPapers.deletePaper.mockResolvedValue();
            localPapers.deletePaper.mockResolvedValue();

            await papers.deletePaper(1);

            expect(localPapers.deletePaper).toHaveBeenCalled();
            expect(apiPapers.deletePaper).toHaveBeenCalled();
        });

        it('should handle 404 errors gracefully', async () => {
            const apiPapers = await import('../../api/papers.js');
            const localPapers = await import('../../db/papers.js');

            apiPapers.deletePaper.mockRejectedValue(new Error('Paper not found'));
            localPapers.deletePaper.mockResolvedValue();

            await papers.deletePaper(1);

            expect(localPapers.deletePaper).toHaveBeenCalledWith(1);
        });

        it('should still delete locally on cloud error', async () => {
            const apiPapers = await import('../../api/papers.js');
            const localPapers = await import('../../db/papers.js');

            apiPapers.deletePaper.mockRejectedValue(new Error('Cloud error'));
            localPapers.deletePaper.mockResolvedValue();

            await papers.deletePaper(1);

            expect(localPapers.deletePaper).toHaveBeenCalled();
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

describe('db/adapter.js - Folder Operations', () => {
    beforeEach(async () => {
        resetAllMocks();
        clearMockSync();
        vi.clearAllMocks();

        const { isCloudSyncEnabled } = await import('../../config.js');
        const { isAuthenticated } = await import('../../api/auth.js');

        isCloudSyncEnabled.mockReturnValue(true);
        isAuthenticated.mockReturnValue(true);
    });

    it('should create folder via API in cloud mode', async () => {
        const apiFoldersModule = await import('../../api/folders.js');
        const localFoldersModule = await import('../../db/folders.js');
        const { triggerDebouncedSync } = await import('../../core/syncManager.js');

        apiFoldersModule.createFolder.mockResolvedValue({ id: 1, name: 'Test Folder' });
        localFoldersModule.addFolder.mockResolvedValue(1);

        const result = await folders.addFolder({ name: 'Test Folder' });

        expect(apiFoldersModule.createFolder).toHaveBeenCalled();
        expect(localFoldersModule.addFolder).toHaveBeenCalled();
        expect(triggerDebouncedSync).toHaveBeenCalled();
        expect(result).toBe(1);
    });

    it('should fallback to local on cloud error', async () => {
        const apiFoldersModule = await import('../../api/folders.js');
        const localFoldersModule = await import('../../db/folders.js');
        const { trackFolderCreated } = await import('../../db/sync.js');

        apiFoldersModule.createFolder.mockRejectedValue(new Error('Cloud error'));
        localFoldersModule.addFolder.mockResolvedValue(2);

        const result = await folders.addFolder({ name: 'Test' });

        expect(localFoldersModule.addFolder).toHaveBeenCalled();
        expect(trackFolderCreated).toHaveBeenCalled();
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
