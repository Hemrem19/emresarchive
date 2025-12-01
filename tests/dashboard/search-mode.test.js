/**
 * Dashboard Search Mode Handler Tests
 * Tests for search-mode.js event handlers
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
    updateSearchModeButtons,
    createSearchModeAllHandler,
    createSearchModeNotesHandler,
    registerSearchModeHandlers,
    unregisterSearchModeHandlers
} from '../../dashboard/handlers/search-mode.js';

describe('dashboard/handlers/search-mode.js', () => {
    let appState;
    let applyFiltersAndRender;
    let mockLocalStorage;

    beforeEach(() => {
        // Reset appState
        appState = {
            searchMode: 'all',
            currentSearchTerm: ''
        };

        // Mock applyFiltersAndRender
        applyFiltersAndRender = vi.fn();

        // Mock localStorage
        mockLocalStorage = {};
        global.localStorage = {
            getItem: vi.fn((key) => mockLocalStorage[key] || null),
            setItem: vi.fn((key, value) => { mockLocalStorage[key] = value; }),
            removeItem: vi.fn((key) => { delete mockLocalStorage[key]; }),
            clear: vi.fn(() => { mockLocalStorage = {}; })
        };

        // Setup mock DOM
        document.body.innerHTML = `
      <button id="search-mode-all" class="text-stone-600 dark:text-stone-400">All Fields</button>
      <button id="search-mode-notes" class="text-stone-600 dark:text-stone-400">Notes Only</button>
      <button id="search-mode-all-mobile" class="text-stone-600 dark:text-stone-400">All Fields</button>
      <button id="search-mode-notes-mobile" class="text-stone-600 dark:text-stone-400">Notes Only</button>
    `;
    });

    afterEach(() => {
        document.body.innerHTML = '';
        vi.clearAllMocks();
    });

    describe('updateSearchModeButtons', () => {
        it('should activate "all" button styles when mode is "all"', () => {
            updateSearchModeButtons('all');

            const allBtn = document.getElementById('search-mode-all');
            expect(allBtn.classList.contains('bg-white')).toBe(true);
            expect(allBtn.classList.contains('text-primary')).toBe(true);
            expect(allBtn.classList.contains('shadow-sm')).toBe(true);
            expect(allBtn.classList.contains('text-stone-600')).toBe(false);
        });

        it('should deactivate "notes" button styles when mode is "all"', () => {
            updateSearchModeButtons('all');

            const notesBtn = document.getElementById('search-mode-notes');
            expect(notesBtn.classList.contains('bg-white')).toBe(false);
            expect(notesBtn.classList.contains('text-primary')).toBe(false);
            expect(notesBtn.classList.contains('text-stone-600')).toBe(true);
        });

        it('should activate "notes" button styles when mode is "notes"', () => {
            updateSearchModeButtons('notes');

            const notesBtn = document.getElementById('search-mode-notes');
            expect(notesBtn.classList.contains('bg-white')).toBe(true);
            expect(notesBtn.classList.contains('text-primary')).toBe(true);
            expect(notesBtn.classList.contains('shadow-sm')).toBe(true);
        });

        it('should deactivate "all" button styles when mode is "notes"', () => {
            updateSearchModeButtons('notes');

            const allBtn = document.getElementById('search-mode-all');
            expect(allBtn.classList.contains('bg-white')).toBe(false);
            expect(allBtn.classList.contains('text-primary')).toBe(false);
            expect(allBtn.classList.contains('text-stone-600')).toBe(true);
        });

        it('should update both desktop and mobile buttons', () => {
            updateSearchModeButtons('all');

            const allBtnMobile = document.getElementById('search-mode-all-mobile');
            expect(allBtnMobile.classList.contains('bg-white')).toBe(true);
            expect(allBtnMobile.classList.contains('text-primary')).toBe(true);
        });

        it('should handle missing buttons gracefully', () => {
            document.body.innerHTML = '<button id="search-mode-all">All</button>';

            expect(() => updateSearchModeButtons('all')).not.toThrow();
        });
    });

    describe('createSearchModeAllHandler', () => {
        it('should set searchMode to "all"', () => {
            const handler = createSearchModeAllHandler(appState, applyFiltersAndRender);
            handler();

            expect(appState.searchMode).toBe('all');
        });

        it('should save to localStorage', () => {
            const handler = createSearchModeAllHandler(appState, applyFiltersAndRender);
            handler();

            expect(localStorage.setItem).toHaveBeenCalledWith('searchMode', 'all');
        });

        it('should update button states', () => {
            const handler = createSearchModeAllHandler(appState, applyFiltersAndRender);
            handler();

            const allBtn = document.getElementById('search-mode-all');
            expect(allBtn.classList.contains('bg-white')).toBe(true);
        });

        it('should call applyFiltersAndRender if search term exists', () => {
            appState.currentSearchTerm = 'machine learning';
            const handler = createSearchModeAllHandler(appState, applyFiltersAndRender);
            handler();

            expect(applyFiltersAndRender).toHaveBeenCalledTimes(1);
        });

        it('should not call applyFiltersAndRender if no search term', () => {
            appState.currentSearchTerm = '';
            const handler = createSearchModeAllHandler(appState, applyFiltersAndRender);
            handler();

            expect(applyFiltersAndRender).not.toHaveBeenCalled();
        });
    });

    describe('createSearchModeNotesHandler', () => {
        it('should set searchMode to "notes"', () => {
            const handler = createSearchModeNotesHandler(appState, applyFiltersAndRender);
            handler();

            expect(appState.searchMode).toBe('notes');
        });

        it('should save to localStorage', () => {
            const handler = createSearchModeNotesHandler(appState, applyFiltersAndRender);
            handler();

            expect(localStorage.setItem).toHaveBeenCalledWith('searchMode', 'notes');
        });

        it('should update button states', () => {
            const handler = createSearchModeNotesHandler(appState, applyFiltersAndRender);
            handler();

            const notesBtn = document.getElementById('search-mode-notes');
            expect(notesBtn.classList.contains('bg-white')).toBe(true);
        });

        it('should call applyFiltersAndRender if search term exists', () => {
            appState.currentSearchTerm = 'important notes';
            const handler = createSearchModeNotesHandler(appState, applyFiltersAndRender);
            handler();

            expect(applyFiltersAndRender).toHaveBeenCalledTimes(1);
        });

        it('should not call applyFiltersAndRender if no search term', () => {
            appState.currentSearchTerm = '';
            const handler = createSearchModeNotesHandler(appState, applyFiltersAndRender);
            handler();

            expect(applyFiltersAndRender).not.toHaveBeenCalled();
        });
    });

    describe('registerSearchModeHandlers', () => {
        it('should register desktop "all" handler', () => {
            const handlers = registerSearchModeHandlers(appState, applyFiltersAndRender);

            expect(handlers.searchModeAllHandler).toBeDefined();
            expect(typeof handlers.searchModeAllHandler).toBe('function');
        });

        it('should register desktop "notes" handler', () => {
            const handlers = registerSearchModeHandlers(appState, applyFiltersAndRender);

            expect(handlers.searchModeNotesHandler).toBeDefined();
            expect(typeof handlers.searchModeNotesHandler).toBe('function');
        });

        it('should register mobile "all" handler', () => {
            const handlers = registerSearchModeHandlers(appState, applyFiltersAndRender);

            expect(handlers.searchModeAllHandlerMobile).toBeDefined();
        });

        it('should register mobile "notes" handler', () => {
            const handlers = registerSearchModeHandlers(appState, applyFiltersAndRender);

            expect(handlers.searchModeNotesHandlerMobile).toBeDefined();
        });

        it('should initialize button states based on appState', () => {
            appState.searchMode = 'notes';
            registerSearchModeHandlers(appState, applyFiltersAndRender);

            const notesBtn = document.getElementById('search-mode-notes');
            expect(notesBtn.classList.contains('bg-white')).toBe(true);
        });

        it('should trigger handler when desktop "all" button is clicked', () => {
            appState.currentSearchTerm = 'test';
            registerSearchModeHandlers(appState, applyFiltersAndRender);

            const allBtn = document.getElementById('search-mode-all');
            allBtn.click();

            expect(appState.searchMode).toBe('all');
            expect(applyFiltersAndRender).toHaveBeenCalledTimes(1);
        });

        it('should trigger handler when mobile "notes" button is clicked', () => {
            appState.currentSearchTerm = 'test';
            registerSearchModeHandlers(appState, applyFiltersAndRender);

            const notesBtnMobile = document.getElementById('search-mode-notes-mobile');
            notesBtnMobile.click();

            expect(appState.searchMode).toBe('notes');
            expect(applyFiltersAndRender).toHaveBeenCalledTimes(1);
        });

        it('should handle missing DOM elements gracefully', () => {
            document.body.innerHTML = '';

            const handlers = registerSearchModeHandlers(appState, applyFiltersAndRender);

            expect(handlers).toEqual({});
        });
    });

    describe('unregisterSearchModeHandlers', () => {
        it('should remove desktop "all" button listener', () => {
            appState.currentSearchTerm = 'test';
            const handlers = registerSearchModeHandlers(appState, applyFiltersAndRender);
            unregisterSearchModeHandlers(handlers);

            const allBtn = document.getElementById('search-mode-all');
            allBtn.click();

            // Should not be called after unregistering
            expect(applyFiltersAndRender).not.toHaveBeenCalled();
        });

        it('should remove desktop "notes" button listener', () => {
            appState.currentSearchTerm = 'test';
            const handlers = registerSearchModeHandlers(appState, applyFiltersAndRender);
            unregisterSearchModeHandlers(handlers);

            const notesBtn = document.getElementById('search-mode-notes');
            notesBtn.click();

            // Should not be called after unregistering
            expect(applyFiltersAndRender).not.toHaveBeenCalled();
        });

        it('should remove mobile button listeners', () => {
            appState.currentSearchTerm = 'test';
            const handlers = registerSearchModeHandlers(appState, applyFiltersAndRender);
            unregisterSearchModeHandlers(handlers);

            const allBtnMobile = document.getElementById('search-mode-all-mobile');
            allBtnMobile.click();

            // Should not be called after unregistering
            expect(applyFiltersAndRender).not.toHaveBeenCalled();
        });

        it('should handle missing DOM elements in unregister', () => {
            const handlers = { searchModeAllHandler: vi.fn() };
            document.body.innerHTML = '';

            expect(() => unregisterSearchModeHandlers(handlers)).not.toThrow();
        });

        it('should handle missing handlers gracefully', () => {
            expect(() => unregisterSearchModeHandlers({})).not.toThrow();
        });
    });
});
