import { getAllPapers, getPaperById, addPaper, deletePaper, updatePaper, getPaperByDoi, getAllCollections, addCollection, updateCollection, deleteCollection } from './db.js';
import { renderSidebarTags, renderSidebarCollections, showToast } from './ui.js';
import { fetchDoiMetadata } from './api.js';
import { generateBibliography, exportBibliographyToFile, copyBibliographyToClipboard } from './citation.js';
import { views as templates } from './views.js';
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
    saveCollectionHandler: null,
    collectionItemClickHandler: null,
    editCollectionClickHandler: null,

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
        try {
            appState.allPapersCache = await getAllPapers();
            renderSidebarTags(appState.allPapersCache);
        } catch (error) {
            console.error('Error loading papers:', error);
            showToast(error.message || 'Failed to load papers. Please refresh the page.', 'error', {
                duration: 0, // Persistent toast
                actions: [{
                    label: 'Refresh',
                    onClick: () => window.location.reload()
                }]
            });
            appState.allPapersCache = [];
            return; // Early exit if papers can't be loaded
        }

        // Load and render collections
        try {
            appState.collectionsCache = await getAllCollections();
            renderSidebarCollections(appState.collectionsCache);
        } catch (error) {
            console.error('Error loading collections:', error);
            showToast('Failed to load collections. Some features may be unavailable.', 'warning', { duration: 5000 });
            appState.collectionsCache = [];
        }

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
                    try {
                        const existingPaper = await getPaperByDoi(doiValue);
                        if (existingPaper) {
                            showToast(`Paper with this DOI already exists: "${existingPaper.title}"`, 'error', { duration: 5000 });
                            return;
                        }
                    } catch (duplicateError) {
                        console.error('Error checking for duplicate:', duplicateError);
                        // Continue with add if duplicate check fails
                    }

                    showToast('Fetching metadata...', 'info', { duration: 10000 });
                    const metadata = await fetchDoiMetadata(doiValue);
                    const paperData = {
                        ...metadata,
                        tags: [], createdAt: new Date(), readingStatus: 'To Read',
                        hasPdf: false, pdfFile: null, notes: ''
                    };
                    const newPaperId = await addPaper(paperData);
                    const newPaper = await getPaperById(newPaperId);
                    appState.allPapersCache.unshift(newPaper);
                    showToast('Paper added successfully!', 'success');
                    doiInput.value = '';
                    applyFiltersAndRender();
                } catch (error) {
                    console.error('Quick add error:', error);
                    // Show user-friendly error message
                    showToast(error.message || 'Failed to add paper from DOI. Please try again.', 'error', {
                        duration: 5000,
                        actions: [{
                            label: 'Retry',
                            onClick: () => quickAddForm.requestSubmit()
                        }]
                    });
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
                    showToast(`Updating ${selectedIds.length} paper(s)...`, 'info', { duration: 10000 });

                    let successCount = 0;
                    let errorCount = 0;

                    for (const paperId of selectedIds) {
                        try {
                            await updatePaper(paperId, { readingStatus: newStatus });
                            const paperIndex = appState.allPapersCache.findIndex(p => p.id === paperId);
                            if (paperIndex > -1) {
                                appState.allPapersCache[paperIndex].readingStatus = newStatus;
                            }
                            successCount++;
                        } catch (paperError) {
                            console.error(`Error updating paper ${paperId}:`, paperError);
                            errorCount++;
                        }
                    }

                    if (successCount > 0) {
                        showToast(`Updated ${successCount} paper(s) to "${newStatus}"${errorCount > 0 ? ` (${errorCount} failed)` : ''}.`, 
                            errorCount > 0 ? 'warning' : 'success');
                    } else {
                        showToast('Failed to update any papers. Please try again.', 'error');
                    }
                    
                    e.target.value = ''; // Reset select
                    applyFiltersAndRender();
                } catch (error) {
                    console.error('Batch status update error:', error);
                    showToast(error.message || 'Error updating status. Please try again.', 'error');
                }
            };
            batchStatusSelect.addEventListener('change', this.batchStatusChangeHandler);
        }

        // Batch Add Tags handler (uses shared batch-tags-input)
        const batchAddTagsBtn = document.getElementById('batch-add-tags-btn');
        if (batchAddTagsBtn) {
            this.batchAddTagsHandler = async () => {
                const input = document.getElementById('batch-tags-input');
                if (!input || !input.value.trim() || appState.selectedPaperIds.size === 0) return;

                const tagsToAdd = input.value.split(',').map(t => t.trim()).filter(t => t);
                if (tagsToAdd.length === 0) return;

                try {
                    const selectedIds = Array.from(appState.selectedPaperIds);
                    showToast(`Adding tags to ${selectedIds.length} paper(s)...`, 'info', { duration: 10000 });

                    for (const paperId of selectedIds) {
                        const paper = appState.allPapersCache.find(p => p.id === paperId);
                        if (paper) {
                            const currentTags = paper.tags || [];
                            const updatedTags = [...new Set([...currentTags, ...tagsToAdd])];
                            await updatePaper(paperId, { tags: updatedTags });
                            paper.tags = updatedTags;
                        }
                    }

                    showToast(`Added tags to ${selectedIds.length} paper(s).`, 'success');
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

        // Batch Remove Tags handler (uses shared batch-tags-input)
        const batchRemoveTagsBtn = document.getElementById('batch-remove-tags-btn');
        if (batchRemoveTagsBtn) {
            this.batchRemoveTagsHandler = async () => {
                const input = document.getElementById('batch-tags-input');
                if (!input || !input.value.trim() || appState.selectedPaperIds.size === 0) return;

                const tagsToRemove = input.value.split(',').map(t => t.trim()).filter(t => t);
                if (tagsToRemove.length === 0) return;

                try {
                    const selectedIds = Array.from(appState.selectedPaperIds);
                    showToast(`Removing tags from ${selectedIds.length} paper(s)...`, 'info', { duration: 10000 });

                    for (const paperId of selectedIds) {
                        const paper = appState.allPapersCache.find(p => p.id === paperId);
                        if (paper) {
                            const updatedTags = (paper.tags || []).filter(t => !tagsToRemove.includes(t));
                            await updatePaper(paperId, { tags: updatedTags });
                            paper.tags = updatedTags;
                        }
                    }

                    showToast(`Removed tags from ${selectedIds.length} paper(s).`, 'success');
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
                    showToast(`Deleting ${count} paper(s)...`, 'info', { duration: 10000 });

                    let successCount = 0;
                    let errorCount = 0;
                    const successfulDeletes = [];

                    for (const paperId of selectedIds) {
                        try {
                            await deletePaper(paperId);
                            successfulDeletes.push(paperId);
                            successCount++;
                        } catch (paperError) {
                            console.error(`Error deleting paper ${paperId}:`, paperError);
                            errorCount++;
                        }
                    }

                    // Remove successfully deleted papers from cache
                    appState.allPapersCache = appState.allPapersCache.filter(p => !successfulDeletes.includes(p.id));
                    appState.selectedPaperIds.clear();
                    
                    if (successCount > 0) {
                        showToast(`Deleted ${successCount} paper(s)${errorCount > 0 ? ` (${errorCount} failed)` : ''}.`, 
                            errorCount > 0 ? 'warning' : 'success');
                    } else {
                        showToast('Failed to delete any papers. Please try again.', 'error');
                    }
                    
                    renderSidebarTags(appState.allPapersCache); // Update sidebar tags
                    this.updateBatchToolbar(appState);
                    applyFiltersAndRender();
                } catch (error) {
                    console.error('Batch delete error:', error);
                    showToast(error.message || 'Error deleting papers. Please try again.', 'error');
                }
            };
            batchDeleteBtn.addEventListener('click', this.batchDeleteHandler);
        }

        // Export Bibliography handler
        const batchExportBibliographyBtn = document.getElementById('batch-export-bibliography-btn');
        if (batchExportBibliographyBtn) {
            this.batchExportBibliographyHandler = async () => {
                if (appState.selectedPaperIds.size === 0) {
                    showToast('Please select papers to export.', 'warning');
                    return;
                }

                try {
                    // Get selected papers
                    const selectedIds = Array.from(appState.selectedPaperIds);
                    const selectedPapers = appState.allPapersCache.filter(p => selectedIds.includes(p.id));
                    
                    if (selectedPapers.length === 0) {
                        showToast('No papers found for export.', 'error');
                        return;
                    }

                    // Inject modal HTML
                    if (document.getElementById('bibliography-export-modal')) {
                        document.getElementById('bibliography-export-modal').remove();
                    }
                    document.body.insertAdjacentHTML('beforeend', templates.bibliographyExportModal);
                    
                    const modal = document.getElementById('bibliography-export-modal');
                    const closeBtn = document.getElementById('close-bibliography-modal-btn');
                    const formatSelect = document.getElementById('bibliography-format-select');
                    const styleSelect = document.getElementById('bibliography-style-select');
                    const previewDiv = document.getElementById('bibliography-preview');
                    const copyBtn = document.getElementById('bibliography-copy-btn');
                    const downloadBtn = document.getElementById('bibliography-download-btn');

                    // Function to update preview
                    const updatePreview = () => {
                        const format = formatSelect.value;
                        const style = styleSelect.value;
                        const bibliography = generateBibliography(selectedPapers, format, style);
                        previewDiv.textContent = bibliography || 'No bibliography generated.';
                    };

                    // Initial preview
                    updatePreview();

                    // Update preview on format/style change
                    formatSelect.addEventListener('change', updatePreview);
                    styleSelect.addEventListener('change', updatePreview);

                    // Copy to clipboard
                    copyBtn.addEventListener('click', async () => {
                        const format = formatSelect.value;
                        const style = styleSelect.value;
                        const bibliography = generateBibliography(selectedPapers, format, style);
                        const success = await copyBibliographyToClipboard(bibliography);
                        if (success) {
                            showToast(`Bibliography copied to clipboard! (${selectedPapers.length} papers)`, 'success');
                        } else {
                            showToast('Failed to copy to clipboard. Please try again.', 'error');
                        }
                    });

                    // Download file
                    downloadBtn.addEventListener('click', () => {
                        const format = formatSelect.value;
                        const style = styleSelect.value;
                        const bibliography = generateBibliography(selectedPapers, format, style);
                        exportBibliographyToFile(bibliography, format);
                        showToast(`Bibliography downloaded! (${selectedPapers.length} papers)`, 'success');
                    });

                    // Close modal handlers
                    const closeModal = () => {
                        modal.classList.add('hidden');
                        setTimeout(() => modal.remove(), 300);
                    };

                    closeBtn.addEventListener('click', closeModal);
                    modal.addEventListener('click', (e) => {
                        if (e.target === modal) closeModal();
                    });

                    // Show modal
                    modal.classList.remove('hidden');
                } catch (error) {
                    console.error('Export bibliography error:', error);
                    showToast(error.message || 'Error exporting bibliography. Please try again.', 'error');
                }
            };
            batchExportBibliographyBtn.addEventListener('click', this.batchExportBibliographyHandler);
        }

        const paperListContainer = document.getElementById('paper-list');
        if (paperListContainer) {
            this.paperListClickHandler = async (e) => {
                // Handle expand notes button clicks
                const expandBtn = e.target.closest('.expand-notes-btn');
                if (expandBtn) {
                    e.preventDefault();
                    e.stopPropagation();
                    const paperCard = expandBtn.closest('.paper-card');
                    if (!paperCard) return;
                    
                    const paperId = parseInt(expandBtn.dataset.paperId, 10);
                    const notesSection = paperCard.querySelector(`.notes-expandable-section[data-paper-id="${paperId}"]`);
                    const expandIcon = expandBtn.querySelector('.expand-icon');
                    
                    if (notesSection && expandIcon) {
                        const isHidden = notesSection.classList.contains('hidden');
                        if (isHidden) {
                            notesSection.classList.remove('hidden');
                            expandIcon.textContent = 'expand_less';
                        } else {
                            notesSection.classList.add('hidden');
                            expandIcon.textContent = 'expand_more';
                        }
                    }
                    return;
                }

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

        // Search mode toggle handlers (both desktop and mobile)
        const searchModeAllBtn = document.getElementById('search-mode-all');
        const searchModeNotesBtn = document.getElementById('search-mode-notes');
        const searchModeAllBtnMobile = document.getElementById('search-mode-all-mobile');
        const searchModeNotesBtnMobile = document.getElementById('search-mode-notes-mobile');
        
        // Update button states based on current mode
        const updateSearchModeButtons = () => {
            const allButtons = [searchModeAllBtn, searchModeAllBtnMobile].filter(Boolean);
            const notesButtons = [searchModeNotesBtn, searchModeNotesBtnMobile].filter(Boolean);
            
            if (appState.searchMode === 'all') {
                allButtons.forEach(btn => {
                    btn.classList.add('bg-white', 'dark:bg-stone-700', 'text-primary', 'shadow-sm');
                    btn.classList.remove('text-stone-600', 'dark:text-stone-400');
                });
                notesButtons.forEach(btn => {
                    btn.classList.remove('bg-white', 'dark:bg-stone-700', 'text-primary', 'shadow-sm');
                    btn.classList.add('text-stone-600', 'dark:text-stone-400');
                });
            } else {
                notesButtons.forEach(btn => {
                    btn.classList.add('bg-white', 'dark:bg-stone-700', 'text-primary', 'shadow-sm');
                    btn.classList.remove('text-stone-600', 'dark:text-stone-400');
                });
                allButtons.forEach(btn => {
                    btn.classList.remove('bg-white', 'dark:bg-stone-700', 'text-primary', 'shadow-sm');
                    btn.classList.add('text-stone-600', 'dark:text-stone-400');
                });
            }
        };

        updateSearchModeButtons();

        const handleSearchModeAll = () => {
            appState.searchMode = 'all';
            localStorage.setItem('searchMode', 'all');
            updateSearchModeButtons();
            if (appState.currentSearchTerm) {
                applyFiltersAndRender();
            }
        };

        const handleSearchModeNotes = () => {
            appState.searchMode = 'notes';
            localStorage.setItem('searchMode', 'notes');
            updateSearchModeButtons();
            if (appState.currentSearchTerm) {
                applyFiltersAndRender();
            }
        };

        if (searchModeAllBtn) {
            this.searchModeAllHandler = handleSearchModeAll;
            searchModeAllBtn.addEventListener('click', this.searchModeAllHandler);
        }

        if (searchModeNotesBtn) {
            this.searchModeNotesHandler = handleSearchModeNotes;
            searchModeNotesBtn.addEventListener('click', this.searchModeNotesHandler);
        }

        if (searchModeAllBtnMobile) {
            this.searchModeAllHandlerMobile = handleSearchModeAll;
            searchModeAllBtnMobile.addEventListener('click', this.searchModeAllHandlerMobile);
        }

        if (searchModeNotesBtnMobile) {
            this.searchModeNotesHandlerMobile = handleSearchModeNotes;
            searchModeNotesBtnMobile.addEventListener('click', this.searchModeNotesHandlerMobile);
        }

        // Collection event handlers using event delegation
        const handleCollectionEvents = async (e) => {
            // Handle save collection button
            const saveCollectionBtn = e.target.closest('#save-collection-btn');
            if (saveCollectionBtn) {
                e.preventDefault();
                await this.handleSaveCollection(appState, applyFiltersAndRender);
                return;
            }

            // Handle collection item click (apply collection)
            const collectionItem = e.target.closest('.collection-item');
            if (collectionItem && !e.target.closest('.edit-collection-btn')) {
                e.preventDefault();
                const collectionId = parseInt(collectionItem.dataset.collectionId, 10);
                await this.handleApplyCollection(collectionId, appState, applyFiltersAndRender);
                return;
            }

            // Handle edit collection button
            const editCollectionBtn = e.target.closest('.edit-collection-btn');
            if (editCollectionBtn) {
                e.stopPropagation();
                e.preventDefault();
                const collectionId = parseInt(editCollectionBtn.dataset.collectionId, 10);
                await this.handleEditCollection(collectionId, appState, applyFiltersAndRender);
                return;
            }
        };

        // Add event listener to both desktop and mobile sidebars
        const desktopSidebar = document.getElementById('sidebar-collections-section');
        const mobileSidebar = document.getElementById('mobile-sidebar-collections-section');
        
        if (desktopSidebar) {
            this.collectionItemClickHandler = handleCollectionEvents;
            desktopSidebar.addEventListener('click', this.collectionItemClickHandler);
        }
        
        if (mobileSidebar) {
            this.saveCollectionHandler = handleCollectionEvents;
            mobileSidebar.addEventListener('click', this.saveCollectionHandler);
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

        const batchExportBibliographyBtn = document.getElementById('batch-export-bibliography-btn');
        if (batchExportBibliographyBtn && this.batchExportBibliographyHandler) {
            batchExportBibliographyBtn.removeEventListener('click', this.batchExportBibliographyHandler);
        }

        // Remove bibliography modal if it exists
        const bibliographyModal = document.getElementById('bibliography-export-modal');
        if (bibliographyModal) {
            bibliographyModal.remove();
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

        const searchModeAllBtnMobile = document.getElementById('search-mode-all-mobile');
        if (searchModeAllBtnMobile && this.searchModeAllHandlerMobile) {
            searchModeAllBtnMobile.removeEventListener('click', this.searchModeAllHandlerMobile);
        }

        const searchModeNotesBtnMobile = document.getElementById('search-mode-notes-mobile');
        if (searchModeNotesBtnMobile && this.searchModeNotesHandlerMobile) {
            searchModeNotesBtnMobile.removeEventListener('click', this.searchModeNotesHandlerMobile);
        }

        const paperListContainer = document.getElementById('paper-list');
        if (paperListContainer) {
            if (this.paperListClickHandler) paperListContainer.removeEventListener('click', this.paperListClickHandler);
            if (this.paperListChangeHandler) paperListContainer.removeEventListener('change', this.paperListChangeHandler);
        }

        // Cleanup collection event listeners
        const desktopSidebar = document.getElementById('sidebar-collections-section');
        if (desktopSidebar && this.collectionItemClickHandler) {
            desktopSidebar.removeEventListener('click', this.collectionItemClickHandler);
        }

        const mobileSidebar = document.getElementById('mobile-sidebar-collections-section');
        if (mobileSidebar && this.saveCollectionHandler) {
            mobileSidebar.removeEventListener('click', this.saveCollectionHandler);
        }

        console.log('Dashboard view unmounted.');
    },

    // Handle saving current filters as a new collection
    async handleSaveCollection(appState, applyFiltersAndRender) {
        // Get current filter state
        const currentFilters = {
            status: appState.activeFilters.status || '',
            tags: appState.activeFilters.tags || [], // Array of tags
            searchTerm: appState.currentSearchTerm || ''
        };

        // Check if any filters are active
        if (!currentFilters.status && (!currentFilters.tags || currentFilters.tags.length === 0) && !currentFilters.searchTerm) {
            showToast('No filters are currently active. Apply some filters first.', 'warning', { duration: 4000 });
            return;
        }

        // Prompt for collection name
        const collectionName = prompt('Enter a name for this collection:');
        if (!collectionName || !collectionName.trim()) {
            return; // User cancelled or entered empty name
        }

        try {
            const newCollection = {
                name: collectionName.trim(),
                icon: 'folder', // Default icon
                color: 'text-primary', // Default color
                filters: currentFilters,
                createdAt: new Date()
            };

            await addCollection(newCollection);
            
            // Refresh collections in sidebar
            appState.collectionsCache = await getAllCollections();
            renderSidebarCollections(appState.collectionsCache);
            
            showToast(`Collection "${collectionName.trim()}" saved successfully!`, 'success', { duration: 3000 });
        } catch (error) {
            console.error('Error saving collection:', error);
            showToast(error.message || 'Failed to save collection. Please try again.', 'error', { duration: 5000 });
        }
    },

    // Handle applying a saved collection (restore its filters)
    async handleApplyCollection(collectionId, appState, applyFiltersAndRender) {
        try {
            const collection = appState.collectionsCache.find(c => c.id === collectionId);
            if (!collection) {
                showToast('Collection not found.', 'error');
                return;
            }

            // Apply the saved filters
            appState.activeFilters.status = collection.filters.status || null;
            // Handle both old (single tag) and new (multiple tags) format for backward compatibility
            if (Array.isArray(collection.filters.tags)) {
                appState.activeFilters.tags = collection.filters.tags;
            } else if (collection.filters.tag) {
                // Legacy: single tag stored as string
                appState.activeFilters.tags = [collection.filters.tag];
            } else {
                appState.activeFilters.tags = [];
            }
            appState.currentSearchTerm = collection.filters.searchTerm || '';

            // Update search input if present
            const searchInput = document.getElementById('search-input');
            if (searchInput) {
                searchInput.value = appState.currentSearchTerm;
            }

            // Apply filters and render
            applyFiltersAndRender();
            
            showToast(`Applied collection: ${collection.name}`, 'success', { duration: 2000 });
        } catch (error) {
            console.error('Error applying collection:', error);
            showToast('Failed to apply collection. Please try again.', 'error');
        }
    },

    // Handle editing or deleting a collection
    async handleEditCollection(collectionId, appState, applyFiltersAndRender) {
        try {
            const collection = appState.collectionsCache.find(c => c.id === collectionId);
            if (!collection) {
                showToast('Collection not found.', 'error');
                return;
            }

            // Simple prompt-based edit for now (can be enhanced with a modal later)
            const action = confirm(`Edit collection "${collection.name}"?\n\nOK = Edit name\nCancel = Delete collection`);
            
            if (action) {
                // Edit collection name
                const newName = prompt('Enter new name for this collection:', collection.name);
                if (newName && newName.trim() && newName.trim() !== collection.name) {
                    await updateCollection(collectionId, { name: newName.trim() });
                    
                    // Refresh collections in sidebar
                    appState.collectionsCache = await getAllCollections();
                    renderSidebarCollections(appState.collectionsCache);
                    
                    showToast('Collection updated successfully!', 'success', { duration: 3000 });
                }
            } else {
                // Delete collection
                const confirmDelete = confirm(`Are you sure you want to delete "${collection.name}"?\n\nThis action cannot be undone.`);
                if (confirmDelete) {
                    await deleteCollection(collectionId);
                    
                    // Refresh collections in sidebar
                    appState.collectionsCache = await getAllCollections();
                    renderSidebarCollections(appState.collectionsCache);
                    
                    showToast('Collection deleted successfully!', 'success', { duration: 3000 });
                }
            }
        } catch (error) {
            console.error('Error editing/deleting collection:', error);
            showToast(error.message || 'Failed to update collection. Please try again.', 'error', { duration: 5000 });
        }
    }
};