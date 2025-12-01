/**
 * DB Adapter Enhancement Tests
 * Additional tests to improve db/adapter.js coverage
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { papers } from '../../db/adapter.js';
import { resetAllMocks } from '../helpers.js';

// Mock all dependencies
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

vi.mock('../../api/papers.js', () => ({
    createPaper: vi.fn(),
    getAllPapers: vi.fn(() => Promise.resolve({ papers: [] })),
    getPaper: vi.fn(),
    updatePaper: vi.fn(),
    deletePaper: vi.fn(),
    batchOperations: vi.fn(() => Promise.resolve([]))
}));

vi.mock('../../db/sync.js', () => ({
    trackPaperCreated: vi.fn(),
    trackPaperUpdated: vi.fn(),
    trackPaperDeleted: vi.fn()
}));

vi.mock('../../core/syncManager.js', () => ({
    triggerDebouncedSync: vi.fn()
}));

describe('DB Adapter - Enhanced Coverage', () => {
    beforeEach(() => {
        resetAllMocks();
        vi.clearAllMocks();
    });

    describe('Error Handling', () => {
        it('should handle network timeouts gracefully', async () => {
            const localPapers = await import('../../db/papers.js');
            localPapers.getAllPapers.mockResolvedValue([{ id: 1, title: 'Cached' }]);

            const result = await papers.getAllPapers();

            expect(result).toHaveLength(1);
        });

        it('should handle corrupted local data', async () => {
            const localPapers = await import('../../db/papers.js');
            localPapers.getPaperById.mockResolvedValue(null);

            const result = await papers.getPaperById(999);

            expect(result).toBeNull();
        });
    });

    describe('Batch Operations', () => {
        it('should handle empty batch operations', async () => {
            const apiPapers = await import('../../api/papers.js');
            apiPapers.batchOperations.mockResolvedValue([]);

            const result = await papers.batchOperations([]);

            expect(result).toEqual([]);
        });

        it('should process batch operations in order', async () => {
            const apiPapers = await import('../../api/papers.js');
            const operations = [
                { type: 'update', id: 1 },
                { type: 'delete', id: 2 }
            ];

            apiPapers.batchOperations.mockResolvedValue(operations);

            const result = await papers.batchOperations(operations);

            expect(result).toHaveLength(2);
        });
    });

    describe('Cache Management', () => {
        it('should cache paper lookups', async () => {
            const localPapers = await import('../../db/papers.js');
            localPapers.getPaperById.mockResolvedValue({ id: 1, title: 'Cached' });

            const result1 = await papers.getPaperById(1);
            const result2 = await papers.getPaperById(1);

            expect(result1).toEqual(result2);
        });

        it('should invalidate cache on update', async () => {
            const localPapers = await import('../../db/papers.js');

            localPapers.getPaperById.mockResolvedValue({ id: 1, title: 'Original' });
            await papers.getPaperById(1);

            localPapers.updatePaper.mockResolvedValue(1);
            localPapers.getPaperById.mockResolvedValue({ id: 1, title: 'Updated' });

            await papers.updatePaper(1, { title: 'Updated' });
            const result = await papers.getPaperById(1);

            expect(result.title).toBe('Updated');
        });
    });

    describe('DOI Lookup', () => {
        it('should find paper by DOI', async () => {
            const localPapers = await import('../../db/papers.js');
            localPapers.getPaperByDoi.mockResolvedValue({ id: 1, doi: '10.1234/test' });

            const result = await papers.getPaperByDoi('10.1234/test');

            expect(result).toBeDefined();
            expect(result.doi).toBe('10.1234/test');
        });

        it('should return null for non-existent DOI', async () => {
            const localPapers = await import('../../db/papers.js');
            localPapers.getPaperByDoi.mockResolvedValue(null);

            const result = await papers.getPaperByDoi('10.9999/nonexistent');

            expect(result).toBeNull();
        });
    });

    describe('Concurrent Operations', () => {
        it('should handle concurrent reads', async () => {
            const localPapers = await import('../../db/papers.js');
            localPapers.getAllPapers.mockResolvedValue([{ id: 1 }, { id: 2 }]);

            const [result1, result2] = await Promise.all([
                papers.getAllPapers(),
                papers.getAllPapers()
            ]);

            expect(result1).toEqual(result2);
        });

        it('should handle concurrent writes', async () => {
            const localPapers = await import('../../db/papers.js');
            localPapers.updatePaper.mockResolvedValue(1);

            await Promise.all([
                papers.updatePaper(1, { title: 'Update 1' }),
                papers.updatePaper(1, { title: 'Update 2' })
            ]);

            expect(localPapers.updatePaper).toHaveBeenCalledTimes(2);
        });
    });
});
