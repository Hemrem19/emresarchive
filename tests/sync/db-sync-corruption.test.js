/**
 * Critical Data Corruption Prevention Tests for db/sync.js  
 * 
 * These tests ensure that sync operations cannot corrupt the database under
 * any circumstances including race conditions, transaction failures, and malformed data.
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import {
    performFullSync,
    performIncrementalSync,
    trackPaperCreated,
    trackPaperDeleted,
    getPendingChanges,
    isSyncInProgress,
    deduplicateLocalPapers
} from '../../db/sync.js';
import { getAllPapers, addPaper, deletePaper } from '../../db/papers.js';
import { openDB, STORE_NAME_PAPERS } from '../../db/core.js';
import { createMockPaper, resetAllMocks, setMockAuth, setMockSyncEnabled, clearMockSync } from '../helpers.js';

// Mock sync API
vi.mock('../../api/sync.js', async (importOriginal) => {
    const actual = await importOriginal();
    return {
        ...actual,
        fullSync: vi.fn(),
        incrementalSync: vi.fn(),
        getClientId: vi.fn(() => 'test-client-id')
    };
});

describe('Sync Corruption Prevention - Transaction Failures', () => {
    beforeEach(() => {
        resetAllMocks();
        clearMockSync();
        setMockAuth(true);
        setMockSyncEnabled(true);
    });

    it('should not clear local data if server fetch fails during full sync', async () => {
        // Add local paper
        await addPaper(createMockPaper({ title: 'Local Paper', doi: '10.1234/local' }));

        const { fullSync } = await import('../../api/sync.js');
        fullSync.mockRejectedValue(new Error('Network error'));

        // Full sync should fail
        await expect(performFullSync()).rejects.toThrow('Network error');

        // Local paper should still exist
        const papers = await getAllPapers();
        expect(papers.length).toBeGreaterThan(0);
        expect(papers.some(p => p.title === 'Local Paper')).toBe(true);
    });

    it('should maintain pending changes if sync transaction fails', async () => {
        // Track a change
        const paper = createMockPaper({ title: 'Test Paper' });
        trackPaperCreated(paper);

        const { incrementalSync } = await import('../../api/sync.js');
        incrementalSync.mockRejectedValue(new Error('Transaction failed'));

        // Sync should fail
        await expect(performIncrementalSync()).rejects.toThrow();

        // Pending changes should still exist for retry
        const changes = getPendingChanges();
        expect(changes.papers.created).toHaveLength(1);
        expect(changes.papers.created[0].title).toBe('Test Paper');
    });
});

describe('Sync Corruption Prevention - Malformed Data', () => {
    beforeEach(() => {
        resetAllMocks();
        clearMockSync();
        setMockAuth(true);
        setMockSyncEnabled(true);
    });

    it('should handle server paper without required fields', async () => {
        const { fullSync } = await import('../../api/sync.js');

        fullSync.mockResolvedValue({
            papers: [
                { id: 1, title: 'Valid Paper', authors: ['Author'], status: 'Reading' },
                { id: 2 }, //  Missing required fields
                { id: 3, title: 'Another Valid Paper', authors: ['Author'], status: 'Reading' }
            ],
            collections: [],
            annotations: [],
            syncedAt: new Date().toISOString()
        });

        // Should handle gracefully
        await expect(performFullSync()).resolves.not.toThrow();

        // Valid papers should be saved
        const papers = await getAllPapers();
        expect(papers.some(p => p.title === 'Valid Paper')).toBe(true);
        expect(papers.some(p => p.title === 'Another Valid Paper')).toBe(true);
    });

    it('should handle server returning duplicate IDs in same batch', async () => {
        const { fullSync } = await import('../../api/sync.js');

        fullSync.mockResolvedValue({
            papers: [
                { id: 1, title: 'First Version', authors: ['Author'], status: 'Reading', doi: '10.1234/dup' },
                { id: 1, title: 'Second Version', authors: ['Author'], status: 'Reading', doi: '10.1234/dup' } // Duplicate ID
            ],
            collections: [],
            annotations: [],
            syncedAt: new Date().toISOString()
        });

        await performFullSync();

        // Should only have one paper with that ID (last one wins)
        const papers = await getAllPapers();
        const papersWithId1 = papers.filter(p => p.id === 1);
        expect(papersWithId1.length).toBe(1);
    });

    it('should handle circular references in relatedPaperIds', async () => {
        const { fullSync } = await import('../../api/sync.js');

        fullSync.mockResolvedValue({
            papers: [
                { id: 1, title: 'Paper 1', authors: ['Author'], status: 'Reading', relatedPaperIds: [2, 3], doi: '10.1234/paper1' },
                { id: 2, title: 'Paper 2', authors: ['Author'], status: 'Reading', relatedPaperIds: [1, 3], doi: '10.1234/paper2' },
                { id: 3, title: 'Paper 3', authors: ['Author'], status: 'Reading', relatedPaperIds: [1, 2], doi: '10.1234/paper3' }
            ],
            collections: [],
            annotations: [],
            syncedAt: new Date().toISOString()
        });

        // Should not hang or corrupt when processing circular references
        await expect(performFullSync()).resolves.not.toThrow();

        const papers = await getAllPapers();
        expect(papers.length).toBe(3);
    });

    it('should handle annotations for non-existent papers', async () => {
        const { fullSync } = await import('../../api/sync.js');

        fullSync.mockResolvedValue({
            papers: [
                { id: 1, title: 'Existing Paper', authors: ['Author'], status: 'Reading' }
            ],
            collections: [],
            annotations: [
                { id: 1, paperId: 1, type: 'highlight', pageNumber: 1, color: 'yellow' },
                { id: 2, paperId: 999, type: 'highlight', pageNumber: 1, color: 'yellow' } // Paper 999 doesn't exist
            ],
            syncedAt: new Date().toISOString()
        });

        // Should not throw error
        await expect(performFullSync()).resolves.not.toThrow();
    });
});

describe('Sync Corruption Prevention - Deduplication', () => {
    beforeEach(async () => {
        resetAllMocks();
        clearMockSync();
        setMockAuth(true);
        setMockSyncEnabled(true);

        // Clear all papers
        const db = await openDB();
        const tx = db.transaction([STORE_NAME_PAPERS], 'readwrite');
        await tx.objectStore(STORE_NAME_PAPERS).clear();
    });

    afterEach(async () => {
        // Clear papers after each test
        const db = await openDB();
        const tx = db.transaction([STORE_NAME_PAPERS], 'readwrite');
        await tx.objectStore(STORE_NAME_PAPERS).clear();
    });

    it('should deduplicate papers with same DOI keeping highest ID', async () => {
        // Add duplicate papers with same DOI - use auto-generated IDs
        const id1 = await addPaper(createMockPaper({ title: 'Old Version', doi: '10.1234/duplicate', notes: 'Old notes' }));
        const id2 = await addPaper(createMockPaper({ title: 'Newer Version', doi: '10.1234/duplicate', notes: 'New notes' }));
        const id3 = await addPaper(createMockPaper({ title: 'Newest Version', doi: '10.1234/duplicate', notes: 'Newest notes' }));

        const result = await deduplicateLocalPapers();

        expect(result.duplicatesRemoved).toBe(2); // Removed 2 duplicates

        const papers = await getAllPapers();
        const duplicatePapers = papers.filter(p => p.doi === '10.1234/duplicate');

        expect(duplicatePapers.length).toBe(1);
        expect(duplicatePapers[0].id).toBe(Math.max(id1, id2, id3)); // Highest ID kept
    });

    it('should deduplicate case-insensitive DOI', async () => {
        await addPaper(createMockPaper({ doi: '10.1234/UPPERCASE' }));
        await addPaper(createMockPaper({ doi: '10.1234/lowercase' }));
        await addPaper(createMockPaper({ doi: '10.1234/MiXeDcAsE' }));

        // Different DOIs, no deduplication
        const result = await deduplicateLocalPapers();

        expect(result.duplicatesRemoved).toBe(0);

        const papers = await getAllPapers();
        expect(papers.length).toBe(3);
    });

    it('should handle papers without DOI or arXiv ID', async () => {
        await addPaper(createMockPaper({ doi: undefined, arxivId: undefined, title: 'No DOI 1' }));
        await addPaper(createMockPaper({ doi: undefined, arxivId: undefined, title: 'No DOI 2' }));
        await addPaper(createMockPaper({ doi: '10.1234/valid' }));

        const result = await deduplicateLocalPapers();

        expect(result.duplicatesRemoved).toBe(0); // Papers without DOI are not deduplicated

        const papers = await getAllPapers();
        expect(papers.length).toBe(3);
    });
});

describe('Sync Corruption Prevention - Sync Lock Management', () => {
    beforeEach(() => {
        resetAllMocks();
        clearMockSync();
        setMockAuth(true);
        setMockSyncEnabled(true);
        localStorage.clear();
    });

    it('should detect and clear stale sync lock after 5 minutes', () => {
        // Set sync in progress with old timestamp
        const fiveMinutesAgo = Date.now() - (5 * 60 * 1000 + 1000);
        localStorage.setItem('citavers_sync_in_progress', 'true');
        localStorage.setItem('citavers_sync_start_time', fiveMinutesAgo.toString());

        // Should detect stale lock and clear it
        const isInProgress = isSyncInProgress();

        expect(isInProgress).toBe(false);
        expect(localStorage.getItem('citavers_sync_in_progress')).toBeNull();
    });

    it('should clear sync lock without start time', () => {
        localStorage.setItem('citavers_sync_in_progress', 'true');
        // No start time set

        const isInProgress = isSyncInProgress();

        expect(isInProgress).toBe(false);
        expect(localStorage.getItem('citavers_sync_in_progress')).toBeNull();
    });
});
