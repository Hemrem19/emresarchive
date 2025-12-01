/**
 * Unit Tests for Details View
 * @module tests/details/index
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { detailsView } from '../../details/index.js';
import * as db from '../../db.js';
import * as ui from '../../ui.js';
import * as apiPapers from '../../api/papers.js';
import * as config from '../../config.js';
import { notesManager } from '../../details/notes.manager.js';
import { summaryManager } from '../../details/summary.manager.js';
import { relatedManager } from '../../details/related.manager.js';

// Mock dependencies
vi.mock('../../db.js', () => ({
    getPaperById: vi.fn(),
    updatePaper: vi.fn()
}));

vi.mock('../../ui.js', () => ({
    escapeHtml: (str) => str || '',
    formatRelativeTime: () => 'Just now',
    showToast: vi.fn()
}));

vi.mock('../../api/papers.js', () => ({
    getPdfDownloadUrl: vi.fn()
}));

vi.mock('../../config.js', () => ({
    isCloudSyncEnabled: vi.fn().mockReturnValue(false),
    getApiBaseUrl: vi.fn().mockReturnValue('http://localhost:3000')
}));

vi.mock('../../api/auth.js', () => ({
    isAuthenticated: vi.fn().mockReturnValue(true)
}));

vi.mock('../../details/notes.manager.js', () => ({
    notesManager: {
        initialize: vi.fn(),
        cleanup: vi.fn()
    }
}));

vi.mock('../../details/summary.manager.js', () => ({
    summaryManager: {
        initialize: vi.fn(),
        cleanup: vi.fn()
    }
}));

vi.mock('../../details/related.manager.js', () => ({
    relatedManager: {
        initialize: vi.fn(),
        cleanup: vi.fn()
    }
}));

vi.mock('../../components/rating-input.js', () => ({
    createRatingInput: vi.fn().mockImplementation(() => document.createElement('div'))
}));

vi.mock('../../citation.js', () => ({
    generateCitation: vi.fn().mockReturnValue('Mock Citation')
}));

describe('Details View', () => {
    let container;

    beforeEach(() => {
        document.body.innerHTML = '<div id="paper-details-container"></div>';
        container = document.getElementById('paper-details-container');
        vi.clearAllMocks();
    });

    afterEach(() => {
        detailsView.unmount();
        document.body.innerHTML = '';
    });

    describe('mount', () => {
        it('should render "Paper not found" if getPaperById returns null', async () => {
            db.getPaperById.mockResolvedValue(null);
            await detailsView.mount(999, {});
            expect(container.innerHTML).toContain('Paper not found');
        });

        it('should render paper details when paper exists', async () => {
            const paper = {
                id: 1,
                title: 'Test Paper',
                authors: ['Author A'],
                year: 2023,
                readingStatus: 'To Read'
            };
            db.getPaperById.mockResolvedValue(paper);

            await detailsView.mount(1, {});

            expect(container.innerHTML).toContain('Test Paper');
            expect(container.innerHTML).toContain('Author A');
            expect(notesManager.initialize).toHaveBeenCalled();
            expect(summaryManager.initialize).toHaveBeenCalled();
            expect(relatedManager.initialize).toHaveBeenCalled();
        });
    });

    describe('Tab Navigation', () => {
        beforeEach(async () => {
            const paper = { id: 1, title: 'Test Paper' };
            db.getPaperById.mockResolvedValue(paper);
            await detailsView.mount(1, {});
        });

        it('should switch tabs correctly', () => {
            const abstractBtn = document.querySelector('[data-tab="abstract"]');
            const summaryBtn = document.querySelector('[data-tab="summary"]');

            // Initial state (Notes tab is default active in code, but let's check switching)
            abstractBtn.click();

            const abstractPanel = document.getElementById('abstract-panel');
            expect(abstractPanel.classList.contains('hidden')).toBe(false);
            expect(abstractBtn.classList.contains('border-primary')).toBe(true);

            summaryBtn.click();
            const summaryPanel = document.getElementById('summary-panel');
            expect(summaryPanel.classList.contains('hidden')).toBe(false);
            expect(abstractPanel.classList.contains('hidden')).toBe(true);
        });
    });

    describe('PDF Actions', () => {
        it('should handle local PDF opening', async () => {
            const paper = { id: 1, title: 'Test', pdfFile: new Blob([''], { type: 'application/pdf' }), hasPdf: true };
            db.getPaperById.mockResolvedValue(paper);

            // Mock URL.createObjectURL
            global.URL.createObjectURL = vi.fn(() => 'blob:url');
            global.window.open = vi.fn();

            await detailsView.mount(1, {});

            const readBtn = document.getElementById('read-paper-btn');
            readBtn.click();

            expect(window.open).toHaveBeenCalledWith('blob:url', '_blank');
        });

        it('should handle cloud PDF download', async () => {
            const paper = { id: 1, title: 'Test', s3Key: 'key', hasPdf: true };
            db.getPaperById.mockResolvedValue(paper);
            config.isCloudSyncEnabled.mockReturnValue(true);
            apiPapers.getPdfDownloadUrl.mockResolvedValue({ downloadUrl: 'http://url' });

            // Mock anchor click
            const clickSpy = vi.spyOn(HTMLElement.prototype, 'click');

            await detailsView.mount(1, {});

            const downloadBtn = document.getElementById('download-pdf-btn');
            await downloadBtn.click(); // Trigger async handler

            // Wait for async operations
            await new Promise(resolve => setTimeout(resolve, 0));

            expect(apiPapers.getPdfDownloadUrl).toHaveBeenCalledWith(1);
            expect(ui.showToast).toHaveBeenCalledWith('Download started', 'success');
        });
    });

    describe('Reading Progress', () => {
        it('should update reading progress', async () => {
            const paper = {
                id: 1,
                title: 'Test',
                readingStatus: 'Reading',
                readingProgress: { currentPage: 10, totalPages: 100 }
            };
            db.getPaperById.mockResolvedValue(paper);
            db.updatePaper.mockResolvedValue(true);

            await detailsView.mount(1, {});

            const currentInput = document.getElementById('current-page-input');
            currentInput.value = '20';

            // Trigger blur event
            currentInput.dispatchEvent(new Event('blur'));

            // Wait for async operations
            await new Promise(resolve => setTimeout(resolve, 0));

            expect(db.updatePaper).toHaveBeenCalledWith(1, {
                readingProgress: { currentPage: 20, totalPages: 100 }
            });
        });

        it('should validate page numbers', async () => {
            const paper = {
                id: 1,
                title: 'Test',
                readingStatus: 'Reading',
                readingProgress: { currentPage: 10, totalPages: 100 }
            };
            db.getPaperById.mockResolvedValue(paper);

            await detailsView.mount(1, {});

            const currentInput = document.getElementById('current-page-input');
            currentInput.value = '150'; // Exceeds total

            currentInput.dispatchEvent(new Event('blur'));

            await new Promise(resolve => setTimeout(resolve, 0));

            expect(ui.showToast).toHaveBeenCalledWith('Current page cannot exceed total pages', 'warning');
            expect(db.updatePaper).not.toHaveBeenCalled();
        });
    });
});
