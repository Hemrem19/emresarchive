/**
 * Quick Add Handler
 * Handles quick paper addition via DOI
 */

import { getPaperById, addPaper, getPaperByDoi } from '../../db.js';
import { showToast } from '../../ui.js';
import { fetchDoiMetadata, normalizePaperIdentifier } from '../../api.js';

/**
 * Creates quick add form submission handler
 * @param {Object} appState - Application state
 * @param {Function} applyFiltersAndRender - Function to re-render the dashboard
 * @returns {Function} Event handler for quick add form
 */
export function createQuickAddHandler(appState, applyFiltersAndRender) {
    let isProcessing = false; // Flag to prevent double submission
    
    return async (e) => {
        e.preventDefault();
        
        // Prevent double submission
        if (isProcessing) {
            return;
        }
        
        const doiInput = document.getElementById('quick-add-doi');
        const quickAddForm = document.getElementById('quick-add-form');
        const submitButton = quickAddForm?.querySelector('button[type="submit"], input[type="submit"]');
        const inputValue = doiInput.value.trim();
        if (!inputValue) return;

        try {
            isProcessing = true;
            // Disable form during processing
            if (doiInput) doiInput.disabled = true;
            if (submitButton) submitButton.disabled = true;
            
            // Normalize input to extract DOI/identifier
            const normalized = normalizePaperIdentifier(inputValue);
            
            // Handle arXiv (not yet supported)
            if (normalized.type === 'arxiv') {
                showToast(normalized.error || 'arXiv papers are not yet supported. Please use a DOI or add the paper manually.', 'warning', { duration: 7000 });
                isProcessing = false;
                if (doiInput) doiInput.disabled = false;
                if (submitButton) submitButton.disabled = false;
                return;
            }
            
            // Handle unsupported formats
            if (normalized.type === 'unsupported') {
                showToast(normalized.error || 'Could not detect a valid DOI. Please provide a DOI (e.g., 10.1234/example) or a doi.org URL.', 'error', { duration: 7000 });
                isProcessing = false;
                if (doiInput) doiInput.disabled = false;
                if (submitButton) submitButton.disabled = false;
                return;
            }
            
            if (normalized.type !== 'doi' || !normalized.value) {
                showToast('Could not extract a valid DOI from the input. Please check the format and try again.', 'error', { duration: 5000 });
                isProcessing = false;
                if (doiInput) doiInput.disabled = false;
                if (submitButton) submitButton.disabled = false;
                return;
            }

            const extractedDoi = normalized.value;

            // Check for duplicates before fetching (use normalized DOI)
            try {
                const existingPaper = await getPaperByDoi(extractedDoi);
                if (existingPaper) {
                    showToast(`Paper with this DOI already exists: "${existingPaper.title}"`, 'error', { duration: 5000 });
                    isProcessing = false;
                    if (doiInput) doiInput.disabled = false;
                    if (submitButton) submitButton.disabled = false;
                    return;
                }
            } catch (duplicateError) {
                console.error('Error checking for duplicate:', duplicateError);
                // Continue with add if duplicate check fails
            }

            // Show helpful message if URL was detected
            if (normalized.original !== extractedDoi) {
                showToast(`Detected DOI: ${extractedDoi}. Fetching metadata...`, 'info', { duration: 5000 });
            } else {
                showToast('Fetching metadata...', 'info', { duration: 10000 });
            }
            
            const metadata = await fetchDoiMetadata(inputValue); // fetchDoiMetadata handles normalization internally
            
            // Re-check for duplicates after fetching metadata (in case it was added during fetch)
            // This is important because fetching metadata takes time, and another submission might have happened
            try {
                const existingPaper = await getPaperByDoi(metadata.doi || extractedDoi);
                if (existingPaper) {
                    showToast(`Paper with this DOI already exists: "${existingPaper.title}"`, 'error', { duration: 5000 });
                    isProcessing = false;
                    if (doiInput) doiInput.disabled = false;
                    if (submitButton) submitButton.disabled = false;
                    return;
                }
            } catch (duplicateError) {
                console.error('Error checking for duplicate after fetch:', duplicateError);
                // Continue with add if duplicate check fails
            }
            
            const paperData = {
                ...metadata,
                tags: [], createdAt: new Date(), readingStatus: 'To Read',
                hasPdf: false, pdfFile: null, notes: ''
            };
            const newPaperId = await addPaper(paperData);
            const newPaper = await getPaperById(newPaperId);
            appState.allPapersCache.unshift(newPaper);
            showToast('Paper added successfully!', 'success');
            doiInput.value = '';
            applyFiltersAndRender();
        } catch (error) {
            console.error('Quick add error:', error);
            // Show user-friendly error message
            showToast(error.message || 'Failed to add paper from DOI. Please try again.', 'error', {
                duration: 5000,
                actions: [{
                    label: 'Retry',
                    onClick: () => document.getElementById('quick-add-form').requestSubmit()
                }]
            });
        } finally {
            // Re-enable form
            isProcessing = false;
            if (doiInput) doiInput.disabled = false;
            if (submitButton) submitButton.disabled = false;
            if (doiInput) doiInput.focus(); // Refocus input for next entry
        }
    };
}

/**
 * Registers quick add form event listener
 * @param {Object} appState - Application state
 * @param {Function} applyFiltersAndRender - Function to re-render the dashboard
 * @returns {Object} Object containing handler function for cleanup
 */
export function registerQuickAddHandler(appState, applyFiltersAndRender) {
    const handlers = {};
    
    const quickAddForm = document.getElementById('quick-add-form');
    if (quickAddForm) {
        handlers.quickAddHandler = createQuickAddHandler(appState, applyFiltersAndRender);
        quickAddForm.addEventListener('submit', handlers.quickAddHandler);
    }
    
    return handlers;
}

/**
 * Unregisters quick add form event listener
 * @param {Object} handlers - Object containing handler function
 */
export function unregisterQuickAddHandler(handlers) {
    const quickAddForm = document.getElementById('quick-add-form');
    if (quickAddForm && handlers.quickAddHandler) {
        quickAddForm.removeEventListener('submit', handlers.quickAddHandler);
    }
}

