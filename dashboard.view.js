import { getAllPapers, getPaperById, addPaper, deletePaper, updatePaper } from '/db.js';
import { renderSidebarTags, showToast } from '/ui.js';
import { fetchDoiMetadata } from '/api.js';

export const dashboardView = {
    // Store handlers to be able to remove them in unmount
    sortChangeHandler: null,
    quickAddHandler: null,
    paperListClickHandler: null,
    paperListChangeHandler: null,

    async mount(appState, applyFiltersAndRender) {
        appState.allPapersCache = await getAllPapers();
        renderSidebarTags(appState.allPapersCache);

        // Set search input value from persisted state
        const searchInput = document.getElementById('search-input');
        if (searchInput) {
            searchInput.value = appState.currentSearchTerm || '';
        }

        const sortSelect = document.getElementById('sort-select');
        if (sortSelect) {
            sortSelect.value = appState.currentSortBy;
            this.sortChangeHandler = (e) => {
                appState.currentSortBy = e.target.value;
                localStorage.setItem('currentSortBy', appState.currentSortBy);
                applyFiltersAndRender();
            };
            sortSelect.addEventListener('change', this.sortChangeHandler);
        }

        const quickAddForm = document.getElementById('quick-add-form');
        if (quickAddForm) {
            this.quickAddHandler = async (e) => {
                e.preventDefault();
                const doiInput = document.getElementById('quick-add-doi');
                const doiValue = doiInput.value.trim();
                if (!doiValue) return;

                try {
                    showToast('Fetching metadata...');
                    const metadata = await fetchDoiMetadata(doiValue);
                    const paperData = {
                        ...metadata,
                        tags: [], createdAt: new Date(), readingStatus: 'To Read',
                        hasPdf: false, pdfFile: null, notes: ''
                    };
                    const newPaperId = await addPaper(paperData);
                    const newPaper = await getPaperById(newPaperId);
                    appState.allPapersCache.unshift(newPaper);
                    showToast('Paper added successfully!');
                    doiInput.value = '';
                    applyFiltersAndRender();
                } catch (error) {
                    showToast('Failed to add paper from DOI.', 'error');
                    console.error('Quick add error:', error);
                }
            };
            quickAddForm.addEventListener('submit', this.quickAddHandler);
        }

        const paperListContainer = document.getElementById('paper-list');
        if (paperListContainer) {
            this.paperListClickHandler = async (e) => {
                const deleteButton = e.target.closest('.delete-paper-btn');
                if (deleteButton) {
                    e.preventDefault();
                    const paperId = parseInt(deleteButton.dataset.id, 10);
                    if (confirm('Are you sure you want to delete this paper? This action cannot be undone.')) {
                        try {
                            await deletePaper(paperId);
                            appState.allPapersCache = appState.allPapersCache.filter(p => p.id !== paperId);
                            showToast('Paper deleted successfully.');
                            applyFiltersAndRender();
                        } catch (error) {
                            showToast('Error deleting paper.', 'error');
                            console.error('Error deleting paper:', error);
                        }
                    }
                }
            };
            paperListContainer.addEventListener('click', this.paperListClickHandler);

            this.paperListChangeHandler = async (e) => {
                const statusSelect = e.target.closest('.reading-status-select');
                if (!statusSelect) return;
                const paperId = parseInt(statusSelect.dataset.id, 10);
                const newStatus = statusSelect.value;
                try {
                    await updatePaper(paperId, { readingStatus: newStatus });
                    const paperIndex = appState.allPapersCache.findIndex(p => p.id === paperId);
                    if (paperIndex > -1) {
                        appState.allPapersCache[paperIndex].readingStatus = newStatus;
                    }
                    applyFiltersAndRender();
                    showToast('Status updated.');
                } catch (error) {
                    showToast('Error updating status.', 'error');
                    console.error('Error updating reading status:', error);
                }
            };
            paperListContainer.addEventListener('change', this.paperListChangeHandler);
        }
    },

    unmount() {
        const sortSelect = document.getElementById('sort-select');
        if (sortSelect && this.sortChangeHandler) {
            sortSelect.removeEventListener('change', this.sortChangeHandler);
        }

        const quickAddForm = document.getElementById('quick-add-form');
        if (quickAddForm && this.quickAddHandler) {
            quickAddForm.removeEventListener('submit', this.quickAddHandler);
        }

        const paperListContainer = document.getElementById('paper-list');
        if (paperListContainer) {
            if (this.paperListClickHandler) paperListContainer.removeEventListener('click', this.paperListClickHandler);
            if (this.paperListChangeHandler) paperListContainer.removeEventListener('change', this.paperListChangeHandler);
        }

        console.log('Dashboard view unmounted.');
    }
};