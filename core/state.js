// core/state.js
// Application State Management

/**
 * Creates and initializes the application state object.
 * State includes papers cache, filters, pagination, search, and user preferences.
 * 
 * @returns {Object} The initialized application state
 */
export const createAppState = () => {
    return {
        allPapersCache: [],
        collectionsCache: [], // Saved filter collections
        // Initialize hasUnsavedChanges to false. It will be set to true by formView if changes are made.
        // This flag is managed by the formView module.
        hasUnsavedChanges: false, 
        currentSortBy: localStorage.getItem('currentSortBy') || 'date_added',
        currentSearchTerm: localStorage.getItem('searchTerm') || '',
        currentPath: window.location.hash.substring(1) || '/',
        currentView: null,
        selectedPaperIds: new Set(), // Track selected papers for batch operations
        activeFilters: {
            status: null,  // e.g., 'To Read'
            tags: [],      // Array of tags, e.g., ['machine-learning', 'neural-networks']
        },
        pagination: {
            currentPage: 1,
            itemsPerPage: parseInt(localStorage.getItem('itemsPerPage')) || 25,
            totalItems: 0,
            totalPages: 0
        },
        searchMode: localStorage.getItem('searchMode') || 'all' // 'all' or 'notes'
    };
};

/**
 * Persists specific state values to localStorage
 * 
 * @param {string} key - The localStorage key
 * @param {*} value - The value to store
 */
export const persistStateToStorage = (key, value) => {
    try {
        localStorage.setItem(key, value);
    } catch (error) {
        console.warn(`Failed to persist ${key} to localStorage:`, error);
    }
};

/**
 * Clears specific state values from localStorage
 * 
 * @param {string} key - The localStorage key to clear
 */
export const clearStorageKey = (key) => {
    try {
        localStorage.removeItem(key);
    } catch (error) {
        console.warn(`Failed to clear ${key} from localStorage:`, error);
    }
};

