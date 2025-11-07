/**
 * Search Mode Handler
 * Handles search mode toggle between "All Fields" and "Notes Only"
 */

/**
 * Updates search mode button states based on current mode
 * @param {string} searchMode - Current search mode ('all' or 'notes')
 */
export function updateSearchModeButtons(searchMode) {
    const searchModeAllBtn = document.getElementById('search-mode-all');
    const searchModeNotesBtn = document.getElementById('search-mode-notes');
    const searchModeAllBtnMobile = document.getElementById('search-mode-all-mobile');
    const searchModeNotesBtnMobile = document.getElementById('search-mode-notes-mobile');
    
    const allButtons = [searchModeAllBtn, searchModeAllBtnMobile].filter(Boolean);
    const notesButtons = [searchModeNotesBtn, searchModeNotesBtnMobile].filter(Boolean);
    
    if (searchMode === 'all') {
        allButtons.forEach(btn => {
            btn.classList.add('bg-white', 'dark:bg-stone-700', 'text-primary', 'shadow-sm');
            btn.classList.remove('text-stone-600', 'dark:text-stone-400');
        });
        notesButtons.forEach(btn => {
            btn.classList.remove('bg-white', 'dark:bg-stone-700', 'text-primary', 'shadow-sm');
            btn.classList.add('text-stone-600', 'dark:text-stone-400');
        });
    } else {
        notesButtons.forEach(btn => {
            btn.classList.add('bg-white', 'dark:bg-stone-700', 'text-primary', 'shadow-sm');
            btn.classList.remove('text-stone-600', 'dark:text-stone-400');
        });
        allButtons.forEach(btn => {
            btn.classList.remove('bg-white', 'dark:bg-stone-700', 'text-primary', 'shadow-sm');
            btn.classList.add('text-stone-600', 'dark:text-stone-400');
        });
    }
}

/**
 * Creates a handler for switching to "All Fields" search mode
 * @param {Object} appState - Application state
 * @param {Function} applyFiltersAndRender - Function to re-render the dashboard
 * @returns {Function} Event handler for "All Fields" mode
 */
export function createSearchModeAllHandler(appState, applyFiltersAndRender) {
    return () => {
        appState.searchMode = 'all';
        localStorage.setItem('searchMode', 'all');
        updateSearchModeButtons('all');
        if (appState.currentSearchTerm) {
            applyFiltersAndRender();
        }
    };
}

/**
 * Creates a handler for switching to "Notes Only" search mode
 * @param {Object} appState - Application state
 * @param {Function} applyFiltersAndRender - Function to re-render the dashboard
 * @returns {Function} Event handler for "Notes Only" mode
 */
export function createSearchModeNotesHandler(appState, applyFiltersAndRender) {
    return () => {
        appState.searchMode = 'notes';
        localStorage.setItem('searchMode', 'notes');
        updateSearchModeButtons('notes');
        if (appState.currentSearchTerm) {
            applyFiltersAndRender();
        }
    };
}

/**
 * Registers search mode event listeners for both desktop and mobile
 * @param {Object} appState - Application state
 * @param {Function} applyFiltersAndRender - Function to re-render the dashboard
 * @returns {Object} Object containing all handler functions for cleanup
 */
export function registerSearchModeHandlers(appState, applyFiltersAndRender) {
    const handlers = {};
    
    // Create handlers
    const handleSearchModeAll = createSearchModeAllHandler(appState, applyFiltersAndRender);
    const handleSearchModeNotes = createSearchModeNotesHandler(appState, applyFiltersAndRender);
    
    // Desktop buttons
    const searchModeAllBtn = document.getElementById('search-mode-all');
    const searchModeNotesBtn = document.getElementById('search-mode-notes');
    
    if (searchModeAllBtn) {
        handlers.searchModeAllHandler = handleSearchModeAll;
        searchModeAllBtn.addEventListener('click', handlers.searchModeAllHandler);
    }
    
    if (searchModeNotesBtn) {
        handlers.searchModeNotesHandler = handleSearchModeNotes;
        searchModeNotesBtn.addEventListener('click', handlers.searchModeNotesHandler);
    }
    
    // Mobile buttons
    const searchModeAllBtnMobile = document.getElementById('search-mode-all-mobile');
    const searchModeNotesBtnMobile = document.getElementById('search-mode-notes-mobile');
    
    if (searchModeAllBtnMobile) {
        handlers.searchModeAllHandlerMobile = handleSearchModeAll;
        searchModeAllBtnMobile.addEventListener('click', handlers.searchModeAllHandlerMobile);
    }
    
    if (searchModeNotesBtnMobile) {
        handlers.searchModeNotesHandlerMobile = handleSearchModeNotes;
        searchModeNotesBtnMobile.addEventListener('click', handlers.searchModeNotesHandlerMobile);
    }
    
    // Initialize button states
    updateSearchModeButtons(appState.searchMode);
    
    return handlers;
}

/**
 * Unregisters search mode event listeners
 * @param {Object} handlers - Object containing all handler functions
 */
export function unregisterSearchModeHandlers(handlers) {
    const searchModeAllBtn = document.getElementById('search-mode-all');
    if (searchModeAllBtn && handlers.searchModeAllHandler) {
        searchModeAllBtn.removeEventListener('click', handlers.searchModeAllHandler);
    }
    
    const searchModeNotesBtn = document.getElementById('search-mode-notes');
    if (searchModeNotesBtn && handlers.searchModeNotesHandler) {
        searchModeNotesBtn.removeEventListener('click', handlers.searchModeNotesHandler);
    }
    
    const searchModeAllBtnMobile = document.getElementById('search-mode-all-mobile');
    if (searchModeAllBtnMobile && handlers.searchModeAllHandlerMobile) {
        searchModeAllBtnMobile.removeEventListener('click', handlers.searchModeAllHandlerMobile);
    }
    
    const searchModeNotesBtnMobile = document.getElementById('search-mode-notes-mobile');
    if (searchModeNotesBtnMobile && handlers.searchModeNotesHandlerMobile) {
        searchModeNotesBtnMobile.removeEventListener('click', handlers.searchModeNotesHandlerMobile);
    }
}

