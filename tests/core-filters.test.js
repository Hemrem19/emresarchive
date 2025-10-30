// Tests for core/filters.js
import { describe, it, expect, beforeEach } from 'vitest';
import { getFilteredPapers, updateUrlHash, parseUrlHash, calculatePagination, getPaginatedPapers } from '../core/filters.js';
import { createMockPapers, createMockPaper } from './helpers.js';

describe('core/filters.js', () => {
  let mockPapers;

  beforeEach(() => {
    mockPapers = [
      createMockPaper({
        id: 1,
        title: 'Machine Learning Basics',
        readingStatus: 'Reading',
        tags: ['machine-learning', 'ai'],
        notes: 'Introduction to ML concepts'
      }),
      createMockPaper({
        id: 2,
        title: 'Deep Learning Advanced',
        readingStatus: 'Completed',
        tags: ['deep-learning', 'neural-networks'],
        notes: 'Advanced deep learning techniques'
      }),
      createMockPaper({
        id: 3,
        title: 'Natural Language Processing',
        readingStatus: 'To Read',
        tags: ['nlp', 'machine-learning'],
        notes: 'NLP fundamentals and applications'
      }),
      createMockPaper({
        id: 4,
        title: 'Computer Vision',
        readingStatus: 'Reading',
        tags: ['computer-vision', 'deep-learning'],
        notes: 'Image processing and recognition'
      })
    ];
  });

  describe('getFilteredPapers', () => {
    it('should return all papers when no filters are active', () => {
      const appState = {
        activeFilters: { status: null, tags: [] },
        currentSearchTerm: '',
        searchMode: 'all'
      };
      const result = getFilteredPapers(mockPapers, appState);

      expect(result).toHaveLength(4);
    });

    it('should filter by reading status', () => {
      const appState = {
        activeFilters: { status: 'Reading', tags: [] },
        currentSearchTerm: '',
        searchMode: 'all'
      };
      const result = getFilteredPapers(mockPapers, appState);

      expect(result).toHaveLength(2);
      expect(result.every(p => p.readingStatus === 'Reading')).toBe(true);
    });

    it('should filter by single tag', () => {
      const appState = {
        activeFilters: { status: null, tags: ['machine-learning'] },
        currentSearchTerm: '',
        searchMode: 'all'
      };
      const result = getFilteredPapers(mockPapers, appState);

      expect(result).toHaveLength(2);
      expect(result.every(p => p.tags.includes('machine-learning'))).toBe(true);
    });

    it('should filter by multiple tags (AND logic)', () => {
      const appState = {
        activeFilters: { status: null, tags: ['machine-learning', 'ai'] },
        currentSearchTerm: '',
        searchMode: 'all'
      };
      const result = getFilteredPapers(mockPapers, appState);

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe(1);
    });

    it('should combine status and tag filters', () => {
      const appState = {
        activeFilters: { status: 'Reading', tags: ['deep-learning'] },
        currentSearchTerm: '',
        searchMode: 'all'
      };
      const result = getFilteredPapers(mockPapers, appState);

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe(4);
    });

    it('should search in all fields by default', () => {
      const appState = {
        activeFilters: { status: null, tags: [] },
        currentSearchTerm: 'advanced',
        searchMode: 'all'
      };
      const result = getFilteredPapers(mockPapers, appState);

      expect(result).toHaveLength(1);
      expect(result[0].title).toBe('Deep Learning Advanced');
    });

    it('should search only in notes when searchMode is "notes"', () => {
      const appState = {
        activeFilters: { status: null, tags: [] },
        currentSearchTerm: 'fundamentals',
        searchMode: 'notes'
      };
      const result = getFilteredPapers(mockPapers, appState);

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe(3);
    });

    it('should be case-insensitive in search', () => {
      const appState = {
        activeFilters: { status: null, tags: [] },
        currentSearchTerm: 'machine',
        searchMode: 'all'
      };
      const result = getFilteredPapers(mockPapers, appState);

      expect(result.length).toBeGreaterThan(0);
    });

    it('should combine all filters together', () => {
      const appState = {
        activeFilters: { status: 'Reading', tags: ['machine-learning'] },
        currentSearchTerm: 'ml',
        searchMode: 'all'
      };
      const result = getFilteredPapers(mockPapers, appState);

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe(1);
    });

    it('should return empty array when no papers match', () => {
      const appState = {
        activeFilters: { status: 'Completed', tags: ['nonexistent-tag'] },
        currentSearchTerm: '',
        searchMode: 'all'
      };
      const result = getFilteredPapers(mockPapers, appState);

      expect(result).toHaveLength(0);
    });
  });

  describe('updateUrlHash', () => {
    beforeEach(() => {
      window.location.hash = '#/';
    });

    it('should set hash to root when no filters are active', () => {
      const appState = {
        activeFilters: { status: null, tags: [] }
      };
      updateUrlHash(appState);

      expect(window.location.hash).toBe('#/');
    });

    it('should include status filter in hash', () => {
      const appState = {
        activeFilters: { status: 'Reading', tags: [] }
      };
      updateUrlHash(appState);

      expect(window.location.hash).toBe('#/filter/status:Reading');
    });

    it('should include single tag filter in hash', () => {
      const appState = {
        activeFilters: { status: null, tags: ['machine-learning'] }
      };
      updateUrlHash(appState);

      expect(window.location.hash).toBe('#/filter/tag:machine-learning');
    });

    it('should include multiple tag filters in hash', () => {
      const appState = {
        activeFilters: { status: null, tags: ['machine-learning', 'ai'] }
      };
      updateUrlHash(appState);

      const hash = window.location.hash;
      expect(hash).toContain('tag:machine-learning');
      expect(hash).toContain('tag:ai');
    });

    it('should include status and tags in hash', () => {
      const appState = {
        activeFilters: { status: 'Reading', tags: ['ml', 'ai'] }
      };
      updateUrlHash(appState);

      const hash = window.location.hash;
      expect(hash).toContain('status:Reading');
      expect(hash).toContain('tag:ml');
      expect(hash).toContain('tag:ai');
    });
  });

  describe('parseUrlHash', () => {
    it('should parse empty filters for root hash', () => {
      window.location.hash = '#/';
      const appState = {
        activeFilters: { status: null, tags: [] }
      };
      parseUrlHash(appState);

      expect(appState.activeFilters.status).toBeNull();
      expect(appState.activeFilters.tags).toEqual([]);
    });

    it('should parse status filter from hash', () => {
      window.location.hash = '#/filter/status:Reading';
      const appState = {
        activeFilters: { status: null, tags: [] }
      };
      parseUrlHash(appState);

      expect(appState.activeFilters.status).toBe('Reading');
    });

    it('should parse single tag filter from hash', () => {
      window.location.hash = '#/filter/tag:machine-learning';
      const appState = {
        activeFilters: { status: null, tags: [] }
      };
      parseUrlHash(appState);

      expect(appState.activeFilters.tags).toEqual(['machine-learning']);
    });

    it('should parse multiple tag filters from hash', () => {
      window.location.hash = '#/filter/tag:ml/tag:ai';
      const appState = {
        activeFilters: { status: null, tags: [] }
      };
      parseUrlHash(appState);

      expect(appState.activeFilters.tags).toEqual(['ml', 'ai']);
    });

    it('should parse combined filters from hash', () => {
      window.location.hash = '#/filter/status:Reading/tag:ml/tag:ai';
      const appState = {
        activeFilters: { status: null, tags: [] }
      };
      parseUrlHash(appState);

      expect(appState.activeFilters.status).toBe('Reading');
      expect(appState.activeFilters.tags).toEqual(['ml', 'ai']);
    });

    it('should handle non-filter hashes', () => {
      window.location.hash = '#/details/123';
      const appState = {
        activeFilters: { status: null, tags: [] }
      };
      parseUrlHash(appState);

      expect(appState.activeFilters.status).toBeNull();
      expect(appState.activeFilters.tags).toEqual([]);
    });
  });

  describe('calculatePagination', () => {
    it('should calculate correct pagination for first page', () => {
      const appState = {
        pagination: { currentPage: 1, itemsPerPage: 25, totalItems: 0, totalPages: 0 }
      };
      calculatePagination(100, appState);

      expect(appState.pagination.totalPages).toBe(4);
      expect(appState.pagination.totalItems).toBe(100);
      expect(appState.pagination.currentPage).toBe(1);
    });

    it('should calculate correct pagination for middle page', () => {
      const appState = {
        pagination: { currentPage: 2, itemsPerPage: 25, totalItems: 0, totalPages: 0 }
      };
      calculatePagination(100, appState);

      expect(appState.pagination.totalPages).toBe(4);
    });

    it('should calculate correct pagination for last page', () => {
      const appState = {
        pagination: { currentPage: 4, itemsPerPage: 25, totalItems: 0, totalPages: 0 }
      };
      calculatePagination(100, appState);

      expect(appState.pagination.totalPages).toBe(4);
      expect(appState.pagination.currentPage).toBe(4);
    });

    it('should handle incomplete last page', () => {
      const appState = {
        pagination: { currentPage: 2, itemsPerPage: 25, totalItems: 0, totalPages: 0 }
      };
      calculatePagination(47, appState);

      expect(appState.pagination.totalPages).toBe(2);
    });

    it('should cap currentPage at totalPages', () => {
      const appState = {
        pagination: { currentPage: 10, itemsPerPage: 25, totalItems: 0, totalPages: 0 }
      };
      calculatePagination(50, appState);

      expect(appState.pagination.currentPage).toBe(2); // Should be capped at totalPages
    });

    it('should handle zero items', () => {
      const appState = {
        pagination: { currentPage: 1, itemsPerPage: 25, totalItems: 0, totalPages: 0 }
      };
      calculatePagination(0, appState);

      expect(appState.pagination.totalPages).toBe(0);
    });
  });

  describe('getPaginatedPapers', () => {
    it('should return correct slice of papers', () => {
      const appState = {
        pagination: { currentPage: 1, itemsPerPage: 2, totalItems: 4, totalPages: 2 }
      };
      const result = getPaginatedPapers(mockPapers, appState);

      expect(result).toHaveLength(2);
      expect(result[0].id).toBe(1);
      expect(result[1].id).toBe(2);
    });

    it('should handle last page with fewer items', () => {
      const appState = {
        pagination: { currentPage: 2, itemsPerPage: 3, totalItems: 4, totalPages: 2 }
      };
      const result = getPaginatedPapers(mockPapers, appState);

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe(4);
    });

    it('should return empty array for out of range page', () => {
      const appState = {
        pagination: { currentPage: 10, itemsPerPage: 2, totalItems: 4, totalPages: 2 }
      };
      const result = getPaginatedPapers(mockPapers, appState);

      expect(result).toHaveLength(0);
    });
  });
});

