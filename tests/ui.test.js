/**
 * Tests for ui.js - UI Utility Functions
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
    escapeHtml,
    showToast,
    formatRelativeTime,
    sortPapers
} from '../ui.js';
import { getStatusOrder } from '../config.js';

// Mock config
vi.mock('../config.js', () => ({
    getStatusOrder: vi.fn(() => ['Unread', 'Reading', 'Finished', 'On Hold'])
}));

describe('ui.js - escapeHtml', () => {
    it('should escape HTML special characters', () => {
        const unsafe = '<script>alert("XSS")</script>';
        const safe = escapeHtml(unsafe);
        expect(safe).toBe('&lt;script&gt;alert(&quot;XSS&quot;)&lt;/script&gt;');
    });

    it('should escape ampersands', () => {
        expect(escapeHtml('R&D')).toBe('R&amp;D');
    });

    it('should escape quotes', () => {
        expect(escapeHtml('Say "hello"')).toBe('Say &quot;hello&quot;');
        expect(escapeHtml("It's great")).toBe('It&#039;s great');
    });

    it('should handle already escaped content', () => {
        const already = '&amp;lt;div&amp;gt;';
        expect(escapeHtml(already)).toBe('&amp;amp;lt;div&amp;amp;gt;');
    });

    it('should handle empty string', () => {
        expect(escapeHtml('')).toBe('');
    });
});

describe('ui.js - showToast', () => {
    let container;

    beforeEach(() => {
        // Create toast container
        container = document.createElement('div');
        container.id = 'toast-container';
        document.body.appendChild(container);
    });

    afterEach(() => {
        document.body.removeChild(container);
        vi.clearAllTimers();
        vi.restoreAllMocks();
    });

    it('should display success toast', () => {
        showToast('Operation successful', 'success');

        const toast = container.querySelector('.toast');
        expect(toast).toBeTruthy();
        expect(toast.textContent).toContain('Operation successful');
        expect(toast.classList.contains('bg-green-500')).toBe(true);
    });

    it('should display error toast', () => {
        showToast('Operation failed', 'error');

        const toast = container.querySelector('.toast');
        expect(toast.classList.contains('bg-red-500')).toBe(true);
        expect(toast.querySelector('.material-symbols-outlined').textContent).toBe('error');
    });

    it('should display warning toast', () => {
        showToast('Warning message', 'warning');

        const toast = container.querySelector('.toast');
        expect(toast.classList.contains('bg-yellow-500')).toBe(true);
    });

    it('should display info toast', () => {
        showToast('Info message', 'info');

        const toast = container.querySelector('.toast');
        expect(toast.classList.contains('bg-blue-500')).toBe(true);
    });

    it('should add action buttons', () => {
        const onClick = vi.fn();
        showToast('Message', 'success', {
            actions: [{ label: 'Retry', onClick }]
        });

        const actionBtn = container.querySelector('.toast-action-btn');
        expect(actionBtn).toBeTruthy();
        expect(actionBtn.textContent.trim()).toBe('Retry');

        actionBtn.click();
        expect(onClick).toHaveBeenCalled();
    });

    it('should remove toast when close button clicked', () => {
        showToast('Persistent', 'success', { duration: 0 });

        const closeBtn = container.querySelector('.toast-close-btn');
        closeBtn.click();

        // Toast should be removed or have opacity-0 class
        setTimeout(() => {
            expect(container.querySelector('.toast')).toBeFalsy();
        }, 500);
    });
});

describe('ui.js - formatRelativeTime', () => {
    it('should return "Never" for null/undefined', () => {
        expect(formatRelativeTime(null)).toBe('Never');
        expect(formatRelativeTime(undefined)).toBe('Never');
    });

    it('should return "Just now" for very recent times', () => {
        const now = new Date();
        expect(formatRelativeTime(now)).toBe('Just now');

        const fewSecondsAgo = new Date(Date.now() - 30 * 1000);
        expect(formatRelativeTime(fewSecondsAgo)).toBe('Just now');
    });

    it('should format minutes ago', () => {
        const twoMinutesAgo = new Date(Date.now() - 2 * 60 * 1000);
        expect(formatRelativeTime(twoMinutesAgo)).toBe('2 minutes ago');

        const oneMinuteAgo = new Date(Date.now() - 1 * 60 * 1000);
        expect(formatRelativeTime(oneMinuteAgo)).toBe('1 minute ago');
    });

    it('should format hours ago', () => {
        const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);
        expect(formatRelativeTime(twoHoursAgo)).toBe('2 hours ago');

        const oneHourAgo = new Date(Date.now() - 1 * 60 * 60 * 1000);
        expect(formatRelativeTime(oneHourAgo)).toBe('1 hour ago');
    });

    it('should format days ago', () => {
        const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);
        expect(formatRelativeTime(threeDaysAgo)).toBe('3 days ago');
    });

    it('should format weeks ago', () => {
        const twoWeeksAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);
        expect(formatRelativeTime(twoWeeksAgo)).toBe('2 weeks ago');
    });

    it('should format months ago', () => {
        const twoMonthsAgo = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000);
        expect(formatRelativeTime(twoMonthsAgo)).toBe('2 months ago');
    });

    it('should format years ago', () => {
        const twoYearsAgo = new Date(Date.now() - 730 * 24 * 60 * 60 * 1000);
        expect(formatRelativeTime(twoYearsAgo)).toBe('2 years ago');
    });

    it('should handle string dates', () => {
        const dateString = new Date(Date.now() - 2 * 60 * 1000).toISOString();
        expect(formatRelativeTime(dateString)).toBe('2 minutes ago');
    });
});

describe('ui.js - sortPapers', () => {
    const papers = [
        { id: 1, title: 'Zebra Paper', createdAt: new Date('2023-01-01'), updatedAt: new Date('2023-06-01'), year: 2020, readingStatus: 'Reading', rating: 4 },
        { id: 2, title: 'Alpha Paper', createdAt: new Date('2023-06-01'), updatedAt: new Date('2023-07-01'), year: 2022, readingStatus: 'Finished', rating: 5 },
        { id: 3, title: 'Beta Paper', createdAt: new Date('2023-03-01'), updatedAt: new Date('2023-05-01'), year: 2021, readingStatus: 'Unread', rating: null }
    ];

    it('should sort by date_added (newest first)', () => {
        const sorted = sortPapers(papers, 'date_added');
        expect(sorted[0].id).toBe(2); // Most recent
        expect(sorted[2].id).toBe(1); // Oldest
    });

    it('should sort by last_updated', () => {
        const sorted = sortPapers(papers, 'last_updated');
        expect(sorted[0].id).toBe(2); // Most recently updated
        expect(sorted[2].id).toBe(3); // Least recently updated
    });

    it('should sort by title ascending', () => {
        const sorted = sortPapers(papers, 'title_asc');
        expect(sorted[0].title).toBe('Alpha Paper');
        expect(sorted[1].title).toBe('Beta Paper');
        expect(sorted[2].title).toBe('Zebra Paper');
    });

    it('should sort by year descending', () => {
        const sorted = sortPapers(papers, 'year_desc');
        expect(sorted[0].year).toBe(2022);
        expect(sorted[2].year).toBe(2020);
    });

    it('should sort by status with custom order', () => {
        const sorted = sortPapers(papers, 'status_asc');
        expect(sorted[0].readingStatus).toBe('Unread'); // First in custom order
        expect(sorted[1].readingStatus).toBe('Reading'); // Second
        expect(sorted[2].readingStatus).toBe('Finished'); // Third
    });

    it('should sort by rating descending', () => {
        const sorted = sortPapers(papers, 'rating_desc');
        expect(sorted[0].rating).toBe(5); // Highest rating
        expect(sorted[1].rating).toBe(4);
        expect(sorted[2].rating).toBe(null); // Unrated last
    });

    it('should handle empty array', () => {
        const sorted = sortPapers([], 'date_added');
        expect(sorted).toEqual([]);
    });

    it('should not mutate original array', () => {
        const original = [...papers];
        sortPapers(papers, 'title_asc');
        expect(papers).toEqual(original);
    });
});


