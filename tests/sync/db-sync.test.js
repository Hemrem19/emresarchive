/**
 * Tests for db/sync.js
 * Sync orchestrator: change tracking, server change application, sync orchestration
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
    getPendingChanges,
    trackPaperCreated,
    trackPaperUpdated,
    trackPaperDeleted,
    trackFolderCreated,
    trackFolderUpdated,
    trackFolderDeleted,
    trackAnnotationCreated,
    trackAnnotationUpdated,
    trackAnnotationDeleted,
    performFullSync,
    performIncrementalSync,
    performSync,
    getSyncStatusInfo,
    clearMockSync as resetSyncState
} from '../../db/sync.js';
import { createMockPaper, createMockFolder, createMockAnnotation, resetAllMocks, setMockAuth, setMockSyncEnabled, clearMockSync } from '../helpers.js';

// Mock the sync API functions - need to include mapping functions
vi.mock('../../api/sync.js', async (importOriginal) => {
    const actual = await importOriginal();
    return {
        ...actual,
        fullSync: vi.fn(),
        incrementalSync: vi.fn(),
        getSyncStatus: vi.fn(),
        getClientId: vi.fn(() => 'test-client-id')
    };
});

describe('db/sync.js - Change Tracking', () => {
    beforeEach(() => {
        resetAllMocks();
        clearMockSync();
        resetSyncState(); // Reset in-memory pending changes
        setMockAuth(true);
        setMockSyncEnabled(true);
    });

    describe('getPendingChanges', () => {
        it('should return empty changes when no changes tracked', () => {
            const changes = getPendingChanges();
            expect(changes).toEqual({
                papers: { created: [], updated: [], deleted: [] },
                folders: { created: [], updated: [], deleted: [] },
                paperFolders: { created: [], deleted: [] },
                annotations: { created: [], updated: [], deleted: [] }
            });
        });

        it('should return tracked changes', () => {
            const paper = createMockPaper({ title: 'Test Paper' });
            trackPaperCreated(paper);
            
            const changes = getPendingChanges();
            expect(changes.papers.created).toHaveLength(1);
            expect(changes.papers.created[0].title).toBe('Test Paper');
        });
    });


    describe('Paper change tracking', () => {
        it('should track paper creation', () => {
            const paper = createMockPaper({ id: 1, title: 'New Paper' });
            trackPaperCreated(paper);
            
            const changes = getPendingChanges();
            expect(changes.papers.created).toHaveLength(1);
            expect(changes.papers.created[0].id).toBe(1);
            expect(changes.papers.created[0].title).toBe('New Paper');
        });

        it('should track paper update', () => {
            trackPaperUpdated(1, { title: 'Updated Title' });
            
            const changes = getPendingChanges();
            expect(changes.papers.updated).toHaveLength(1);
            expect(changes.papers.updated[0].id).toBe(1);
            expect(changes.papers.updated[0].title).toBe('Updated Title');
        });

        it('should track paper deletion', () => {
            trackPaperDeleted(1);
            
            const changes = getPendingChanges();
            expect(changes.papers.deleted).toContain(1);
        });

        it('should track multiple paper changes', () => {
            const paper1 = createMockPaper({ id: 1 });
            const paper2 = createMockPaper({ id: 2 });
            trackPaperCreated(paper1);
            trackPaperCreated(paper2);
            
            // Update an existing paper (not in created list)
            trackPaperUpdated(3, { title: 'Updated' });
            
            trackPaperDeleted(4);
            
            const changes = getPendingChanges();
            expect(changes.papers.created).toHaveLength(2);
            expect(changes.papers.updated).toHaveLength(1);
            expect(changes.papers.updated[0].id).toBe(3);
            expect(changes.papers.deleted).toHaveLength(1);
            expect(changes.papers.deleted[0]).toBe(4);
        });

        it('should update created paper in created list when updated', () => {
            const paper1 = createMockPaper({ id: 1, localId: 1 });
            trackPaperCreated(paper1);
            
            // Updating a paper that was just created updates it in the created list
            trackPaperUpdated(1, { title: 'Updated Title' });
            
            const changes = getPendingChanges();
            expect(changes.papers.created).toHaveLength(1);
            expect(changes.papers.created[0].title).toBe('Updated Title');
            expect(changes.papers.updated).toHaveLength(0);
        });
    });

    describe('Folder change tracking', () => {
        it('should track folder creation', () => {
            const folder = createMockFolder({ id: 1, name: 'New Folder' });
            trackFolderCreated(folder);

            const changes = getPendingChanges();
            expect(changes.folders.created).toHaveLength(1);
            expect(changes.folders.created[0].id).toBe(1);
        });

        it('should track folder update', () => {
            trackFolderUpdated(1, { name: 'Updated Name' });

            const changes = getPendingChanges();
            expect(changes.folders.updated).toHaveLength(1);
        });

        it('should track folder deletion', () => {
            trackFolderDeleted(1);

            const changes = getPendingChanges();
            expect(changes.folders.deleted).toContain(1);
        });
    });

    describe('Annotation change tracking', () => {
        it('should track annotation creation', () => {
            const annotation = createMockAnnotation({ id: 1 });
            trackAnnotationCreated(annotation);
            
            const changes = getPendingChanges();
            expect(changes.annotations.created).toHaveLength(1);
        });

        it('should track annotation update', () => {
            trackAnnotationUpdated(1, { content: 'Updated content' });
            
            const changes = getPendingChanges();
            expect(changes.annotations.updated).toHaveLength(1);
        });

        it('should track annotation deletion', () => {
            trackAnnotationDeleted(1);
            
            const changes = getPendingChanges();
            expect(changes.annotations.deleted).toContain(1);
        });
    });
});

// Note: prepareChangesForSync is internal and tested via performIncrementalSync

// Note: applyServerChanges is internal and tested via performFullSync/performIncrementalSync

describe('db/sync.js - Sync Orchestration', () => {
    beforeEach(() => {
        resetAllMocks();
        clearMockSync();
        resetSyncState(); // Reset in-memory pending changes
        setMockAuth(true);
        setMockSyncEnabled(true);
    });

    describe('performSync (shim)', () => {
        it('should resolve successfully', async () => {
            await expect(performSync()).resolves.not.toThrow();
        });

        it('should set lastSyncedAt', async () => {
            await performSync();
            expect(localStorage.getItem('citavers_last_synced_at')).toBeTruthy();
        });
    });

    describe('performFullSync (shim)', () => {
        it('should return success', async () => {
            const result = await performFullSync();
            expect(result.success).toBe(true);
        });

        it('should clear pending changes', async () => {
            trackPaperCreated(createMockPaper({ id: 1 }));
            await performFullSync();
            const changes = getPendingChanges();
            expect(changes.papers.created).toHaveLength(0);
        });
    });

    describe('performIncrementalSync (shim)', () => {
        it('should return success', async () => {
            const result = await performIncrementalSync();
            expect(result.success).toBe(true);
        });

        it('should clear pending changes', async () => {
            trackPaperCreated(createMockPaper({ id: 1, title: 'Local Paper' }));
            await performIncrementalSync();
            const changes = getPendingChanges();
            expect(changes.papers.created).toHaveLength(0);
        });
    });

    describe('getSyncStatusInfo', () => {
        it('should return sync status with pending changes', async () => {
            trackPaperCreated(createMockPaper());
            trackPaperUpdated(1, { title: 'Updated' });

            const status = await getSyncStatusInfo();

            expect(status.hasPendingChanges).toBe(true);
            expect(status.pendingChangeCounts.papers.created).toBe(1);
            expect(status.pendingChangeCounts.papers.updated).toBe(1);
        });

        it('should return sync status without pending changes', async () => {
            const status = await getSyncStatusInfo();

            expect(status.hasPendingChanges).toBe(false);
            expect(status.pendingChangeCounts.papers.created).toBe(0);
        });

        it('should return serverCounts as empty object (shim)', async () => {
            const status = await getSyncStatusInfo();
            expect(status.serverCounts).toEqual({});
        });
    });
});

