/**
 * Dashboard Pagination Handler Tests
 * Tests for pagination.js event handlers
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
    createItemsPerPageChangeHandler,
    createSortChangeHandler,
    registerPaginationHandlers,
    unregisterPaginationHandlers
} from '../../dashboard/handlers/pagination.js';

describe('dashboard/handlers/pagination.js', () => {
    let appState;
    let applyFiltersAndRender;
    let mockLocalStorage;

    beforeEach(() => {
        // Reset appState
        appState = {
            pagination: {
                itemsPerPage: 25,
                currentPage: 1
            },
            currentSortBy: 'updatedAt'
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
      <select id="items-per-page">
        <option value="10">10</option>
        <option value="25">25</option>
        <option value="50">50</option>
        <option value="100">100</option>
      </select>
      <select id="sort-select">
        <option value="updatedAt">Recently Updated</option>
        <option value="createdAt">Recently Added</option>
        <option value="title">Title (A-Z)</option>
        <option value="year">Year (Newest)</option>
      </select>
    `;
    });

    afterEach(() => {
        document.body.innerHTML = '';
        vi.clearAllMocks();
    });

    describe('createItemsPerPageChangeHandler', () => {
        it('should update appState.pagination.itemsPerPage', () => {
            const handler = createItemsPerPageChangeHandler(appState, applyFiltersAndRender);
            const event = { target: { value: '50' } };

            handler(event);

            expect(appState.pagination.itemsPerPage).toBe(50);
        });

        it('should reset currentPage to 1', () => {
            appState.pagination.currentPage = 5;
            const handler = createItemsPerPageChangeHandler(appState, applyFiltersAndRender);
            const event = { target: { value: '100' } };

            handler(event);

            expect(appState.pagination.currentPage).toBe(1);
        });

        it('should save to localStorage', () => {
            const handler = createItemsPerPageChangeHandler(appState, applyFiltersAndRender);
            const event = { target: { value: '50' } };

            handler(event);

            expect(localStorage.setItem).toHaveBeenCalledWith('itemsPerPage', 50);
        });

        it('should call applyFiltersAndRender', () => {
            const handler = createItemsPerPageChangeHandler(appState, applyFiltersAndRender);
            const event = { target: { value: '50' } };

            handler(event);

            expect(applyFiltersAndRender).toHaveBeenCalledTimes(1);
        });

        it('should handle string values correctly', () => {
            const handler = createItemsPerPageChangeHandler(appState, applyFiltersAndRender);
            const event = { target: { value: '10' } };

            handler(event);

            expect(appState.pagination.itemsPerPage).toBe(10);
            expect(typeof appState.pagination.itemsPerPage).toBe('number');
        });
    });

    describe('createSortChangeHandler', () => {
        it('should update appState.currentSortBy', () => {
            const handler = createSortChangeHandler(appState, applyFiltersAndRender);
            const event = { target: { value: 'title' } };

            handler(event);

            expect(appState.currentSortBy).toBe('title');
        });

        it('should save to localStorage', () => {
            const handler = createSortChangeHandler(appState, applyFiltersAndRender);
            const event = { target: { value: 'year' } };

            handler(event);

            expect(localStorage.setItem).toHaveBeenCalledWith('currentSortBy', 'year');
        });

        it('should call applyFiltersAndRender', () => {
            const handler = createSortChangeHandler(appState, applyFiltersAndRender);
            const event = { target: { value: 'createdAt' } };

            handler(event);

            expect(applyFiltersAndRender).toHaveBeenCalledTimes(1);
        });
    });

    describe('registerPaginationHandlers', () => {
        it('should register items-per-page change handler', () => {
            const handlers = registerPaginationHandlers(appState, applyFiltersAndRender);

            expect(handlers.itemsPerPageChangeHandler).toBeDefined();
            expect(typeof handlers.itemsPerPageChangeHandler).toBe('function');
        });

        it('should register sort change handler', () => {
            const handlers = registerPaginationHandlers(appState, applyFiltersAndRender);

            expect(handlers.sortChangeHandler).toBeDefined();
            expect(typeof handlers.sortChangeHandler).toBe('function');
        });

        it('should set initial sort select value from appState', () => {
            appState.currentSortBy = 'year';
            registerPaginationHandlers(appState, applyFiltersAndRender);

            const sortSelect = document.getElementById('sort-select');
            expect(sortSelect.value).toBe('year');
        });

        it('should set initial items per page value from appState', () => {
            appState.pagination.itemsPerPage = 50;
            registerPaginationHandlers(appState, applyFiltersAndRender);

            const itemsPerPageSelect = document.getElementById('items-per-page');
            expect(itemsPerPageSelect.value).toBe('50');
        });

        it('should trigger handler when items per page select changes', () => {
            registerPaginationHandlers(appState, applyFiltersAndRender);

            const itemsPerPageSelect = document.getElementById('items-per-page');
            itemsPerPageSelect.value = '100';
            itemsPerPageSelect.dispatchEvent(new Event('change'));

            expect(applyFiltersAndRender).toHaveBeenCalledTimes(1);
            expect(appState.pagination.itemsPerPage).toBe(100);
        });

        it('should trigger handler when sort select changes', () => {
            registerPaginationHandlers(appState, applyFiltersAndRender);

            const sortSelect = document.getElementById('sort-select');
            sortSelect.value = 'title';
            sortSelect.dispatchEvent(new Event('change'));

            expect(applyFiltersAndRender).toHaveBeenCalledTimes(1);
            expect(appState.currentSortBy).toBe('title');
        });

        it('should handle missing DOM elements gracefully', () => {
            document.body.innerHTML = '';

            const handlers = registerPaginationHandlers(appState, applyFiltersAndRender);

            expect(handlers).toEqual({});
        });
    });

    describe('unregisterPaginationHandlers', () => {
        it('should remove items per page event listener', () => {
            const handlers = registerPaginationHandlers(appState, applyFiltersAndRender);
            unregisterPaginationHandlers(handlers);

            const itemsPerPageSelect = document.getElementById('items-per-page');
            itemsPerPageSelect.value = '100';
            itemsPerPageSelect.dispatchEvent(new Event('change'));

            // applyFiltersAndRender should not be called after unregistering
            expect(applyFiltersAndRender).not.toHaveBeenCalled();
        });

        it('should remove sort change event listener', () => {
            const handlers = registerPaginationHandlers(appState, applyFiltersAndRender);
            unregisterPaginationHandlers(handlers);

            const sortSelect = document.getElementById('sort-select');
            sortSelect.value = 'title';
            sortSelect.dispatchEvent(new Event('change'));

            // applyFiltersAndRender should not be called after unregistering
            expect(applyFiltersAndRender).not.toHaveBeenCalled();
        });

        it('should handle missing DOM elements in unregister', () => {
            const handlers = { sortChangeHandler: vi.fn(), itemsPerPageChangeHandler: vi.fn() };
            document.body.innerHTML = '';

            expect(() => unregisterPaginationHandlers(handlers)).not.toThrow();
        });

        it('should handle missing handlers gracefully', () => {
            expect(() => unregisterPaginationHandlers({})).not.toThrow();
        });
    });
});
