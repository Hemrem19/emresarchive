/**
 * Pagination Handler
 * Handles items per page selection
 */

/**
 * Creates items per page change handler
 * @param {Object} appState - Application state
 * @param {Function} applyFiltersAndRender - Function to re-render the dashboard
 * @returns {Function} Event handler for items per page change
 */
export function createItemsPerPageChangeHandler(appState, applyFiltersAndRender) {
    return (e) => {
        const newItemsPerPage = parseInt(e.target.value, 10);
        appState.pagination.itemsPerPage = newItemsPerPage;
        appState.pagination.currentPage = 1; // Reset to first page
        localStorage.setItem('itemsPerPage', newItemsPerPage);
        applyFiltersAndRender();
    };
}

/**
 * Creates sort change handler
 * @param {Object} appState - Application state
 * @param {Function} applyFiltersAndRender - Function to re-render the dashboard
 * @returns {Function} Event handler for sort change
 */
export function createSortChangeHandler(appState, applyFiltersAndRender) {
    return (e) => {
        appState.currentSortBy = e.target.value;
        localStorage.setItem('currentSortBy', appState.currentSortBy);
        applyFiltersAndRender();
    };
}

/**
 * Registers pagination and sort event listeners
 * @param {Object} appState - Application state
 * @param {Function} applyFiltersAndRender - Function to re-render the dashboard
 * @returns {Object} Object containing handler functions for cleanup
 */
export function registerPaginationHandlers(appState, applyFiltersAndRender) {
    const handlers = {};
    
    // Sort select
    const sortSelect = document.getElementById('sort-select');
    if (sortSelect) {
        sortSelect.value = appState.currentSortBy;
        handlers.sortChangeHandler = createSortChangeHandler(appState, applyFiltersAndRender);
        sortSelect.addEventListener('change', handlers.sortChangeHandler);
    }
    
    // Items per page select
    const itemsPerPageSelect = document.getElementById('items-per-page');
    if (itemsPerPageSelect) {
        // Set initial value from appState
        itemsPerPageSelect.value = appState.pagination.itemsPerPage.toString();
        handlers.itemsPerPageChangeHandler = createItemsPerPageChangeHandler(appState, applyFiltersAndRender);
        itemsPerPageSelect.addEventListener('change', handlers.itemsPerPageChangeHandler);
    }
    
    return handlers;
}

/**
 * Unregisters pagination and sort event listeners
 * @param {Object} handlers - Object containing handler functions
 */
export function unregisterPaginationHandlers(handlers) {
    const sortSelect = document.getElementById('sort-select');
    if (sortSelect && handlers.sortChangeHandler) {
        sortSelect.removeEventListener('change', handlers.sortChangeHandler);
    }
    
    const itemsPerPageSelect = document.getElementById('items-per-page');
    if (itemsPerPageSelect && handlers.itemsPerPageChangeHandler) {
        itemsPerPageSelect.removeEventListener('change', handlers.itemsPerPageChangeHandler);
    }
}

