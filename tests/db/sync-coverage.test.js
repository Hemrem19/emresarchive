/**
 * Coverage Tests for Sync Module
 * Focuses on change tracking, sync locking, and de-duplication logic
 * @module tests/db/sync-coverage
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import {
    trackPaperUpdated,
    trackPaperDeleted,
    isSyncInProgress,
    deduplicateLocalPapers,
    getPendingChanges
} from '../../db/sync.js';
import * as papersModule from '../../db/papers.js';

// Mock dependencies
vi.mock('../../db/papers.js', () => ({
    getAllPapers: vi.fn(),
    deletePaper: vi.fn(),
    addPaper: vi.fn(),
    updatePaper: vi.fn(),
    getPaperById: vi.fn(),
    getPaperByDoi: vi.fn(),
}));

vi.mock('../../db/core.js', () => ({
    openDB: vi.fn(),
    STORE_NAME_PAPERS: 'papers'
}));

vi.mock('../../config.js', () => ({
    isCloudSyncEnabled: vi.fn().mockReturnValue(true),
    getApiBaseUrl: vi.fn().mockReturnValue('http://localhost:3000'),
    API_CONFIG: { BASE_URL: 'http://localhost:3000' }
}));

vi.mock('../../api/auth.js', () => ({
    isAuthenticated: vi.fn().mockReturnValue(true)
}));

describe('Sync Module Coverage', () => {
    let mockLocalStorage;

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

        // Default: deletePaper resolves successfully
        papersModule.deletePaper.mockResolvedValue(undefined);
    });

    describe('Change Tracking Logic', () => {
        it('should merge updates for the same paper', () => {
            // Initial update
            trackPaperUpdated(1, { title: 'Title 1', version: 1 });

            let changes = getPendingChanges();
            expect(changes.papers.updated).toHaveLength(1);
            expect(changes.papers.updated[0].title).toBe('Title 1');

            // Second update - should merge
            trackPaperUpdated(1, { summary: 'Summary 1', version: 2 });

            changes = getPendingChanges();
            expect(changes.papers.updated).toHaveLength(1);
            expect(changes.papers.updated[0].title).toBe('Title 1');
            expect(changes.papers.updated[0].summary).toBe('Summary 1');
            expect(changes.papers.updated[0].version).toBe(2);
        });

        it('should remove from created/updated lists when deleted', () => {
            // Setup: Add to created and updated
            const changes = {
                papers: {
                    created: [{ localId: 1, title: 'New' }],
                    updated: [{ id: 2, title: 'Updated' }],
                    deleted: []
                },
                collections: { created: [], updated: [], deleted: [] },
                annotations: { created: [], updated: [], deleted: [] }
            };
            mockLocalStorage['citavers_pending_changes'] = JSON.stringify(changes);

            // Delete created paper
            trackPaperDeleted(1);
            let newChanges = getPendingChanges();
            expect(newChanges.papers.created).toHaveLength(0);
            expect(newChanges.papers.deleted).toContain(1);

            // Delete updated paper
            trackPaperDeleted(2);
            newChanges = getPendingChanges();
            expect(newChanges.papers.updated).toHaveLength(0);
            expect(newChanges.papers.deleted).toContain(2);
        });
    });

    describe('Sync Lock Logic', () => {
        it('should clear stale sync lock (> 5 mins)', () => {
            const now = Date.now();
            const sixMinutesAgo = now - (6 * 60 * 1000);

            mockLocalStorage['citavers_sync_in_progress'] = 'true';
            mockLocalStorage['citavers_sync_start_time'] = sixMinutesAgo.toString();

            expect(isSyncInProgress()).toBe(false);
            expect(global.localStorage.removeItem).toHaveBeenCalledWith('citavers_sync_in_progress');
        });

        it('should clear lock if start time is missing', () => {
            mockLocalStorage['citavers_sync_in_progress'] = 'true';
            // No start time

            expect(isSyncInProgress()).toBe(false);
            expect(global.localStorage.removeItem).toHaveBeenCalledWith('citavers_sync_in_progress');
        });

        it('should respect valid sync lock', () => {
            const now = Date.now();
            mockLocalStorage['citavers_sync_in_progress'] = 'true';
            mockLocalStorage['citavers_sync_start_time'] = now.toString();

            expect(isSyncInProgress()).toBe(true);
        });
    });

    describe('Local De-duplication Logic', () => {
        it('should remove duplicate papers by DOI, keeping the newest (highest ID)', async () => {
            const papers = [
                { id: 1, title: 'Old', doi: '10.1234/test' },
                { id: 2, title: 'New', doi: '10.1234/test' }, // Should keep this
                { id: 3, title: 'Unique', doi: '10.5678/unique' }
            ];

            papersModule.getAllPapers.mockResolvedValue(papers);

            const result = await deduplicateLocalPapers();

            // Should delete ID 1 (lower id for duplicate doi)
            expect(papersModule.deletePaper).toHaveBeenCalledWith(1);
            expect(papersModule.deletePaper).not.toHaveBeenCalledWith(2);
            expect(papersModule.deletePaper).not.toHaveBeenCalledWith(3);
            expect(result.duplicatesRemoved).toBe(1);
        });

        it('should remove duplicate papers by arXiv ID', async () => {
            const papers = [
                { id: 10, title: 'Old Arxiv', arxivId: '2101.12345' },
                { id: 20, title: 'New Arxiv', doi: 'arXiv:2101.12345' } // Should match by extracted ID
            ];

            papersModule.getAllPapers.mockResolvedValue(papers);

            await deduplicateLocalPapers();

            // Should delete ID 10 (lower ID)
            expect(papersModule.deletePaper).toHaveBeenCalledWith(10);
            expect(papersModule.deletePaper).not.toHaveBeenCalledWith(20);
        });

        it('should handle errors during de-duplication gracefully', async () => {
            const papers = [
                { id: 1, doi: 'duplicate' },
                { id: 2, doi: 'duplicate' }
            ];

            papersModule.getAllPapers.mockResolvedValue(papers);
            papersModule.deletePaper.mockRejectedValueOnce(new Error('Delete failed'));

            // Should still resolve, swallowing the delete error
            const result = await deduplicateLocalPapers();
            expect(result.duplicatesRemoved).toBe(1);
        });
    });
});
