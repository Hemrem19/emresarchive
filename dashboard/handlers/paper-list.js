/**
 * Paper List Handler
 * Handles interactions with paper cards in the dashboard list
 */

import { deletePaper, updatePaper } from '../../db.js';
import { showToast } from '../../ui.js';

/**
 * Creates paper list click handler (expand notes, checkboxes, delete)
 * @param {Object} appState - Application state
 * @param {Function} applyFiltersAndRender - Function to re-render the dashboard
 * @param {Function} updateBatchToolbar - Function to update batch toolbar UI
 * @returns {Function} Event handler for paper list clicks
 */
export function createPaperListClickHandler(appState, applyFiltersAndRender, updateBatchToolbar) {
    return async (e) => {
        // Handle expand notes button clicks
        const expandBtn = e.target.closest('.expand-notes-btn');
        if (expandBtn) {
            e.preventDefault();
            e.stopPropagation();
            const paperCard = expandBtn.closest('.paper-card');
            if (!paperCard) return;
            
            const paperId = parseInt(expandBtn.dataset.paperId, 10);
            const notesSection = paperCard.querySelector(`.notes-expandable-section[data-paper-id="${paperId}"]`);
            const expandIcon = expandBtn.querySelector('.expand-icon');
            
            if (notesSection && expandIcon) {
                const isHidden = notesSection.classList.contains('hidden');
                if (isHidden) {
                    notesSection.classList.remove('hidden');
                    expandIcon.textContent = 'expand_less';
                } else {
                    notesSection.classList.add('hidden');
                    expandIcon.textContent = 'expand_more';
                }
            }
            return;
        }

        // Handle checkbox clicks
        const checkbox = e.target.closest('.paper-checkbox');
        if (checkbox) {
            const paperId = parseInt(checkbox.dataset.paperId, 10);
            if (checkbox.checked) {
                appState.selectedPaperIds.add(paperId);
            } else {
                appState.selectedPaperIds.delete(paperId);
            }
            updateBatchToolbar(appState);
            applyFiltersAndRender();
            return;
        }

        // Handle delete button clicks
        const deleteButton = e.target.closest('.delete-paper-btn');
        if (deleteButton) {
            e.preventDefault();
            const paperId = parseInt(deleteButton.dataset.id, 10);
            if (confirm('Are you sure you want to delete this paper? This action cannot be undone.')) {
                try {
                    await deletePaper(paperId);
                    appState.allPapersCache = appState.allPapersCache.filter(p => p.id !== paperId);
                    appState.selectedPaperIds.delete(paperId); // Remove from selection if was selected
                    showToast('Paper deleted successfully.');
                    updateBatchToolbar(appState);
                    applyFiltersAndRender();
                } catch (error) {
                    showToast('Error deleting paper.', 'error');
                    console.error('Error deleting paper:', error);
                }
            }
        }
    };
}

/**
 * Creates paper list change handler (status select)
 * @param {Object} appState - Application state
 * @param {Function} applyFiltersAndRender - Function to re-render the dashboard
 * @returns {Function} Event handler for paper list changes
 */
export function createPaperListChangeHandler(appState, applyFiltersAndRender) {
    return async (e) => {
        const statusSelect = e.target.closest('.reading-status-select');
        if (!statusSelect) return;
        const paperId = parseInt(statusSelect.dataset.id, 10);
        const newStatus = statusSelect.value;
        try {
            await updatePaper(paperId, { readingStatus: newStatus });
            const paperIndex = appState.allPapersCache.findIndex(p => p.id === paperId);
            if (paperIndex > -1) {
                appState.allPapersCache[paperIndex].readingStatus = newStatus;
            }
            applyFiltersAndRender();
            showToast('Status updated.');
        } catch (error) {
            showToast('Error updating status.', 'error');
            console.error('Error updating reading status:', error);
        }
    };
}

/**
 * Registers paper list event listeners
 * @param {Object} appState - Application state
 * @param {Function} applyFiltersAndRender - Function to re-render the dashboard
 * @param {Function} updateBatchToolbar - Function to update batch toolbar UI
 * @returns {Object} Object containing handler functions for cleanup
 */
export function registerPaperListHandlers(appState, applyFiltersAndRender, updateBatchToolbar) {
    const handlers = {};
    
    const paperListContainer = document.getElementById('paper-list');
    if (paperListContainer) {
        handlers.paperListClickHandler = createPaperListClickHandler(appState, applyFiltersAndRender, updateBatchToolbar);
        handlers.paperListChangeHandler = createPaperListChangeHandler(appState, applyFiltersAndRender);
        
        paperListContainer.addEventListener('click', handlers.paperListClickHandler);
        paperListContainer.addEventListener('change', handlers.paperListChangeHandler);
    }
    
    return handlers;
}

/**
 * Unregisters paper list event listeners
 * @param {Object} handlers - Object containing handler functions
 */
export function unregisterPaperListHandlers(handlers) {
    const paperListContainer = document.getElementById('paper-list');
    if (paperListContainer) {
        if (handlers.paperListClickHandler) {
            paperListContainer.removeEventListener('click', handlers.paperListClickHandler);
        }
        if (handlers.paperListChangeHandler) {
            paperListContainer.removeEventListener('change', handlers.paperListChangeHandler);
        }
    }
}

