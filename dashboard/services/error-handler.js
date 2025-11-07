/**
 * Error Handler Service
 * Centralized error handling for consistent error messages and logging
 */

import { showToast } from '../../ui.js';

/**
 * Handles operation errors with consistent messaging and logging
 * @param {Error} error - The error object
 * @param {string} context - Context where the error occurred (e.g., 'batch delete', 'update status')
 * @param {Object} options - Configuration options
 * @param {boolean} options.showToast - Show toast notification (default: true)
 * @param {boolean} options.logToConsole - Log to console (default: true)
 * @param {string} options.fallbackMessage - Custom fallback message
 * @returns {string} The error message that was displayed/logged
 */
export function handleOperationError(error, context, options = {}) {
    const { 
        showToast: showToastNotification = true, 
        logToConsole = true,
        fallbackMessage = null
    } = options;
    
    if (logToConsole) {
        console.error(`Error in ${context}:`, error);
    }
    
    const message = fallbackMessage || createErrorMessage(error, context);
    
    if (showToastNotification) {
        showToast(message, 'error');
    }
    
    return message;
}

/**
 * Creates a user-friendly error message based on error type
 * @param {Error} error - The error object
 * @param {string} context - Context where the error occurred
 * @returns {string} User-friendly error message
 */
export function createErrorMessage(error, context) {
    // Check for specific error types
    if (error.name === 'QuotaExceededError') {
        return 'Storage quota exceeded. Please free up space or delete some papers.';
    }
    
    if (error.name === 'NotFoundError' || error.message?.includes('not found')) {
        return `Item not found. It may have been deleted.`;
    }
    
    if (error.name === 'NetworkError' || error.message?.includes('network')) {
        return 'Network error. Please check your connection and try again.';
    }
    
    if (error.name === 'TimeoutError' || error.message?.includes('timeout')) {
        return 'Operation timed out. Please try again.';
    }
    
    if (error.name === 'AbortError') {
        return 'Operation was cancelled.';
    }
    
    // IndexedDB specific errors
    if (error.name === 'ConstraintError') {
        return 'Database constraint error. This item may already exist.';
    }
    
    if (error.name === 'DataError') {
        return 'Invalid data provided. Please check your input.';
    }
    
    if (error.name === 'TransactionInactiveError') {
        return 'Database transaction error. Please try again.';
    }
    
    // Use error message if available, otherwise use context
    if (error.message) {
        return `Error during ${context}: ${error.message}`;
    }
    
    // Default fallback
    return `Error during ${context}. Please try again.`;
}

/**
 * Determines if an operation should be retried based on error type
 * @param {Error} error - The error object
 * @returns {boolean} True if operation should be retried
 */
export function shouldRetry(error) {
    const retryableErrors = [
        'NetworkError',
        'TimeoutError',
        'TransactionInactiveError'
    ];
    
    return retryableErrors.includes(error.name) || 
           error.message?.includes('network') ||
           error.message?.includes('timeout');
}

/**
 * Wraps an async operation with error handling
 * @param {Function} operation - Async function to execute
 * @param {string} context - Context description
 * @param {Object} options - Error handling options
 * @returns {Promise<{success: boolean, data?: any, error?: Error}>}
 */
export async function withErrorHandling(operation, context, options = {}) {
    try {
        const data = await operation();
        return { success: true, data };
    } catch (error) {
        handleOperationError(error, context, options);
        return { success: false, error };
    }
}

/**
 * Handles multiple errors from batch operations
 * @param {Array<{paperId: number, error: Error}>} errors - Array of error objects
 * @param {string} context - Context where errors occurred
 * @returns {string} Summary message
 */
export function handleBatchErrors(errors, context) {
    if (errors.length === 0) return '';
    
    // Group errors by type
    const errorTypes = {};
    errors.forEach(({ error }) => {
        const type = error.name || 'Unknown';
        errorTypes[type] = (errorTypes[type] || 0) + 1;
    });
    
    // Create summary message
    const errorSummary = Object.entries(errorTypes)
        .map(([type, count]) => `${count} ${type}`)
        .join(', ');
    
    console.error(`Batch ${context} errors:`, errorSummary, errors);
    
    return `Some operations failed (${errors.length} total): ${errorSummary}`;
}

