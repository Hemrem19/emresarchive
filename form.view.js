import { getPaperById, addPaper, updatePaper, getPaperByDoi } from './db.js';
import { showToast } from './ui.js';
import { fetchDoiMetadata } from './api.js';
import { isCloudSyncEnabled } from './config.js';
import { isAuthenticated } from './api/auth.js';
import { getUploadUrl, uploadPdf, uploadPdfViaBackend } from './api/papers.js';

export const formView = {
    isEditMode: false,
    paperId: null,
    formSubmitHandler: null,
    formInputHandler: null,
    titleInputHandler: null,

    async mount(paperId, appState) {
        this.paperId = paperId;
        this.isEditMode = paperId !== null;
        appState.hasUnsavedChanges = false; // Reset on mount

        const form = document.getElementById('add-paper-form');
        const formTitle = document.querySelector('#add-edit-paper-view h2');

        if (this.isEditMode) {
            const paper = await getPaperById(this.paperId);
            if (!paper) {
                window.location.hash = '#/app';
                return;
            }
            formTitle.textContent = 'Edit Paper';
            document.getElementById('title').value = paper.title || '';
            document.getElementById('authors').value = paper.authors ? paper.authors.join(', ') : '';
            document.getElementById('journal').value = paper.journal || '';
            document.getElementById('year').value = paper.year || '';
            document.getElementById('doi').value = paper.doi || '';
            document.getElementById('tags').value = paper.tags ? paper.tags.join(', ') : '';

            if (paper.journal || paper.year || paper.doi) {
                const advancedDetails = document.getElementById('advanced-details');
                if (advancedDetails) advancedDetails.open = true;
            }

            // Show existing PDF if present
            if (paper.pdfData) {
                const dropzone = document.getElementById('file-upload-dropzone');
                const filePreview = document.getElementById('file-preview');
                const fileName = document.getElementById('file-name');
                
                if (dropzone && filePreview && fileName) {
                    fileName.textContent = paper.title ? `${paper.title.substring(0, 50)}...pdf` : 'Existing PDF';
                    filePreview.classList.remove('hidden');
                    dropzone.classList.add('hidden');
                }
            }
        } else {
            formTitle.textContent = 'Add New Paper';
        }

        this.formInputHandler = () => { appState.hasUnsavedChanges = true; };
        form.addEventListener('input', this.formInputHandler);

        this.setupFileUpload();
        this.setupDoiFetch(appState);
        this.setupFormSubmit(appState);
        this.setupTagSuggestions();
    },

    unmount(appState) {
        const form = document.getElementById('add-paper-form');
        if (form) {
            form.removeEventListener('submit', this.formSubmitHandler);
            form.removeEventListener('input', this.formInputHandler);
        }
        const titleInput = document.getElementById('title');
        if (titleInput && this.titleInputHandler) {
            titleInput.removeEventListener('input', this.titleInputHandler);
        }
        // Clear any lingering suggestions, only if the element exists
        const suggestionsContainer = document.getElementById('tag-suggestions');
        if (suggestionsContainer) {
            suggestionsContainer.innerHTML = '';
        }
        appState.hasUnsavedChanges = false; // Ensure flag is cleared on unmount
        console.log('Form view unmounted.');
    },

    setupFileUpload() {
        const fileInput = document.getElementById('file-upload');
        const dropzone = document.getElementById('file-upload-dropzone');
        const filePreview = document.getElementById('file-preview');
        const fileName = document.getElementById('file-name');
        const removeFileBtn = document.getElementById('remove-file-btn');

        if (!fileInput || !dropzone || !filePreview || !fileName || !removeFileBtn) return;

        const handleFileSelect = (file) => {
            if (file && file.type === 'application/pdf') {
                if (file.size > 10 * 1024 * 1024) {
                    showToast('File size exceeds 10MB limit.', 'error');
                    return;
                }
                fileName.textContent = file.name;
                filePreview.classList.remove('hidden');
                dropzone.classList.add('hidden');
            } else {
                showToast('Please select a PDF file.', 'error');
            }
        };

        // Click to upload
        dropzone.addEventListener('click', () => {
            fileInput.click();
        });

        // File input change
        fileInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) handleFileSelect(file);
        });

        // Drag and drop
        dropzone.addEventListener('dragover', (e) => {
            e.preventDefault();
            dropzone.classList.add('border-blue-500/50', 'bg-blue-500/10');
        });

        dropzone.addEventListener('dragleave', (e) => {
            e.preventDefault();
            dropzone.classList.remove('border-blue-500/50', 'bg-blue-500/10');
        });

        dropzone.addEventListener('drop', (e) => {
            e.preventDefault();
            dropzone.classList.remove('border-primary', 'bg-primary/5');
            const file = e.dataTransfer.files[0];
            if (file) {
                // Manually set the file to the input for form submission
                const dataTransfer = new DataTransfer();
                dataTransfer.items.add(file);
                fileInput.files = dataTransfer.files;
                handleFileSelect(file);
            }
        });

        // Remove file
        removeFileBtn.addEventListener('click', () => {
            fileInput.value = '';
            filePreview.classList.add('hidden');
            dropzone.classList.remove('hidden');
        });
    },

    setupDoiFetch(appState) {
        const fetchDoiBtn = document.getElementById('fetch-doi-btn');
        if (fetchDoiBtn) {
            fetchDoiBtn.addEventListener('click', async () => {
                const doiInput = document.getElementById('doi');
                const doiValue = doiInput.value.trim();
                if (!doiValue) {
                    showToast('Please enter a DOI to fetch.', 'error');
                    return;
                }

                fetchDoiBtn.textContent = 'Fetching...';
                fetchDoiBtn.disabled = true;

                try {
                    const data = await fetchDoiMetadata(doiValue);
                    document.getElementById('title').value = data.title;
                    document.getElementById('authors').value = data.authors.join(', ');
                    document.getElementById('journal').value = data.journal;
                    document.getElementById('year').value = data.year || '';
                    doiInput.value = data.doi;
                    showToast('Metadata fetched successfully!', 'success');
                    appState.hasUnsavedChanges = true;
                } catch (error) {
                    console.error('DOI fetch error:', error);
                    // Show user-friendly error message from the API
                    showToast(error.message || 'Failed to fetch metadata. Please try again.', 'error', {
                        duration: 5000,
                        actions: [{
                            label: 'Retry',
                            onClick: () => fetchDoiBtn.click()
                        }]
                    });
                } finally {
                    fetchDoiBtn.textContent = 'Fetch';
                    fetchDoiBtn.disabled = false;
                }
            });
        }
    },

    setupFormSubmit(appState) {
        const form = document.getElementById('add-paper-form');
        this.formSubmitHandler = async (event) => {
            event.preventDefault();
            const title = document.getElementById('title').value.trim();
            const authors = document.getElementById('authors').value.split(',').map(a => a.trim()).filter(a => a);
            const journal = document.getElementById('journal').value;
            const year = parseInt(document.getElementById('year').value, 10);
            const doi = document.getElementById('doi').value.trim();
            const tags = document.getElementById('tags').value.split(',').map(t => t.trim()).filter(t => t);
            const fileInput = document.getElementById('file-upload');
            const pdfFile = fileInput.files.length > 0 ? fileInput.files[0] : null;

            const paperData = {
                title, authors, journal, doi, tags,
                year: isNaN(year) ? null : year,
            };

            // Handle PDF upload based on sync mode
            if (pdfFile) {
                const useCloudSync = isCloudSyncEnabled() && isAuthenticated();
                
                if (useCloudSync) {
                    // Cloud sync: Upload PDF to S3 via backend (avoids presigned URL signature issues)
                    try {
                        showToast('Uploading PDF to cloud...', 'info');
                        // Upload via backend server - avoids signature mismatch issues with presigned URLs
                        const { s3Key, pdfSizeBytes, filename } = await uploadPdfViaBackend(
                            pdfFile,
                            this.isEditMode ? this.paperId : null
                        );
                        
                        paperData.s3Key = s3Key;
                        paperData.pdfSizeBytes = pdfSizeBytes;
                        paperData.hasPdf = true;
                        showToast('PDF uploaded to cloud successfully!', 'success');
                    } catch (uploadError) {
                        console.error('PDF upload to S3 failed:', uploadError);
                        showToast('PDF upload failed, saving paper without PDF. You can add PDF later.', 'warning');
                        // Continue without PDF - user can add it later
                        paperData.hasPdf = false;
                    }
                } else {
                    // Local mode: Store PDF in IndexedDB
                    paperData.pdfData = pdfFile;
                    paperData.hasPdf = true;
                }
            }

            try {
                if (this.isEditMode) {
                    // Preserve existing fields that aren't in the form
                    const existingPaper = await getPaperById(this.paperId);
                    if (existingPaper) {
                        // Preserve PDF data
                        if (!pdfFile) {
                            if (existingPaper.pdfData) {
                                paperData.pdfData = existingPaper.pdfData;
                                paperData.hasPdf = true;
                            }
                            if (existingPaper.s3Key) {
                                paperData.s3Key = existingPaper.s3Key;
                                paperData.hasPdf = true;
                            }
                        }
                        // Preserve rating and summary (not in form, managed in details view)
                        if (existingPaper.rating !== undefined) {
                            paperData.rating = existingPaper.rating;
                        }
                        if (existingPaper.summary !== undefined) {
                            paperData.summary = existingPaper.summary;
                        }
                        // Preserve notes (not in form, managed in details view)
                        if (existingPaper.notes !== undefined) {
                            paperData.notes = existingPaper.notes;
                        }
                        // Preserve reading progress
                        if (existingPaper.readingProgress !== undefined) {
                            paperData.readingProgress = existingPaper.readingProgress;
                        }
                        // Preserve related papers
                        if (existingPaper.relatedPaperIds !== undefined) {
                            paperData.relatedPaperIds = existingPaper.relatedPaperIds;
                        }
                    }
                    await updatePaper(this.paperId, paperData);
                    appState.allPapersCache = appState.allPapersCache.map(p => p.id === this.paperId ? { ...p, ...paperData } : p);
                    showToast('Paper updated successfully!', 'success');
                } else {
                    // Check for duplicate DOI before adding a new paper
                    try {
                        const existingPaper = await getPaperByDoi(paperData.doi);
                        if (existingPaper) {
                            showToast(`A paper with this DOI already exists: "${existingPaper.title}"`, 'error', { duration: 5000 });
                            return; // Stop the submission
                        }
                    } catch (duplicateCheckError) {
                        console.error('Error checking for duplicate DOI:', duplicateCheckError);
                        // Continue with add if duplicate check fails
                    }

                    paperData.createdAt = new Date();
                    paperData.readingStatus = 'To Read';
                    if (!paperData.hasPdf) paperData.hasPdf = false;
                    await addPaper(paperData);
                    showToast('Paper added successfully!', 'success');
                }
                appState.hasUnsavedChanges = false;
                window.location.hash = '#/app';
            } catch (error) {
                console.error('Failed to save paper:', error);
                // Show user-friendly error message from database
                showToast(error.message || 'Failed to save paper. Please try again.', 'error', {
                    duration: 5000,
                    actions: [{
                        label: 'Retry',
                        onClick: () => form.requestSubmit()
                    }]
                });
            }
        };
        form.addEventListener('submit', this.formSubmitHandler);
    },

    setupTagSuggestions() {
        const titleInput = document.getElementById('title');
        const tagsInput = document.getElementById('tags');
        const suggestionsContainer = document.getElementById('tag-suggestions');

        if (!titleInput || !tagsInput || !suggestionsContainer) return;

        const STOP_WORDS = new Set(['a', 'an', 'the', 'and', 'or', 'in', 'on', 'of', 'for', 'to', 'with', 'by', 'as', 'is', 'are', 'was', 'were', 'from', 'about', 'using', 'based', 'via']);

        const generateSuggestions = (title) => {
            if (!title) return [];
            const words = title.toLowerCase().replace(/[^a-z0-9\s-]/g, '').split(/\s+/);
            const uniqueWords = [...new Set(words)];
            return uniqueWords.filter(word => word.length > 2 && !STOP_WORDS.has(word) && !/^\d+$/.test(word));
        };

        const renderSuggestions = (suggestions) => {
            suggestionsContainer.innerHTML = '';
            if (suggestions.length === 0) return;

            const existingTags = new Set(tagsInput.value.split(',').map(t => t.trim().toLowerCase()).filter(t => t));
            const filteredSuggestions = suggestions.filter(s => !existingTags.has(s));

            if (filteredSuggestions.length > 0) {
                suggestionsContainer.innerHTML = `<p class="text-xs text-slate-500 w-full mb-2 uppercase tracking-wide">Suggested tags from title:</p>`;
            }

            filteredSuggestions.forEach(suggestion => {
                const button = document.createElement('button');
                button.type = 'button';
                button.textContent = `+ ${suggestion}`;
                button.dataset.tag = suggestion;
                button.className = 'text-xs font-semibold bg-blue-500/10 border border-blue-500/30 text-blue-300 px-3 py-1.5 rounded-full hover:bg-blue-500/20 hover:text-blue-200 transition-colors';
                suggestionsContainer.appendChild(button);
            });
        };

        this.titleInputHandler = (e) => {
            const suggestions = generateSuggestions(e.target.value);
            renderSuggestions(suggestions);
        };

        // Listen to title input changes
        titleInput.addEventListener('input', this.titleInputHandler);

        // Also listen to tags input changes to update suggestions
        tagsInput.addEventListener('input', () => {
            const suggestions = generateSuggestions(titleInput.value);
            renderSuggestions(suggestions);
        });

        // Handle clicking on suggestion buttons
        suggestionsContainer.addEventListener('click', (e) => {
            const button = e.target.closest('button');
            if (!button || !button.dataset.tag) return;

            const tagToAdd = button.dataset.tag;
            const currentTags = tagsInput.value.trim();

            tagsInput.value = currentTags ? `${currentTags}, ${tagToAdd}` : tagToAdd;
            button.remove(); // Remove suggestion once used

            // Manually trigger input event to mark form as having unsaved changes
            tagsInput.dispatchEvent(new Event('input', { bubbles: true }));
        });

        // Show initial suggestions if title already has content (useful when editing)
        if (titleInput.value.trim()) {
            const initialSuggestions = generateSuggestions(titleInput.value);
            renderSuggestions(initialSuggestions);
        }
    }
};