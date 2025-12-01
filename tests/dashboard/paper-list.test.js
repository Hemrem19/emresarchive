/**
 * Dashboard Paper List Handler Tests
 * Tests for dashboard/handlers/paper-list.js
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
    createPaperListClickHandler,
    createPaperListChangeHandler,
    registerPaperListHandlers,
    unregisterPaperListHandlers
} from '../../dashboard/handlers/paper-list.js';
import { createMockPaper } from '../helpers.js';

// Mock dependencies
vi.mock('../../db.js', () => ({
    deletePaper: vi.fn(),
    updatePaper: vi.fn()
}));

vi.mock('../../ui.js', () => ({
    showToast: vi.fn()
}));

import { deletePaper, updatePaper } from '../../db.js';
import { showToast } from '../../ui.js';

describe('dashboard/handlers/paper-list.js', () => {
    let appState;
    let applyFiltersAndRender;
    let updateBatchToolbar;

    beforeEach(() => {
        // Setup mock DOM
        document.body.innerHTML = `
      <div id="paper-list">
        <div class="paper-card" data-paper-id="1">
          <button class="expand-notes-btn" data-paper-id="1">
            <span class="expand-icon">expand_more</span>
          </button>
          <div class="notes-expandable-section hidden" data-paper-id="1">Notes content</div>
          <input type="checkbox" class="paper-checkbox" data-paper-id="1" />
          <button class="delete-paper-btn" data-id="1">Delete</button>
          <select class="reading-status-select" data-id="1">
            <option value="Reading">Reading</option>
            <option value="Finished">Finished</option>
          </select>
        </div>
      </div>
    `;

        // Mock appState
        appState = {
            allPapersCache: [createMockPaper({ id: 1, title: 'Test Paper' })],
            selectedPaperIds: new Set()
        };

        applyFiltersAndRender = vi.fn();
        updateBatchToolbar = vi.fn();

        // Mock window.confirm
        global.confirm = vi.fn(() => true);
    });

    afterEach(() => {
        document.body.innerHTML = '';
        vi.clearAllMocks();
    });

    describe('createPaperListClickHandler', () => {
        it('should expand notes when expand button clicked', () => {
            const handler = createPaperListClickHandler(appState, applyFiltersAndRender, updateBatchToolbar);

            const expandBtn = document.querySelector('.expand-notes-btn');
            const notesSection = document.querySelector('.notes-expandable-section');
            const expandIcon = document.querySelector('.expand-icon');

            expect(notesSection.classList.contains('hidden')).toBe(true);

            expandBtn.click();
            handler({ target: expandBtn, preventDefault: vi.fn(), stopPropagation: vi.fn() });

            expect(notesSection.classList.contains('hidden')).toBe(false);
            expect(expandIcon.textContent).toBe('expand_less');
        });

        it('should add paper to selection when checkbox checked', () => {
            const handler = createPaperListClickHandler(appState, applyFiltersAndRender, updateBatchToolbar);

            const checkbox = document.querySelector('.paper-checkbox');
            checkbox.checked = true;

            handler({ target: checkbox });

            expect(appState.selectedPaperIds.has(1)).toBe(true);
            expect(updateBatchToolbar).toHaveBeenCalled();
            expect(applyFiltersAndRender).toHaveBeenCalled();
        });

        it('should remove paper from selection when checkbox unchecked', () => {
            appState.selectedPaperIds.add(1);
            const handler = createPaperListClickHandler(appState, applyFiltersAndRender, updateBatchToolbar);

            const checkbox = document.querySelector('.paper-checkbox');
            checkbox.checked = false;

            handler({ target: checkbox });

            expect(appState.selectedPaperIds.has(1)).toBe(false);
        });

        it('should delete paper when delete button clicked and confirmed', async () => {
            deletePaper.mockResolvedValue();
            const handler = createPaperListClickHandler(appState, applyFiltersAndRender, updateBatchToolbar);

            const deleteBtn = document.querySelector('.delete-paper-btn');

            await handler({ target: deleteBtn, preventDefault: vi.fn() });

            expect(global.confirm).toHaveBeenCalled();
            expect(deletePaper).toHaveBeenCalledWith(1);
            expect(showToast).toHaveBeenCalledWith('Paper deleted successfully.');
        });

        it('should not delete paper if user cancels confirmation', async () => {
            global.confirm = vi.fn(() => false);
            const handler = createPaperListClickHandler(appState, applyFiltersAndRender, updateBatchToolbar);

            const deleteBtn = document.querySelector('.delete-paper-btn');

            await handler({ target: deleteBtn, preventDefault: vi.fn() });

            expect(deletePaper).not.toHaveBeenCalled();
        });
    });

    describe('createPaperListChangeHandler', () => {
        it('should update paper status when select changes', async () => {
            updatePaper.mockResolvedValue();
            const handler = createPaperListChangeHandler(appState, applyFiltersAndRender);

            const statusSelect = document.querySelector('.reading-status-select');
            statusSelect.value = 'Finished';

            await handler({ target: statusSelect });

            expect(updatePaper).toHaveBeenCalledWith(1, { readingStatus: 'Finished' });
            expect(appState.allPapersCache[0].readingStatus).toBe('Finished');
            expect(applyFiltersAndRender).toHaveBeenCalled();
            expect(showToast).toHaveBeenCalledWith('Status updated.');
        });

        it('should handle status update errors', async () => {
            updatePaper.mockRejectedValue(new Error('Update failed'));
            const handler = createPaperListChangeHandler(appState, applyFiltersAndRender);

            const statusSelect = document.querySelector('.reading-status-select');

            await handler({ target: statusSelect });

            expect(showToast).toHaveBeenCalledWith('Error updating status.', 'error');
        });
    });

    describe('registerPaperListHandlers', () => {
        it('should register click and change handlers', () => {
            const handlers = registerPaperListHandlers(appState, applyFiltersAndRender, updateBatchToolbar);

            expect(handlers.paperListClickHandler).toBeDefined();
            expect(handlers.paperListChangeHandler).toBeDefined();
        });

        it('should handle missing paper-list container', () => {
            document.body.innerHTML = '';

            const handlers = registerPaperListHandlers(appState, applyFiltersAndRender, updateBatchToolbar);

            expect(handlers).toEqual({});
        });
    });

    describe('unregisterPaperListHandlers', () => {
        it('should remove event listeners', () => {
            const handlers = registerPaperListHandlers(appState, applyFiltersAndRender, updateBatchToolbar);

            expect(() => unregisterPaperListHandlers(handlers)).not.toThrow();
        });

        it('should handle missing handlers', () => {
            expect(() => unregisterPaperListHandlers({})).not.toThrow();
        });
    });
});
