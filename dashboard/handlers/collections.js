/**
 * Collections Handler
 * Handles saving, applying, and editing collections
 */

import { getAllCollections, addCollection, updateCollection, deleteCollection } from '../../db.js';
import { renderSidebarCollections, showToast } from '../../ui.js';

/**
 * Handles saving current filters as a new collection
 * @param {Object} appState - Application state
 * @param {Function} applyFiltersAndRender - Function to re-render the dashboard
 */
export async function handleSaveCollection(appState, applyFiltersAndRender) {
    // Get current filter state
    const currentFilters = {
        status: appState.activeFilters.status || '',
        tags: appState.activeFilters.tags || [], // Array of tags
        searchTerm: appState.currentSearchTerm || ''
    };

    // Check if any filters are active
    if (!currentFilters.status && (!currentFilters.tags || currentFilters.tags.length === 0) && !currentFilters.searchTerm) {
        showToast('No filters are currently active. Apply some filters first.', 'warning', { duration: 4000 });
        return;
    }

    // Prompt for collection name
    const collectionName = prompt('Enter a name for this collection:');
    if (!collectionName || !collectionName.trim()) {
        return; // User cancelled or entered empty name
    }

    try {
        const newCollection = {
            name: collectionName.trim(),
            icon: 'folder', // Default icon
            color: 'text-primary', // Default color
            filters: currentFilters,
            createdAt: new Date()
        };

        await addCollection(newCollection);
        
        // Refresh collections in sidebar
        appState.collectionsCache = await getAllCollections();
        renderSidebarCollections(appState.collectionsCache);
        
        showToast(`Collection "${collectionName.trim()}" saved successfully!`, 'success', { duration: 3000 });
    } catch (error) {
        console.error('Error saving collection:', error);
        showToast(error.message || 'Failed to save collection. Please try again.', 'error', { duration: 5000 });
    }
}

/**
 * Handles applying a saved collection (restore its filters)
 * @param {number} collectionId - ID of the collection to apply
 * @param {Object} appState - Application state
 * @param {Function} applyFiltersAndRender - Function to re-render the dashboard
 */
export async function handleApplyCollection(collectionId, appState, applyFiltersAndRender) {
    try {
        const collection = appState.collectionsCache.find(c => c.id === collectionId);
        if (!collection) {
            showToast('Collection not found.', 'error');
            return;
        }

        // Apply the saved filters
        appState.activeFilters.status = collection.filters.status || null;
        // Handle both old (single tag) and new (multiple tags) format for backward compatibility
        if (Array.isArray(collection.filters.tags)) {
            appState.activeFilters.tags = collection.filters.tags;
        } else if (collection.filters.tag) {
            // Legacy: single tag stored as string
            appState.activeFilters.tags = [collection.filters.tag];
        } else {
            appState.activeFilters.tags = [];
        }
        appState.currentSearchTerm = collection.filters.searchTerm || '';

        // Update search input if present
        const searchInput = document.getElementById('search-input');
        if (searchInput) {
            searchInput.value = appState.currentSearchTerm;
        }

        // Apply filters and render
        applyFiltersAndRender();
        
        showToast(`Applied collection: ${collection.name}`, 'success', { duration: 2000 });
    } catch (error) {
        console.error('Error applying collection:', error);
        showToast('Failed to apply collection. Please try again.', 'error');
    }
}

/**
 * Handles editing or deleting a collection
 * @param {number} collectionId - ID of the collection to edit
 * @param {Object} appState - Application state
 * @param {Function} applyFiltersAndRender - Function to re-render the dashboard
 */
export async function handleEditCollection(collectionId, appState, applyFiltersAndRender) {
    try {
        const collection = appState.collectionsCache.find(c => c.id === collectionId);
        if (!collection) {
            showToast('Collection not found.', 'error');
            return;
        }

        // Simple prompt-based edit for now (can be enhanced with a modal later)
        const action = confirm(`Edit collection "${collection.name}"?\n\nOK = Edit name\nCancel = Delete collection`);
        
        if (action) {
            // Edit collection name
            const newName = prompt('Enter new name for this collection:', collection.name);
            if (newName && newName.trim() && newName.trim() !== collection.name) {
                await updateCollection(collectionId, { name: newName.trim() });
                
                // Refresh collections in sidebar
                appState.collectionsCache = await getAllCollections();
                renderSidebarCollections(appState.collectionsCache);
                
                showToast('Collection updated successfully!', 'success', { duration: 3000 });
            }
        } else {
            // Delete collection
            const confirmDelete = confirm(`Are you sure you want to delete "${collection.name}"?\n\nThis action cannot be undone.`);
            if (confirmDelete) {
                await deleteCollection(collectionId);
                
                // Refresh collections in sidebar
                appState.collectionsCache = await getAllCollections();
                renderSidebarCollections(appState.collectionsCache);
                
                showToast('Collection deleted successfully!', 'success', { duration: 3000 });
            }
        }
    } catch (error) {
        console.error('Error editing/deleting collection:', error);
        showToast(error.message || 'Failed to update collection. Please try again.', 'error', { duration: 5000 });
    }
}

/**
 * Registers collection event listeners using event delegation
 * @param {Object} appState - Application state
 * @param {Function} applyFiltersAndRender - Function to re-render the dashboard
 * @returns {Object} Object containing all handler functions for cleanup
 */
export function registerCollectionHandlers(appState, applyFiltersAndRender) {
    const handlers = {};
    
    // Create unified event handler for collection events
    const handleCollectionEvents = async (e) => {
        // Handle save collection button
        const saveCollectionBtn = e.target.closest('#save-collection-btn');
        if (saveCollectionBtn) {
            e.preventDefault();
            await handleSaveCollection(appState, applyFiltersAndRender);
            return;
        }

        // Handle collection item click (apply collection)
        const collectionItem = e.target.closest('.collection-item');
        if (collectionItem && !e.target.closest('.edit-collection-btn')) {
            e.preventDefault();
            const collectionId = parseInt(collectionItem.dataset.collectionId, 10);
            await handleApplyCollection(collectionId, appState, applyFiltersAndRender);
            return;
        }

        // Handle edit collection button
        const editCollectionBtn = e.target.closest('.edit-collection-btn');
        if (editCollectionBtn) {
            e.stopPropagation();
            e.preventDefault();
            const collectionId = parseInt(editCollectionBtn.dataset.collectionId, 10);
            await handleEditCollection(collectionId, appState, applyFiltersAndRender);
            return;
        }
    };
    
    // Add event listener to both desktop and mobile sidebars
    const desktopSidebar = document.getElementById('sidebar-collections-section');
    const mobileSidebar = document.getElementById('mobile-sidebar-collections-section');
    
    if (desktopSidebar) {
        handlers.collectionItemClickHandler = handleCollectionEvents;
        desktopSidebar.addEventListener('click', handlers.collectionItemClickHandler);
    }
    
    if (mobileSidebar) {
        handlers.saveCollectionHandler = handleCollectionEvents;
        mobileSidebar.addEventListener('click', handlers.saveCollectionHandler);
    }
    
    return handlers;
}

/**
 * Unregisters collection event listeners
 * @param {Object} handlers - Object containing all handler functions
 */
export function unregisterCollectionHandlers(handlers) {
    const desktopSidebar = document.getElementById('sidebar-collections-section');
    if (desktopSidebar && handlers.collectionItemClickHandler) {
        desktopSidebar.removeEventListener('click', handlers.collectionItemClickHandler);
    }

    const mobileSidebar = document.getElementById('mobile-sidebar-collections-section');
    if (mobileSidebar && handlers.saveCollectionHandler) {
        mobileSidebar.removeEventListener('click', handlers.saveCollectionHandler);
    }
}

