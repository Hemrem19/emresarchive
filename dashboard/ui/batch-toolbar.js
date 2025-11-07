/**
 * Batch Toolbar UI
 * Handles batch toolbar visibility and state updates
 */

import { getStatusOrder } from '../../config.js';

/**
 * Updates batch toolbar visibility and selection count
 * @param {Object} appState - Application state
 */
export function updateBatchToolbar(appState) {
    const toolbar = document.getElementById('batch-action-toolbar');
    const countSpan = document.getElementById('selected-count');
    const selectAllCheckbox = document.getElementById('select-all-checkbox');
    
    if (toolbar && countSpan) {
        const count = appState.selectedPaperIds.size;
        if (count > 0) {
            toolbar.classList.remove('hidden');
            countSpan.textContent = `${count} selected`;
        } else {
            toolbar.classList.add('hidden');
        }
    }

    // Update select all checkbox state
    if (selectAllCheckbox) {
        const paperCheckboxes = document.querySelectorAll('.paper-checkbox');
        const allChecked = paperCheckboxes.length > 0 && 
                         Array.from(paperCheckboxes).every(cb => cb.checked);
        selectAllCheckbox.checked = allChecked;
    }
}

/**
 * Populates batch status select with current status options
 */
export function populateBatchStatusSelect() {
    const select = document.getElementById('batch-status-select');
    if (!select) return;
    
    const statusOrder = getStatusOrder();
    const optionsHtml = '<option value="">Select...</option>' +
        statusOrder.map(status => `<option value="${status}">${status}</option>`).join('');
    select.innerHTML = optionsHtml;
}

/**
 * Creates select all checkbox handler
 * @param {Object} appState - Application state
 * @param {Function} applyFiltersAndRender - Function to re-render the dashboard
 * @param {Function} updateBatchToolbar - Function to update batch toolbar UI
 * @returns {Function} Event handler for select all checkbox
 */
export function createSelectAllHandler(appState, applyFiltersAndRender, updateBatchToolbar) {
    return (e) => {
        const isChecked = e.target.checked;
        const paperCheckboxes = document.querySelectorAll('.paper-checkbox');
        
        paperCheckboxes.forEach(checkbox => {
            const paperId = parseInt(checkbox.dataset.paperId, 10);
            checkbox.checked = isChecked;
            if (isChecked) {
                appState.selectedPaperIds.add(paperId);
            } else {
                appState.selectedPaperIds.delete(paperId);
            }
        });
        
        updateBatchToolbar(appState);
        applyFiltersAndRender();
    };
}

/**
 * Creates clear selection button handler
 * @param {Object} appState - Application state
 * @param {Function} applyFiltersAndRender - Function to re-render the dashboard
 * @param {Function} updateBatchToolbar - Function to update batch toolbar UI
 * @returns {Function} Event handler for clear selection button
 */
export function createClearSelectionHandler(appState, applyFiltersAndRender, updateBatchToolbar) {
    return () => {
        appState.selectedPaperIds.clear();
        updateBatchToolbar(appState);
        applyFiltersAndRender();
    };
}

/**
 * Registers batch toolbar event listeners
 * @param {Object} appState - Application state
 * @param {Function} applyFiltersAndRender - Function to re-render the dashboard
 * @param {Function} updateBatchToolbar - Function to update batch toolbar UI
 * @returns {Object} Object containing handler functions for cleanup
 */
export function registerBatchToolbarHandlers(appState, applyFiltersAndRender, updateBatchToolbar) {
    const handlers = {};
    
    // Select All checkbox
    const selectAllCheckbox = document.getElementById('select-all-checkbox');
    if (selectAllCheckbox) {
        handlers.selectAllChangeHandler = createSelectAllHandler(appState, applyFiltersAndRender, updateBatchToolbar);
        selectAllCheckbox.addEventListener('change', handlers.selectAllChangeHandler);
    }
    
    // Clear Selection button
    const clearSelectionBtn = document.getElementById('clear-selection-btn');
    if (clearSelectionBtn) {
        handlers.clearSelectionHandler = createClearSelectionHandler(appState, applyFiltersAndRender, updateBatchToolbar);
        clearSelectionBtn.addEventListener('click', handlers.clearSelectionHandler);
    }
    
    return handlers;
}

/**
 * Unregisters batch toolbar event listeners
 * @param {Object} handlers - Object containing handler functions
 */
export function unregisterBatchToolbarHandlers(handlers) {
    const selectAllCheckbox = document.getElementById('select-all-checkbox');
    if (selectAllCheckbox && handlers.selectAllChangeHandler) {
        selectAllCheckbox.removeEventListener('change', handlers.selectAllChangeHandler);
    }
    
    const clearSelectionBtn = document.getElementById('clear-selection-btn');
    if (clearSelectionBtn && handlers.clearSelectionHandler) {
        clearSelectionBtn.removeEventListener('click', handlers.clearSelectionHandler);
    }
}

