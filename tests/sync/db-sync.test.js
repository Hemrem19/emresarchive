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
    trackCollectionCreated,
    trackCollectionUpdated,
    trackCollectionDeleted,
    trackAnnotationCreated,
    trackAnnotationUpdated,
    trackAnnotationDeleted,
    performFullSync,
    performIncrementalSync,
    performSync,
    getSyncStatusInfo
} from '../../db/sync.js';
// Import local DB functions directly (not through adapter) for testing
import * as localPapers from '../../db/papers.js';
import * as localCollections from '../../db/collections.js';
import * as localAnnotations from '../../db/annotations.js';
import { createMockPaper, createMockCollection, createMockAnnotation, resetAllMocks, setMockAuth, setMockSyncEnabled, clearMockSync } from '../helpers.js';
import { openDB } from '../../db/core.js';

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
        setMockAuth(true);
        setMockSyncEnabled(true);
    });

    describe('getPendingChanges', () => {
        it('should return empty changes when no changes tracked', () => {
            const changes = getPendingChanges();
            expect(changes).toEqual({
                papers: { created: [], updated: [], deleted: [] },
                collections: { created: [], updated: [], deleted: [] },
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

    describe('Collection change tracking', () => {
        it('should track collection creation', () => {
            const collection = createMockCollection({ id: 1, name: 'New Collection' });
            trackCollectionCreated(collection);
            
            const changes = getPendingChanges();
            expect(changes.collections.created).toHaveLength(1);
            expect(changes.collections.created[0].id).toBe(1);
        });

        it('should track collection update', () => {
            trackCollectionUpdated(1, { name: 'Updated Name' });
            
            const changes = getPendingChanges();
            expect(changes.collections.updated).toHaveLength(1);
        });

        it('should track collection deletion', () => {
            trackCollectionDeleted(1);
            
            const changes = getPendingChanges();
            expect(changes.collections.deleted).toContain(1);
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
        setMockAuth(true);
        setMockSyncEnabled(true);
    });

    describe('performSync', () => {
        it('should perform full sync when never synced before', async () => {
            const { fullSync } = await import('../../api/sync.js');
            fullSync.mockResolvedValue({
                papers: [],
                collections: [],
                annotations: [],
                deleted: { papers: [], collections: [], annotations: [] }
            });

            await performSync();

            expect(fullSync).toHaveBeenCalled();
        });

        it('should perform incremental sync when synced before', async () => {
            localStorage.setItem('citaversa_last_synced_at', new Date().toISOString());
            
            const { incrementalSync } = await import('../../api/sync.js');
            incrementalSync.mockResolvedValue({
                serverChanges: { papers: [], collections: [], annotations: [] },
                appliedChanges: { papers: [], collections: [], annotations: [] },
                syncedAt: new Date().toISOString()
            });

            await performSync();

            expect(incrementalSync).toHaveBeenCalled();
        });
    });

    describe('performFullSync', () => {
        it('should perform full sync and apply server data', async () => {
            const { fullSync } = await import('../../api/sync.js');
            fullSync.mockResolvedValue({
                papers: [
                    { id: 1, title: 'Server Paper', authors: ['Author'], status: 'Reading' }
                ],
                collections: [],
                annotations: [],
                deleted: { papers: [], collections: [], annotations: [] }
            });

            const result = await performFullSync();

            expect(fullSync).toHaveBeenCalled();
            expect(result.success).toBe(true);
            
            // Verify server data was applied
            const papers = await localPapers.getAllPapers();
            expect(papers).toHaveLength(1);
            expect(papers[0].title).toBe('Server Paper');
            expect(papers[0].readingStatus).toBe('Reading'); // status mapped to readingStatus
        });

        it('should throw error when cloud sync not enabled', async () => {
            setMockSyncEnabled(false);

            await expect(performFullSync()).rejects.toThrow('Cloud sync is not enabled');
        });

        it('should throw error when not authenticated', async () => {
            setMockAuth(false);
            setMockSyncEnabled(true);

            await expect(performFullSync()).rejects.toThrow('Cloud sync is not enabled');
        });
    });

    describe('performIncrementalSync', () => {
        it('should send local changes and apply server changes', async () => {
            // Track local changes
            trackPaperCreated(createMockPaper({ id: 1, title: 'Local Paper' }));
            
            const { incrementalSync } = await import('../../api/sync.js');
            incrementalSync.mockResolvedValue({
                serverChanges: {
                    papers: [{ id: 2, title: 'Server Paper', authors: ['Author'], status: 'Reading' }],
                    collections: [],
                    annotations: []
                },
                appliedChanges: {
                    papers: [{ id: 1 }],
                    collections: [],
                    annotations: []
                },
                syncedAt: new Date().toISOString()
            });

            const result = await performIncrementalSync();

            expect(incrementalSync).toHaveBeenCalled();
            expect(result.success).toBe(true);
            
            // Verify server changes were applied
            const papers = await localPapers.getAllPapers();
            expect(papers.some(p => p.title === 'Server Paper')).toBe(true);
        });
    });

    describe('getSyncStatusInfo', () => {
        it('should return sync status with pending changes', async () => {
            trackPaperCreated(createMockPaper());
            trackPaperUpdated(1, { title: 'Updated' });

            const { getSyncStatus } = await import('../../api/sync.js');
            getSyncStatus.mockResolvedValue({
                lastSyncedAt: new Date().toISOString(),
                counts: { papers: 10, collections: 2, annotations: 5 }
            });

            const status = await getSyncStatusInfo();

            expect(status.hasPendingChanges).toBe(true);
            expect(status.pendingChangeCounts.papers.created).toBe(1);
            expect(status.pendingChangeCounts.papers.updated).toBe(1);
            expect(status.serverCounts.papers).toBe(10);
        });

        it('should return sync status without pending changes', async () => {
            const { getSyncStatus } = await import('../../api/sync.js');
            getSyncStatus.mockResolvedValue({
                lastSyncedAt: new Date().toISOString(),
                counts: { papers: 10 }
            });

            const status = await getSyncStatusInfo();

            expect(status.hasPendingChanges).toBe(false);
            expect(status.pendingChangeCounts.papers.created).toBe(0);
        });
    });
});

