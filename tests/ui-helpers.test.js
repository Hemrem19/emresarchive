// Tests for ui.js helper functions
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { escapeHtml, formatRelativeTime, sortPapers } from '../ui.js';
import { createMockPapers, createMockPaper } from './helpers.js';

describe('ui.js - Helper Functions', () => {
  describe('escapeHtml', () => {
    it('should escape HTML special characters', () => {
      const input = '<script>alert("XSS")</script>';
      const result = escapeHtml(input);

      expect(result).toBe('&lt;script&gt;alert(&quot;XSS&quot;)&lt;/script&gt;');
    });

    it('should escape ampersands', () => {
      expect(escapeHtml('Tom & Jerry')).toBe('Tom &amp; Jerry');
    });

    it('should escape single quotes', () => {
      expect(escapeHtml("It's a test")).toBe('It&#039;s a test');
    });

    it('should handle empty strings', () => {
      expect(escapeHtml('')).toBe('');
    });

    it('should handle strings without special characters', () => {
      expect(escapeHtml('Hello World')).toBe('Hello World');
    });
  });

  describe('formatRelativeTime', () => {
    it('should return "Never" for null/undefined', () => {
      expect(formatRelativeTime(null)).toBe('Never');
      expect(formatRelativeTime(undefined)).toBe('Never');
    });

    it('should return "Just now" for recent times', () => {
      const now = new Date();
      const recent = new Date(now.getTime() - 30 * 1000); // 30 seconds ago

      expect(formatRelativeTime(recent)).toBe('Just now');
    });

    it('should format minutes ago', () => {
      const now = new Date();
      const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000);

      expect(formatRelativeTime(fiveMinutesAgo)).toBe('5 minutes ago');
    });

    it('should handle singular minute', () => {
      const now = new Date();
      const oneMinuteAgo = new Date(now.getTime() - 1 * 60 * 1000);

      expect(formatRelativeTime(oneMinuteAgo)).toBe('1 minute ago');
    });

    it('should format hours ago', () => {
      const now = new Date();
      const threeHoursAgo = new Date(now.getTime() - 3 * 60 * 60 * 1000);

      expect(formatRelativeTime(threeHoursAgo)).toBe('3 hours ago');
    });

    it('should format days ago', () => {
      const now = new Date();
      const twoDaysAgo = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000);

      expect(formatRelativeTime(twoDaysAgo)).toBe('2 days ago');
    });

    it('should format weeks ago', () => {
      const now = new Date();
      const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

      expect(formatRelativeTime(twoWeeksAgo)).toBe('2 weeks ago');
    });

    it('should format months ago', () => {
      const now = new Date();
      const threeMonthsAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);

      expect(formatRelativeTime(threeMonthsAgo)).toBe('3 months ago');
    });

    it('should format years ago', () => {
      const now = new Date();
      const twoYearsAgo = new Date(now.getTime() - 730 * 24 * 60 * 60 * 1000);

      expect(formatRelativeTime(twoYearsAgo)).toBe('2 years ago');
    });

    it('should handle string dates', () => {
      const now = new Date();
      const dateString = new Date(now.getTime() - 5 * 60 * 1000).toISOString();

      expect(formatRelativeTime(dateString)).toBe('5 minutes ago');
    });
  });

  describe('sortPapers', () => {
    let mockPapers;

    beforeEach(() => {
      mockPapers = [
        createMockPaper({
          id: 1,
          title: 'Zebra Paper',
          year: 2020,
          readingStatus: 'To Read',
          createdAt: new Date('2024-01-01'),
          updatedAt: new Date('2024-01-05'),
          readingProgress: { currentPage: 50, totalPages: 100 }
        }),
        createMockPaper({
          id: 2,
          title: 'Alpha Paper',
          year: 2023,
          readingStatus: 'Reading',
          createdAt: new Date('2024-01-03'),
          updatedAt: new Date('2024-01-10'),
          readingProgress: { currentPage: 75, totalPages: 100 }
        }),
        createMockPaper({
          id: 3,
          title: 'Beta Paper',
          year: 2021,
          readingStatus: 'Finished',
          createdAt: new Date('2024-01-02'),
          updatedAt: new Date('2024-01-08'),
          readingProgress: { currentPage: 100, totalPages: 100 }
        })
      ];
    });

    it('should not mutate original array', () => {
      const original = [...mockPapers];
      sortPapers(mockPapers, 'title_asc');

      expect(mockPapers).toEqual(original);
    });

    it('should sort by date_added (newest first)', () => {
      const sorted = sortPapers(mockPapers, 'date_added');

      expect(sorted[0].id).toBe(2); // Most recent createdAt
      expect(sorted[1].id).toBe(3);
      expect(sorted[2].id).toBe(1);
    });

    it('should sort by last_updated (newest first)', () => {
      const sorted = sortPapers(mockPapers, 'last_updated');

      expect(sorted[0].id).toBe(2); // Most recent updatedAt
      expect(sorted[1].id).toBe(3);
      expect(sorted[2].id).toBe(1);
    });

    it('should fallback to createdAt if updatedAt is missing', () => {
      const papers = [
        createMockPaper({ id: 1, createdAt: new Date('2024-01-01'), updatedAt: null }),
        createMockPaper({ id: 2, createdAt: new Date('2024-01-03'), updatedAt: null })
      ];

      const sorted = sortPapers(papers, 'last_updated');

      expect(sorted[0].id).toBe(2);
    });

    it('should sort by title alphabetically', () => {
      const sorted = sortPapers(mockPapers, 'title_asc');

      expect(sorted[0].title).toBe('Alpha Paper');
      expect(sorted[1].title).toBe('Beta Paper');
      expect(sorted[2].title).toBe('Zebra Paper');
    });

    it('should sort by year descending', () => {
      const sorted = sortPapers(mockPapers, 'year_desc');

      expect(sorted[0].year).toBe(2023);
      expect(sorted[1].year).toBe(2021);
      expect(sorted[2].year).toBe(2020);
    });

    it('should handle missing years', () => {
      const papers = [
        createMockPaper({ id: 1, year: 2023 }),
        createMockPaper({ id: 2, year: null }),
        createMockPaper({ id: 3, year: 2024 })
      ];

      const sorted = sortPapers(papers, 'year_desc');

      expect(sorted[0].year).toBe(2024);
      expect(sorted[1].year).toBe(2023);
      expect(sorted[2].year).toBeNull();
    });

    it('should sort by reading status', () => {
      const sorted = sortPapers(mockPapers, 'status_asc');

      // Assuming status order is: Reading, To Read, Finished, Archived
      expect(sorted[0].readingStatus).toBe('Reading');
      expect(sorted[1].readingStatus).toBe('To Read');
      expect(sorted[2].readingStatus).toBe('Finished');
    });

    it('should sort by reading progress (highest first)', () => {
      const sorted = sortPapers(mockPapers, 'progress_desc');

      expect(sorted[0].id).toBe(3); // 100% complete
      expect(sorted[1].id).toBe(2); // 75% complete
      expect(sorted[2].id).toBe(1); // 50% complete
    });

    it('should handle papers without progress tracking', () => {
      const papers = [
        createMockPaper({ id: 1, readingProgress: { currentPage: 50, totalPages: 100 } }),
        createMockPaper({ id: 2, readingProgress: { currentPage: 0, totalPages: 0 } }),
        createMockPaper({ id: 3, readingProgress: null })
      ];

      const sorted = sortPapers(papers, 'progress_desc');

      expect(sorted[0].id).toBe(1); // Papers with progress come first
      // Papers without progress should be at the end
    });

    it('should use date_added for unknown sort keys', () => {
      const sorted = sortPapers(mockPapers, 'unknown_sort');

      expect(sorted[0].id).toBe(2); // Newest createdAt
    });
  });
});

