/**
 * Unit Tests for Related Papers Manager
 * @module tests/details/related-manager
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { relatedManager } from '../../details/related.manager.js';
import * as db from '../../db.js';
import * as ui from '../../ui.js';
import * as sync from '../../db/sync.js';
import * as config from '../../config.js';

// Mock dependencies
vi.mock('../../db.js', () => ({
    getPaperById: vi.fn(),
    updatePaper: vi.fn(),
    getAllPapers: vi.fn()
}));

vi.mock('../../ui.js', () => ({
    escapeHtml: (str) => str,
    showToast: vi.fn()
}));

vi.mock('../../views/index.js', () => ({
    views: {
        linkModal: `
            <div id="link-modal" class="hidden">
                <div id="link-modal-list"></div>
                <input id="link-search-input" />
                <button id="close-link-modal-btn">Close</button>
            </div>
        `
    }
}));

vi.mock('../../db/sync.js', () => ({
    performIncrementalSync: vi.fn().mockResolvedValue(true)
}));

vi.mock('../../config.js', () => ({
    isCloudSyncEnabled: vi.fn().mockReturnValue(false)
}));

describe('Related Papers Manager', () => {
    let listContainer;
    let addBtn;

    beforeEach(() => {
        document.body.innerHTML = `
            <div id="related-papers-list"></div>
            <button id="add-related-paper-btn">Add</button>
        `;
        listContainer = document.getElementById('related-papers-list');
        addBtn = document.getElementById('add-related-paper-btn');

        // Reset mocks
        vi.clearAllMocks();
    });

    afterEach(() => {
        relatedManager.cleanup();
        document.body.innerHTML = '';
    });

    describe('initialize', () => {
        it('should set paperId and elements', async () => {
            const paperId = 1;
            const elements = { list: listContainer, addBtn };

            db.getPaperById.mockResolvedValue({ id: 1, relatedPaperIds: [] });

            await relatedManager.initialize(paperId, elements);

            expect(relatedManager.paperId).toBe(paperId);
            expect(relatedManager.elements).toEqual(elements);
            expect(db.getPaperById).toHaveBeenCalledWith(paperId);
        });
    });

    describe('renderRelatedPapers', () => {
        it('should show message when no related papers', async () => {
            db.getPaperById.mockResolvedValue({ id: 1, relatedPaperIds: [] });

            await relatedManager.initialize(1, { list: listContainer });
            await relatedManager.renderRelatedPapers();

            expect(listContainer.innerHTML).toContain('No related papers linked');
        });

        it('should render list of related papers', async () => {
            const paper = { id: 1, relatedPaperIds: [2, 3] };
            const related1 = { id: 2, title: 'Related Paper A' };
            const related2 = { id: 3, title: 'Related Paper B' };

            db.getPaperById.mockImplementation((id) => {
                if (id === 1) return Promise.resolve(paper);
                if (id === 2) return Promise.resolve(related1);
                if (id === 3) return Promise.resolve(related2);
                return Promise.resolve(null);
            });

            await relatedManager.initialize(1, { list: listContainer });
            await relatedManager.renderRelatedPapers();

            expect(listContainer.innerHTML).toContain('Related Paper A');
            expect(listContainer.innerHTML).toContain('Related Paper B');
            expect(listContainer.querySelectorAll('.remove-link-btn').length).toBe(2);
        });
        it('should handle null relatedPaperIds', async () => {
            const paper = { id: 1, relatedPaperIds: null };
            db.getPaperById.mockResolvedValue(paper);

            await relatedManager.initialize(1, { list: listContainer });
            await relatedManager.renderRelatedPapers();

            expect(listContainer.innerHTML).toContain('No related papers linked');
        });

        it('should handle missing list element', async () => {
            const paper = { id: 1, relatedPaperIds: [2] };
            db.getPaperById.mockResolvedValue(paper);

            // Initialize without list element
            await relatedManager.initialize(1, {});
            await relatedManager.renderRelatedPapers();

            // Should not throw error
            expect(true).toBe(true);
        });
    });

    describe('openAddLinkModal', () => {
        it('should inject modal into DOM', async () => {
            const paper = { id: 1, relatedPaperIds: [] };
            db.getPaperById.mockResolvedValue(paper);
            db.getAllPapers.mockResolvedValue([paper, { id: 2, title: 'Other Paper' }]);

            await relatedManager.openAddLinkModal(1);

            const modal = document.getElementById('link-modal');
            expect(modal).toBeTruthy();
            expect(modal.classList.contains('hidden')).toBe(false);
        });

        it('should list linkable papers', async () => {
            const currentPaper = { id: 1, relatedPaperIds: [] };
            const otherPaper = { id: 2, title: 'Linkable Paper' };
            const alreadyLinked = { id: 3, title: 'Already Linked' };

            currentPaper.relatedPaperIds = [3];

            db.getPaperById.mockResolvedValue(currentPaper);
            db.getAllPapers.mockResolvedValue([currentPaper, otherPaper, alreadyLinked]);

            await relatedManager.openAddLinkModal(1);

            const modalList = document.getElementById('link-modal-list');
            expect(modalList.innerHTML).toContain('Linkable Paper');
            expect(modalList.innerHTML).not.toContain('Already Linked');
        });
        it('should handle empty linkable papers list', async () => {
            const currentPaper = { id: 1, relatedPaperIds: [] };
            db.getPaperById.mockResolvedValue(currentPaper);
            db.getAllPapers.mockResolvedValue([currentPaper]); // Only current paper exists

            await relatedManager.openAddLinkModal(1);

            const modalList = document.getElementById('link-modal-list');
            expect(modalList.innerHTML).toContain('No other papers available to link');
        });

        it('should filter papers by search term', async () => {
            const currentPaper = { id: 1, relatedPaperIds: [] };
            const paperA = { id: 2, title: 'Alpha Paper' };
            const paperB = { id: 3, title: 'Beta Paper' };

            db.getPaperById.mockResolvedValue(currentPaper);
            db.getAllPapers.mockResolvedValue([currentPaper, paperA, paperB]);

            await relatedManager.openAddLinkModal(1);

            const searchInput = document.getElementById('link-search-input');
            const modalList = document.getElementById('link-modal-list');

            // Simulate search input
            searchInput.value = 'beta';
            searchInput.dispatchEvent(new Event('input'));

            expect(modalList.innerHTML).toContain('Beta Paper');
            expect(modalList.innerHTML).not.toContain('Alpha Paper');
        });
    });

    describe('Linking Logic', () => {
        it('should link papers bidirectionally', async () => {
            const paper1 = { id: 1, relatedPaperIds: [] };
            const paper2 = { id: 2, relatedPaperIds: [] };

            db.getPaperById.mockImplementation((id) => {
                if (id === 1) return Promise.resolve(paper1);
                if (id === 2) return Promise.resolve(paper2);
            });
            db.getAllPapers.mockResolvedValue([paper1, paper2]);
            db.updatePaper.mockResolvedValue(true);

            await relatedManager.openAddLinkModal(1);

            // Simulate clicking link button
            const modalList = document.getElementById('link-modal-list');
            const linkBtn = modalList.querySelector('.link-paper-btn');

            // Manually trigger the click handler logic since we can't easily access the internal handler function
            // But we can simulate the event if the listener was attached correctly
            linkBtn.click();

            // Wait for async operations
            await new Promise(resolve => setTimeout(resolve, 0));

            expect(db.updatePaper).toHaveBeenCalledTimes(2);
            expect(db.updatePaper).toHaveBeenCalledWith(1, { relatedPaperIds: [2] });
            expect(db.updatePaper).toHaveBeenCalledWith(2, { relatedPaperIds: [1] });
            expect(ui.showToast).toHaveBeenCalledWith('Papers linked successfully!');
        });

        it('should handle sync errors gracefully', async () => {
            const paper1 = { id: 1, relatedPaperIds: [] };
            const paper2 = { id: 2, relatedPaperIds: [] };

            db.getPaperById.mockImplementation((id) => {
                if (id === 1) return Promise.resolve(paper1);
                if (id === 2) return Promise.resolve(paper2);
            });
            db.getAllPapers.mockResolvedValue([paper1, paper2]);
            db.updatePaper.mockResolvedValue(true);

            config.isCloudSyncEnabled.mockReturnValue(true);
            sync.performIncrementalSync.mockRejectedValue(new Error('Sync failed'));

            // Spy on console.warn to verify error logging
            const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => { });

            await relatedManager.openAddLinkModal(1);

            const modalList = document.getElementById('link-modal-list');
            const linkBtn = modalList.querySelector('.link-paper-btn');
            linkBtn.click();

            await new Promise(resolve => setTimeout(resolve, 0));

            expect(sync.performIncrementalSync).toHaveBeenCalled();
            expect(consoleSpy).toHaveBeenCalledWith('Background sync failed after linking papers:', expect.any(Error));

            consoleSpy.mockRestore();
        });
    });

    describe('Unlinking Logic', () => {
        it('should remove links bidirectionally', async () => {
            const paper1 = { id: 1, relatedPaperIds: [2] };
            const paper2 = { id: 2, relatedPaperIds: [1] };

            db.getPaperById.mockImplementation((id) => {
                if (id === 1) return Promise.resolve(paper1);
                if (id === 2) return Promise.resolve(paper2);
            });

            await relatedManager.initialize(1, { list: listContainer });
            await relatedManager.renderRelatedPapers();

            const removeBtn = listContainer.querySelector('.remove-link-btn');
            removeBtn.click();

            // Wait for async operations
            await new Promise(resolve => setTimeout(resolve, 0));

            expect(db.updatePaper).toHaveBeenCalledTimes(2);
            expect(db.updatePaper).toHaveBeenCalledWith(1, { relatedPaperIds: [] });
            expect(db.updatePaper).toHaveBeenCalledWith(2, { relatedPaperIds: [] });
            expect(ui.showToast).toHaveBeenCalledWith('Paper link removed.');
        });
    });
});
