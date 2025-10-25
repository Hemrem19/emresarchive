import { getPaperById, addPaper, updatePaper, getPaperByDoi } from './db.js';
import { showToast } from './ui.js';
import { fetchDoiMetadata } from './api.js';

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
                window.location.hash = '#/';
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
        // ... file upload logic from setupAddEditPaperForm
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
                    showToast('Metadata fetched successfully!');
                    appState.hasUnsavedChanges = true;
                } catch (error) {
                    showToast('Failed to fetch metadata.', 'error');
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

            if (pdfFile) {
                paperData.pdfFile = pdfFile;
                paperData.hasPdf = true;
            }

            try {
                if (this.isEditMode) {
                    await updatePaper(this.paperId, paperData);
                    appState.allPapersCache = appState.allPapersCache.map(p => p.id === this.paperId ? { ...p, ...paperData } : p);
                    showToast('Paper updated successfully!');
                } else {
                    // Check for duplicate DOI before adding a new paper
                    const existingPaper = await getPaperByDoi(paperData.doi);
                    if (existingPaper) {
                        showToast(`A paper with this DOI already exists: "${existingPaper.title}"`, 'error');
                        return; // Stop the submission
                    }

                    paperData.createdAt = new Date();
                    paperData.readingStatus = 'To Read';
                    if (!paperData.hasPdf) paperData.hasPdf = false;
                    await addPaper(paperData);
                    showToast('Paper added successfully!');
                }
                appState.hasUnsavedChanges = false;
                window.location.hash = '#/';
            } catch (error) {
                showToast('Failed to save paper.', 'error');
                console.error('Failed to save paper:', error);
            }
        };
        form.addEventListener('submit', this.formSubmitHandler);
    },

    setupTagSuggestions() {
        const titleInput = document.getElementById('title');
        const tagsInput = document.getElementById('tags');
        const suggestionsContainer = document.getElementById('tag-suggestions');

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

            const existingTags = new Set(tagsInput.value.split(',').map(t => t.trim().toLowerCase()));
            const filteredSuggestions = suggestions.filter(s => !existingTags.has(s));

            if (filteredSuggestions.length > 0) {
                suggestionsContainer.innerHTML = `<p class="text-xs text-stone-500 w-full mb-1">Suggestions:</p>`;
            }

            filteredSuggestions.forEach(suggestion => {
                const button = document.createElement('button');
                button.type = 'button';
                button.textContent = `+ ${suggestion}`;
                button.dataset.tag = suggestion;
                button.className = 'text-xs font-medium bg-stone-100 text-stone-700 dark:bg-stone-800 dark:text-stone-300 px-2 py-1 rounded-full hover:bg-primary/20 dark:hover:bg-primary/30 transition-colors';
                suggestionsContainer.appendChild(button);
            });
        };

        this.titleInputHandler = (e) => {
            const suggestions = generateSuggestions(e.target.value);
            renderSuggestions(suggestions);
        };

        titleInput.addEventListener('input', this.titleInputHandler);

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
    }
};