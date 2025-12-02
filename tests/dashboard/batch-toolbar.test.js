/**
 * Tests for dashboard/ui/batch-toolbar.js - Batch Toolbar UI
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
    updateBatchToolbar,
    populateBatchStatusSelect,
    createSelectAllHandler,
    createClearSelectionHandler,
    registerBatchToolbarHandlers,
    unregisterBatchToolbarHandlers
} from '../../dashboard/ui/batch-toolbar.js';

// Mock dependencies
vi.mock('../../config.js', () => ({
    getStatusOrder: vi.fn(() => ['Reading', 'To Read', 'Finished', 'Archived'])
}));

describe('batch-toolbar.js - Batch Toolbar UI', () => {
    let appState;
    let mockApplyFiltersAndRender;
    let mockUpdateBatchToolbar;

    beforeEach(() => {
        // Create app state
        appState = {
            selectedPaperIds: new Set()
        };

        // Create mock functions
        mockApplyFiltersAndRender = vi.fn();
        mockUpdateBatchToolbar = vi.fn();

        // Create DOM elements
        document.body.innerHTML = `
            <div id="batch-action-toolbar" class="hidden">
                <span id="selected-count">0 selected</span>
                <button id="clear-selection-btn">Clear</button>
            </div>
            <input type="checkbox" id="select-all-checkbox" />
            <select id="batch-status-select"></select>
            <div class="paper-checkbox-container">
                <input type="checkbox" class="paper-checkbox" data-paper-id="1" />
                <input type="checkbox"  class="paper-checkbox" data-paper-id="2" />
                <input type="checkbox" class="paper-checkbox" data-paper-id="3" />
            </div>
        `;
    });

    afterEach(() => {
        document.body.innerHTML = '';
        vi.clearAllMocks();
    });

    describe('updateBatchToolbar', () => {
        it('should show toolbar when papers are selected', () => {
            appState.selectedPaperIds.add(1);
            appState.selectedPaperIds.add(2);

            updateBatchToolbar(appState);

            const toolbar = document.getElementById('batch-action-toolbar');
            const countSpan = document.getElementById('selected-count');

            expect(toolbar.classList.contains('hidden')).toBe(false);
            expect(countSpan.textContent).toBe('2 selected');
        });

        it('should hide toolbar when no papers are selected', () => {
            appState.selectedPaperIds.clear();

            updateBatchToolbar(appState);

            const toolbar = document.getElementById('batch-action-toolbar');
            expect(toolbar.classList.contains('hidden')).toBe(true);
        });

        it('should update selection count correctly', () => {
            appState.selectedPaperIds.add(1);

            updateBatchToolbar(appState);

            const countSpan = document.getElementById('selected-count');
            expect(countSpan.textContent).toBe('1 selected');

            appState.selectedPaperIds.add(2);
            appState.selectedPaperIds.add(3);

            updateBatchToolbar(appState);
            expect(countSpan.textContent).toBe('3 selected');
        });

        it('should check select-all checkbox when all papers are selected', () => {
            const checkboxes = document.querySelectorAll('.paper-checkbox');
            checkboxes.forEach(cb => cb.checked = true);

            updateBatchToolbar(appState);

            const selectAllCheckbox = document.getElementById('select-all-checkbox');
            expect(selectAllCheckbox.checked).toBe(true);
        });

        it('should uncheck select-all checkbox when not all papers are selected', () => {
            const checkboxes = document.querySelectorAll('.paper-checkbox');
            checkboxes[0].checked = true;
            checkboxes[1].checked = false;

            updateBatchToolbar(appState);

            const selectAllCheckbox = document.getElementById('select-all-checkbox');
            expect(selectAllCheckbox.checked).toBe(false);
        });

        it('should handle missing DOM elements gracefully', () => {
            document.body.innerHTML = '';

            expect(() => {
                updateBatchToolbar(appState);
            }).not.toThrow();
        });
    });

    describe('populateBatchStatusSelect', () => {
        it('should populate status select with options', () => {
            populateBatchStatusSelect();

            const select = document.getElementById('batch-status-select');
            const options = select.querySelectorAll('option');

            expect(options.length).toBe(5); // "Select..." + 4 statuses
            expect(options[0].textContent).toBe('Select...');
            expect(options[1].value).toBe('Reading');
            expect(options[2].value).toBe('To Read');
            expect(options[3].value).toBe('Finished');
            expect(options[4].value).toBe('Archived');
        });

        it('should handle missing select element gracefully', () => {
            document.getElementById('batch-status-select').remove();

            expect(() => {
                populateBatchStatusSelect();
            }).not.toThrow();
        });
    });

    describe('createSelectAllHandler', () => {
        it('should select all papers when checked', () => {
            const handler = createSelectAllHandler(appState, mockApplyFiltersAndRender, mockUpdateBatchToolbar);
            const selectAllCheckbox = document.getElementById('select-all-checkbox');

            const event = { target: { checked: true } };
            handler(event);

            expect(appState.selectedPaperIds.size).toBe(3);
            expect(appState.selectedPaperIds.has(1)).toBe(true);
            expect(appState.selectedPaperIds.has(2)).toBe(true);
            expect(appState.selectedPaperIds.has(3)).toBe(true);
            expect(mockUpdateBatchToolbar).toHaveBeenCalledWith(appState);
            expect(mockApplyFiltersAndRender).toHaveBeenCalled();
        });

        it('should deselect all papers when unchecked', () => {
            appState.selectedPaperIds.add(1);
            appState.selectedPaperIds.add(2);
            appState.selectedPaperIds.add(3);

            const handler = createSelectAllHandler(appState, mockApplyFiltersAndRender, mockUpdateBatchToolbar);

            const event = { target: { checked: false } };
            handler(event);

            expect(appState.selectedPaperIds.size).toBe(0);
            expect(mockUpdateBatchToolbar).toHaveBeenCalledWith(appState);
            expect(mockApplyFiltersAndRender).toHaveBeenCalled();
        });

        it('should update paper checkboxes to match select-all state', () => {
            const handler = createSelectAllHandler(appState, mockApplyFiltersAndRender, mockUpdateBatchToolbar);
            const checkboxes = document.querySelectorAll('.paper-checkbox');

            // Check all
            const checkEvent = { target: { checked: true } };
            handler(checkEvent);

            checkboxes.forEach(cb => {
                expect(cb.checked).toBe(true);
            });

            // Uncheck all
            const uncheckEvent = { target: { checked: false } };
            handler(uncheckEvent);

            checkboxes.forEach(cb => {
                expect(cb.checked).toBe(false);
            });
        });
    });

    describe('createClearSelectionHandler', () => {
        it('should clear all selected papers', () => {
            appState.selectedPaperIds.add(1);
            appState.selectedPaperIds.add(2);
            appState.selectedPaperIds.add(3);

            const handler = createClearSelectionHandler(appState, mockApplyFiltersAndRender, mockUpdateBatchToolbar);
            handler();

            expect(appState.selectedPaperIds.size).toBe(0);
            expect(mockUpdateBatchToolbar).toHaveBeenCalledWith(appState);
            expect(mockApplyFiltersAndRender).toHaveBeenCalled();
        });

        it('should work even when no papers are selected', () => {
            const handler = createClearSelectionHandler(appState, mockApplyFiltersAndRender, mockUpdateBatchToolbar);

            expect(() => {
                handler();
            }).not.toThrow();

            expect(appState.selectedPaperIds.size).toBe(0);
        });
    });

    describe('registerBatchToolbarHandlers', () => {
        it('should register select-all checkbox handler', () => {
            const handlers = registerBatchToolbarHandlers(appState, mockApplyFiltersAndRender, mockUpdateBatchToolbar);

            expect(handlers).toHaveProperty('selectAllChangeHandler');
            expect(typeof handlers.selectAllChangeHandler).toBe('function');
        });

        it('should register clear selection button handler', () => {
            const handlers = registerBatchToolbarHandlers(appState, mockApplyFiltersAndRender, mockUpdateBatchToolbar);

            expect(handlers).toHaveProperty('clearSelectionHandler');
            expect(typeof handlers.clearSelectionHandler).toBe('function');
        });

        it('should make select-all checkbox functional', () => {
            const handlers = registerBatchToolbarHandlers(appState, mockApplyFiltersAndRender, mockUpdateBatchToolbar);
            const selectAllCheckbox = document.getElementById('select-all-checkbox');

            selectAllCheckbox.checked = true;
            selectAllCheckbox.dispatchEvent(new Event('change'));

            expect(appState.selectedPaperIds.size).toBe(3);
        });

        it('should make clear selection button functional', () => {
            appState.selectedPaperIds.add(1);
            appState.selectedPaperIds.add(2);

            const handlers = registerBatchToolbarHandlers(appState, mockApplyFiltersAndRender, mockUpdateBatchToolbar);
            const clearBtn = document.getElementById('clear-selection-btn');

            clearBtn.click();

            expect(appState.selectedPaperIds.size).toBe(0);
        });

        it('should handle missing DOM elements gracefully', () => {
            document.body.innerHTML = '';

            const handlers = registerBatchToolbarHandlers(appState, mockApplyFiltersAndRender, mockUpdateBatchToolbar);

            expect(handlers).toEqual({});
        });
    });

    describe('unregisterBatchToolbarHandlers', () => {
        it('should unregister select-all handler', () => {
            const handlers = registerBatchToolbarHandlers(appState, mockApplyFiltersAndRender, mockUpdateBatchToolbar);

            // Verify handler works before unregistering
            const selectAllCheckbox = document.getElementById('select-all-checkbox');
            selectAllCheckbox.checked = true;
            selectAllCheckbox.dispatchEvent(new Event('change'));
            expect(appState.selectedPaperIds.size).toBe(3);

            // Unregister
            unregisterBatchToolbarHandlers(handlers);

            // Clear state
            appState.selectedPaperIds.clear();

            // Try to trigger handler again - should not work
            selectAllCheckbox.checked = true;
            selectAllCheckbox.dispatchEvent(new Event('change'));
            expect(appState.selectedPaperIds.size).toBe(0);
        });

        it('should unregister clear selection handler', () => {
            appState.selectedPaperIds.add(1);
            appState.selectedPaperIds.add(2);

            const handlers = registerBatchToolbarHandlers(appState, mockApplyFiltersAndRender, mockUpdateBatchToolbar);

            // Verify handler works
            const clearBtn = document.getElementById('clear-selection-btn');
            clearBtn.click();
            expect(appState.selectedPaperIds.size).toBe(0);

            // Re-add items
            appState.selectedPaperIds.add(1);
            appState.selectedPaperIds.add(2);

            // Unregister
            unregisterBatchToolbarHandlers(handlers);

            // Try to trigger handler again - should not work
            clearBtn.click();
            expect(appState.selectedPaperIds.size).toBe(2);
        });

        it('should handle missing DOM elements gracefully', () => {
            const handlers = {
                selectAllChangeHandler: vi.fn(),
                clearSelectionHandler: vi.fn()
            };

            document.body.innerHTML = '';

            expect(() => {
                unregisterBatchToolbarHandlers(handlers);
            }).not.toThrow();
        });

        it('should handle empty handlers object gracefully', () => {
            expect(() => {
                unregisterBatchToolbarHandlers({});
            }).not.toThrow();
        });
    });

    describe('Integration Tests', () => {
        it('should handle complete selection workflow', () => {
            // Register handlers
            const handlers = registerBatchToolbarHandlers(appState, mockApplyFiltersAndRender, mockUpdateBatchToolbar);

            // Select all
            const selectAllCheckbox = document.getElementById('select-all-checkbox');
            selectAllCheckbox.checked = true;
            selectAllCheckbox.dispatchEvent(new Event('change'));

            expect(appState.selectedPaperIds.size).toBe(3);

            // Clear selection
            const clearBtn = document.getElementById('clear-selection-btn');
            clearBtn.click();

            expect(appState.selectedPaperIds.size).toBe(0);

            // Cleanup
            unregisterBatchToolbarHandlers(handlers);
        });
    });
});
