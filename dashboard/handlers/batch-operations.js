/**
 * Batch Operations Handler (Refactored)
 * Handles batch actions on selected papers: status change, tag management, delete, and export
 */

import { renderSidebarTags, showToast } from '../../ui.js';
import { generateBibliography, exportBibliographyToFile, copyBibliographyToClipboard } from '../../citation.js';
import { views as templates } from '../../views/index.js';
import { 
    executeBatchOperation, 
    updatePaperInCache, 
    removePapersFromCache,
    parseTags,
    addTagsToPaper,
    removeTagsFromPaper
} from '../utils/batch-operations-utils.js';
import { handleOperationError } from '../services/error-handler.js';
import { showModal, closeModal } from '../services/modal-manager.js';

/**
 * Creates batch status change handler
 * @param {Object} appState - Application state
 * @param {Function} applyFiltersAndRender - Function to re-render the dashboard
 * @returns {Function} Event handler for batch status change
 */
export function createBatchStatusChangeHandler(appState, applyFiltersAndRender) {
    return async (e) => {
        const newStatus = e.target.value;
        if (!newStatus || appState.selectedPaperIds.size === 0) return;

        try {
            const selectedIds = Array.from(appState.selectedPaperIds);
            
            const { successCount, results } = await executeBatchOperation(
                selectedIds,
                (paperId) => ({ type: 'update', id: paperId, data: { readingStatus: newStatus } }),
                { actionName: `Update status to "${newStatus}"` }
            );

            e.target.value = ''; // Reset select
            
            if (successCount > 0) {
                // Update cache for successful operations
                results.forEach(res => {
                    if (res.success) {
                        updatePaperInCache(appState.allPapersCache, res.paperId, { readingStatus: newStatus });
                    }
                });
                applyFiltersAndRender();
            }
        } catch (error) {
            handleOperationError(error, 'batch status update');
        }
    };
}

/**
 * Creates batch add tags handler
 * @param {Object} appState - Application state
 * @param {Function} applyFiltersAndRender - Function to re-render the dashboard
 * @returns {Function} Event handler for batch add tags
 */
export function createBatchAddTagsHandler(appState, applyFiltersAndRender) {
    return async () => {
        const input = document.getElementById('batch-tags-input');
        if (!input || !input.value.trim() || appState.selectedPaperIds.size === 0) return;

        const tagsToAdd = parseTags(input.value);
        if (tagsToAdd.length === 0) return;

        try {
            const selectedIds = Array.from(appState.selectedPaperIds);
            
            const { successCount, results } = await executeBatchOperation(
                selectedIds,
                (paperId) => {
                    const paper = appState.allPapersCache.find(p => p.id === paperId);
                    if (paper) {
                        const updatedTags = addTagsToPaper(paper, tagsToAdd);
                        return { type: 'update', id: paperId, data: { tags: updatedTags } };
                    }
                    return null;
                },
                { actionName: 'Add tags' }
            );

            input.value = ''; // Clear input
            
            if (successCount > 0) {
                // Update cache for successful operations
                results.forEach(res => {
                    if (res.success && res.result && res.result.data && res.result.data.tags) {
                        updatePaperInCache(appState.allPapersCache, res.paperId, { tags: res.result.data.tags });
                    }
                });
                renderSidebarTags(appState.allPapersCache); // Update sidebar tags
                applyFiltersAndRender();
            }
        } catch (error) {
            handleOperationError(error, 'batch add tags');
        }
    };
}

/**
 * Creates batch remove tags handler
 * @param {Object} appState - Application state
 * @param {Function} applyFiltersAndRender - Function to re-render the dashboard
 * @returns {Function} Event handler for batch remove tags
 */
export function createBatchRemoveTagsHandler(appState, applyFiltersAndRender) {
    return async () => {
        const input = document.getElementById('batch-tags-input');
        if (!input || !input.value.trim() || appState.selectedPaperIds.size === 0) return;

        const tagsToRemove = parseTags(input.value);
        if (tagsToRemove.length === 0) return;

        try {
            const selectedIds = Array.from(appState.selectedPaperIds);
            
            const { successCount, results } = await executeBatchOperation(
                selectedIds,
                (paperId) => {
                    const paper = appState.allPapersCache.find(p => p.id === paperId);
                    if (paper) {
                        const updatedTags = removeTagsFromPaper(paper, tagsToRemove);
                        return { type: 'update', id: paperId, data: { tags: updatedTags } };
                    }
                    return null;
                },
                { actionName: 'Remove tags' }
            );

            input.value = ''; // Clear input
            
            if (successCount > 0) {
                // Update cache for successful operations
                results.forEach(res => {
                    if (res.success && res.result && res.result.data && res.result.data.tags) {
                        updatePaperInCache(appState.allPapersCache, res.paperId, { tags: res.result.data.tags });
                    }
                });
                renderSidebarTags(appState.allPapersCache); // Update sidebar tags
                applyFiltersAndRender();
            }
        } catch (error) {
            handleOperationError(error, 'batch remove tags');
        }
    };
}

/**
 * Creates batch delete handler
 * @param {Object} appState - Application state
 * @param {Function} applyFiltersAndRender - Function to re-render the dashboard
 * @param {Function} updateBatchToolbar - Function to update batch toolbar UI
 * @returns {Function} Event handler for batch delete
 */
export function createBatchDeleteHandler(appState, applyFiltersAndRender, updateBatchToolbar) {
    return async () => {
        if (appState.selectedPaperIds.size === 0) return;

        const count = appState.selectedPaperIds.size;
        if (!confirm(`Are you sure you want to delete ${count} paper(s)? This action cannot be undone.`)) {
            return;
        }

        try {
            const selectedIds = Array.from(appState.selectedPaperIds);
            
            const { successCount, results } = await executeBatchOperation(
                selectedIds,
                (paperId) => ({ type: 'delete', id: paperId }),
                { actionName: 'Delete papers' }
            );

            // Get successfully deleted IDs
            const successfulDeletes = results
                .filter(r => r.success)
                .map(r => r.paperId);

            // Remove successfully deleted papers from cache
            if (successfulDeletes.length > 0) {
                appState.allPapersCache = removePapersFromCache(appState.allPapersCache, successfulDeletes);
                appState.selectedPaperIds.clear();
                renderSidebarTags(appState.allPapersCache); // Update sidebar tags
                updateBatchToolbar(appState);
                applyFiltersAndRender();
            }
        } catch (error) {
            handleOperationError(error, 'batch delete');
        }
    };
}

/**
 * Creates batch export bibliography handler
 * @param {Object} appState - Application state
 * @returns {Function} Event handler for batch export bibliography
 */
export function createBatchExportBibliographyHandler(appState) {
    return async () => {
        if (appState.selectedPaperIds.size === 0) {
            showToast('Please select papers to export.', 'warning');
            return;
        }

        try {
            // Get selected papers
            const selectedIds = Array.from(appState.selectedPaperIds);
            const selectedPapers = appState.allPapersCache.filter(p => selectedIds.includes(p.id));
            
            if (selectedPapers.length === 0) {
                showToast('No papers found for export.', 'error');
                return;
            }

            // Show modal using Modal Manager
            const modalId = 'bibliography-export-modal';
            
            showModal({
                id: modalId,
                html: templates.bibliographyExportModal,
                handlers: {
                    'close-bibliography-modal-btn': {
                        event: 'click',
                        callback: () => closeModal(modalId)
                    },
                    'bibliography-copy-btn': {
                        event: 'click',
                        callback: async () => {
                            const format = document.getElementById('bibliography-format-select').value;
                            const style = document.getElementById('bibliography-style-select').value;
                            const bibliography = generateBibliography(selectedPapers, format, style);
                            const success = await copyBibliographyToClipboard(bibliography);
                            if (success) {
                                showToast(`Bibliography copied to clipboard! (${selectedPapers.length} papers)`, 'success');
                            } else {
                                showToast('Failed to copy to clipboard. Please try again.', 'error');
                            }
                        }
                    },
                    'bibliography-download-btn': {
                        event: 'click',
                        callback: () => {
                            const format = document.getElementById('bibliography-format-select').value;
                            const style = document.getElementById('bibliography-style-select').value;
                            const bibliography = generateBibliography(selectedPapers, format, style);
                            exportBibliographyToFile(bibliography, format);
                            showToast(`Bibliography downloaded! (${selectedPapers.length} papers)`, 'success');
                        }
                    },
                    'bibliography-format-select': {
                        event: 'change',
                        callback: () => updateBibliographyPreview(selectedPapers)
                    },
                    'bibliography-style-select': {
                        event: 'change',
                        callback: () => updateBibliographyPreview(selectedPapers)
                    }
                },
                onOpen: () => {
                    // Initial preview
                    updateBibliographyPreview(selectedPapers);
                }
            });
        } catch (error) {
            handleOperationError(error, 'export bibliography');
        }
    };
}

/**
 * Updates bibliography preview in modal
 * @param {Array} selectedPapers - Array of selected papers
 */
function updateBibliographyPreview(selectedPapers) {
    const formatSelect = document.getElementById('bibliography-format-select');
    const styleSelect = document.getElementById('bibliography-style-select');
    const previewDiv = document.getElementById('bibliography-preview');
    
    if (formatSelect && styleSelect && previewDiv) {
        const format = formatSelect.value;
        const style = styleSelect.value;
        const bibliography = generateBibliography(selectedPapers, format, style);
        previewDiv.textContent = bibliography || 'No bibliography generated.';
    }
}

/**
 * Registers all batch operation event listeners
 * @param {Object} appState - Application state
 * @param {Function} applyFiltersAndRender - Function to re-render the dashboard
 * @param {Function} updateBatchToolbar - Function to update batch toolbar UI
 * @returns {Object} Object containing all handler functions for cleanup
 */
export function registerBatchOperationHandlers(appState, applyFiltersAndRender, updateBatchToolbar) {
    const handlers = {};

    // Batch Status Change
    const batchStatusSelect = document.getElementById('batch-status-select');
    if (batchStatusSelect) {
        handlers.batchStatusChangeHandler = createBatchStatusChangeHandler(appState, applyFiltersAndRender);
        batchStatusSelect.addEventListener('change', handlers.batchStatusChangeHandler);
    }

    // Batch Add Tags
    const batchAddTagsBtn = document.getElementById('batch-add-tags-btn');
    if (batchAddTagsBtn) {
        handlers.batchAddTagsHandler = createBatchAddTagsHandler(appState, applyFiltersAndRender);
        batchAddTagsBtn.addEventListener('click', handlers.batchAddTagsHandler);
    }

    // Batch Remove Tags
    const batchRemoveTagsBtn = document.getElementById('batch-remove-tags-btn');
    if (batchRemoveTagsBtn) {
        handlers.batchRemoveTagsHandler = createBatchRemoveTagsHandler(appState, applyFiltersAndRender);
        batchRemoveTagsBtn.addEventListener('click', handlers.batchRemoveTagsHandler);
    }

    // Batch Delete
    const batchDeleteBtn = document.getElementById('batch-delete-btn');
    if (batchDeleteBtn) {
        handlers.batchDeleteHandler = createBatchDeleteHandler(appState, applyFiltersAndRender, updateBatchToolbar);
        batchDeleteBtn.addEventListener('click', handlers.batchDeleteHandler);
    }

    // Batch Export Bibliography
    const batchExportBibliographyBtn = document.getElementById('batch-export-bibliography-btn');
    if (batchExportBibliographyBtn) {
        handlers.batchExportBibliographyHandler = createBatchExportBibliographyHandler(appState);
        batchExportBibliographyBtn.addEventListener('click', handlers.batchExportBibliographyHandler);
    }

    return handlers;
}

/**
 * Unregisters all batch operation event listeners
 * @param {Object} handlers - Object containing all handler functions
 */
export function unregisterBatchOperationHandlers(handlers) {
    const batchStatusSelect = document.getElementById('batch-status-select');
    if (batchStatusSelect && handlers.batchStatusChangeHandler) {
        batchStatusSelect.removeEventListener('change', handlers.batchStatusChangeHandler);
    }

    const batchAddTagsBtn = document.getElementById('batch-add-tags-btn');
    if (batchAddTagsBtn && handlers.batchAddTagsHandler) {
        batchAddTagsBtn.removeEventListener('click', handlers.batchAddTagsHandler);
    }

    const batchRemoveTagsBtn = document.getElementById('batch-remove-tags-btn');
    if (batchRemoveTagsBtn && handlers.batchRemoveTagsHandler) {
        batchRemoveTagsBtn.removeEventListener('click', handlers.batchRemoveTagsHandler);
    }

    const batchDeleteBtn = document.getElementById('batch-delete-btn');
    if (batchDeleteBtn && handlers.batchDeleteHandler) {
        batchDeleteBtn.removeEventListener('click', handlers.batchDeleteHandler);
    }

    const batchExportBibliographyBtn = document.getElementById('batch-export-bibliography-btn');
    if (batchExportBibliographyBtn && handlers.batchExportBibliographyHandler) {
        batchExportBibliographyBtn.removeEventListener('click', handlers.batchExportBibliographyHandler);
    }

    // Modal Manager handles cleanup automatically
    closeModal('bibliography-export-modal');
}
