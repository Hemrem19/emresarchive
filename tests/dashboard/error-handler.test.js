/**
 * Tests for Error Handler Service
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
    handleOperationError,
    createErrorMessage,
    shouldRetry,
    withErrorHandling,
    handleBatchErrors
} from '../../dashboard/services/error-handler.js';
import * as ui from '../../ui.js';

// Mock ui.js
vi.mock('../../ui.js', () => ({
    showToast: vi.fn()
}));

describe('Error Handler Service', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.spyOn(console, 'error').mockImplementation(() => {});
    });

    describe('handleOperationError', () => {
        it('should log error to console by default', () => {
            const error = new Error('Test error');
            
            handleOperationError(error, 'test operation');
            
            expect(console.error).toHaveBeenCalledWith('Error in test operation:', error);
        });

        it('should show toast by default', () => {
            const error = new Error('Test error');
            
            handleOperationError(error, 'test operation');
            
            expect(ui.showToast).toHaveBeenCalledWith(
                'Error during test operation: Test error',
                'error'
            );
        });

        it('should not show toast when disabled', () => {
            const error = new Error('Test error');
            
            handleOperationError(error, 'test operation', { showToast: false });
            
            expect(ui.showToast).not.toHaveBeenCalled();
        });

        it('should not log to console when disabled', () => {
            const error = new Error('Test error');
            
            handleOperationError(error, 'test operation', { logToConsole: false });
            
            expect(console.error).not.toHaveBeenCalled();
        });

        it('should use fallback message when provided', () => {
            const error = new Error('Test error');
            
            handleOperationError(error, 'test operation', { 
                fallbackMessage: 'Custom error message' 
            });
            
            expect(ui.showToast).toHaveBeenCalledWith('Custom error message', 'error');
        });
    });

    describe('createErrorMessage', () => {
        it('should handle QuotaExceededError', () => {
            const error = new Error('Quota exceeded');
            error.name = 'QuotaExceededError';
            
            const message = createErrorMessage(error, 'save paper');
            
            expect(message).toContain('Storage quota exceeded');
        });

        it('should handle NotFoundError', () => {
            const error = new Error('Not found');
            error.name = 'NotFoundError';
            
            const message = createErrorMessage(error, 'delete paper');
            
            expect(message).toContain('Item not found');
        });

        it('should handle NetworkError', () => {
            const error = new Error('Network failure');
            error.name = 'NetworkError';
            
            const message = createErrorMessage(error, 'sync data');
            
            expect(message).toContain('Network error');
        });

        it('should handle TimeoutError', () => {
            const error = new Error('Timeout');
            error.name = 'TimeoutError';
            
            const message = createErrorMessage(error, 'load papers');
            
            expect(message).toContain('timed out');
        });

        it('should handle AbortError', () => {
            const error = new Error('Aborted');
            error.name = 'AbortError';
            
            const message = createErrorMessage(error, 'upload file');
            
            expect(message).toContain('cancelled');
        });

        it('should handle ConstraintError', () => {
            const error = new Error('Constraint violation');
            error.name = 'ConstraintError';
            
            const message = createErrorMessage(error, 'add paper');
            
            expect(message).toContain('constraint error');
        });

        it('should handle DataError', () => {
            const error = new Error('Invalid data');
            error.name = 'DataError';
            
            const message = createErrorMessage(error, 'update paper');
            
            expect(message).toContain('Invalid data');
        });

        it('should handle TransactionInactiveError', () => {
            const error = new Error('Transaction inactive');
            error.name = 'TransactionInactiveError';
            
            const message = createErrorMessage(error, 'save changes');
            
            expect(message).toContain('Database transaction error');
        });

        it('should use error message for unknown errors', () => {
            const error = new Error('Custom error message');
            
            const message = createErrorMessage(error, 'test operation');
            
            expect(message).toBe('Error during test operation: Custom error message');
        });

        it('should use context for errors without message', () => {
            const error = new Error();
            error.message = '';
            
            const message = createErrorMessage(error, 'test operation');
            
            expect(message).toContain('test operation');
        });
    });

    describe('shouldRetry', () => {
        it('should return true for NetworkError', () => {
            const error = new Error('Network failure');
            error.name = 'NetworkError';
            
            expect(shouldRetry(error)).toBe(true);
        });

        it('should return true for TimeoutError', () => {
            const error = new Error('Timeout');
            error.name = 'TimeoutError';
            
            expect(shouldRetry(error)).toBe(true);
        });

        it('should return true for TransactionInactiveError', () => {
            const error = new Error('Transaction inactive');
            error.name = 'TransactionInactiveError';
            
            expect(shouldRetry(error)).toBe(true);
        });

        it('should return true for errors with network in message', () => {
            const error = new Error('network connection failed');
            
            expect(shouldRetry(error)).toBe(true);
        });

        it('should return true for errors with timeout in message', () => {
            const error = new Error('operation timeout');
            
            expect(shouldRetry(error)).toBe(true);
        });

        it('should return false for other errors', () => {
            const error = new Error('Invalid data');
            error.name = 'DataError';
            
            expect(shouldRetry(error)).toBe(false);
        });
    });

    describe('withErrorHandling', () => {
        it('should return success result for successful operation', async () => {
            const operation = vi.fn().mockResolvedValue('success data');
            
            const result = await withErrorHandling(operation, 'test operation');
            
            expect(result.success).toBe(true);
            expect(result.data).toBe('success data');
            expect(result.error).toBeUndefined();
        });

        it('should return error result for failed operation', async () => {
            const error = new Error('Operation failed');
            const operation = vi.fn().mockRejectedValue(error);
            
            const result = await withErrorHandling(operation, 'test operation');
            
            expect(result.success).toBe(false);
            expect(result.error).toBe(error);
            expect(result.data).toBeUndefined();
        });

        it('should handle error with provided options', async () => {
            const error = new Error('Operation failed');
            const operation = vi.fn().mockRejectedValue(error);
            
            await withErrorHandling(operation, 'test operation', { 
                showToast: false 
            });
            
            expect(ui.showToast).not.toHaveBeenCalled();
        });
    });

    describe('handleBatchErrors', () => {
        it('should return empty string for no errors', () => {
            const result = handleBatchErrors([], 'batch operation');
            
            expect(result).toBe('');
        });

        it('should create summary for single error type', () => {
            const errors = [
                { paperId: 1, error: { name: 'NetworkError', message: 'Failed' } },
                { paperId: 2, error: { name: 'NetworkError', message: 'Failed' } }
            ];
            
            const result = handleBatchErrors(errors, 'batch delete');
            
            expect(result).toContain('2 total');
            expect(result).toContain('2 NetworkError');
        });

        it('should create summary for multiple error types', () => {
            const errors = [
                { paperId: 1, error: { name: 'NetworkError', message: 'Failed' } },
                { paperId: 2, error: { name: 'DataError', message: 'Invalid' } },
                { paperId: 3, error: { name: 'NetworkError', message: 'Failed' } }
            ];
            
            const result = handleBatchErrors(errors, 'batch update');
            
            expect(result).toContain('3 total');
            expect(result).toContain('2 NetworkError');
            expect(result).toContain('1 DataError');
        });

        it('should log errors to console', () => {
            const errors = [
                { paperId: 1, error: { name: 'Error', message: 'Failed' } }
            ];
            
            handleBatchErrors(errors, 'batch operation');
            
            expect(console.error).toHaveBeenCalled();
        });
    });
});

