/**
 * Full Coverage Tests for Sync Module
 * Covers performFullSync, performIncrementalSync, getSyncStatusInfo, and isSyncInProgress
 * @module tests/db/sync-full
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import {
    performFullSync,
    performIncrementalSync,
    performSync,
    getPendingChanges,
    trackPaperCreated,
    isSyncInProgress,
    clearMockSync as resetSyncState,
} from '../../db/sync.js';
import * as configModule from '../../config.js';
import * as authModule from '../../api/auth.js';
import * as syncApiModule from '../../api/sync.js';
import { getSyncStatusInfo } from '../../db/sync.js';

// Mock all dependencies of db/sync.js using higher-level module mocks
vi.mock('../../api/utils.js', () => ({
    isRateLimited: vi.fn(() => false)
}));
import * as utilsModule from '../../api/utils.js';

vi.mock('../../config.js', () => ({
    isCloudSyncEnabled: vi.fn(() => true),
    getApiBaseUrl: vi.fn().mockReturnValue('http://localhost:3000'),
    API_CONFIG: { BASE_URL: 'http://localhost:3000' }
}));

vi.mock('../../api/auth.js', () => ({
    isAuthenticated: vi.fn(() => true)
}));

vi.mock('../../api/sync.js', () => ({
    fullSync: vi.fn(),
    incrementalSync: vi.fn(),
    getSyncStatus: vi.fn(),
    getClientId: vi.fn(() => 'client-123'),
    mapPaperFromApi: vi.fn(p => p),
    mapCollectionFromApi: vi.fn(c => c),
    mapAnnotationFromApi: vi.fn(a => a),
    mapPaperToApi: vi.fn(p => p),
    mapCollectionToApi: vi.fn(c => c),
    mapAnnotationToApi: vi.fn(a => a),
    getLastSyncedAt: vi.fn(() => null),
    setLastSyncedAt: vi.fn(),
}));

vi.mock('../../db/papers.js', () => ({
    getAllPapers: vi.fn(() => Promise.resolve([])),
    addPaper: vi.fn(() => Promise.resolve(1)),
    updatePaper: vi.fn(() => Promise.resolve()),
    deletePaper: vi.fn(() => Promise.resolve()),
}));

vi.mock('../../db/collections.js', () => ({
    getAllCollections: vi.fn(() => Promise.resolve([])),
    addCollection: vi.fn(() => Promise.resolve()),
    updateCollection: vi.fn(() => Promise.resolve()),
    deleteCollection: vi.fn(() => Promise.resolve()),
}));

vi.mock('../../db/annotations.js', () => ({
    getAnnotationsByPaperId: vi.fn(() => Promise.resolve([])),
    addAnnotation: vi.fn(() => Promise.resolve()),
    updateAnnotation: vi.fn(() => Promise.resolve()),
    deleteAnnotation: vi.fn(() => Promise.resolve()),
}));

describe('Sync Module Full Coverage', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        resetSyncState();
        localStorage.clear();

        // Default mocks
        configModule.isCloudSyncEnabled.mockReturnValue(true);
        authModule.isAuthenticated.mockReturnValue(true);
        utilsModule.isRateLimited.mockReturnValue(false);
    });

    afterEach(() => {
        resetSyncState();
        localStorage.clear();
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
            localStorage.setItem('citavers_sync_in_progress', 'true');
            localStorage.setItem('citavers_sync_start_time', Date.now().toString());
            await expect(performFullSync()).rejects.toThrow('Sync already in progress');
        });

        it('should perform successful full sync', async () => {
            const { getAllPapers, addPaper, deletePaper } = await import('../../db/papers.js');
            getAllPapers.mockResolvedValue([{ id: 99, title: 'Old Paper' }]);
            addPaper.mockResolvedValue(1);
            deletePaper.mockResolvedValue();

            syncApiModule.fullSync.mockResolvedValue({
                papers: [{ id: 1, title: 'Server Paper', authors: [] }],
                collections: [],
                annotations: [],
                syncedAt: '2023-01-01T00:00:00Z'
            });

            const result = await performFullSync();

            expect(result.success).toBe(true);
            expect(result.counts.papers).toBe(1);
            expect(deletePaper).toHaveBeenCalledWith(99); // Old paper cleared
            expect(addPaper).toHaveBeenCalled(); // New paper added
        });

        it('should not clear local data if server fetch fails', async () => {
            const { getAllPapers, deletePaper } = await import('../../db/papers.js');
            getAllPapers.mockResolvedValue([{ id: 1, title: 'Local Paper' }]);

            syncApiModule.fullSync.mockRejectedValue(new Error('Network error'));

            await expect(performFullSync()).rejects.toThrow('Network error');

            // deletePaper should NOT have been called
            expect(deletePaper).not.toHaveBeenCalled();
        });

        it('should skip malformed papers without title', async () => {
            const { getAllPapers, addPaper } = await import('../../db/papers.js');
            getAllPapers.mockResolvedValue([]);

            syncApiModule.fullSync.mockResolvedValue({
                papers: [
                    { id: 1, title: 'Valid Paper' },
                    { id: 2 }, // No title — malformed
                ],
                collections: [],
                annotations: [],
                syncedAt: '2023-01-01T00:00:00Z'
            });

            await performFullSync();
            expect(addPaper).toHaveBeenCalledTimes(1); // Only the valid paper
        });
    });

    describe('performIncrementalSync', () => {
        it('should throw if cloud sync is disabled', async () => {
            configModule.isCloudSyncEnabled.mockReturnValue(false);
            await expect(performIncrementalSync()).rejects.toThrow('Cloud sync is not enabled');
        });

        it('should skip if sync is in progress', async () => {
            localStorage.setItem('citavers_sync_in_progress', 'true');
            localStorage.setItem('citavers_sync_start_time', Date.now().toString());
            await expect(performIncrementalSync()).rejects.toThrow('Sync already in progress');
        });

        it('should perform successful incremental sync with local changes', async () => {
            trackPaperCreated({ title: 'New Paper' });

            syncApiModule.incrementalSync.mockResolvedValue({
                syncedAt: '2023-01-02T00:00:00Z',
                appliedChanges: { papers: [{ id: 1 }], conflicts: [] },
                serverChanges: {
                    papers: [{ id: 2, title: 'Server Update' }],
                    collections: [],
                    annotations: [],
                    deleted: {}
                }
            });

            const result = await performIncrementalSync();

            expect(result.success).toBe(true);
            expect(result.hasLocalChanges).toBe(true);
            expect(result.serverChangeCount.papers).toBe(1);
            expect(syncApiModule.incrementalSync).toHaveBeenCalled();
        });

        it('should preserve pending changes if incremental sync fails', async () => {
            trackPaperCreated({ title: 'Pending Paper' });

            syncApiModule.incrementalSync.mockRejectedValue(new Error('Transaction failed'));

            await expect(performIncrementalSync()).rejects.toThrow('Transaction failed');

            // Pending changes should be preserved
            const changes = getPendingChanges();
            expect(changes.papers.created).toHaveLength(1);
        });

        it('should apply server deletions', async () => {
            const { deletePaper } = await import('../../db/papers.js');
            const { deleteCollection } = await import('../../db/collections.js');
            const { deleteAnnotation } = await import('../../db/annotations.js');

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

            await performIncrementalSync();

            expect(deletePaper).toHaveBeenCalledWith(100);
            expect(deleteCollection).toHaveBeenCalledWith(200);
            expect(deleteAnnotation).toHaveBeenCalledWith(300);
        });

        it('should handle de-duplication during sync (DOI match)', async () => {
            const { getAllPapers, deletePaper, addPaper } = await import('../../db/papers.js');
            // Existing paper with same DOI as server paper
            getAllPapers.mockResolvedValue([{ id: 10, title: 'Local Duplicate', doi: '10.1234/test' }]);

            syncApiModule.incrementalSync.mockResolvedValue({
                syncedAt: 'now',
                appliedChanges: {},
                serverChanges: {
                    papers: [{ id: 20, title: 'Server Original', doi: '10.1234/test' }],
                    collections: [], annotations: [], deleted: {}
                }
            });

            await performIncrementalSync();

            // Server paper should be upserted
            expect(addPaper).toHaveBeenCalled();
        });

        it('should handle server deletions', async () => {
            const { deletePaper } = await import('../../db/papers.js');

            syncApiModule.incrementalSync.mockResolvedValue({
                syncedAt: 'now',
                appliedChanges: {},
                serverChanges: {
                    papers: [], collections: [], annotations: [],
                    deleted: { papers: [100], collections: [], annotations: [] }
                }
            });

            await performIncrementalSync();
            expect(deletePaper).toHaveBeenCalledWith(100);
        });
    });

    describe('getSyncStatusInfo', () => {
        it('should return local status when rate limited', async () => {
            utilsModule.isRateLimited.mockReturnValue(true);

            trackPaperCreated({ title: 'New Paper' });
            localStorage.setItem('citavers_last_synced_at', '2023-01-01T00:00:00Z');

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
            syncApiModule.fullSync.mockResolvedValue({
                papers: [], collections: [], annotations: [], syncedAt: '2023-01-01T00:00:00Z'
            });
            const { getAllPapers } = await import('../../db/papers.js');
            getAllPapers.mockResolvedValue([]);

            await performSync();
            expect(syncApiModule.fullSync).toHaveBeenCalled();
            expect(syncApiModule.incrementalSync).not.toHaveBeenCalled();
        });

        it('should perform incremental sync if previously synced', async () => {
            localStorage.setItem('citavers_last_synced_at', 'some-date');

            syncApiModule.incrementalSync.mockResolvedValue({
                syncedAt: 'now',
                appliedChanges: {},
                serverChanges: {}
            });

            await performSync();
            expect(syncApiModule.incrementalSync).toHaveBeenCalled();
            expect(syncApiModule.fullSync).not.toHaveBeenCalled();
        });
    });
});
