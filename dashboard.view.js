import { getAllPapers, getPaperById, addPaper, deletePaper, updatePaper, getPaperByDoi } from './db.js';
import { renderSidebarTags, showToast } from './ui.js';
import { fetchDoiMetadata } from './api.js';
import { getStatusOrder } from './config.js';

export const dashboardView = {
    // Store handlers to be able to remove them in unmount
    sortChangeHandler: null,
    quickAddHandler: null,
    paperListClickHandler: null,
    paperListChangeHandler: null,
    selectAllChangeHandler: null,
    clearSelectionHandler: null,
    batchStatusChangeHandler: null,
    batchAddTagsHandler: null,
    batchRemoveTagsHandler: null,
    batchDeleteHandler: null,
    itemsPerPageChangeHandler: null,
    searchModeAllHandler: null,
    searchModeNotesHandler: null,

    // Helper function to update batch toolbar visibility and count
    updateBatchToolbar(appState) {
        const toolbar = document.getElementById('batch-action-toolbar');
        const countSpan = document.getElementById('selected-count');
        const selectAllCheckbox = document.getElementById('select-all-checkbox');
        
        if (toolbar && countSpan) {
            const count = appState.selectedPaperIds.size;
            if (count > 0) {
                toolbar.classList.remove('hidden');
                countSpan.textContent = `${count} selected`;
            } else {
                toolbar.classList.add('hidden');
            }
        }

        // Update select all checkbox state
        if (selectAllCheckbox) {
            const paperCheckboxes = document.querySelectorAll('.paper-checkbox');
            const allChecked = paperCheckboxes.length > 0 && 
                             Array.from(paperCheckboxes).every(cb => cb.checked);
            selectAllCheckbox.checked = allChecked;
        }
    },

    // Populate batch status select with current status options
    populateBatchStatusSelect() {
        const select = document.getElementById('batch-status-select');
        if (!select) return;
        
        const statusOrder = getStatusOrder();
        const optionsHtml = '<option value="">Select...</option>' +
            statusOrder.map(status => `<option value="${status}">${status}</option>`).join('');
        select.innerHTML = optionsHtml;
    },

    async mount(appState, applyFiltersAndRender) {
        appState.allPapersCache = await getAllPapers();
        renderSidebarTags(appState.allPapersCache);

        // Clear selections when mounting dashboard (e.g., when navigating back)
        appState.selectedPaperIds.clear();

        // Populate batch status select
        this.populateBatchStatusSelect();

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
                    // Check for duplicates before fetching
                    const existingPaper = await getPaperByDoi(doiValue);
                    if (existingPaper) {
                        showToast(`Paper with this DOI already exists: "${existingPaper.title}"`, 'error');
                        return;
                    }

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

        // Select All checkbox handler
        const selectAllCheckbox = document.getElementById('select-all-checkbox');
        if (selectAllCheckbox) {
            this.selectAllChangeHandler = (e) => {
                const isChecked = e.target.checked;
                const paperCheckboxes = document.querySelectorAll('.paper-checkbox');
                
                paperCheckboxes.forEach(checkbox => {
                    const paperId = parseInt(checkbox.dataset.paperId, 10);
                    checkbox.checked = isChecked;
                    if (isChecked) {
                        appState.selectedPaperIds.add(paperId);
                    } else {
                        appState.selectedPaperIds.delete(paperId);
                    }
                });
                
                this.updateBatchToolbar(appState);
                applyFiltersAndRender();
            };
            selectAllCheckbox.addEventListener('change', this.selectAllChangeHandler);
        }

        // Clear Selection button handler
        const clearSelectionBtn = document.getElementById('clear-selection-btn');
        if (clearSelectionBtn) {
            this.clearSelectionHandler = () => {
                appState.selectedPaperIds.clear();
                this.updateBatchToolbar(appState);
                applyFiltersAndRender();
            };
            clearSelectionBtn.addEventListener('click', this.clearSelectionHandler);
        }

        // Batch Status Change handler
        const batchStatusSelect = document.getElementById('batch-status-select');
        if (batchStatusSelect) {
            this.batchStatusChangeHandler = async (e) => {
                const newStatus = e.target.value;
                if (!newStatus || appState.selectedPaperIds.size === 0) return;

                try {
                    const selectedIds = Array.from(appState.selectedPaperIds);
                    showToast(`Updating ${selectedIds.length} paper(s)...`);

                    for (const paperId of selectedIds) {
                        await updatePaper(paperId, { readingStatus: newStatus });
                        const paperIndex = appState.allPapersCache.findIndex(p => p.id === paperId);
                        if (paperIndex > -1) {
                            appState.allPapersCache[paperIndex].readingStatus = newStatus;
                        }
                    }

                    showToast(`Updated status for ${selectedIds.length} paper(s).`);
                    e.target.value = ''; // Reset select
                    applyFiltersAndRender();
                } catch (error) {
                    showToast('Error updating status.', 'error');
                    console.error('Batch status update error:', error);
                }
            };
            batchStatusSelect.addEventListener('change', this.batchStatusChangeHandler);
        }

        // Batch Add Tags handler
        const batchAddTagsBtn = document.getElementById('batch-add-tags-btn');
        if (batchAddTagsBtn) {
            this.batchAddTagsHandler = async () => {
                const input = document.getElementById('batch-add-tags-input');
                if (!input || !input.value.trim() || appState.selectedPaperIds.size === 0) return;

                const tagsToAdd = input.value.split(',').map(t => t.trim()).filter(t => t);
                if (tagsToAdd.length === 0) return;

                try {
                    const selectedIds = Array.from(appState.selectedPaperIds);
                    showToast(`Adding tags to ${selectedIds.length} paper(s)...`);

                    for (const paperId of selectedIds) {
                        const paper = appState.allPapersCache.find(p => p.id === paperId);
                        if (paper) {
                            const currentTags = paper.tags || [];
                            const updatedTags = [...new Set([...currentTags, ...tagsToAdd])];
                            await updatePaper(paperId, { tags: updatedTags });
                            paper.tags = updatedTags;
                        }
                    }

                    showToast(`Added tags to ${selectedIds.length} paper(s).`);
                    input.value = ''; // Clear input
                    renderSidebarTags(appState.allPapersCache); // Update sidebar tags
                    applyFiltersAndRender();
                } catch (error) {
                    showToast('Error adding tags.', 'error');
                    console.error('Batch add tags error:', error);
                }
            };
            batchAddTagsBtn.addEventListener('click', this.batchAddTagsHandler);
        }

        // Batch Remove Tags handler
        const batchRemoveTagsBtn = document.getElementById('batch-remove-tags-btn');
        if (batchRemoveTagsBtn) {
            this.batchRemoveTagsHandler = async () => {
                const input = document.getElementById('batch-remove-tags-input');
                if (!input || !input.value.trim() || appState.selectedPaperIds.size === 0) return;

                const tagsToRemove = input.value.split(',').map(t => t.trim()).filter(t => t);
                if (tagsToRemove.length === 0) return;

                try {
                    const selectedIds = Array.from(appState.selectedPaperIds);
                    showToast(`Removing tags from ${selectedIds.length} paper(s)...`);

                    for (const paperId of selectedIds) {
                        const paper = appState.allPapersCache.find(p => p.id === paperId);
                        if (paper) {
                            const updatedTags = (paper.tags || []).filter(t => !tagsToRemove.includes(t));
                            await updatePaper(paperId, { tags: updatedTags });
                            paper.tags = updatedTags;
                        }
                    }

                    showToast(`Removed tags from ${selectedIds.length} paper(s).`);
                    input.value = ''; // Clear input
                    renderSidebarTags(appState.allPapersCache); // Update sidebar tags
                    applyFiltersAndRender();
                } catch (error) {
                    showToast('Error removing tags.', 'error');
                    console.error('Batch remove tags error:', error);
                }
            };
            batchRemoveTagsBtn.addEventListener('click', this.batchRemoveTagsHandler);
        }

        // Batch Delete handler
        const batchDeleteBtn = document.getElementById('batch-delete-btn');
        if (batchDeleteBtn) {
            this.batchDeleteHandler = async () => {
                if (appState.selectedPaperIds.size === 0) return;

                const count = appState.selectedPaperIds.size;
                if (!confirm(`Are you sure you want to delete ${count} paper(s)? This action cannot be undone.`)) {
                    return;
                }

                try {
                    const selectedIds = Array.from(appState.selectedPaperIds);
                    showToast(`Deleting ${count} paper(s)...`);

                    for (const paperId of selectedIds) {
                        await deletePaper(paperId);
                    }

                    appState.allPapersCache = appState.allPapersCache.filter(p => !selectedIds.includes(p.id));
                    appState.selectedPaperIds.clear();
                    
                    showToast(`Deleted ${count} paper(s) successfully.`);
                    renderSidebarTags(appState.allPapersCache); // Update sidebar tags
                    this.updateBatchToolbar(appState);
                    applyFiltersAndRender();
                } catch (error) {
                    showToast('Error deleting papers.', 'error');
                    console.error('Batch delete error:', error);
                }
            };
            batchDeleteBtn.addEventListener('click', this.batchDeleteHandler);
        }

        const paperListContainer = document.getElementById('paper-list');
        if (paperListContainer) {
            this.paperListClickHandler = async (e) => {
                // Handle checkbox clicks
                const checkbox = e.target.closest('.paper-checkbox');
                if (checkbox) {
                    const paperId = parseInt(checkbox.dataset.paperId, 10);
                    if (checkbox.checked) {
                        appState.selectedPaperIds.add(paperId);
                    } else {
                        appState.selectedPaperIds.delete(paperId);
                    }
                    this.updateBatchToolbar(appState);
                    applyFiltersAndRender();
                    return;
                }

                // Handle delete button clicks
                const deleteButton = e.target.closest('.delete-paper-btn');
                if (deleteButton) {
                    e.preventDefault();
                    const paperId = parseInt(deleteButton.dataset.id, 10);
                    if (confirm('Are you sure you want to delete this paper? This action cannot be undone.')) {
                        try {
                            await deletePaper(paperId);
                            appState.allPapersCache = appState.allPapersCache.filter(p => p.id !== paperId);
                            appState.selectedPaperIds.delete(paperId); // Remove from selection if was selected
                            showToast('Paper deleted successfully.');
                            this.updateBatchToolbar(appState);
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

        // Initial toolbar update
        this.updateBatchToolbar(appState);

        // Items per page selector handler
        const itemsPerPageSelect = document.getElementById('items-per-page');
        if (itemsPerPageSelect) {
            // Set initial value from appState
            itemsPerPageSelect.value = appState.pagination.itemsPerPage.toString();
            
            this.itemsPerPageChangeHandler = (e) => {
                const newItemsPerPage = parseInt(e.target.value, 10);
                appState.pagination.itemsPerPage = newItemsPerPage;
                appState.pagination.currentPage = 1; // Reset to first page
                localStorage.setItem('itemsPerPage', newItemsPerPage);
                applyFiltersAndRender();
            };
            itemsPerPageSelect.addEventListener('change', this.itemsPerPageChangeHandler);
        }

        // Search mode toggle handlers
        const searchModeAllBtn = document.getElementById('search-mode-all');
        const searchModeNotesBtn = document.getElementById('search-mode-notes');
        
        // Update button states based on current mode
        const updateSearchModeButtons = () => {
            if (searchModeAllBtn && searchModeNotesBtn) {
                if (appState.searchMode === 'all') {
                    searchModeAllBtn.classList.add('bg-white', 'dark:bg-stone-700', 'text-primary', 'shadow-sm');
                    searchModeAllBtn.classList.remove('text-stone-600', 'dark:text-stone-400');
                    searchModeNotesBtn.classList.remove('bg-white', 'dark:bg-stone-700', 'text-primary', 'shadow-sm');
                    searchModeNotesBtn.classList.add('text-stone-600', 'dark:text-stone-400');
                } else {
                    searchModeNotesBtn.classList.add('bg-white', 'dark:bg-stone-700', 'text-primary', 'shadow-sm');
                    searchModeNotesBtn.classList.remove('text-stone-600', 'dark:text-stone-400');
                    searchModeAllBtn.classList.remove('bg-white', 'dark:bg-stone-700', 'text-primary', 'shadow-sm');
                    searchModeAllBtn.classList.add('text-stone-600', 'dark:text-stone-400');
                }
            }
        };

        updateSearchModeButtons();

        if (searchModeAllBtn) {
            this.searchModeAllHandler = () => {
                appState.searchMode = 'all';
                localStorage.setItem('searchMode', 'all');
                updateSearchModeButtons();
                if (appState.currentSearchTerm) {
                    applyFiltersAndRender();
                }
            };
            searchModeAllBtn.addEventListener('click', this.searchModeAllHandler);
        }

        if (searchModeNotesBtn) {
            this.searchModeNotesHandler = () => {
                appState.searchMode = 'notes';
                localStorage.setItem('searchMode', 'notes');
                updateSearchModeButtons();
                if (appState.currentSearchTerm) {
                    applyFiltersAndRender();
                }
            };
            searchModeNotesBtn.addEventListener('click', this.searchModeNotesHandler);
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

        const selectAllCheckbox = document.getElementById('select-all-checkbox');
        if (selectAllCheckbox && this.selectAllChangeHandler) {
            selectAllCheckbox.removeEventListener('change', this.selectAllChangeHandler);
        }

        const clearSelectionBtn = document.getElementById('clear-selection-btn');
        if (clearSelectionBtn && this.clearSelectionHandler) {
            clearSelectionBtn.removeEventListener('click', this.clearSelectionHandler);
        }

        const batchStatusSelect = document.getElementById('batch-status-select');
        if (batchStatusSelect && this.batchStatusChangeHandler) {
            batchStatusSelect.removeEventListener('change', this.batchStatusChangeHandler);
        }

        const batchAddTagsBtn = document.getElementById('batch-add-tags-btn');
        if (batchAddTagsBtn && this.batchAddTagsHandler) {
            batchAddTagsBtn.removeEventListener('click', this.batchAddTagsHandler);
        }

        const batchRemoveTagsBtn = document.getElementById('batch-remove-tags-btn');
        if (batchRemoveTagsBtn && this.batchRemoveTagsHandler) {
            batchRemoveTagsBtn.removeEventListener('click', this.batchRemoveTagsHandler);
        }

        const batchDeleteBtn = document.getElementById('batch-delete-btn');
        if (batchDeleteBtn && this.batchDeleteHandler) {
            batchDeleteBtn.removeEventListener('click', this.batchDeleteHandler);
        }

        const itemsPerPageSelect = document.getElementById('items-per-page');
        if (itemsPerPageSelect && this.itemsPerPageChangeHandler) {
            itemsPerPageSelect.removeEventListener('change', this.itemsPerPageChangeHandler);
        }

        const searchModeAllBtn = document.getElementById('search-mode-all');
        if (searchModeAllBtn && this.searchModeAllHandler) {
            searchModeAllBtn.removeEventListener('click', this.searchModeAllHandler);
        }

        const searchModeNotesBtn = document.getElementById('search-mode-notes');
        if (searchModeNotesBtn && this.searchModeNotesHandler) {
            searchModeNotesBtn.removeEventListener('click', this.searchModeNotesHandler);
        }

        const paperListContainer = document.getElementById('paper-list');
        if (paperListContainer) {
            if (this.paperListClickHandler) paperListContainer.removeEventListener('click', this.paperListClickHandler);
            if (this.paperListChangeHandler) paperListContainer.removeEventListener('change', this.paperListChangeHandler);
        }

        console.log('Dashboard view unmounted.');
    }
};