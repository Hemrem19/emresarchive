// Tests for core/filters.js
import { describe, it, expect, beforeEach, vi } from 'vitest';

// Hoist mocks to ensure they are available for vi.mock
const uiMocks = vi.hoisted(() => ({
  sortPapers: vi.fn((p) => p),
  renderPaperList: vi.fn(),
  highlightActiveSidebarLink: vi.fn(),
  renderFilterChips: vi.fn(),
  showToast: vi.fn()
}));

// Mock ui.js globally for this test file
vi.mock('../ui.js', () => ({
  sortPapers: uiMocks.sortPapers,
  renderPaperList: uiMocks.renderPaperList,
  highlightActiveSidebarLink: uiMocks.highlightActiveSidebarLink,
  renderFilterChips: uiMocks.renderFilterChips,
  showToast: uiMocks.showToast
}));

import {
  getFilteredPapers,
  updateUrlHash,
  parseUrlHash,
  calculatePagination,
  getPaginatedPapers,
  renderFilterChips,
  renderPaginationControls,
  applyFiltersAndRender
} from '../core/filters.js';
import { createMockPapers, createMockPaper } from './helpers.js';

describe('core/filters.js', () => {
  let mockPapers;

  beforeEach(() => {
    vi.clearAllMocks();
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

      expect(window.location.hash).toBe('#/app');
    });

    it('should include status filter in hash', () => {
      const appState = {
        activeFilters: { status: 'Reading', tags: [] }
      };
      updateUrlHash(appState);

      expect(window.location.hash).toBe('#/app/filter/status:Reading');
    });

    it('should include single tag filter in hash', () => {
      const appState = {
        activeFilters: { status: null, tags: ['machine-learning'] }
      };
      updateUrlHash(appState);

      expect(window.location.hash).toBe('#/app/filter/tag:machine-learning');
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

  describe('renderFilterChips', () => {
    let container;
    let mockApplyFiltersAndRender;

    beforeEach(() => {
      // Setup DOM elements
      container = document.createElement('div');
      container.id = 'filter-chips-container';
      document.body.appendChild(container);
      mockApplyFiltersAndRender = vi.fn();
    });

    afterEach(() => {
      if (container && container.parentNode) {
        document.body.removeChild(container);
      }
      container = null;
      // Clean up search input if it exists
      const searchInput = document.getElementById('search-input');
      if (searchInput && searchInput.parentNode) {
        document.body.removeChild(searchInput);
      }
    });

    it('should render nothing when no filters are active', () => {
      const appState = {
        activeFilters: { status: null, tags: [] },
        currentSearchTerm: '',
        pagination: { currentPage: 1 }
      };

      renderFilterChips(appState, mockApplyFiltersAndRender);

      expect(container.classList.contains('hidden')).toBe(true);
      expect(container.innerHTML).toBe('');
    });

    it('should render search term chip', () => {
      const appState = {
        activeFilters: { status: null, tags: [] },
        currentSearchTerm: 'machine learning',
        pagination: { currentPage: 1 }
      };

      renderFilterChips(appState, mockApplyFiltersAndRender);

      expect(container.classList.contains('hidden')).toBe(false);
      expect(container.innerHTML).toContain('machine learning');
      expect(container.innerHTML).toContain('remove-filter-btn');
    });

    it('should render status filter chip', () => {
      const appState = {
        activeFilters: { status: 'Reading', tags: [] },
        currentSearchTerm: '',
        pagination: { currentPage: 1 }
      };

      renderFilterChips(appState, mockApplyFiltersAndRender);

      expect(container.classList.contains('hidden')).toBe(false);
      expect(container.innerHTML).toContain('Status: Reading');
    });

    it('should render tag filter chips', () => {
      const appState = {
        activeFilters: { status: null, tags: ['machine-learning', 'ai'] },
        currentSearchTerm: '',
        pagination: { currentPage: 1 }
      };

      renderFilterChips(appState, mockApplyFiltersAndRender);

      expect(container.classList.contains('hidden')).toBe(false);
      expect(container.innerHTML).toContain('machine-learning');
      expect(container.innerHTML).toContain('ai');
    });

    it('should render all filter chips together', () => {
      const appState = {
        activeFilters: { status: 'Reading', tags: ['ml'] },
        currentSearchTerm: 'test',
        pagination: { currentPage: 1 }
      };

      renderFilterChips(appState, mockApplyFiltersAndRender);

      expect(container.classList.contains('hidden')).toBe(false);
      expect(container.innerHTML).toContain('test');
      expect(container.innerHTML).toContain('Reading');
      expect(container.innerHTML).toContain('ml');
      expect(container.innerHTML).toContain('clear-all-filters-btn');
    });

    it('should remove search filter when remove button clicked', () => {
      const searchInput = document.createElement('input');
      searchInput.id = 'search-input';
      document.body.appendChild(searchInput);

      const appState = {
        activeFilters: { status: null, tags: [] },
        currentSearchTerm: 'test',
        pagination: { currentPage: 1 }
      };

      renderFilterChips(appState, mockApplyFiltersAndRender);

      const removeBtn = container.querySelector('.remove-filter-btn[data-filter-type="search"]');
      removeBtn.click();

      expect(appState.currentSearchTerm).toBe('');
      expect(mockApplyFiltersAndRender).toHaveBeenCalled();

      document.body.removeChild(searchInput);
    });

    it('should remove tag filter when remove button clicked', () => {
      const appState = {
        activeFilters: { status: null, tags: ['ml', 'ai'] },
        currentSearchTerm: '',
        pagination: { currentPage: 1 }
      };

      renderFilterChips(appState, mockApplyFiltersAndRender);

      const removeBtn = container.querySelector('.remove-tag-btn[data-tag="ml"]');
      removeBtn.click();

      expect(appState.activeFilters.tags).toEqual(['ai']);
      expect(mockApplyFiltersAndRender).toHaveBeenCalled();
    });

    it('should call applyFiltersAndRender when clear all button clicked', () => {
      const appState = {
        activeFilters: { status: 'Reading', tags: ['ml'] },
        currentSearchTerm: 'test',
        pagination: { currentPage: 2 }
      };

      // Mock search input
      const searchInput = document.createElement('input');
      searchInput.id = 'search-input';
      searchInput.value = 'test';
      document.body.appendChild(searchInput);

      renderFilterChips(appState, mockApplyFiltersAndRender);

      const clearBtn = container.querySelector('#clear-all-filters-btn');
      clearBtn.click();

      expect(appState.activeFilters.status).toBeNull();
      expect(appState.activeFilters.tags).toEqual([]);
      expect(appState.currentSearchTerm).toBe('');
      expect(appState.pagination.currentPage).toBe(1);
      expect(searchInput.value).toBe('');
      expect(mockApplyFiltersAndRender).toHaveBeenCalled();

      document.body.removeChild(searchInput);
    });
  });

  describe('renderPaginationControls', () => {
    let container, infoSpan, navElement;
    let mockApplyFiltersAndRender;

    beforeEach(() => {
      container = document.createElement('div');
      container.id = 'pagination-container';
      infoSpan = document.createElement('span');
      infoSpan.id = 'pagination-info';
      navElement = document.createElement('nav');
      navElement.id = 'pagination-nav';

      container.appendChild(infoSpan);
      container.appendChild(navElement);
      document.body.appendChild(container);

      mockApplyFiltersAndRender = vi.fn();
    });

    afterEach(() => {
      if (container && container.parentNode) {
        document.body.removeChild(container);
      }
      container = null;
    });

    it('should hide pagination when no items', () => {
      const appState = {
        pagination: { currentPage: 1, itemsPerPage: 25, totalItems: 0, totalPages: 0 }
      };

      renderPaginationControls(appState, mockApplyFiltersAndRender);

      expect(container.classList.contains('hidden')).toBe(true);
    });

    it('should hide pagination when only one page', () => {
      const appState = {
        pagination: { currentPage: 1, itemsPerPage: 25, totalItems: 10, totalPages: 1 }
      };

      renderPaginationControls(appState, mockApplyFiltersAndRender);

      expect(container.classList.contains('hidden')).toBe(true);
    });

    it('should render pagination controls for multiple pages', () => {
      const appState = {
        pagination: { currentPage: 1, itemsPerPage: 25, totalItems: 100, totalPages: 4 }
      };

      renderPaginationControls(appState, mockApplyFiltersAndRender);

      expect(container.classList.contains('hidden')).toBe(false);
      expect(infoSpan.innerHTML).toContain('1-25');
      expect(infoSpan.innerHTML).toContain('100');
      expect(navElement.innerHTML).toContain('Previous');
      expect(navElement.innerHTML).toContain('Next');
    });

    it('should disable Previous button on first page', () => {
      const appState = {
        pagination: { currentPage: 1, itemsPerPage: 25, totalItems: 100, totalPages: 4 }
      };

      renderPaginationControls(appState, mockApplyFiltersAndRender);

      // Previous button is the first button
      const prevBtn = navElement.querySelector('button');
      expect(prevBtn).toBeDefined();
      expect(prevBtn.disabled).toBe(true);
    });

    it('should disable Next button on last page', () => {
      const appState = {
        pagination: { currentPage: 4, itemsPerPage: 25, totalItems: 100, totalPages: 4 }
      };

      renderPaginationControls(appState, mockApplyFiltersAndRender);

      // Next button is the last button
      const buttons = navElement.querySelectorAll('button');
      const nextBtn = buttons[buttons.length - 1];
      expect(nextBtn).toBeDefined();
      expect(nextBtn.disabled).toBe(true);
    });

    it('should change page when page button clicked', () => {
      const appState = {
        pagination: { currentPage: 1, itemsPerPage: 25, totalItems: 100, totalPages: 4 }
      };

      renderPaginationControls(appState, mockApplyFiltersAndRender);

      const page2Btn = navElement.querySelector('button[data-page="2"]');
      page2Btn.click();

      expect(appState.pagination.currentPage).toBe(2);
      expect(mockApplyFiltersAndRender).toHaveBeenCalled();
    });

    it('should scroll to top when page changes', () => {
      const appState = {
        pagination: { currentPage: 1, itemsPerPage: 25, totalItems: 100, totalPages: 4 }
      };

      // Mock paper list element for scrolling
      const paperList = document.createElement('div');
      paperList.id = 'paper-list';
      paperList.scrollIntoView = vi.fn();
      document.body.appendChild(paperList);

      renderPaginationControls(appState, mockApplyFiltersAndRender);

      const page2Btn = navElement.querySelector('button[data-page="2"]');
      page2Btn.click();

      expect(paperList.scrollIntoView).toHaveBeenCalledWith({ behavior: 'smooth', block: 'start' });

      document.body.removeChild(paperList);
    });
  });

  describe('applyFiltersAndRender', () => {
    it('should apply filters, sort, paginate and render', () => {
      const appState = {
        allPapersCache: mockPapers,
        activeFilters: { status: 'Reading', tags: [] },
        currentSearchTerm: '',
        currentSortBy: 'title-asc',
        pagination: { currentPage: 1, itemsPerPage: 25, totalItems: 0, totalPages: 0 },
        selectedPaperIds: []
      };

      // Setup DOM elements required by render functions
      const container = document.createElement('div');
      container.id = 'filter-chips-container';
      document.body.appendChild(container);

      const paperList = document.createElement('div');
      paperList.id = 'paper-list';
      document.body.appendChild(paperList);

      const paginationContainer = document.createElement('div');
      paginationContainer.id = 'pagination-container';
      const paginationInfo = document.createElement('span');
      paginationInfo.id = 'pagination-info';
      const paginationNav = document.createElement('nav');
      paginationNav.id = 'pagination-nav';
      paginationContainer.appendChild(paginationInfo);
      paginationContainer.appendChild(paginationNav);
      document.body.appendChild(paginationContainer);

      applyFiltersAndRender(appState);

      // Verify that external UI functions were called
      expect(uiMocks.sortPapers).toHaveBeenCalled();
      expect(uiMocks.renderPaperList).toHaveBeenCalled();

      // For internal functions, we check their side effects (DOM updates)
      // renderFilterChips should have rendered chips (status: Reading)
      expect(container.innerHTML).toContain('Status: Reading');

      // renderPaginationControls should have rendered pagination
      // Since totalItems is 0 in appState (default), it might be hidden.
      expect(paginationContainer.classList.contains('hidden')).toBe(true);

      expect(uiMocks.highlightActiveSidebarLink).toHaveBeenCalled();

      // Clean up
      document.body.removeChild(container);
      document.body.removeChild(paperList);
      document.body.removeChild(paginationContainer);
    });
  });
});
