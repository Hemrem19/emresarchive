import { getPaperById, updatePaper, getAllPapers } from '../db.js';
import { escapeHtml, showToast } from '../ui.js';
import { views as templates } from '../views/index.js';
import { performIncrementalSync } from '../db/sync.js';
import { isCloudSyncEnabled } from '../config.js';

export const relatedManager = {
    paperId: null,
    elements: {},
    closeModalHandler: null,

    async initialize(paperId, elements) {
        this.paperId = paperId;
        this.elements = elements;
        await this.renderRelatedPapers();
        this.setupEventListeners();
    },

    cleanup() {
        const modal = document.getElementById('link-modal');
        if (modal) {
            const closeModalBtn = document.getElementById('close-link-modal-btn');
            if (closeModalBtn && this.closeModalHandler) {
                closeModalBtn.removeEventListener('click', this.closeModalHandler);
                modal.removeEventListener('click', this.closeModalHandler);
            }
            modal.remove();
        }
        this.paperId = null;
        this.elements = {};
    },

    async renderRelatedPapers() {
        if (!this.elements.list) return;

        const currentPaper = await getPaperById(this.paperId);
        if (!this.elements.list) return; // Guard clause after async

        if (!currentPaper.relatedPaperIds || currentPaper.relatedPaperIds.length === 0) {
            this.elements.list.innerHTML = `<p class="text-sm text-stone-500">No related papers linked.</p>`;
            return;
        }
        const relatedPapers = await Promise.all(currentPaper.relatedPaperIds.map(id => getPaperById(id)));
        if (!this.elements.list) return; // Guard clause after async

        this.elements.list.innerHTML = relatedPapers
            .filter(p => p)
            .map(p => `
                <div class="flex justify-between items-center group -mx-1 px-1 py-0.5 rounded-md hover:bg-stone-100 dark:hover:bg-stone-800/50">
                    <a href="#/details/${p.id}" class="block text-sm text-primary hover:underline truncate pr-2">${escapeHtml(p.title)}</a>
                    <button class="remove-link-btn p-1 rounded-full text-red-500 opacity-0 group-hover:opacity-100 transition-opacity" data-remove-id="${p.id}" title="Remove link">
                        <span class="material-symbols-outlined text-base">link_off</span>
                    </button>
                </div>
            `).join('');
    },

    async openAddLinkModal(paperId) {
        if (document.getElementById('link-modal')) return;
        document.body.insertAdjacentHTML('beforeend', templates.linkModal);
        const modal = document.getElementById('link-modal');
        const modalList = document.getElementById('link-modal-list');
        const linkSearchInput = document.getElementById('link-search-input');
        const closeModalBtn = document.getElementById('close-link-modal-btn');
        modal.classList.remove('hidden');

        const allPapers = await getAllPapers();
        const currentPaper = await getPaperById(paperId);
        const papersToLink = allPapers.filter(p =>
            p.id !== currentPaper.id && !(currentPaper.relatedPaperIds || []).includes(p.id)
        );

        const renderLinkablePapers = (papers) => {
            if (papers.length === 0) {
                modalList.innerHTML = `<p class="text-sm text-stone-500">No other papers available to link.</p>`;
                return;
            }
            modalList.innerHTML = papers.map(p => `
                <div class="p-2 border-b dark:border-stone-800 flex justify-between items-center">
                    <span class="text-sm">${escapeHtml(p.title)}</span>
                    <button class="link-paper-btn text-sm text-primary hover:underline" data-link-id="${p.id}">Link</button>
                </div>
            `).join('');
        };
        renderLinkablePapers(papersToLink);

        const searchHandler = (e) => {
            const searchTerm = e.target.value.toLowerCase();
            const filtered = papersToLink.filter(p => p.title.toLowerCase().includes(searchTerm));
            renderLinkablePapers(filtered);
        };
        linkSearchInput.addEventListener('input', searchHandler);

        const linkHandler = async (e) => {
            if (e.target.classList.contains('link-paper-btn')) {
                const linkId = parseInt(e.target.dataset.linkId, 10);

                // Update both papers bidirectionally
                const freshPaper = await getPaperById(paperId);
                const linkedPaper = await getPaperById(linkId);

                // Add bidirectional links
                const newRelatedIds = [...(freshPaper.relatedPaperIds || []), linkId];
                const linkedPaperRelatedIds = [...(linkedPaper.relatedPaperIds || []), paperId];

                await updatePaper(paperId, { relatedPaperIds: newRelatedIds });
                await updatePaper(linkId, { relatedPaperIds: linkedPaperRelatedIds });

                // Trigger background cloud sync if enabled
                if (isCloudSyncEnabled()) {
                    performIncrementalSync().catch(err =>
                        console.warn('Background sync failed after linking papers:', err)
                    );
                }

                await this.renderRelatedPapers();
                closeModal();
                showToast('Papers linked successfully!');
            }
        };
        modalList.addEventListener('click', linkHandler);

        const closeModal = () => {
            const modalToRemove = document.getElementById('link-modal');
            if (modalToRemove) {
                linkSearchInput.removeEventListener('input', searchHandler);
                modalList.removeEventListener('click', linkHandler);
                closeModalBtn.removeEventListener('click', this.closeModalHandler);
                modalToRemove.removeEventListener('click', this.closeModalHandler);
                modalToRemove.remove();
            }
        };
        this.closeModalHandler = (e) => {
            if (e.target.id === 'close-link-modal-btn' || e.target.id === 'link-modal') {
                closeModal();
            }
        };
        closeModalBtn.addEventListener('click', this.closeModalHandler);
        modal.addEventListener('click', this.closeModalHandler);
    },

    setupEventListeners() {
        // Handle remove link button clicks
        if (this.elements.list) {
            this.elements.list.addEventListener('click', async (e) => {
                const removeBtn = e.target.closest('.remove-link-btn');
                if (removeBtn) {
                    e.preventDefault();
                    const idToRemove = parseInt(removeBtn.dataset.removeId, 10);

                    // Update both papers bidirectionally
                    const currentPaper = await getPaperById(this.paperId);
                    const linkedPaper = await getPaperById(idToRemove);

                    // Remove bidirectional links
                    const updatedRelatedIds = (currentPaper.relatedPaperIds || []).filter(id => id !== idToRemove);
                    const linkedPaperRelatedIds = (linkedPaper.relatedPaperIds || []).filter(id => id !== this.paperId);

                    await updatePaper(this.paperId, { relatedPaperIds: updatedRelatedIds });
                    await updatePaper(idToRemove, { relatedPaperIds: linkedPaperRelatedIds });

                    // Trigger background cloud sync if enabled
                    if (isCloudSyncEnabled()) {
                        performIncrementalSync().catch(err =>
                            console.warn('Background sync failed after unlinking papers:', err)
                        );
                    }

                    await this.renderRelatedPapers();
                    showToast('Paper link removed.');
                }
            });
        }

        // Handle Add Link button click
        if (this.elements.addBtn) {
            this.elements.addBtn.addEventListener('click', () => {
                this.openAddLinkModal(this.paperId);
            });
        }
    }
};
