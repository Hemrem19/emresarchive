// Integration tests for complete workflows
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { openDB } from '../db/core.js';
import { addPaper, getAllPapers, updatePaper, deletePaper } from '../db/papers.js';
import { addCollection, getAllCollections, deleteCollection } from '../db/collections.js';
import { getFilteredPapers, calculatePagination, getPaginatedPapers } from '../core/filters.js';
import { sortPapers } from '../ui.js';
import { createMockPaper, createMockCollection } from './helpers.js';

describe('Integration Tests', () => {
  beforeEach(async () => {
    await openDB();
  });

  afterEach(async () => {
    const db = await openDB();
    
    // Clear all stores
    const papersTx = db.transaction('papers', 'readwrite');
    await papersTx.objectStore('papers').clear();
    await papersTx.done;
    
    const collectionsTx = db.transaction('collections', 'readwrite');
    await collectionsTx.objectStore('collections').clear();
    await collectionsTx.done;
  });

  describe('Paper Management Workflow', () => {
    it('should add, retrieve, update, and delete a paper', async () => {
      // Add a paper
      const paper = {
        title: 'Test Paper',
        authors: ['John Doe'],
        year: 2024,
        tags: ['machine-learning'],
        readingStatus: 'To Read',
        notes: 'Initial notes'
      };

      const paperId = await addPaper(paper);
      expect(paperId).toBeDefined();

      // Retrieve the paper
      let papers = await getAllPapers();
      expect(papers).toHaveLength(1);
      expect(papers[0].title).toBe('Test Paper');

      // Update the paper
      await updatePaper(paperId, { 
        readingStatus: 'Reading',
        notes: 'Updated notes' 
      });

      papers = await getAllPapers();
      expect(papers[0].readingStatus).toBe('Reading');
      expect(papers[0].notes).toBe('Updated notes');
      expect(papers[0].updatedAt).toBeDefined();

      // Delete the paper
      await deletePaper(paperId);

      papers = await getAllPapers();
      expect(papers).toHaveLength(0);
    });

    it('should handle multiple papers with different tags and statuses', async () => {
      // Add multiple papers
      await addPaper({
        title: 'ML Paper',
        authors: ['Alice'],
        year: 2024,
        tags: ['machine-learning', 'ai'],
        readingStatus: 'Reading',
        notes: 'ML research'
      });

      await addPaper({
        title: 'DL Paper',
        authors: ['Bob'],
        year: 2023,
        tags: ['deep-learning'],
        readingStatus: 'Finished',
        notes: 'Deep learning study'
      });

      await addPaper({
        title: 'NLP Paper',
        authors: ['Charlie'],
        year: 2024,
        tags: ['nlp', 'machine-learning'],
        readingStatus: 'To Read',
        notes: 'Natural language processing'
      });

      const papers = await getAllPapers();
      expect(papers).toHaveLength(3);

      // Verify tags
      const allTags = papers.flatMap(p => p.tags);
      expect(allTags).toContain('machine-learning');
      expect(allTags).toContain('deep-learning');
      expect(allTags).toContain('nlp');
    });
  });

  describe('Filtering and Search Workflow', () => {
    beforeEach(async () => {
      // Set up test data
      await addPaper({
        title: 'Machine Learning Basics',
        authors: ['Author A'],
        year: 2024,
        tags: ['machine-learning', 'ai'],
        readingStatus: 'Reading',
        notes: 'Introduction to ML'
      });

      await addPaper({
        title: 'Deep Learning Advanced',
        authors: ['Author B'],
        year: 2023,
        tags: ['deep-learning', 'neural-networks'],
        readingStatus: 'Finished',
        notes: 'Advanced deep learning techniques'
      });

      await addPaper({
        title: 'Natural Language Processing',
        authors: ['Author C'],
        year: 2024,
        tags: ['nlp', 'machine-learning'],
        readingStatus: 'To Read',
        notes: 'NLP fundamentals and applications'
      });
    });

    it('should filter papers by status', async () => {
      const allPapers = await getAllPapers();
      const appState = {
        activeFilters: { status: 'Reading', tags: [] },
        currentSearchTerm: '',
        searchMode: 'all'
      };
      const filtered = getFilteredPapers(allPapers, appState);

      expect(filtered).toHaveLength(1);
      expect(filtered[0].readingStatus).toBe('Reading');
    });

    it('should filter papers by tag', async () => {
      const allPapers = await getAllPapers();
      const appState = {
        activeFilters: { status: null, tags: ['machine-learning'] },
        currentSearchTerm: '',
        searchMode: 'all'
      };
      const filtered = getFilteredPapers(allPapers, appState);

      expect(filtered).toHaveLength(2);
      expect(filtered.every(p => p.tags.includes('machine-learning'))).toBe(true);
    });

    it('should search papers by title and notes', async () => {
      const allPapers = await getAllPapers();
      const appState = {
        activeFilters: { status: null, tags: [] },
        currentSearchTerm: 'advanced',
        searchMode: 'all'
      };
      const filtered = getFilteredPapers(allPapers, appState);

      expect(filtered).toHaveLength(1);
      expect(filtered[0].title).toContain('Advanced');
    });

    it('should combine filters and search', async () => {
      const allPapers = await getAllPapers();
      const appState = {
        activeFilters: { status: 'Reading', tags: ['machine-learning'] },
        currentSearchTerm: 'ml',
        searchMode: 'all'
      };
      const filtered = getFilteredPapers(allPapers, appState);

      expect(filtered).toHaveLength(1);
      expect(filtered[0].readingStatus).toBe('Reading');
      expect(filtered[0].tags).toContain('machine-learning');
    });

    it('should search only in notes when searchMode is "notes"', async () => {
      const allPapers = await getAllPapers();
      const appState = {
        activeFilters: { status: null, tags: [] },
        currentSearchTerm: 'fundamentals',
        searchMode: 'notes'
      };
      const filtered = getFilteredPapers(allPapers, appState);

      expect(filtered).toHaveLength(1);
      expect(filtered[0].notes).toContain('fundamentals');
    });
  });

  describe('Sort and Pagination Workflow', () => {
    beforeEach(async () => {
      // Add papers with different dates and properties
      await addPaper({
        title: 'Zebra Paper',
        authors: ['Author'],
        year: 2020,
        tags: ['tag1'],
        readingStatus: 'To Read',
        notes: ''
      });

      await addPaper({
        title: 'Alpha Paper',
        authors: ['Author'],
        year: 2024,
        tags: ['tag2'],
        readingStatus: 'Reading',
        notes: ''
      });

      await addPaper({
        title: 'Beta Paper',
        authors: ['Author'],
        year: 2022,
        tags: ['tag3'],
        readingStatus: 'Finished',
        notes: ''
      });
    });

    it('should sort papers and paginate results', async () => {
      const allPapers = await getAllPapers();

      // Sort by title
      const sorted = sortPapers(allPapers, 'title_asc');
      expect(sorted[0].title).toBe('Alpha Paper');
      expect(sorted[1].title).toBe('Beta Paper');
      expect(sorted[2].title).toBe('Zebra Paper');

      // Paginate (2 items per page)
      const appState = {
        pagination: { currentPage: 1, itemsPerPage: 2, totalItems: 0, totalPages: 0 }
      };
      calculatePagination(sorted.length, appState);
      expect(appState.pagination.totalPages).toBe(2);

      const page1 = getPaginatedPapers(sorted, appState);
      expect(page1).toHaveLength(2);
      expect(page1[0].title).toBe('Alpha Paper');
      expect(page1[1].title).toBe('Beta Paper');
    });

    it('should handle filtering, sorting, and pagination together', async () => {
      const allPapers = await getAllPapers();

      // Filter by year >= 2022
      const filtered = allPapers.filter(p => p.year >= 2022);
      expect(filtered).toHaveLength(2);

      // Sort by year descending
      const sorted = sortPapers(filtered, 'year_desc');
      expect(sorted[0].year).toBe(2024);

      // Paginate (1 item per page)
      const appState = {
        pagination: { currentPage: 1, itemsPerPage: 1, totalItems: 0, totalPages: 0 }
      };
      calculatePagination(sorted.length, appState);
      const page1 = getPaginatedPapers(sorted, appState);

      expect(page1).toHaveLength(1);
      expect(page1[0].year).toBe(2024);
    });
  });

  describe('Collections Workflow', () => {
    beforeEach(async () => {
      // Set up test papers
      await addPaper({
        title: 'ML Paper',
        authors: ['Author'],
        year: 2024,
        tags: ['machine-learning'],
        readingStatus: 'Reading',
        notes: ''
      });

      await addPaper({
        title: 'DL Paper',
        authors: ['Author'],
        year: 2023,
        tags: ['deep-learning'],
        readingStatus: 'Finished',
        notes: ''
      });
    });

    it('should create collection and apply filters', async () => {
      // Create a collection
      const collection = {
        name: 'ML Papers',
        icon: 'folder',
        color: 'text-primary',
        filters: {
          status: 'Reading',
          tags: ['machine-learning'],
          searchTerm: ''
        }
      };

      const collectionId = await addCollection(collection);
      expect(collectionId).toBeDefined();

      // Retrieve collection
      const collections = await getAllCollections();
      expect(collections).toHaveLength(1);

      // Apply collection filters
      const savedCollection = collections[0];
      const allPapers = await getAllPapers();
      const appState = {
        activeFilters: {
          status: savedCollection.filters.status,
          tags: savedCollection.filters.tags
        },
        currentSearchTerm: savedCollection.filters.searchTerm,
        searchMode: 'all'
      };
      const filtered = getFilteredPapers(allPapers, appState);

      expect(filtered).toHaveLength(1);
      expect(filtered[0].title).toBe('ML Paper');
    });

    it('should manage multiple collections', async () => {
      // Create multiple collections
      await addCollection({
        name: 'Reading List',
        icon: 'book',
        color: 'text-blue-500',
        filters: { status: 'Reading', tags: [], searchTerm: '' }
      });

      await addCollection({
        name: 'Finished Papers',
        icon: 'check',
        color: 'text-green-500',
        filters: { status: 'Finished', tags: [], searchTerm: '' }
      });

      const collections = await getAllCollections();
      expect(collections).toHaveLength(2);

      // Delete one collection
      await deleteCollection(collections[0].id);

      const remainingCollections = await getAllCollections();
      expect(remainingCollections).toHaveLength(1);
    });
  });

  describe('Complete User Journey', () => {
    it('should simulate a typical user workflow', async () => {
      // 1. User adds a new paper
      const paperId = await addPaper({
        title: 'Introduction to Machine Learning',
        authors: ['John Doe', 'Jane Smith'],
        year: 2024,
        doi: '10.1234/ml-intro',
        tags: ['machine-learning', 'tutorial'],
        readingStatus: 'To Read',
        notes: 'Recommended by colleague'
      });

      expect(paperId).toBeDefined();

      // 2. User starts reading and updates status
      await updatePaper(paperId, {
        readingStatus: 'Reading',
        readingProgress: { currentPage: 10, totalPages: 100 }
      });

      // 3. User adds notes
      await updatePaper(paperId, {
        notes: 'Great introduction to ML concepts. Chapter 3 is particularly useful.'
      });

      // 4. User creates a collection for ML papers
      const collectionId = await addCollection({
        name: 'Machine Learning',
        icon: 'auto_stories',
        color: 'text-blue-500',
        filters: {
          status: null,
          tags: ['machine-learning'],
          searchTerm: ''
        }
      });

      // 5. User searches for papers
      const allPapers = await getAllPapers();
      const searchState = {
        activeFilters: { status: null, tags: [] },
        currentSearchTerm: 'introduction',
        searchMode: 'all'
      };
      const searchResults = getFilteredPapers(allPapers, searchState);

      expect(searchResults).toHaveLength(1);
      expect(searchResults[0].id).toBe(paperId);

      // 6. User applies collection filter
      const collections = await getAllCollections();
      const mlCollection = collections.find(c => c.id === collectionId);
      const collectionState = {
        activeFilters: {
          status: mlCollection.filters.status,
          tags: mlCollection.filters.tags
        },
        currentSearchTerm: mlCollection.filters.searchTerm,
        searchMode: 'all'
      };
      const collectionResults = getFilteredPapers(allPapers, collectionState);

      expect(collectionResults).toHaveLength(1);

      // 7. User finishes reading
      await updatePaper(paperId, {
        readingStatus: 'Finished',
        readingProgress: { currentPage: 100, totalPages: 100 }
      });

      // 8. Verify final state
      const updatedPapers = await getAllPapers();
      expect(updatedPapers[0].readingStatus).toBe('Finished');
      expect(updatedPapers[0].readingProgress.currentPage).toBe(100);
      expect(updatedPapers[0].updatedAt).toBeDefined();
    });
  });
});
