/**
 * Coverage Tests for DB Papers Module
 * Focuses on error handling, edge cases, and specific logic branches
 * @module tests/db/papers-coverage
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { addPaper, getAllPapers, getPaperById, getPaperByDoi, updatePaper, deletePaper } from '../../db/papers.js';
import { openDB } from '../../db/core.js';
import * as annotationsModule from '../../db/annotations.js';

// Mock dependencies
vi.mock('../../db/core.js', () => ({
    openDB: vi.fn(),
    STORE_NAME_PAPERS: 'papers',
    STORE_NAME_COLLECTIONS: 'collections',
    STORE_NAME_ANNOTATIONS: 'annotations'
}));

vi.mock('../../db/annotations.js', () => ({
    deleteAnnotationsByPaperId: vi.fn()
}));

describe('DB Papers Coverage', () => {
    let mockDb;
    let mockTransaction;
    let mockStore;

    beforeEach(() => {
        vi.clearAllMocks();

        // Setup common DB mocks
        mockStore = {
            add: vi.fn(),
            put: vi.fn(),
            get: vi.fn(),
            getAll: vi.fn(),
            delete: vi.fn(),
            index: vi.fn()
        };

        mockTransaction = {
            objectStore: vi.fn().mockReturnValue(mockStore)
        };

        mockDb = {
            transaction: vi.fn().mockReturnValue(mockTransaction)
        };

        openDB.mockResolvedValue(mockDb);
    });

    describe('addPaper Error Handling', () => {
        it('should handle QuotaExceededError', async () => {
            const error = new Error('Quota exceeded');
            error.name = 'QuotaExceededError';

            mockStore.add.mockReturnValue({
                onsuccess: null,
                onerror: null
            });

            const promise = addPaper({ title: 'Test Paper' });

            // Wait for openDB to resolve and transaction to start
            await new Promise(resolve => setTimeout(resolve, 0));

            // Trigger error
            const request = mockStore.add.mock.results[0].value;
            request.onerror({ target: { error } });

            await expect(promise).rejects.toThrow('Storage quota exceeded');
        });

        it('should handle ConstraintError (Duplicate)', async () => {
            const error = new Error('Constraint failed');
            error.name = 'ConstraintError';

            mockStore.add.mockReturnValue({ onsuccess: null, onerror: null });
            const promise = addPaper({ title: 'Test Paper' });

            await new Promise(resolve => setTimeout(resolve, 0));

            mockStore.add.mock.results[0].value.onerror({ target: { error } });

            await expect(promise).rejects.toThrow('Duplicate paper');
        });

        it('should handle DataError', async () => {
            const error = new Error('Invalid data');
            error.name = 'DataError';

            mockStore.add.mockReturnValue({ onsuccess: null, onerror: null });
            const promise = addPaper({ title: 'Test Paper' });

            await new Promise(resolve => setTimeout(resolve, 0));

            mockStore.add.mock.results[0].value.onerror({ target: { error } });

            await expect(promise).rejects.toThrow('Invalid paper data');
        });
    });

    describe('getAllPapers Edge Cases', () => {
        it('should handle sorting errors gracefully', async () => {
            // Mock papers where one throws on access to createdAt
            const badPaper = {
                id: 1,
                get createdAt() { throw new Error('Access error'); }
            };

            mockStore.getAll.mockReturnValue({
                onsuccess: null,
                onerror: null,
                result: [badPaper]
            });

            const promise = getAllPapers();

            await new Promise(resolve => setTimeout(resolve, 0));

            // Trigger success
            const request = mockStore.getAll.mock.results[0].value;
            request.onsuccess({ target: { result: [badPaper] } });

            // Should resolve with unsorted array instead of crashing
            const result = await promise;
            expect(result).toHaveLength(1);
            expect(result[0].id).toBe(1);
        });

        it('should handle database read errors', async () => {
            mockStore.getAll.mockReturnValue({ onsuccess: null, onerror: null });
            const promise = getAllPapers();

            await new Promise(resolve => setTimeout(resolve, 0));

            const error = new Error('Read failed');
            mockStore.getAll.mock.results[0].value.onerror({ target: { error } });

            await expect(promise).rejects.toThrow('Failed to retrieve papers');
        });
    });

    describe('getPaperById Logic', () => {
        it('should map pdfUrl to s3Key for compatibility', async () => {
            const legacyPaper = { id: 1, pdfUrl: 'legacy-key', s3Key: null };

            mockStore.get.mockReturnValue({ onsuccess: null, onerror: null });
            const promise = getPaperById(1);

            await new Promise(resolve => setTimeout(resolve, 0));

            mockStore.get.mock.results[0].value.onsuccess({ target: { result: legacyPaper } });

            const result = await promise;
            expect(result.s3Key).toBe('legacy-key');
            expect(result.hasPdf).toBe(true);
        });

        it('should correctly set hasPdf flag', async () => {
            const paperNoPdf = { id: 1 };
            const paperLocalPdf = { id: 2, pdfData: 'blob' };

            mockStore.get.mockReturnValue({ onsuccess: null, onerror: null });

            // Test no PDF
            let promise = getPaperById(1);
            await new Promise(resolve => setTimeout(resolve, 0));
            mockStore.get.mock.results[0].value.onsuccess({ target: { result: paperNoPdf } });
            expect((await promise).hasPdf).toBe(false);

            // Test local PDF
            promise = getPaperById(2);
            await new Promise(resolve => setTimeout(resolve, 0));
            mockStore.get.mock.results[1].value.onsuccess({ target: { result: paperLocalPdf } });
            expect((await promise).hasPdf).toBe(true);
        });
    });

    describe('updatePaper Error Handling', () => {
        it('should handle QuotaExceededError during update', async () => {
            mockStore.get.mockReturnValue({ onsuccess: null, onerror: null });
            mockStore.put.mockReturnValue({ onsuccess: null, onerror: null });

            const promise = updatePaper(1, { title: 'New Title' });

            await new Promise(resolve => setTimeout(resolve, 0));

            // Get success
            mockStore.get.mock.results[0].value.onsuccess({ target: { result: { id: 1 } } });

            // Put error
            const error = new Error('Quota');
            error.name = 'QuotaExceededError';
            mockStore.put.mock.results[0].value.onerror({ target: { error } });

            await expect(promise).rejects.toThrow('Storage quota exceeded');
        });

        it('should handle DataError during update', async () => {
            mockStore.get.mockReturnValue({ onsuccess: null, onerror: null });
            mockStore.put.mockReturnValue({ onsuccess: null, onerror: null });

            const promise = updatePaper(1, { title: 'New Title' });

            await new Promise(resolve => setTimeout(resolve, 0));

            mockStore.get.mock.results[0].value.onsuccess({ target: { result: { id: 1 } } });

            const error = new Error('Invalid');
            error.name = 'DataError';
            mockStore.put.mock.results[0].value.onerror({ target: { error } });

            await expect(promise).rejects.toThrow('Invalid data');
        });
    });

    describe('deletePaper Logic', () => {
        it('should continue with paper deletion if annotation deletion fails', async () => {
            // Mock annotation deletion failure
            annotationsModule.deleteAnnotationsByPaperId.mockRejectedValue(new Error('Annotation error'));

            mockStore.delete.mockReturnValue({ onsuccess: null, onerror: null });

            const promise = deletePaper(1);

            await new Promise(resolve => setTimeout(resolve, 0));

            expect(mockStore.delete).toHaveBeenCalledWith(1);

            // Complete paper deletion
            mockStore.delete.mock.results[0].value.onsuccess();

            await expect(promise).resolves.toBeUndefined();
        });

        it('should handle database deletion error', async () => {
            annotationsModule.deleteAnnotationsByPaperId.mockResolvedValue();

            mockStore.delete.mockReturnValue({ onsuccess: null, onerror: null });

            const promise = deletePaper(1);

            await new Promise(resolve => setTimeout(resolve, 0));

            const error = new Error('Delete failed');
            mockStore.delete.mock.results[0].value.onerror({ target: { error } });

            await expect(promise).rejects.toThrow('Failed to delete paper');
        });
    });
});
