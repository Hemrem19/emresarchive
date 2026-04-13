/**
 * Dashboard View - Refactored
 * Main orchestrator for the dashboard view, delegating to specialized handlers
 */

import { getAllPapers, getAllCollections } from './db.js';
import { renderSidebarTags, renderSidebarCollections, showToast } from './ui.js';

// Import refactored handlers
import { registerBatchOperationHandlers, unregisterBatchOperationHandlers } from './dashboard/handlers/batch-operations.js';
import { registerSearchModeHandlers, unregisterSearchModeHandlers } from './dashboard/handlers/search-mode.js';
import { registerCollectionHandlers, unregisterCollectionHandlers } from './dashboard/handlers/collections.js';
import { registerQuickAddHandler, unregisterQuickAddHandler } from './dashboard/handlers/quick-add.js';
import { registerPaperListHandlers, unregisterPaperListHandlers } from './dashboard/handlers/paper-list.js';
import { registerPaginationHandlers, unregisterPaginationHandlers } from './dashboard/handlers/pagination.js';
import { 
    updateBatchToolbar, 
    populateBatchStatusSelect, 
    registerBatchToolbarHandlers, 
    unregisterBatchToolbarHandlers 
} from './dashboard/ui/batch-toolbar.js';

export const dashboardView = {
    // Store all handlers for cleanup
    handlers: {},
    _cloudSyncHandler: null,
    _mountGeneration: 0,

    /**
     * Mount the dashboard view
     * @param {Object} appState - Application state
     * @param {Function} applyFiltersAndRender - Function to re-render the dashboard
     */
    async mount(appState, applyFiltersAndRender) {
        // Capture generation so a stale mount can bail out before registering handlers
        const mountGeneration = ++this._mountGeneration;

        // Load papers
        try {
            appState.allPapersCache = await getAllPapers();
            renderSidebarTags(appState.allPapersCache);
        } catch (error) {
            console.error('Error loading papers:', error);
            showToast(error.message || 'Failed to load papers. Please refresh the page.', 'error', {
                duration: 0, // Persistent toast
                actions: [{
                    label: 'Refresh',
                    onClick: () => window.location.reload()
                }]
            });
            appState.allPapersCache = [];
            return; // Early exit if papers can't be loaded
        }

        // Load collections
        try {
            appState.collectionsCache = await getAllCollections();
            renderSidebarCollections(appState.collectionsCache);
        } catch (error) {
            console.error('Error loading collections:', error);
            showToast('Failed to load collections. Some features may be unavailable.', 'warning', {
                duration: 0,
                actions: [{
                    label: 'Refresh',
                    onClick: () => window.location.reload()
                }]
            });
            appState.collectionsCache = [];
        }

        // If the router navigated away (and possibly back) while we were awaiting,
        // a newer mount() call has already registered handlers — bail out to avoid duplicates.
        if (mountGeneration !== this._mountGeneration) return;

        // Clear selections when mounting dashboard
        appState.selectedPaperIds.clear();

        // Populate batch status select
        populateBatchStatusSelect();

        // Set search input value from persisted state
        const searchInput = document.getElementById('search-input');
        if (searchInput) {
            searchInput.value = appState.currentSearchTerm || '';
        }

        // Register all event handlers
        this.handlers = {
            ...registerPaginationHandlers(appState, applyFiltersAndRender),
            ...registerQuickAddHandler(appState, applyFiltersAndRender),
            ...registerBatchToolbarHandlers(appState, applyFiltersAndRender, updateBatchToolbar),
            ...registerBatchOperationHandlers(appState, applyFiltersAndRender, updateBatchToolbar),
            ...registerPaperListHandlers(appState, applyFiltersAndRender, updateBatchToolbar),
            ...registerSearchModeHandlers(appState, applyFiltersAndRender),
            ...registerCollectionHandlers(appState, applyFiltersAndRender)
        };

        // Initial toolbar update
        updateBatchToolbar(appState);

        // Refresh dashboard when cloud sync pulls new data from another device
        this._cloudSyncHandler = async () => {
            try {
                appState.allPapersCache = await getAllPapers();
                renderSidebarTags(appState.allPapersCache);
                appState.collectionsCache = await getAllCollections();
                renderSidebarCollections(appState.collectionsCache);
                applyFiltersAndRender(appState);
            } catch (e) {
                console.warn('[Dashboard] Cloud sync refresh failed:', e.message);
            }
        };
        window.addEventListener('citavers:cloud-synced', this._cloudSyncHandler);
    },

    /**
     * Unmount the dashboard view and cleanup event listeners
     */
    unmount() {
        // Invalidate any in-flight mount() that is still awaiting async DB calls
        this._mountGeneration++;

        // Unregister all event handlers
        unregisterPaginationHandlers(this.handlers);
        unregisterQuickAddHandler(this.handlers);
        unregisterBatchToolbarHandlers(this.handlers);
        unregisterBatchOperationHandlers(this.handlers);
        unregisterPaperListHandlers(this.handlers);
        unregisterSearchModeHandlers(this.handlers);
        unregisterCollectionHandlers(this.handlers);

        // Clear handlers
        this.handlers = {};

        if (this._cloudSyncHandler) {
            window.removeEventListener('citavers:cloud-synced', this._cloudSyncHandler);
            this._cloudSyncHandler = null;
        }

        console.log('Dashboard view unmounted.');
    }
};
