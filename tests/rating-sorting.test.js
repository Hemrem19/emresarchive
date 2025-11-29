// Tests for rating sorting functionality in ui.js
import { describe, it, expect, beforeEach } from 'vitest';
import { sortPapers } from '../ui.js';
import { createMockPaper } from './helpers.js';

describe('Rating Sorting', () => {
  let mockPapers;

  beforeEach(() => {
    mockPapers = [
      createMockPaper({
        id: 1,
        title: 'Paper 1',
        rating: 8,
        createdAt: new Date('2024-01-01')
      }),
      createMockPaper({
        id: 2,
        title: 'Paper 2',
        rating: 5,
        createdAt: new Date('2024-01-02')
      }),
      createMockPaper({
        id: 3,
        title: 'Paper 3',
        rating: 10,
        createdAt: new Date('2024-01-03')
      }),
      createMockPaper({
        id: 4,
        title: 'Paper 4',
        rating: null,
        createdAt: new Date('2024-01-04')
      }),
      createMockPaper({
        id: 5,
        title: 'Paper 5',
        rating: 3,
        createdAt: new Date('2024-01-05')
      })
    ];
  });

  describe('sort by rating_desc', () => {
    it('should sort by rating descending (highest first)', () => {
      const sorted = sortPapers(mockPapers, 'rating_desc');

      expect(sorted[0].id).toBe(3); // Rating 10
      expect(sorted[1].id).toBe(1); // Rating 8
      expect(sorted[2].id).toBe(2); // Rating 5
      expect(sorted[3].id).toBe(5); // Rating 3
      expect(sorted[4].id).toBe(4); // Rating null (unrated at end)
    });

    it('should place unrated papers at the end', () => {
      const papers = [
        createMockPaper({ id: 1, rating: 5 }),
        createMockPaper({ id: 2, rating: null }),
        createMockPaper({ id: 3, rating: 8 })
      ];

      const sorted = sortPapers(papers, 'rating_desc');

      expect(sorted[0].id).toBe(3); // Rating 8
      expect(sorted[1].id).toBe(1); // Rating 5
      expect(sorted[2].id).toBe(2); // Rating null
    });

    it('should handle all unrated papers', () => {
      const papers = [
        createMockPaper({ id: 1, rating: null, createdAt: new Date('2024-01-01') }),
        createMockPaper({ id: 2, rating: null, createdAt: new Date('2024-01-02') }),
        createMockPaper({ id: 3, rating: null, createdAt: new Date('2024-01-03') })
      ];

      const sorted = sortPapers(papers, 'rating_desc');

      // All have same rating (-1), so order should be preserved (or based on other criteria)
      expect(sorted).toHaveLength(3);
    });

    it('should handle papers with undefined rating', () => {
      const papers = [
        createMockPaper({ id: 1, rating: 7 }),
        createMockPaper({ id: 2, rating: undefined }),
        createMockPaper({ id: 3, rating: 9 })
      ];

      const sorted = sortPapers(papers, 'rating_desc');

      expect(sorted[0].id).toBe(3); // Rating 9
      expect(sorted[1].id).toBe(1); // Rating 7
      expect(sorted[2].id).toBe(2); // Rating undefined (treated as -1)
    });
  });

  describe('sort by rating_asc', () => {
    it('should sort by rating ascending (lowest first)', () => {
      const sorted = sortPapers(mockPapers, 'rating_asc');

      expect(sorted[0].id).toBe(5); // Rating 3
      expect(sorted[1].id).toBe(2); // Rating 5
      expect(sorted[2].id).toBe(1); // Rating 8
      expect(sorted[3].id).toBe(3); // Rating 10
      expect(sorted[4].id).toBe(4); // Rating null (unrated at end)
    });

    it('should place unrated papers at the end', () => {
      const papers = [
        createMockPaper({ id: 1, rating: 2 }),
        createMockPaper({ id: 2, rating: null }),
        createMockPaper({ id: 3, rating: 1 })
      ];

      const sorted = sortPapers(papers, 'rating_asc');

      expect(sorted[0].id).toBe(3); // Rating 1
      expect(sorted[1].id).toBe(1); // Rating 2
      expect(sorted[2].id).toBe(2); // Rating null
    });

    it('should handle edge cases with ratings 1 and 10', () => {
      const papers = [
        createMockPaper({ id: 1, rating: 1 }),
        createMockPaper({ id: 2, rating: 10 }),
        createMockPaper({ id: 3, rating: 5 })
      ];

      const sorted = sortPapers(papers, 'rating_asc');

      expect(sorted[0].id).toBe(1); // Rating 1
      expect(sorted[1].id).toBe(3); // Rating 5
      expect(sorted[2].id).toBe(2); // Rating 10
    });
  });

  describe('rating sorting edge cases', () => {
    it('should handle empty array', () => {
      const sorted = sortPapers([], 'rating_desc');
      expect(sorted).toEqual([]);
    });

    it('should handle single paper', () => {
      const papers = [createMockPaper({ id: 1, rating: 7 })];
      const sorted = sortPapers(papers, 'rating_desc');
      expect(sorted).toHaveLength(1);
      expect(sorted[0].id).toBe(1);
    });

    it('should handle papers with same rating', () => {
      const papers = [
        createMockPaper({ id: 1, rating: 5, createdAt: new Date('2024-01-01') }),
        createMockPaper({ id: 2, rating: 5, createdAt: new Date('2024-01-02') }),
        createMockPaper({ id: 3, rating: 5, createdAt: new Date('2024-01-03') })
      ];

      const sorted = sortPapers(papers, 'rating_desc');

      // All have same rating, order may vary but all should be present
      expect(sorted).toHaveLength(3);
      expect(sorted.every(p => p.rating === 5)).toBe(true);
    });

    it('should not mutate original array', () => {
      const original = [...mockPapers];
      const sorted = sortPapers(mockPapers, 'rating_desc');

      expect(mockPapers).toEqual(original);
      expect(sorted).not.toBe(mockPapers);
    });
  });
});

