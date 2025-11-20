/**
 * Integration Tests for Batch Operations Flow
 * Tests the complete flow from frontend to backend for batch operations
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { executeBatchOperation } from '../dashboard/utils/batch-operations-utils.js';
import * as db from '../db.js';

// Mock db.js to simulate backend responses
vi.mock('../db.js', () => ({
    batchOperations: vi.fn()
}));

// Mock ui.js to prevent toast notifications during tests
vi.mock('../ui.js', () => ({
    showToast: vi.fn()
}));

describe('Integration Tests - Batch Operations Flow', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('Batch Status Change', () => {
        it('should update status for multiple papers in a single request', async () => {
            const paperIds = [1, 2, 3, 4, 5];
            const newStatus = 'Read';

            // Mock successful batch response
            db.batchOperations.mockResolvedValue(
                paperIds.map(id => ({ id, success: true, type: 'update' }))
            );

            const result = await executeBatchOperation(
                paperIds,
                (id) => ({ type: 'update', id, data: { status: newStatus } }),
                { showProgress: false, showResult: false }
            );

            // Verify single batch call was made
            expect(db.batchOperations).toHaveBeenCalledTimes(1);
            expect(db.batchOperations).toHaveBeenCalledWith(
                paperIds.map(id => ({ type: 'update', id, data: { status: newStatus } }))
            );

            // Verify all operations succeeded
            expect(result.successCount).toBe(5);
            expect(result.errorCount).toBe(0);
        });

        it('should handle partial failures gracefully', async () => {
            const paperIds = [1, 2, 3];

            // Mock partial success response
            db.batchOperations.mockResolvedValue([
                { id: 1, success: true, type: 'update' },
                { id: 2, success: false, error: 'Paper not found' },
                { id: 3, success: true, type: 'update' }
            ]);

            const result = await executeBatchOperation(
                paperIds,
                (id) => ({ type: 'update', id, data: { status: 'Reading' } }),
                { showProgress: false, showResult: false }
            );

            expect(result.successCount).toBe(2);
            expect(result.errorCount).toBe(1);
            expect(result.results.find(r => r.paperId === 2).error).toBe('Paper not found');
        });
    });

    describe('Batch Tag Operations', () => {
        it('should add tags to multiple papers', async () => {
            const paperIds = [10, 11, 12];
            const tagsToAdd = ['machine-learning', 'ai'];

            db.batchOperations.mockResolvedValue(
                paperIds.map(id => ({ id, success: true, type: 'update' }))
            );

            const result = await executeBatchOperation(
                paperIds,
                (id) => ({ 
                    type: 'update', 
                    id, 
                    data: { tags: ['existing-tag', ...tagsToAdd] } 
                }),
                { showProgress: false, showResult: false }
            );

            expect(result.successCount).toBe(3);
            expect(db.batchOperations).toHaveBeenCalledWith(
                expect.arrayContaining([
                    expect.objectContaining({ 
                        type: 'update', 
                        data: expect.objectContaining({ tags: expect.arrayContaining(tagsToAdd) })
                    })
                ])
            );
        });

        it('should remove tags from multiple papers', async () => {
            const paperIds = [20, 21];
            const tagsToRemove = ['outdated'];

            db.batchOperations.mockResolvedValue(
                paperIds.map(id => ({ id, success: true, type: 'update' }))
            );

            const result = await executeBatchOperation(
                paperIds,
                (id) => ({ 
                    type: 'update', 
                    id, 
                    data: { tags: ['ml', 'ai'] } // Remaining tags after removal
                }),
                { showProgress: false, showResult: false }
            );

            expect(result.successCount).toBe(2);
        });
    });

    describe('Batch Delete Operations', () => {
        it('should delete multiple papers in a single request', async () => {
            const paperIds = [100, 101, 102];

            db.batchOperations.mockResolvedValue(
                paperIds.map(id => ({ id, success: true, type: 'delete' }))
            );

            const result = await executeBatchOperation(
                paperIds,
                (id) => ({ type: 'delete', id }),
                { showProgress: false, showResult: false }
            );

            expect(db.batchOperations).toHaveBeenCalledTimes(1);
            expect(db.batchOperations).toHaveBeenCalledWith(
                paperIds.map(id => ({ type: 'delete', id }))
            );

            expect(result.successCount).toBe(3);
            expect(result.errorCount).toBe(0);
        });

        it('should handle already-deleted papers', async () => {
            const paperIds = [200, 201];

            db.batchOperations.mockResolvedValue([
                { id: 200, success: true, type: 'delete' },
                { id: 201, success: false, error: 'Paper not found or already deleted' }
            ]);

            const result = await executeBatchOperation(
                paperIds,
                (id) => ({ type: 'delete', id }),
                { showProgress: false, showResult: false }
            );

            expect(result.successCount).toBe(1);
            expect(result.errorCount).toBe(1);
        });
    });

    describe('Large Batch Operations', () => {
        it('should handle batch of 100 papers (max limit)', async () => {
            const paperIds = Array.from({ length: 100 }, (_, i) => i + 1);

            db.batchOperations.mockResolvedValue(
                paperIds.map(id => ({ id, success: true, type: 'update' }))
            );

            const result = await executeBatchOperation(
                paperIds,
                (id) => ({ type: 'update', id, data: { status: 'Archived' } }),
                { showProgress: false, showResult: false }
            );

            expect(result.successCount).toBe(100);
            expect(db.batchOperations).toHaveBeenCalledTimes(1);
        });

        it('should handle batch with mixed success and failures', async () => {
            const paperIds = Array.from({ length: 50 }, (_, i) => i + 1);

            // Mock 80% success rate
            db.batchOperations.mockResolvedValue(
                paperIds.map((id, idx) => 
                    idx % 5 === 0 
                        ? { id, success: false, error: 'Update failed' }
                        : { id, success: true, type: 'update' }
                )
            );

            const result = await executeBatchOperation(
                paperIds,
                (id) => ({ type: 'update', id, data: { status: 'To Read' } }),
                { showProgress: false, showResult: false }
            );

            expect(result.successCount).toBe(40);
            expect(result.errorCount).toBe(10);
        });
    });

    describe('Error Handling', () => {
        it('should handle network errors gracefully', async () => {
            const paperIds = [1, 2, 3];

            db.batchOperations.mockRejectedValue(new Error('Network Error'));

            const result = await executeBatchOperation(
                paperIds,
                (id) => ({ type: 'update', id, data: { status: 'Read' } }),
                { showProgress: false, showResult: false }
            );

            // All operations should fail with the same error
            expect(result.successCount).toBe(0);
            expect(result.errorCount).toBe(3);
            expect(result.results.every(r => r.error === 'Network Error')).toBe(true);
        });

        it('should handle rate limit errors', async () => {
            const paperIds = [1, 2];

            db.batchOperations.mockRejectedValue(new Error('Rate Limited: Too many requests'));

            const result = await executeBatchOperation(
                paperIds,
                (id) => ({ type: 'delete', id }),
                { showProgress: false, showResult: false }
            );

            expect(result.errorCount).toBe(2);
            expect(result.results[0].error).toContain('Rate Limited');
        });

        it('should handle authentication errors', async () => {
            const paperIds = [1];

            db.batchOperations.mockRejectedValue(new Error('Not authenticated'));

            const result = await executeBatchOperation(
                paperIds,
                (id) => ({ type: 'update', id, data: { status: 'Read' } }),
                { showProgress: false, showResult: false }
            );

            expect(result.errorCount).toBe(1);
            expect(result.results[0].error).toBe('Not authenticated');
        });
    });

    describe('Performance', () => {
        it('should complete batch operation faster than individual operations', async () => {
            const paperIds = Array.from({ length: 20 }, (_, i) => i + 1);

            db.batchOperations.mockResolvedValue(
                paperIds.map(id => ({ id, success: true, type: 'update' }))
            );

            const startTime = Date.now();
            await executeBatchOperation(
                paperIds,
                (id) => ({ type: 'update', id, data: { status: 'Read' } }),
                { showProgress: false, showResult: false }
            );
            const duration = Date.now() - startTime;

            // Should complete in reasonable time (< 100ms for mocked operations)
            expect(duration).toBeLessThan(100);
            
            // Should only make 1 API call instead of 20
            expect(db.batchOperations).toHaveBeenCalledTimes(1);
        });
    });
});

