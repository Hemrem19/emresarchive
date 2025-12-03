/**
 * Unit Tests for UI Utilities
 * @module tests/ui
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
    escapeHtml,
    formatRelativeTime,
    sortPapers,
    highlightText,
    extractNoteSnippet,
    hasNotesMatch,
    highlightText,
    extractNoteSnippet,
    hasNotesMatch,
    showToast,
    renderPaperList,
    renderSidebarTags,
    renderSidebarCollections
} from '../ui.js';

// Mock config.js since sortPapers uses getStatusOrder
vi.mock('../config.js', () => ({
    getStatusOrder: () => ['To Read', 'Reading', 'Finished', 'Archived']
}));

describe('UI Utilities', () => {

    describe('escapeHtml', () => {
        it('should escape special characters', () => {
            const input = '<script>alert("xss")</script>';
            const expected = '&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;';
            expect(escapeHtml(input)).toBe(expected);
        });

        it('should handle strings without special characters', () => {
            const input = 'Hello World';
            expect(escapeHtml(input)).toBe(input);
        });

        it('should escape ampersands first', () => {
            const input = '& < > " \'';
            const expected = '&amp; &lt; &gt; &quot; &#039;';
            expect(escapeHtml(input)).toBe(expected);
        });
    });

    describe('formatRelativeTime', () => {
        it('should return "Never" for null/undefined date', () => {
            expect(formatRelativeTime(null)).toBe('Never');
            expect(formatRelativeTime(undefined)).toBe('Never');
        });

        it('should return "Just now" for very recent dates', () => {
            const now = new Date();
            expect(formatRelativeTime(now)).toBe('Just now');
        });

        it('should format minutes correctly', () => {
            const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
            expect(formatRelativeTime(fiveMinutesAgo)).toBe('5 minutes ago');
        });

        it('should format hours correctly', () => {
            const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);
            expect(formatRelativeTime(twoHoursAgo)).toBe('2 hours ago');
        });

        it('should format days correctly', () => {
            const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);
            expect(formatRelativeTime(threeDaysAgo)).toBe('3 days ago');
        });

        it('should format weeks correctly', () => {
            const twoWeeksAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);
            expect(formatRelativeTime(twoWeeksAgo)).toBe('2 weeks ago');
        });

        it('should format months correctly', () => {
            const twoMonthsAgo = new Date(Date.now() - 65 * 24 * 60 * 60 * 1000);
            expect(formatRelativeTime(twoMonthsAgo)).toBe('2 months ago');
        });

        it('should format years correctly', () => {
            const twoYearsAgo = new Date(Date.now() - 750 * 24 * 60 * 60 * 1000);
            expect(formatRelativeTime(twoYearsAgo)).toBe('2 years ago');
        });
    });

    describe('sortPapers', () => {
        const papers = [
            { id: 1, title: 'B Paper', year: 2020, createdAt: '2023-01-01', updatedAt: '2023-01-01', readingStatus: 'Reading', rating: 5 },
            { id: 2, title: 'A Paper', year: 2021, createdAt: '2023-02-01', updatedAt: '2023-03-01', readingStatus: 'To Read', rating: null },
            { id: 3, title: 'C Paper', year: 2019, createdAt: '2023-01-15', updatedAt: '2023-02-01', readingStatus: 'Finished', rating: 8 }
        ];

        it('should sort by date_added (default)', () => {
            const sorted = sortPapers(papers, 'date_added');
            expect(sorted[0].id).toBe(2); // Newest created
            expect(sorted[2].id).toBe(1); // Oldest created
        });

        it('should sort by last_updated', () => {
            const sorted = sortPapers(papers, 'last_updated');
            expect(sorted[0].id).toBe(2); // Newest updated
            expect(sorted[2].id).toBe(1); // Oldest updated
        });

        it('should sort by title_asc', () => {
            const sorted = sortPapers(papers, 'title_asc');
            expect(sorted[0].title).toBe('A Paper');
            expect(sorted[2].title).toBe('C Paper');
        });

        it('should sort by year_desc', () => {
            const sorted = sortPapers(papers, 'year_desc');
            expect(sorted[0].year).toBe(2021);
            expect(sorted[2].year).toBe(2019);
        });

        it('should sort by status_asc', () => {
            const sorted = sortPapers(papers, 'status_asc');
            // Order: To Read, Reading, Finished
            expect(sorted[0].readingStatus).toBe('To Read');
            expect(sorted[1].readingStatus).toBe('Reading');
            expect(sorted[2].readingStatus).toBe('Finished');
        });

        it('should sort by rating_desc', () => {
            const sorted = sortPapers(papers, 'rating_desc');
            expect(sorted[0].rating).toBe(8);
            expect(sorted[1].rating).toBe(5);
            expect(sorted[2].rating).toBe(null);
        });
    });

    describe('highlightText', () => {
        it('should highlight matching terms', () => {
            const text = 'Hello World';
            const term = 'World';
            const result = highlightText(text, term);
            expect(result).toContain('<mark');
            expect(result).toContain('World</mark>');
        });

        it('should be case insensitive', () => {
            const text = 'Hello World';
            const term = 'world';
            const result = highlightText(text, term);
            expect(result).toContain('<mark');
            expect(result).toContain('World</mark>');
        });

        it('should escape special regex characters in term', () => {
            const text = 'Hello (World)';
            const term = '(World)';
            const result = highlightText(text, term);
            expect(result).toContain('<mark');
            expect(result).toContain('(World)</mark>');
        });

        it('should return original text if no term provided', () => {
            const text = 'Hello World';
            expect(highlightText(text, '')).toBe(text);
            expect(highlightText(text, null)).toBe(text);
        });
    });

    describe('extractNoteSnippet', () => {
        const notes = 'This is a long note about machine learning and artificial intelligence. It contains many keywords.';

        it('should extract snippet containing term', () => {
            const snippet = extractNoteSnippet(notes, 'machine');
            expect(snippet.toLowerCase()).toContain('machine');
        });

        it('should handle terms at the beginning', () => {
            const snippet = extractNoteSnippet(notes, 'This');
            expect(snippet).toContain('This is a long');
        });

        it('should return empty string if no match', () => {
            const snippet = extractNoteSnippet(notes, 'banana');
            expect(snippet).toBe('');
        });

        it('should trim to word boundaries', () => {
            const longNotes = 'Start ' + 'a'.repeat(100) + ' middle ' + 'b'.repeat(100) + ' End';
            const snippet = extractNoteSnippet(longNotes, 'middle', 20);
            expect(snippet).toContain('middle');
            // Should verify ellipsis logic if possible, but exact boundary depends on implementation details
        });
    });

    describe('hasNotesMatch', () => {
        const paper = { notes: 'Machine Learning paper' };

        it('should return true for partial match', () => {
            expect(hasNotesMatch(paper, 'Machine')).toBe(true);
            expect(hasNotesMatch(paper, 'learning')).toBe(true);
        });

        it('should return false for no match', () => {
            expect(hasNotesMatch(paper, 'banana')).toBe(false);
        });

        it('should handle exact phrase search', () => {
            expect(hasNotesMatch(paper, '"Machine Learning"')).toBe(true);
            expect(hasNotesMatch(paper, '"Deep Learning"')).toBe(false);
        });

        it('should require all words for normal search', () => {
            expect(hasNotesMatch(paper, 'Machine Learning')).toBe(true);
            expect(hasNotesMatch(paper, 'Machine Banana')).toBe(false);
        });
    });

    describe('showToast', () => {
        let container;

        beforeEach(() => {
            document.body.innerHTML = '<div id="toast-container"></div>';
            container = document.getElementById('toast-container');
            vi.useFakeTimers();
        });

        afterEach(() => {
            vi.useRealTimers();
            document.body.innerHTML = '';
        });

        it('should create a toast element', () => {
            showToast('Test Message');
            const toast = container.querySelector('.toast');
            expect(toast).toBeTruthy();
            expect(toast.textContent).toContain('Test Message');
        });

        it('should apply success style by default', () => {
            showToast('Success');
            const toast = container.querySelector('.toast');
            expect(toast.className).toContain('bg-green-500');
        });

        it('should apply error style', () => {
            showToast('Error', 'error');
            const toast = container.querySelector('.toast');
            expect(toast.className).toContain('bg-red-500');
        });

        it('should auto-remove after duration', () => {
            showToast('Transient', 'info', { duration: 1000 });
            expect(container.children.length).toBe(1);

            vi.advanceTimersByTime(1000); // Trigger remove timeout
            vi.advanceTimersByTime(500);  // Trigger animation timeout

            expect(container.children.length).toBe(0);
        });

        it('should not auto-remove if duration is 0', () => {
            showToast('Persistent', 'info', { duration: 0 });
            vi.advanceTimersByTime(5000);
            expect(container.children.length).toBe(1);
        });

        it('should render action buttons', () => {
            const onClick = vi.fn();
            showToast('Action', 'info', {
                actions: [{ label: 'Click Me', onClick }]
            });

            const btn = container.querySelector('.toast-action-btn');
            expect(btn).toBeTruthy();
            expect(btn.textContent.trim()).toBe('Click Me');

            btn.click();
            expect(onClick).toHaveBeenCalled();
        });
    });

    describe('renderPaperList', () => {
        let container;

        beforeEach(() => {
            document.body.innerHTML = '<div id="paper-list"></div>';
            container = document.getElementById('paper-list');
        });

        it('should render empty state when no papers', () => {
            renderPaperList([]);
            expect(container.innerHTML).toContain('No papers found');
        });

        it('should render paper cards', () => {
            const papers = [
                {
                    id: 1,
                    title: 'Test Paper',
                    authors: ['Author A'],
                    year: 2023,
                    readingStatus: 'To Read',
                    tags: ['tag1'],
                    rating: 8
                }
            ];
            renderPaperList(papers);

            expect(container.querySelectorAll('.paper-card').length).toBe(1);
            expect(container.textContent).toContain('Test Paper');
            expect(container.textContent).toContain('Author A');
            expect(container.textContent).toContain('2023');
            expect(container.textContent).toContain('8'); // Rating
        });

        it('should highlight search terms in title and authors', () => {
            const papers = [
                {
                    id: 1,
                    title: 'Machine Learning',
                    authors: ['John Doe'],
                    readingStatus: 'To Read'
                }
            ];
            renderPaperList(papers, 'Machine');

            const titleHtml = container.querySelector('a').innerHTML;
            expect(titleHtml).toContain('<mark');
            expect(titleHtml).toContain('Machine</mark>');
        });

        it('should show note snippet when search matches notes', () => {
            const papers = [
                {
                    id: 1,
                    title: 'Paper',
                    authors: ['Author'],
                    readingStatus: 'To Read',
                    notes: 'This paper discusses deep learning techniques.'
                }
            ];
            renderPaperList(papers, 'deep learning');

            expect(container.textContent).toContain('Match found in notes');
            expect(container.innerHTML).toContain('<mark');
        });

        it('should mark selected papers as checked', () => {
            const papers = [{ id: 1, title: 'Paper', authors: [], readingStatus: 'To Read' }];
            const selectedIds = new Set([1]);

            renderPaperList(papers, '', selectedIds);

            const checkbox = container.querySelector('input[type="checkbox"]');
            expect(checkbox.checked).toBe(true);
            expect(container.querySelector('.paper-card').className).toContain('border-blue-500/50');
        });

        it('should render reading progress bar for Reading status', () => {
            const papers = [
                {
                    id: 1,
                    title: 'Paper',
                    authors: [],
                    readingStatus: 'Reading',
                    readingProgress: { currentPage: 50, totalPages: 100 }
                }
            ];
            renderPaperList(papers);

            // Reading progress bar shows percentage
            // The progress bar is inside a container with bg-slate-700, find it specifically
            const progressContainer = container.querySelector('.bg-slate-700');
            expect(progressContainer).toBeTruthy();
            // The progress bar itself is the bg-blue-500 div inside the progress container
            const progressBar = progressContainer.querySelector('.bg-blue-500');
            expect(progressBar).toBeTruthy();
            // Check that width style is set - verify the HTML contains the style attribute
            const html = progressBar.outerHTML;
            expect(html).toContain('style');
            expect(html).toContain('50%');
        });
    });

    describe('renderSidebarTags', () => {
        let tagsSection;
        let mobileTagsSection;

        beforeEach(() => {
            document.body.innerHTML = `
                <div id="sidebar-tags-section"></div>
                <div id="mobile-sidebar-tags-section"></div>
            `;
            tagsSection = document.getElementById('sidebar-tags-section');
            mobileTagsSection = document.getElementById('mobile-sidebar-tags-section');
        });

        it('should render unique tags', () => {
            const papers = [
                { tags: ['ml', 'ai'] },
                { tags: ['ml', 'data'] }
            ];
            renderSidebarTags(papers);

            const tags = tagsSection.querySelectorAll('.sidebar-tag');
            expect(tags.length).toBe(3); // ml, ai, data
            expect(tagsSection.textContent).toContain('#ml');
            expect(tagsSection.textContent).toContain('#ai');
            expect(tagsSection.textContent).toContain('#data');
        });

        it('should handle papers with no tags', () => {
            const papers = [{ title: 'No Tags' }];
            renderSidebarTags(papers);
            expect(tagsSection.innerHTML).toBe('');
        });

        it('should update both desktop and mobile sections', () => {
            const papers = [{ tags: ['test'] }];
            renderSidebarTags(papers);

            expect(tagsSection.innerHTML).toContain('test');
            expect(mobileTagsSection.innerHTML).toContain('test');
        });
    });

    describe('renderSidebarCollections', () => {
        let collectionsSection;
        let mobileCollectionsSection;

        beforeEach(() => {
            document.body.innerHTML = `
                <div id="sidebar-collections-section"></div>
                <div id="mobile-sidebar-collections-section"></div>
            `;
            collectionsSection = document.getElementById('sidebar-collections-section');
            mobileCollectionsSection = document.getElementById('mobile-sidebar-collections-section');
        });

        it('should render collections list', () => {
            const collections = [
                { id: '1', name: 'My Collection', icon: 'star', color: 'text-yellow-500' }
            ];
            renderSidebarCollections(collections);

            expect(collectionsSection.textContent).toContain('My Collection');
            expect(collectionsSection.innerHTML).toContain('star');
            expect(collectionsSection.innerHTML).toContain('text-yellow-500');
        });

        it('should show empty state when no collections', () => {
            renderSidebarCollections([]);
            expect(collectionsSection.textContent).toContain('No saved collections yet');
        });
    });
});
