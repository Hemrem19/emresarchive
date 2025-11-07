/**
 * Tests for Batch Operations Utilities
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
    executeBatchOperation,
    showBatchResult,
    updatePaperInCache,
    removePapersFromCache,
    parseTags,
    addTagsToPaper,
    removeTagsFromPaper
} from '../../dashboard/utils/batch-operations-utils.js';
import * as ui from '../../ui.js';

// Mock ui.js
vi.mock('../../ui.js', () => ({
    showToast: vi.fn()
}));

describe('Batch Operations Utilities', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('executeBatchOperation', () => {
        it('should execute operation for all selected IDs', async () => {
            const selectedIds = [1, 2, 3];
            const operation = vi.fn().mockResolvedValue('success');
            
            const result = await executeBatchOperation(selectedIds, operation, {
                showProgress: false,
                showResult: false
            });
            
            expect(operation).toHaveBeenCalledTimes(3);
            expect(result.successCount).toBe(3);
            expect(result.errorCount).toBe(0);
        });

        it('should handle errors gracefully', async () => {
            const selectedIds = [1, 2, 3];
            const operation = vi.fn()
                .mockResolvedValueOnce('success')
                .mockRejectedValueOnce(new Error('Failed'))
                .mockResolvedValueOnce('success');
            
            const result = await executeBatchOperation(selectedIds, operation, {
                showProgress: false,
                showResult: false
            });
            
            expect(result.successCount).toBe(2);
            expect(result.errorCount).toBe(1);
        });

        it('should show progress toast when enabled', async () => {
            const selectedIds = [1, 2];
            const operation = vi.fn().mockResolvedValue('success');
            
            await executeBatchOperation(selectedIds, operation, {
                showProgress: true,
                showResult: false
            });
            
            expect(ui.showToast).toHaveBeenCalledWith(
                'Processing 2 paper(s)...',
                'info',
                { duration: 10000 }
            );
        });

        it('should show result toast when enabled', async () => {
            const selectedIds = [1, 2];
            const operation = vi.fn().mockResolvedValue('success');
            
            await executeBatchOperation(selectedIds, operation, {
                showProgress: false,
                showResult: true,
                actionName: 'test operation'
            });
            
            expect(ui.showToast).toHaveBeenCalledWith(
                'test operation completed: 2 succeeded',
                'success'
            );
        });
    });

    describe('showBatchResult', () => {
        it('should show success message when all operations succeed', () => {
            showBatchResult(3, 0, 'Delete papers');
            
            expect(ui.showToast).toHaveBeenCalledWith(
                'Delete papers completed: 3 succeeded',
                'success'
            );
        });

        it('should show warning message when some operations fail', () => {
            showBatchResult(2, 1, 'Update status');
            
            expect(ui.showToast).toHaveBeenCalledWith(
                'Update status completed: 2 succeeded, 1 failed',
                'warning'
            );
        });

        it('should show error message when all operations fail', () => {
            showBatchResult(0, 3, 'Add tags');
            
            expect(ui.showToast).toHaveBeenCalledWith(
                'Add tags failed. Please try again.',
                'error'
            );
        });
    });

    describe('updatePaperInCache', () => {
        it('should update paper in cache', () => {
            const cache = [
                { id: 1, title: 'Paper 1', status: 'to-read' },
                { id: 2, title: 'Paper 2', status: 'reading' }
            ];
            
            const result = updatePaperInCache(cache, 1, { status: 'completed' });
            
            expect(result).toBe(true);
            expect(cache[0].status).toBe('completed');
        });

        it('should return false if paper not found', () => {
            const cache = [
                { id: 1, title: 'Paper 1' }
            ];
            
            const result = updatePaperInCache(cache, 999, { status: 'completed' });
            
            expect(result).toBe(false);
        });
    });

    describe('removePapersFromCache', () => {
        it('should remove papers from cache', () => {
            const cache = [
                { id: 1, title: 'Paper 1' },
                { id: 2, title: 'Paper 2' },
                { id: 3, title: 'Paper 3' }
            ];
            
            const result = removePapersFromCache(cache, [1, 3]);
            
            expect(result).toHaveLength(1);
            expect(result[0].id).toBe(2);
        });

        it('should return original cache if no papers match', () => {
            const cache = [
                { id: 1, title: 'Paper 1' }
            ];
            
            const result = removePapersFromCache(cache, [999]);
            
            expect(result).toHaveLength(1);
            expect(result[0].id).toBe(1);
        });
    });

    describe('parseTags', () => {
        it('should parse comma-separated tags', () => {
            const result = parseTags('tag1, tag2, tag3');
            
            expect(result).toEqual(['tag1', 'tag2', 'tag3']);
        });

        it('should trim whitespace', () => {
            const result = parseTags('  tag1  ,  tag2  ');
            
            expect(result).toEqual(['tag1', 'tag2']);
        });

        it('should remove duplicates', () => {
            const result = parseTags('tag1, tag2, tag1');
            
            expect(result).toEqual(['tag1', 'tag2']);
        });

        it('should filter empty tags', () => {
            const result = parseTags('tag1, , tag2, ');
            
            expect(result).toEqual(['tag1', 'tag2']);
        });

        it('should return empty array for empty input', () => {
            expect(parseTags('')).toEqual([]);
            expect(parseTags(null)).toEqual([]);
            expect(parseTags(undefined)).toEqual([]);
        });
    });

    describe('addTagsToPaper', () => {
        it('should add tags to paper', () => {
            const paper = { id: 1, tags: ['existing'] };
            
            const result = addTagsToPaper(paper, ['new1', 'new2']);
            
            expect(result).toEqual(['existing', 'new1', 'new2']);
        });

        it('should not add duplicate tags', () => {
            const paper = { id: 1, tags: ['tag1', 'tag2'] };
            
            const result = addTagsToPaper(paper, ['tag2', 'tag3']);
            
            expect(result).toEqual(['tag1', 'tag2', 'tag3']);
        });

        it('should handle paper with no existing tags', () => {
            const paper = { id: 1 };
            
            const result = addTagsToPaper(paper, ['tag1', 'tag2']);
            
            expect(result).toEqual(['tag1', 'tag2']);
        });
    });

    describe('removeTagsFromPaper', () => {
        it('should remove tags from paper', () => {
            const paper = { id: 1, tags: ['tag1', 'tag2', 'tag3'] };
            
            const result = removeTagsFromPaper(paper, ['tag1', 'tag3']);
            
            expect(result).toEqual(['tag2']);
        });

        it('should handle removing non-existent tags', () => {
            const paper = { id: 1, tags: ['tag1', 'tag2'] };
            
            const result = removeTagsFromPaper(paper, ['tag3', 'tag4']);
            
            expect(result).toEqual(['tag1', 'tag2']);
        });

        it('should handle paper with no tags', () => {
            const paper = { id: 1 };
            
            const result = removeTagsFromPaper(paper, ['tag1']);
            
            expect(result).toEqual([]);
        });
    });
});

