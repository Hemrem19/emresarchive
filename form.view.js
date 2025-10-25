import { getPaperById, addPaper, updatePaper } from '../db.js';
import { showToast } from '../ui.js';
import { fetchDoiMetadata } from '../api.js';

export const formView = {
    isEditMode: false,
    paperId: null,
    formSubmitHandler: null,
    formInputHandler: null,

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
    },

    unmount(appState) {
        const form = document.getElementById('add-paper-form');
        if (form) {
            form.removeEventListener('submit', this.formSubmitHandler);
            form.removeEventListener('input', this.formInputHandler);
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
            const doi = document.getElementById('doi').value;
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
    }
};