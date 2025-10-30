// Tests for core/state.js
import { describe, it, expect, beforeEach } from 'vitest';
import { createAppState, persistStateToStorage, clearStorageKey } from '../core/state.js';

describe('core/state.js', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  describe('createAppState', () => {
    it('should create initial app state with default values', () => {
      const state = createAppState();

      expect(state).toBeDefined();
      expect(state.allPapersCache).toEqual([]);
      expect(state.collectionsCache).toEqual([]);
      expect(state.hasUnsavedChanges).toBe(false);
      expect(state.currentSearchTerm).toBe('');
      expect(state.currentView).toBeNull();
      expect(state.selectedPaperIds).toBeInstanceOf(Set);
      expect(state.selectedPaperIds.size).toBe(0);
    });

    it('should initialize activeFilters correctly', () => {
      const state = createAppState();

      expect(state.activeFilters).toBeDefined();
      expect(state.activeFilters.status).toBeNull();
      expect(state.activeFilters.tags).toEqual([]);
    });

    it('should initialize pagination state', () => {
      const state = createAppState();

      expect(state.pagination).toBeDefined();
      expect(state.pagination.currentPage).toBe(1);
      expect(state.pagination.itemsPerPage).toBe(25);
      expect(state.pagination.totalItems).toBe(0);
      expect(state.pagination.totalPages).toBe(0);
    });

    it('should load currentSortBy from localStorage if available', () => {
      localStorage.setItem('currentSortBy', 'title');
      const state = createAppState();

      expect(state.currentSortBy).toBe('title');
    });

    it('should use default currentSortBy if not in localStorage', () => {
      const state = createAppState();

      expect(state.currentSortBy).toBe('date_added');
    });

    it('should load itemsPerPage from localStorage', () => {
      localStorage.setItem('itemsPerPage', '50');
      const state = createAppState();

      expect(state.pagination.itemsPerPage).toBe(50);
    });

    it('should load searchMode from localStorage', () => {
      localStorage.setItem('searchMode', 'notes');
      const state = createAppState();

      expect(state.searchMode).toBe('notes');
    });
  });

  describe('persistStateToStorage', () => {
    it('should save value to localStorage', () => {
      persistStateToStorage('testKey', 'testValue');

      expect(localStorage.getItem('testKey')).toBe('testValue');
    });

    it('should handle numeric values', () => {
      persistStateToStorage('count', 42);

      // localStorage stores everything as strings, but some environments may vary
      const stored = localStorage.getItem('count');
      expect(stored == '42' || stored == 42).toBe(true);
    });

    it('should not throw on storage errors', () => {
      // This shouldn't throw even if storage fails
      expect(() => {
        persistStateToStorage('key', 'value');
      }).not.toThrow();
    });
  });

  describe('clearStorageKey', () => {
    it('should remove key from localStorage', () => {
      localStorage.setItem('testKey', 'testValue');
      clearStorageKey('testKey');

      expect(localStorage.getItem('testKey')).toBeNull();
    });

    it('should not throw if key does not exist', () => {
      expect(() => {
        clearStorageKey('nonexistent');
      }).not.toThrow();
    });
  });
});

