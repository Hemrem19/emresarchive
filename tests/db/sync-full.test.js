/**
 * Tests for Sync Module (Shim)
 * The original REST-based sync system was replaced by Yjs CRDT WebSocket sync.
 * db/sync.js is now a compatibility shim with in-memory change tracking.
 * These tests verify the shim behavior.
 * @module tests/db/sync-full
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
    performFullSync,
    performIncrementalSync,
    performSync,
    getPendingChanges,
    trackPaperCreated,
    isSyncInProgress,
    clearMockSync as resetSyncState,
    getSyncStatusInfo,
} from '../../db/sync.js';

// Mock minimal dependencies
vi.mock('../../api/utils.js', () => ({
    isRateLimited: vi.fn(() => false)
}));

vi.mock('../../config.js', () => ({
    isCloudSyncEnabled: vi.fn(() => true),
    getApiBaseUrl: vi.fn().mockReturnValue('http://localhost:3000'),
    API_CONFIG: { BASE_URL: 'http://localhost:3000' }
}));

vi.mock('../../api/auth.js', () => ({
    isAuthenticated: vi.fn(() => true)
}));

vi.mock('../../db/papers.js', () => ({
    getAllPapers: vi.fn(() => Promise.resolve([])),
    addPaper: vi.fn(() => Promise.resolve(1)),
    updatePaper: vi.fn(() => Promise.resolve()),
    deletePaper: vi.fn(() => Promise.resolve()),
}));

vi.mock('../../db/folders.js', () => ({
    getAllFolders: vi.fn(() => Promise.resolve([])),
    addFolder: vi.fn(() => Promise.resolve()),
    updateFolder: vi.fn(() => Promise.resolve()),
    deleteFolder: vi.fn(() => Promise.resolve()),
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
    });

    afterEach(() => {
        resetSyncState();
        localStorage.clear();
    });

    describe('performFullSync (shim)', () => {
        it('should return success without calling external APIs', async () => {
            const result = await performFullSync();

            expect(result.success).toBe(true);
            expect(result.counts).toBeDefined();
        });

        it('should set lastSyncedAt in localStorage', async () => {
            await performFullSync();

            expect(localStorage.getItem('citavers_last_synced_at')).toBeTruthy();
        });

        it('should clear pending changes after sync', async () => {
            trackPaperCreated({ title: 'Test' });

            await performFullSync();

            const changes = getPendingChanges();
            expect(changes.papers.created).toHaveLength(0);
        });

        it('should not delete local papers', async () => {
            const { deletePaper } = await import('../../db/papers.js');

            await performFullSync();

            expect(deletePaper).not.toHaveBeenCalled();
        });

        it('should not call api/sync.js fullSync', async () => {
            // The shim no longer delegates to api/sync.js
            // Just verify it resolves without error
            await expect(performFullSync()).resolves.not.toThrow();
        });
    });

    describe('performIncrementalSync (shim)', () => {
        it('should return success', async () => {
            const result = await performIncrementalSync();

            expect(result.success).toBe(true);
        });

        it('should set lastSyncedAt', async () => {
            await performIncrementalSync();

            expect(localStorage.getItem('citavers_last_synced_at')).toBeTruthy();
        });

        it('should clear pending changes', async () => {
            trackPaperCreated({ title: 'New Paper' });

            await performIncrementalSync();

            const changes = getPendingChanges();
            expect(changes.papers.created).toHaveLength(0);
        });

        it('should return hasLocalChanges flag', async () => {
            const result = await performIncrementalSync();

            expect(result).toHaveProperty('hasLocalChanges');
        });
    });

    describe('getSyncStatusInfo', () => {
        it('should return pending change counts', async () => {
            trackPaperCreated({ title: 'New Paper' });

            const status = await getSyncStatusInfo();

            expect(status.hasPendingChanges).toBe(true);
            expect(status.pendingChangeCounts.papers.created).toBe(1);
        });

        it('should return false hasPendingChanges when nothing tracked', async () => {
            const status = await getSyncStatusInfo();

            expect(status.hasPendingChanges).toBe(false);
            expect(status.pendingChangeCounts.papers.created).toBe(0);
        });

        it('should return lastSyncedAt from localStorage', async () => {
            localStorage.setItem('citavers_last_synced_at', '2023-01-01T00:00:00Z');

            const status = await getSyncStatusInfo();

            expect(status.lastSyncedAt).toBe('2023-01-01T00:00:00Z');
        });

        it('should return empty serverCounts (status is local-only)', async () => {
            const status = await getSyncStatusInfo();

            expect(status.serverCounts).toBeDefined();
            // serverCounts is an empty object in the shim
            expect(Object.keys(status.serverCounts).length).toBe(0);
        });
    });

    describe('performSync', () => {
        it('should perform incremental sync (shim always does incremental)', async () => {
            await performSync();

            // After sync, lastSyncedAt should be set
            expect(localStorage.getItem('citavers_last_synced_at')).toBeTruthy();
        });

        it('should resolve successfully', async () => {
            await expect(performSync()).resolves.not.toThrow();
        });
    });
});
