// Test helper utilities
import { vi } from 'vitest';

/**
 * Create a mock paper object for testing
 */
export const createMockPaper = (overrides = {}) => {
  return {
    id: 1,
    title: 'Test Paper',
    authors: ['John Doe', 'Jane Smith'],
    year: 2024,
    doi: '10.1234/test',
    tags: ['machine-learning', 'ai'],
    readingStatus: 'To Read',
    notes: 'Test notes',
    pdfFile: null,
    relatedPaperIds: [],
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-02'),
    readingProgress: { currentPage: 0, totalPages: 0 },
    ...overrides
  };
};

/**
 * Create multiple mock papers
 */
export const createMockPapers = (count = 5) => {
  return Array.from({ length: count }, (_, i) => createMockPaper({
    id: i + 1,
    title: `Test Paper ${i + 1}`,
    year: 2024 - i,
    tags: i % 2 === 0 ? ['machine-learning'] : ['deep-learning'],
    readingStatus: i % 3 === 0 ? 'Reading' : 'To Read'
  }));
};

/**
 * Create a mock collection
 */
export const createMockCollection = (overrides = {}) => {
  return {
    id: 1,
    name: 'Test Collection',
    icon: 'folder',
    color: 'text-primary',
    filters: {
      status: 'Reading',
      tags: ['machine-learning'],
      searchTerm: ''
    },
    createdAt: new Date('2024-01-01'),
    ...overrides
  };
};

/**
 * Wait for async operations
 */
export const waitFor = (ms = 0) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Mock fetch for DOI API calls
 */
export const mockFetch = (data, ok = true) => {
  global.fetch = vi.fn(() =>
    Promise.resolve({
      ok,
      json: () => Promise.resolve(data),
      text: () => Promise.resolve(JSON.stringify(data))
    })
  );
};

/**
 * Reset all mocks
 */
export const resetAllMocks = () => {
  vi.clearAllMocks();
  localStorage.clear();
};

