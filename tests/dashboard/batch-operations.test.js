/**
 * Dashboard Batch Operations Handler Tests
 * Tests for dashboard/handlers/batch-operations.js
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
    registerBatchOperationHandlers,
    unregisterBatchOperationHandlers
} from '../../dashboard/handlers/batch-operations.js';
import { createMockPaper } from '../helpers.js';

// Mock all complex dependencies
vi.mock('../../ui.js', () => ({
    renderSidebarTags: vi.fn(),
    showToast: vi.fn()
}));

vi.mock('../../citation.js', () => ({
    generateBibliography: vi.fn(() => '@article{test}'),
    exportBibliographyToFile: vi.fn(),
    copyBibliographyToClipboard: vi.fn(() => Promise.resolve(true))
}));

vi.mock('../../views/index.js', () => ({
    views: {
        bibliographyExportModal: '<div id="bibliography-export-modal"></div>'
    }
}));

vi.mock('../../dashboard/utils/batch-operations-utils.js', () => ({
    executeBatchOperation: vi.fn(() => Promise.resolve({ successCount: 0, errorCount: 0, results: [] })),
    updatePaperInCache: vi.fn(),
    removePapersFromCache: vi.fn((cache) => cache),
    parseTags: vi.fn((str) => str.split(',').map(t => t.trim()).filter(Boolean)),
    addTagsToPaper: vi.fn((paper) => paper.tags || []),
    removeTagsFromPaper: vi.fn((paper) => paper.tags || [])
}));

vi.mock('../../dashboard/services/error-handler.js', () => ({
    handleOperationError: vi.fn()
}));

vi.mock('../../dashboard/services/modal-manager.js', () => ({
    showModal: vi.fn(),
    closeModal: vi.fn()
}));

describe('dashboard/handlers/batch-operations.js', () => {
    let appState;
    let applyFiltersAndRender;
    let updateBatchToolbar;

    beforeEach(() => {
        // Setup mock DOM
        document.body.innerHTML = `
      <select id="batch-status-select"></select>
      <input id="batch-tags-input" value="" />
      <button id="batch-add-tags-btn"></button>
      <button id="batch-remove-tags-btn"></button>
      <button id="batch-delete-btn"></button>
      <button id="batch-export-bibliography-btn"></button>
    `;

        // Mock appState
        appState = {
            selectedPaperIds: new Set([1, 2, 3]),
            allPapersCache: [
                createMockPaper({ id: 1, title: 'Paper 1', tags: ['ML'] }),
                createMockPaper({ id: 2, title: 'Paper 2', tags: ['AI'] }),
                createMockPaper({ id: 3, title: 'Paper 3', tags: ['ML', 'AI'] })
            ]
        };

        applyFiltersAndRender = vi.fn();
        updateBatchToolbar = vi.fn();

        global.confirm = vi.fn(() => true);
    });

    afterEach(() => {
        document.body.innerHTML = '';
        vi.clearAllMocks();
    });

    describe('registerBatchOperationHandlers', () => {
        it('should register all batch operation handlers on existing elements', () => {
            const handlers = registerBatchOperationHandlers(appState, applyFiltersAndRender, updateBatchToolbar);

            expect(handlers).toBeDefined();
            expect(handlers.batchStatusChangeHandler).toBeDefined();
            expect(handlers.batchAddTagsHandler).toBeDefined();
            expect(handlers.batchRemoveTagsHandler).toBeDefined();
            expect(handlers.batchDeleteHandler).toBeDefined();
            expect(handlers.batchExportBibliographyHandler).toBeDefined();
        });

        it('should handle missing DOM elements gracefully', () => {
            document.body.innerHTML = '';

            const handlers = registerBatchOperationHandlers(appState, applyFiltersAndRender, updateBatchToolbar);

            expect(handlers).toBeDefined();
            expect(Object.keys(handlers).length).toBe(0);
        });

        it('should attach event listeners to status select', () => {
            const select = document.getElementById('batch-status-select');
            const addEventListenerSpy = vi.spyOn(select, 'addEventListener');

            registerBatchOperationHandlers(appState, applyFiltersAndRender, updateBatchToolbar);

            expect(addEventListenerSpy).toHaveBeenCalledWith('change', expect.any(Function));
        });

        it('should attach event listeners to tag buttons', () => {
            const addBtn = document.getElementById('batch-add-tags-btn');
            const removeBtn = document.getElementById('batch-remove-tags-btn');

            const addSpy = vi.spyOn(addBtn, 'addEventListener');
            const removeSpy = vi.spyOn(removeBtn, 'addEventListener');

            registerBatchOperationHandlers(appState, applyFiltersAndRender, updateBatchToolbar);

            expect(addSpy).toHaveBeenCalledWith('click', expect.any(Function));
            expect(removeSpy).toHaveBeenCalledWith('click', expect.any(Function));
        });
    });

    describe('unregisterBatchOperationHandlers', () => {
        it('should remove all event listeners', () => {
            const handlers = registerBatchOperationHandlers(appState, applyFiltersAndRender, updateBatchToolbar);

            expect(() => unregisterBatchOperationHandlers(handlers)).not.toThrow();
        });

        it('should handle empty handlers object', () => {
            expect(() => unregisterBatchOperationHandlers({})).not.toThrow();
        });

        it('should handle missing DOM elements during unregister', () => {
            const handlers = registerBatchOperationHandlers(appState, applyFiltersAndRender, updateBatchToolbar);
            document.body.innerHTML = '';

            expect(() => unregisterBatchOperationHandlers(handlers)).not.toThrow();
        });
    });
});
