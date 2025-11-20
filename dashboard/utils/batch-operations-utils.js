/**
 * Batch Operations Utilities
 * Shared utilities for batch operations to reduce code duplication
 */

import { showToast } from '../../ui.js';
import { batchOperations } from '../../db.js';
import { 
    parseTags as parseTagsService,
    addTagsToPaper as addTagsService,
    removeTagsFromPaper as removeTagsService
} from '../services/tag-manager.js';

/**
 * Executes a batch operation on multiple papers using the backend batch API
 * @param {Array<number>} selectedIds - Array of paper IDs to process
 * @param {Function} operationGenerator - Function that takes a paperId and returns an operation object { type, data } or null
 * @param {Object} options - Configuration options
 * @param {boolean} options.showProgress - Show progress toast (default: true)
 * @param {boolean} options.showResult - Show result toast (default: true)
 * @param {string} options.actionName - Name of the action for messages (default: 'operation')
 * @returns {Promise<Object>} Object with successCount, errorCount, and results array
 */
export async function executeBatchOperation(selectedIds, operationGenerator, options = {}) {
    const { 
        showProgress = true, 
        showResult = true, 
        actionName = 'operation' 
    } = options;
    
    if (showProgress) {
        showToast(`Processing ${selectedIds.length} paper(s)...`, 'info', { duration: 10000 });
    }
    
    // Generate operations
    const operations = [];
    
    for (const paperId of selectedIds) {
        try {
            // operationGenerator can be async
            const op = await operationGenerator(paperId);
            if (op) {
                // Ensure ID is present
                if (!op.id) op.id = paperId;
                operations.push(op);
            }
        } catch (error) {
            console.error(`Error generating operation for ${paperId}:`, error);
        }
    }

    let successCount = 0;
    let errorCount = 0;
    const results = [];
    
    if (operations.length > 0) {
        try {
            // Send single batch request
            const batchResults = await batchOperations(operations);
            
            // Process results
            for (const res of batchResults) {
                if (res.success) {
                    successCount++;
                    results.push({ paperId: res.id, success: true, result: res });
                } else {
                    errorCount++;
                    results.push({ paperId: res.id, success: false, error: res.error });
                }
            }
        } catch (error) {
            console.error('Batch operation failed:', error);
            // Treat all operations as failed if the batch request itself fails (e.g. network error)
            errorCount = operations.length;
            operations.forEach(op => {
                results.push({ paperId: op.id, success: false, error: error.message });
            });
        }
    }
    
    if (showResult) {
        showBatchResult(successCount, errorCount, actionName);
    }
    
    return { successCount, errorCount, results };
}

/**
 * Shows a standardized batch operation result toast
 * @param {number} successCount - Number of successful operations
 * @param {number} errorCount - Number of failed operations
 * @param {string} actionName - Name of the action
 */
export function showBatchResult(successCount, errorCount, actionName) {
    if (successCount > 0) {
        const message = `${actionName} completed: ${successCount} succeeded${errorCount > 0 ? `, ${errorCount} failed` : ''}`;
        showToast(message, errorCount > 0 ? 'warning' : 'success');
    } else {
        showToast(`${actionName} failed. Please try again.`, 'error');
    }
}

/**
 * Updates a paper in the cache with new data
 * @param {Array} cache - Papers cache array
 * @param {number} paperId - ID of the paper to update
 * @param {Object} updates - Object with properties to update
 * @returns {boolean} True if paper was found and updated, false otherwise
 */
export function updatePaperInCache(cache, paperId, updates) {
    const paperIndex = cache.findIndex(p => p.id === paperId);
    if (paperIndex > -1) {
        cache[paperIndex] = { ...cache[paperIndex], ...updates };
        return true;
    }
    return false;
}

/**
 * Removes papers from cache
 * @param {Array} cache - Papers cache array
 * @param {Array<number>} paperIds - Array of paper IDs to remove
 * @returns {Array} New cache array without the specified papers
 */
export function removePapersFromCache(cache, paperIds) {
    return cache.filter(p => !paperIds.includes(p.id));
}

/**
 * Note: Tag parsing and management functions have been moved to
 * dashboard/services/tag-manager.js for better organization and validation.
 * These functions are kept here for backward compatibility.
 */

/**
 * Parses and sanitizes tag input
 * @param {string} input - Comma-separated tag input
 * @returns {Array<string>} Array of sanitized, unique tags
 */
export function parseTags(input) {
    return parseTagsService(input);
}

/**
 * Adds tags to a paper's existing tags
 * @param {Object} paper - Paper object
 * @param {Array<string>} tagsToAdd - Tags to add
 * @returns {Array<string>} Updated tags array
 */
export function addTagsToPaper(paper, tagsToAdd) {
    const result = addTagsService(paper, tagsToAdd);
    return result.tags;
}

/**
 * Removes tags from a paper's existing tags
 * @param {Object} paper - Paper object
 * @param {Array<string>} tagsToRemove - Tags to remove
 * @returns {Array<string>} Updated tags array
 */
export function removeTagsFromPaper(paper, tagsToRemove) {
    const result = removeTagsService(paper, tagsToRemove);
    return result.tags;
}

