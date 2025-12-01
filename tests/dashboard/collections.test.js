/**
 * Dashboard Collections Handler Tests
 * Tests for dashboard/handlers/collections.js
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
    handleSaveCollection,
    handleApplyCollection,
    handleEditCollection,
    registerCollectionHandlers,
    unregisterCollectionHandlers
} from '../../dashboard/handlers/collections.js';

// Mock dependencies
vi.mock('../../db.js', () => ({
    getAllCollections: vi.fn(),
    addCollection: vi.fn(),
    updateCollection: vi.fn(),
    deleteCollection: vi.fn()
}));

vi.mock('../../ui.js', () => ({
    renderSidebarCollections: vi.fn(),
    showToast: vi.fn()
}));

import { getAllCollections, addCollection, updateCollection, deleteCollection } from '../../db.js';
import { renderSidebarCollections, showToast } from '../../ui.js';

describe('dashboard/handlers/collections.js', () => {
    let appState;
    let applyFiltersAndRender;

    beforeEach(() => {
        // Mock appState
        appState = {
            activeFilters: {
                status: 'Reading',
                tags: ['ML', 'AI']
            },
            currentSearchTerm: 'neural networks',
            collectionsCache: [
                { id: 1, name: 'My Collection', filters: { status: 'Reading', tags: ['ML'], searchTerm: 'test' } },
                { id: 2, name: 'Old Collection', filters: { tag: 'Legacy' } } // Legacy format
            ]
        };

        applyFiltersAndRender = vi.fn();

        // Mock window functions
        global.prompt = vi.fn();
        global.confirm = vi.fn();

        // Mock document elements
        document.body.innerHTML = `
      <input id="search-input" value="" />
      <div id="sidebar-collections-section"></div>
      <div id="mobile-sidebar-collections-section"></div>
    `;
    });

    afterEach(() => {
        vi.clearAllMocks();
        document.body.innerHTML = '';
    });

    describe('handleSaveCollection', () => {
        it('should warn if no filters are active', async () => {
            appState.activeFilters = { status: '', tags: [] };
            appState.currentSearchTerm = '';

            await handleSaveCollection(appState, applyFiltersAndRender);

            expect(showToast).toHaveBeenCalledWith(
                expect.stringContaining('No filters'),
                'warning',
                expect.any(Object)
            );
            expect(addCollection).not.toHaveBeenCalled();
        });

        it('should not save if user cancels prompt', async () => {
            global.prompt.mockReturnValue(null);

            await handleSaveCollection(appState, applyFiltersAndRender);

            expect(addCollection).not.toHaveBeenCalled();
        });

        it('should not save if user enters empty name', async () => {
            global.prompt.mockReturnValue('  ');

            await handleSaveCollection(appState, applyFiltersAndRender);

            expect(addCollection).not.toHaveBeenCalled();
        });

        it('should save collection with current filters', async () => {
            global.prompt.mockReturnValue('My New Collection');
            addCollection.mockResolvedValue();
            getAllCollections.mockResolvedValue([]);

            await handleSaveCollection(appState, applyFiltersAndRender);

            expect(addCollection).toHaveBeenCalledWith(
                expect.objectContaining({
                    name: 'My New Collection',
                    icon: 'folder',
                    filters: {
                        status: 'Reading',
                        tags: ['ML', 'AI'],
                        searchTerm: 'neural networks'
                    }
                })
            );
            expect(showToast).toHaveBeenCalledWith(
                expect.stringContaining('saved successfully'),
                'success',
                expect.any(Object)
            );
        });

        it('should handle save errors', async () => {
            global.prompt.mockReturnValue('Test');
            addCollection.mockRejectedValue(new Error('DB error'));

            await handleSaveCollection(appState, applyFiltersAndRender);

            expect(showToast).toHaveBeenCalledWith(
                expect.stringContaining('DB error'),
                'error',
                expect.any(Object)
            );
        });
    });

    describe('handleApplyCollection', () => {
        it('should apply collection filters to appState', async () => {
            await handleApplyCollection(1, appState, applyFiltersAndRender);

            expect(appState.activeFilters.status).toBe('Reading');
            expect(appState.activeFilters.tags).toEqual(['ML']);
            expect(appState.currentSearchTerm).toBe('test');
            expect(applyFiltersAndRender).toHaveBeenCalled();
        });

        it('should update search input if present', async () => {
            await handleApplyCollection(1, appState, applyFiltersAndRender);

            const searchInput = document.getElementById('search-input');
            expect(searchInput.value).toBe('test');
        });

        it('should handle legacy single tag format', async () => {
            await handleApplyCollection(2, appState, applyFiltersAndRender);

            expect(appState.activeFilters.tags).toEqual(['Legacy']);
        });

        it('should show error if collection not found', async () => {
            await handleApplyCollection(999, appState, applyFiltersAndRender);

            expect(showToast).toHaveBeenCalledWith('Collection not found.', 'error');
            expect(applyFiltersAndRender).not.toHaveBeenCalled();
        });

        it('should show success toast', async () => {
            await handleApplyCollection(1, appState, applyFiltersAndRender);

            expect(showToast).toHaveBeenCalledWith(
                expect.stringContaining('My Collection'),
                'success',
                expect.any(Object)
            );
        });
    });

    describe('handleEditCollection', () => {
        it('should update collection name when confirmed to edit', async () => {
            global.confirm.mockReturnValue(true); // Choose edit
            global.prompt.mockReturnValue('Updated Name');
            updateCollection.mockResolvedValue();
            getAllCollections.mockResolvedValue([]);

            await handleEditCollection(1, appState, applyFiltersAndRender);

            expect(updateCollection).toHaveBeenCalledWith(1, { name: 'Updated Name' });
            expect(showToast).toHaveBeenCalledWith(
                expect.stringContaining('updated'),
                'success',
                expect.any(Object)
            );
        });

        it('should not update if name unchanged', async () => {
            global.confirm.mockReturnValue(true);
            global.prompt.mockReturnValue('My Collection'); // Same name

            await handleEditCollection(1, appState, applyFiltersAndRender);

            expect(updateCollection).not.toHaveBeenCalled();
        });

        it('should delete collection when confirmed to delete', async () => {
            global.confirm
                .mockReturnValueOnce(false) // Choose delete
                .mockReturnValueOnce(true);  // Confirm deletion
            deleteCollection.mockResolvedValue();
            getAllCollections.mockResolvedValue([]);

            await handleEditCollection(1, appState, applyFiltersAndRender);

            expect(deleteCollection).toHaveBeenCalledWith(1);
            expect(showToast).toHaveBeenCalledWith(
                expect.stringContaining('deleted'),
                'success',
                expect.any(Object)
            );
        });

        it('should not delete if user cancels deletion', async () => {
            global.confirm
                .mockReturnValueOnce(false) // Choose delete
                .mockReturnValueOnce(false); // Cancel deletion

            await handleEditCollection(1, appState, applyFiltersAndRender);

            expect(deleteCollection).not.toHaveBeenCalled();
        });

        it('should show error if collection not found', async () => {
            await handleEditCollection(999, appState, applyFiltersAndRender);

            expect(showToast).toHaveBeenCalledWith('Collection not found.', 'error');
        });
    });

    describe('registerCollectionHandlers', () => {
        it('should register handlers on desktop sidebar', () => {
            const handlers = registerCollectionHandlers(appState, applyFiltersAndRender);

            expect(handlers.collectionItemClickHandler).toBeDefined();
        });

        it('should register handlers on mobile sidebar', () => {
            const handlers = registerCollectionHandlers(appState, applyFiltersAndRender);

            expect(handlers.saveCollectionHandler).toBeDefined();
        });

        it('should handle missing sidebars gracefully', () => {
            document.body.innerHTML = '';

            const handlers = registerCollectionHandlers(appState, applyFiltersAndRender);

            expect(handlers).toBeDefined();
        });
    });

    describe('unregisterCollectionHandlers', () => {
        it('should remove event listeners', () => {
            const handlers = registerCollectionHandlers(appState, applyFiltersAndRender);

            expect(() => unregisterCollectionHandlers(handlers)).not.toThrow();
        });

        it('should handle missing handlers', () => {
            expect(() => unregisterCollectionHandlers({})).not.toThrow();
        });
    });
});
