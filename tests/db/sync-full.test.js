/**
 * Full Coverage Tests for Sync Module
 * Covers performFullSync, performIncrementalSync, and applyServerChanges logic
 * @module tests/db/sync-full
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import {
    performFullSync,
    performIncrementalSync,
    performSync,
    getPendingChanges,
    trackPaperCreated,
    isSyncInProgress
} from '../../db/sync.js';
import * as coreModule from '../../db/core.js';
import * as configModule from '../../config.js';
import * as authModule from '../../api/auth.js';
import * as syncApiModule from '../../api/sync.js';
import { getSyncStatusInfo } from '../../db/sync.js';

// Mock dependencies
vi.mock('../../api/utils.js', () => ({
    isRateLimited: vi.fn()
}));
import * as utilsModule from '../../api/utils.js';

vi.mock('../../db/core.js', () => ({
    openDB: vi.fn(),
    STORE_NAME_PAPERS: 'papers',
    STORE_NAME_COLLECTIONS: 'collections',
    STORE_NAME_ANNOTATIONS: 'annotations'
}));

vi.mock('../../config.js', () => ({
    isCloudSyncEnabled: vi.fn(),
    getApiBaseUrl: vi.fn().mockReturnValue('http://localhost:3000'),
    API_CONFIG: { BASE_URL: 'http://localhost:3000' }
}));

vi.mock('../../api/auth.js', () => ({
    isAuthenticated: vi.fn()
}));

vi.mock('../../api/sync.js', () => ({
    fullSync: vi.fn(),
    incrementalSync: vi.fn(),
    getSyncStatus: vi.fn(),
    getClientId: vi.fn(),
    mapPaperFromApi: vi.fn(p => p),
    mapCollectionFromApi: vi.fn(c => c),
    mapAnnotationFromApi: vi.fn(a => a),
    mapPaperToApi: vi.fn(p => p),
    mapCollectionToApi: vi.fn(c => c),
    mapAnnotationToApi: vi.fn(a => a)
}));

vi.mock('../../db.js', () => ({
    getAllPapers: vi.fn(),
    addPaper: vi.fn(),
    updatePaper: vi.fn(),
    deletePaper: vi.fn(),
    getAllCollections: vi.fn(),
    addCollection: vi.fn(),
    updateCollection: vi.fn(),
    deleteCollection: vi.fn(),
    getAnnotationsByPaperId: vi.fn(),
    addAnnotation: vi.fn(),
    updateAnnotation: vi.fn(),
    deleteAnnotation: vi.fn()
}));

describe('Sync Module Full Coverage', () => {
    let mockLocalStorage;
    let mockDb;
    let mockTransaction;
    let mockPapersStore;
    let mockCollectionsStore;
    let mockAnnotationsStore;

    beforeEach(() => {
        vi.clearAllMocks();

        // Mock localStorage
        mockLocalStorage = {};
        global.localStorage = {
            getItem: vi.fn((key) => mockLocalStorage[key] || null),
            setItem: vi.fn((key, value) => { mockLocalStorage[key] = value.toString(); }),
            removeItem: vi.fn((key) => { delete mockLocalStorage[key]; }),
            clear: vi.fn(() => { mockLocalStorage = {}; })
        };

        // Mock DB Stores
        const createMockStore = () => ({
            getAll: vi.fn(),
            delete: vi.fn(),
            put: vi.fn(),
            clear: vi.fn()
        });

        mockPapersStore = createMockStore();
        mockCollectionsStore = createMockStore();
        mockAnnotationsStore = createMockStore();

        mockTransaction = {
            objectStore: vi.fn((name) => {
                if (name === 'papers') return mockPapersStore;
                if (name === 'collections') return mockCollectionsStore;
                if (name === 'annotations') return mockAnnotationsStore;
                return null;
            }),
            oncomplete: null,
            onerror: null
        };

        mockDb = {
            transaction: vi.fn().mockReturnValue(mockTransaction)
        };

        coreModule.openDB.mockResolvedValue(mockDb);

        // Default config/auth mocks
        configModule.isCloudSyncEnabled.mockReturnValue(true);
        authModule.isAuthenticated.mockReturnValue(true);
    });

    describe('performFullSync', () => {
        it('should throw if cloud sync is disabled', async () => {
            configModule.isCloudSyncEnabled.mockReturnValue(false);
            await expect(performFullSync()).rejects.toThrow('Cloud sync is not enabled');
        });

        it('should throw if user is not authenticated', async () => {
            authModule.isAuthenticated.mockReturnValue(false);
            await expect(performFullSync()).rejects.toThrow('user is not authenticated');
        });

        it('should throw if sync is already in progress', async () => {
            mockLocalStorage['citavers_sync_in_progress'] = 'true';
            mockLocalStorage['citavers_sync_start_time'] = Date.now().toString();
            await expect(performFullSync()).rejects.toThrow('Sync already in progress');
        });

        it('should perform successful full sync', async () => {
            // Setup API response
            const apiData = {
                papers: [{ id: 1, title: 'Server Paper' }],
                collections: [],
                annotations: [],
                syncedAt: '2023-01-01T00:00:00Z'
            };
            syncApiModule.fullSync.mockResolvedValue(apiData);

            // Setup DB clear success
            mockPapersStore.clear.mockReturnValue({});
            mockCollectionsStore.clear.mockReturnValue({});
            mockAnnotationsStore.clear.mockReturnValue({});

            // Setup DB put success for applyServerChanges
            mockPapersStore.put.mockReturnValue({ onsuccess: null, onerror: null });
            // applyServerChanges does a getAll first for dedup
            mockPapersStore.getAll.mockReturnValue({ onsuccess: null, onerror: null, result: [] });

            const promise = performFullSync();

            // Wait for async operations
            await new Promise(resolve => setTimeout(resolve, 0));

            // Trigger transaction complete (clearing done)
            if (mockTransaction.oncomplete) mockTransaction.oncomplete();

            // Wait for applyServerChanges to start
            await new Promise(resolve => setTimeout(resolve, 0));

            // Trigger getAll success (dedup check)
            if (mockPapersStore.getAll.mock.results[0]?.value?.onsuccess) {
                mockPapersStore.getAll.mock.results[0].value.onsuccess({ target: { result: [] } });
            }

            // Trigger put success
            await new Promise(resolve => setTimeout(resolve, 0));
            if (mockPapersStore.put.mock.results[0]?.value?.onsuccess) {
                mockPapersStore.put.mock.results[0].value.onsuccess();
            }

            const result = await promise;

            expect(result.success).toBe(true);
            expect(result.counts.papers).toBe(1);
            expect(mockPapersStore.clear).toHaveBeenCalled();
            expect(mockLocalStorage['citavers_pending_changes']).toBeUndefined(); // Should be cleared
        });

        it('should handle DB clear failure', async () => {
            syncApiModule.fullSync.mockResolvedValue({ papers: [], collections: [], annotations: [] });

            const promise = performFullSync();
            await new Promise(resolve => setTimeout(resolve, 0));

            // Trigger transaction error
            if (mockTransaction.onerror) mockTransaction.onerror({ target: { error: 'DB Error' } });

            await expect(promise).rejects.toThrow('Failed to clear local data');
        });
    });

    describe('performIncrementalSync', () => {
        it('should throw if cloud sync is disabled', async () => {
            configModule.isCloudSyncEnabled.mockReturnValue(false);
            await expect(performIncrementalSync()).rejects.toThrow('Cloud sync is not enabled');
        });

        it('should skip if sync is in progress', async () => {
            mockLocalStorage['citavers_sync_in_progress'] = 'true';
            mockLocalStorage['citavers_sync_start_time'] = Date.now().toString();
            await expect(performIncrementalSync()).rejects.toThrow('Sync already in progress');
        });

        it('should perform successful incremental sync with local changes', async () => {
            // Setup local changes
            trackPaperCreated({ title: 'New Paper' });

            // Setup API response
            const apiResult = {
                syncedAt: '2023-01-02T00:00:00Z',
                appliedChanges: { papers: { conflicts: [] } },
                serverChanges: {
                    papers: [{ id: 2, title: 'Server Update' }],
                    collections: [],
                    annotations: [],
                    deleted: { papers: [], collections: [], annotations: [] }
                }
            };
            syncApiModule.incrementalSync.mockResolvedValue(apiResult);

            // Setup DB mocks for applyServerChanges
            mockPapersStore.getAll.mockReturnValue({ onsuccess: null, onerror: null, result: [] });
            mockPapersStore.put.mockReturnValue({ onsuccess: null, onerror: null });

            const promise = performIncrementalSync();

            await new Promise(resolve => setTimeout(resolve, 0));

            // Trigger getAll success (dedup check)
            if (mockPapersStore.getAll.mock.results[0]?.value?.onsuccess) {
                mockPapersStore.getAll.mock.results[0].value.onsuccess({ target: { result: [] } });
            }

            await new Promise(resolve => setTimeout(resolve, 0));
            // Trigger put success
            if (mockPapersStore.put.mock.results[0]?.value?.onsuccess) {
                mockPapersStore.put.mock.results[0].value.onsuccess();
            }

            const result = await promise;

            expect(result.success).toBe(true);
            expect(result.hasLocalChanges).toBe(true);
            expect(result.serverChangeCount.papers).toBe(1);
            expect(mockLocalStorage['citavers_pending_changes']).toBeUndefined(); // Should be cleared
        });

        it('should handle de-duplication during sync (DOI match)', async () => {
            // Scenario: Server sends paper with DOI that matches existing local paper with different ID
            const existingPapers = [{ id: 10, title: 'Local Duplicate', doi: '10.1234/test' }];
            const serverPaper = { id: 20, title: 'Server Original', doi: '10.1234/test' };

            syncApiModule.incrementalSync.mockResolvedValue({
                syncedAt: 'now',
                appliedChanges: {},
                serverChanges: {
                    papers: [serverPaper],
                    collections: [],
                    annotations: [],
                    deleted: {}
                }
            });

            mockPapersStore.getAll.mockReturnValue({ onsuccess: null, onerror: null, result: existingPapers });
            mockPapersStore.delete.mockReturnValue({ onsuccess: null, onerror: null });
            mockPapersStore.put.mockReturnValue({ onsuccess: null, onerror: null });

            const promise = performIncrementalSync();

            await new Promise(resolve => setTimeout(resolve, 0));

            // Trigger getAll success
            if (mockPapersStore.getAll.mock.results[0]?.value?.onsuccess) {
                mockPapersStore.getAll.mock.results[0].value.onsuccess({ target: { result: existingPapers } });
            }

            await new Promise(resolve => setTimeout(resolve, 0));

            // Should have called delete for ID 10
            expect(mockPapersStore.delete).toHaveBeenCalledWith(10);

            // Trigger delete success
            if (mockPapersStore.delete.mock.results[0]?.value?.onsuccess) {
                mockPapersStore.delete.mock.results[0].value.onsuccess();
            }

            await new Promise(resolve => setTimeout(resolve, 0));

            // Should have called put for ID 20
            expect(mockPapersStore.put).toHaveBeenCalledWith(expect.objectContaining({ id: 20 }));

            // Trigger put success
            if (mockPapersStore.put.mock.results[0]?.value?.onsuccess) {
                mockPapersStore.put.mock.results[0].value.onsuccess();
            }

            await promise;
        });

        it('should handle de-duplication during sync (arXiv ID match)', async () => {
            const existingPapers = [{ id: 11, title: 'Local Arxiv', arxivId: '2101.00001' }];
            const serverPaper = { id: 21, title: 'Server Arxiv', doi: 'arXiv:2101.00001' };

            syncApiModule.incrementalSync.mockResolvedValue({
                syncedAt: 'now',
                appliedChanges: {},
                serverChanges: {
                    papers: [serverPaper],
                    collections: [],
                    annotations: [],
                    deleted: {}
                }
            });

            mockPapersStore.getAll.mockReturnValue({ onsuccess: null, onerror: null, result: existingPapers });
            mockPapersStore.delete.mockReturnValue({ onsuccess: null, onerror: null });
            mockPapersStore.put.mockReturnValue({ onsuccess: null, onerror: null });

            const promise = performIncrementalSync();

            await new Promise(resolve => setTimeout(resolve, 0));

            // Trigger getAll success
            if (mockPapersStore.getAll.mock.results[0]?.value?.onsuccess) {
                mockPapersStore.getAll.mock.results[0].value.onsuccess({ target: { result: existingPapers } });
            }

            await new Promise(resolve => setTimeout(resolve, 0));

            // Should have called delete for ID 11
            expect(mockPapersStore.delete).toHaveBeenCalledWith(11);

            // Trigger delete success
            if (mockPapersStore.delete.mock.results[0]?.value?.onsuccess) {
                mockPapersStore.delete.mock.results[0].value.onsuccess();
            }

            await new Promise(resolve => setTimeout(resolve, 0));

            // Should have called put for ID 21
            expect(mockPapersStore.put).toHaveBeenCalledWith(expect.objectContaining({ id: 21 }));

            // Trigger put success
            if (mockPapersStore.put.mock.results[0]?.value?.onsuccess) {
                mockPapersStore.put.mock.results[0].value.onsuccess();
            }

            await promise;
        });

        it('should handle server deletions', async () => {
            syncApiModule.incrementalSync.mockResolvedValue({
                syncedAt: 'now',
                appliedChanges: {},
                serverChanges: {
                    papers: [],
                    collections: [],
                    annotations: [],
                    deleted: {
                        papers: [100],
                        collections: [200],
                        annotations: [300]
                    }
                }
            });

            mockPapersStore.getAll.mockReturnValue({ onsuccess: null, onerror: null, result: [] });
            mockPapersStore.delete.mockReturnValue({ onsuccess: null, onerror: null });
            mockCollectionsStore.delete.mockReturnValue({ onsuccess: null, onerror: null });
            mockAnnotationsStore.delete.mockReturnValue({ onsuccess: null, onerror: null });

            const promise = performIncrementalSync();

            await new Promise(resolve => setTimeout(resolve, 0));
            // Trigger getAll success (dedup check)
            if (mockPapersStore.getAll.mock.results[0]?.value?.onsuccess) {
                mockPapersStore.getAll.mock.results[0].value.onsuccess({ target: { result: [] } });
            }

            await new Promise(resolve => setTimeout(resolve, 0));

            // Trigger delete successes
            if (mockPapersStore.delete.mock.results[0]?.value?.onsuccess) mockPapersStore.delete.mock.results[0].value.onsuccess();
            if (mockCollectionsStore.delete.mock.results[0]?.value?.onsuccess) mockCollectionsStore.delete.mock.results[0].value.onsuccess();
            if (mockAnnotationsStore.delete.mock.results[0]?.value?.onsuccess) mockAnnotationsStore.delete.mock.results[0].value.onsuccess();

            await promise;

            expect(mockPapersStore.delete).toHaveBeenCalledWith(100);
            expect(mockCollectionsStore.delete).toHaveBeenCalledWith(200);
            expect(mockAnnotationsStore.delete).toHaveBeenCalledWith(300);
        });
    });

    describe('getSyncStatusInfo', () => {
        it('should return local status when rate limited', async () => {
            utilsModule.isRateLimited.mockReturnValue(true);

            // Setup pending changes
            trackPaperCreated({ title: 'New Paper' });

            // Mock getLastSyncedAt helper (it reads from localStorage)
            mockLocalStorage['citavers_last_synced_at'] = '2023-01-01T00:00:00Z';

            const status = await getSyncStatusInfo();

            expect(status.hasPendingChanges).toBe(true);
            expect(status.pendingChangeCounts.papers.created).toBe(1);
            expect(status.lastSyncedAt).toBe('2023-01-01T00:00:00Z');
            expect(syncApiModule.getSyncStatus).not.toHaveBeenCalled();
        });

        it('should return server status when not rate limited', async () => {
            utilsModule.isRateLimited.mockReturnValue(false);

            syncApiModule.getSyncStatus.mockResolvedValue({
                lastSyncedAt: '2023-01-02T00:00:00Z',
                counts: { papers: 5, collections: 2, annotations: 10 }
            });
            syncApiModule.getClientId.mockReturnValue('client-123');

            const status = await getSyncStatusInfo();

            expect(status.lastSyncedAt).toBe('2023-01-02T00:00:00Z');
            expect(status.serverCounts.papers).toBe(5);
            expect(status.clientId).toBe('client-123');
            expect(syncApiModule.getSyncStatus).toHaveBeenCalled();
        });

        it('should handle errors', async () => {
            utilsModule.isRateLimited.mockReturnValue(false);
            syncApiModule.getSyncStatus.mockRejectedValue(new Error('API Error'));

            await expect(getSyncStatusInfo()).rejects.toThrow('API Error');
        });
    });

    describe('performSync', () => {
        it('should perform full sync if never synced', async () => {
            // No last synced time
            mockLocalStorage['citavers_last_synced_at'] = null;

            // Mock fullSync implementation to return immediately
            syncApiModule.fullSync.mockResolvedValue({ papers: [], collections: [], annotations: [] });
            mockPapersStore.clear.mockReturnValue({});
            mockCollectionsStore.clear.mockReturnValue({});
            mockAnnotationsStore.clear.mockReturnValue({});
            mockPapersStore.getAll.mockReturnValue({ onsuccess: null, onerror: null, result: [] });

            const promise = performSync();

            await new Promise(resolve => setTimeout(resolve, 0));
            if (mockTransaction.oncomplete) mockTransaction.oncomplete();
            await new Promise(resolve => setTimeout(resolve, 0));
            if (mockPapersStore.getAll.mock.results[0]?.value?.onsuccess) mockPapersStore.getAll.mock.results[0].value.onsuccess({ target: { result: [] } });

            await promise;

            expect(syncApiModule.fullSync).toHaveBeenCalled();
            expect(syncApiModule.incrementalSync).not.toHaveBeenCalled();
        });

        it('should perform incremental sync if previously synced', async () => {
            mockLocalStorage['citavers_last_synced_at'] = 'some-date';

            syncApiModule.incrementalSync.mockResolvedValue({
                syncedAt: 'now',
                appliedChanges: {},
                serverChanges: {}
            });
            mockPapersStore.getAll.mockReturnValue({ onsuccess: null, onerror: null, result: [] });

            const promise = performSync();

            await new Promise(resolve => setTimeout(resolve, 0));
            if (mockPapersStore.getAll.mock.results[0]?.value?.onsuccess) mockPapersStore.getAll.mock.results[0].value.onsuccess({ target: { result: [] } });

            await promise;

            expect(syncApiModule.incrementalSync).toHaveBeenCalled();
            expect(syncApiModule.fullSync).not.toHaveBeenCalled();
        });
    });
});
