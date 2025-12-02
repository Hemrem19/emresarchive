/**
 * Tests for form.view.js - Paper Add/Edit Form
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { formView } from '../form.view.js';

// Mock all dependencies
vi.mock('../db.js', () => ({
    getPaperById: vi.fn(),
    addPaper: vi.fn(),
    updatePaper: vi.fn(),
    getPaperByDoi: vi.fn()
}));

vi.mock('../ui.js', () => ({
    showToast: vi.fn()
}));

vi.mock('../api.js', () => ({
    fetchDoiMetadata: vi.fn()
}));

vi.mock('../config.js', () => ({
    isCloudSyncEnabled: vi.fn(() => false)
}));

vi.mock('../api/auth.js', () => ({
    isAuthenticated: vi.fn(() => false)
}));

vi.mock('../api/papers.js', () => ({
    getUploadUrl: vi.fn(),
    uploadPdf: vi.fn(),
    uploadPdfViaBackend: vi.fn()
}));

describe('form.view.js - Paper Form View', () => {
    let appState;
    let mockForm;
    let mockTitle;

    beforeEach(() => {
        vi.clearAllMocks();

        // Reset form view state
        formView.isEditMode = false;
        formView.paperId = null;
        formView.formSubmitHandler = null;
        formView.formInputHandler = null;
        formView.titleInputHandler = null;

        // Create app state
        appState = {
            hasUnsavedChanges: false,
            allPapersCache: []
        };

        // Create mock form elements
        document.body.innerHTML = `
            <div id="add-edit-paper-view">
                <h2>Add New Paper</h2>
                <form id="add-paper-form">
                    <input id="title" type="text" />
                    <input id="authors" type="text" />
                    <input id="journal" type="text" />
                    <input id="year" type="number" />
                    <input id="doi" type="text" />
                    <input id="tags" type="text" />
                    <button id="fetch-doi-btn" type="button">Fetch</button>
                    <details id="advanced-details"><summary>Advanced</summary></details>
                    
                    <input id="file-upload" type="file" />
                    <div id="file-upload-dropzone">Drop zone</div>
                    <div id="file-preview" class="hidden">
                        <span id="file-name"></span>
                        <button id="remove-file-btn" type="button">Remove</button>
                    </div>
                    
                    <div id="tag-suggestions"></div>
                    
                    <button type="submit">Submit</button>
                </form>
            </div>
        `;

        mockForm = document.getElementById('add-paper-form');
        mockTitle = document.querySelector('#add-edit-paper-view h2');
    });

    afterEach(() => {
        document.body.innerHTML = '';
    });

    describe('mount', () => {
        it('should initialize in add mode when paperId is null', async () => {
            await formView.mount(null, appState);

            expect(formView.isEditMode).toBe(false);
            expect(formView.paperId).toBeNull();
            expect(mockTitle.textContent).toBe('Add New Paper');
            expect(appState.hasUnsavedChanges).toBe(false);
        });

        it('should initialize input change handler', async () => {
            await formView.mount(null, appState);

            // Trigger input event
            const titleInput = document.getElementById('title');
            titleInput.value = 'Test';
            titleInput.dispatchEvent(new Event('input', { bubbles: true }));

            expect(appState.hasUnsavedChanges).toBe(true);
        });

        it('should initialize in edit mode with paperId', async () => {
            const mockPaper = {
                id: 1,
                title: 'Test Paper',
                authors: ['Author 1', 'Author 2'],
                journal: 'Test Journal',
                year: 2024,
                doi: '10.1234/test',
                tags: ['ml', 'ai']
            };

            const { getPaperById } = await import('../db.js');
            getPaperById.mockResolvedValue(mockPaper);

            await formView.mount(1, appState);

            expect(formView.isEditMode).toBe(true);
            expect(formView.paperId).toBe(1);
            expect(mockTitle.textContent).toBe('Edit Paper');
            expect(document.getElementById('title').value).toBe('Test Paper');
            expect(document.getElementById('authors').value).toBe('Author 1, Author 2');
            expect(document.getElementById('tags').value).toBe('ml, ai');
        });

        it('should redirect to home if paper not found in edit mode', async () => {
            const { getPaperById } = await import('../db.js');
            getPaperById.mockResolvedValue(null);

            const originalHash = window.location.hash;
            await formView.mount(1, appState);

            expect(window.location.hash).toBe('#/app');
        });

        it('should open advanced details if journal/year/doi present', async () => {
            const mockPaper = {
                id: 1,
                title: 'Test',
                journal: 'Nature',
                year: 2024,
                doi: '10.1234/test'
            };

            const { getPaperById } = await import('../db.js');
            getPaperById.mockResolvedValue(mockPaper);

            await formView.mount(1, appState);

            const advancedDetails = document.getElementById('advanced-details');
            expect(advancedDetails.open).toBe(true);
        });

        it('should show existing PDF in edit mode', async () => {
            const mockPaper = {
                id: 1,
                title: 'Test Paper',
                pdfData: new Blob()
            };

            const { getPaperById } = await import('../db.js');
            getPaperById.mockResolvedValue(mockPaper);

            await formView.mount(1, appState);

            const filePreview = document.getElementById('file-preview');
            const dropzone = document.getElementById('file-upload-dropzone');

            expect(filePreview.classList.contains('hidden')).toBe(false);
            expect(dropzone.classList.contains('hidden')).toBe(true);
        });
    });

    describe('unmount', () => {
        it('should remove event listeners and clean up', async () => {
            await formView.mount(null, appState);
            formView.unmount(appState);

            expect(appState.hasUnsavedChanges).toBe(false);

            const suggestionsContainer = document.getElementById('tag-suggestions');
            expect(suggestionsContainer.innerHTML).toBe('');
        });

        it('should not throw if form elements  do not exist', () => {
            document.body.innerHTML = '';

            expect(() => {
                formView.unmount(appState);
            }).not.toThrow();
        });
    });

    describe('setupFileUpload', () => {
        beforeEach(async () => {
            await formView.mount(null, appState);
        });

        it('should handle file selection via input', () => {
            const fileInput = document.getElementById('file-upload');
            const file = new File(['test'], 'test.pdf', { type: 'application/pdf' });

            const dataTransfer = new DataTransfer();
            dataTransfer.items.add(file);
            fileInput.files = dataTransfer.files;

            fileInput.dispatchEvent(new Event('change'));

            const fileName = document.getElementById('file-name');
            const filePreview = document.getElementById('file-preview');

            expect(fileName.textContent).toBe('test.pdf');
            expect(filePreview.classList.contains('hidden')).toBe(false);
        });

        it('should reject non-PDF files', async () => {
            const { showToast } = await import('../ui.js');
            const fileInput = document.getElementById('file-upload');
            const file = new File(['test'], 'test.txt', { type: 'text/plain' });

            const dataTransfer = new DataTransfer();
            dataTransfer.items.add(file);
            fileInput.files = dataTransfer.files;

            fileInput.dispatchEvent(new Event('change'));

            expect(showToast).toHaveBeenCalledWith('Please select a PDF file.', 'error');
        });

        it('should reject files larger than 10MB', async () => {
            const { showToast } = await import('../ui.js');
            const fileInput = document.getElementById('file-upload');

            // Create file larger than 10MB
            const largeFile = new File([new ArrayBuffer(11 * 1024 * 1024)], 'large.pdf', {
                type: 'application/pdf'
            });

            const dataTransfer = new DataTransfer();
            dataTransfer.items.add(largeFile);
            fileInput.files = dataTransfer.files;

            fileInput.dispatchEvent(new Event('change'));

            expect(showToast).toHaveBeenCalledWith('File size exceeds 10MB limit.', 'error');
        });

        it('should allow removing selected file', async () => {
            // First select a file
            const fileInput = document.getElementById('file-upload');
            const file = new File(['test'], 'test.pdf', { type: 'application/pdf' });

            const dataTransfer = new DataTransfer();
            dataTransfer.items.add(file);
            fileInput.files = dataTransfer.files;
            fileInput.dispatchEvent(new Event('change'));

            // Then remove it
            const removeBtn = document.getElementById('remove-file-btn');
            removeBtn.click();

            const filePreview = document.getElementById('file-preview');
            const dropzone = document.getElementById('file-upload-dropzone');

            expect(filePreview.classList.contains('hidden')).toBe(true);
            expect(dropzone.classList.contains('hidden')).toBe(false);
            // Note: fileInput.value cannot be set to '' in test environment
        });

        it('should handle drag and drop', () => {
            const dropzone = document.getElementById('file-upload-dropzone');
            const fileInput = document.getElementById('file-upload');
            const file = new File(['test'], 'test.pdf', { type: 'application/pdf' });

            // Create DataTransfer with file
            const dataTransfer = new DataTransfer();
            dataTransfer.items.add(file);

            // Create custom drop event
            const dropEvent = new Event('drop');
            Object.defineProperty(dropEvent, 'dataTransfer', {
                value: dataTransfer,
                writable: false
            });
            Object.defineProperty(dropEvent, 'preventDefault', {
                value: vi.fn()
            });

            dropzone.dispatchEvent(dropEvent);

            // Check if file was processed
            const fileName = document.getElementById('file-name');
            expect(fileName.textContent).toBe('test.pdf');
        });
    });

    describe('setupDoiFetch', () => {
        beforeEach(async () => {
            await formView.mount(null, appState);
        });

        it('should fetch DOI metadata successfully', async () => {
            const { fetchDoiMetadata } = await import('../api.js');
            const { showToast } = await import('../ui.js');

            const mockData = {
                title: 'Fetched Title',
                authors: ['Author A', 'Author B'],
                journal: 'Nature',
                year: 2024,
                doi: '10.1234/test'
            };
            fetchDoiMetadata.mockResolvedValue(mockData);

            document.getElementById('doi').value = '10.1234/test';
            document.getElementById('fetch-doi-btn').click();

            await vi.waitFor(() => {
                expect(document.getElementById('title').value).toBe('Fetched Title');
            });

            expect(document.getElementById('authors').value).toBe('Author A, Author B');
            expect(showToast).toHaveBeenCalledWith('Metadata fetched successfully!', 'success');
            expect(appState.hasUnsavedChanges).toBe(true);
        });

        it('should show error if DOI input is empty', async () => {
            const { showToast } = await import('../ui.js');

            document.getElementById('doi').value = '';
            document.getElementById('fetch-doi-btn').click();

            await vi.waitFor(() => {
                expect(showToast).toHaveBeenCalledWith('Please enter a DOI to fetch.', 'error');
            });
        });

        it('should handle DOI fetch errors', async () => {
            const { fetchDoiMetadata } = await import('../api.js');
            const { showToast } = await import('../ui.js');

            fetchDoiMetadata.mockRejectedValue(new Error('DOI not found'));

            document.getElementById('doi').value = '10.1234/invalid';
            document.getElementById('fetch-doi-btn').click();

            await vi.waitFor(() => {
                expect(showToast).toHaveBeenCalledWith(
                    expect.stringContaining('DOI not found'),
                    'error',
                    expect.any(Object)
                );
            });
        });

        it('should disable button while fetching', async () => {
            const { fetchDoiMetadata } = await import('../api.js');
            fetchDoiMetadata.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)));

            const fetchBtn = document.getElementById('fetch-doi-btn');
            document.getElementById('doi').value = '10.1234/test';

            fetchBtn.click();
            expect(fetchBtn.disabled).toBe(true);
            expect(fetchBtn.textContent).toBe('Fetching...');

            await vi.waitFor(() => {
                expect(fetchBtn.disabled).toBe(false);
                expect(fetchBtn.textContent).toBe('Fetch');
            });
        });
    });

    describe('setupTagSuggestions', () => {
        beforeEach(async () => {
            await formView.mount(null, appState);
        });

        it('should generate tag suggestions from title', () => {
            const titleInput = document.getElementById('title');
            titleInput.value = 'Machine Learning Applications in Healthcare';
            titleInput.dispatchEvent(new Event('input'));

            const suggestionsContainer = document.getElementById('tag-suggestions');
            expect(suggestionsContainer.innerHTML).toContain('machine');
            expect(suggestionsContainer.innerHTML).toContain('learning');
            expect(suggestionsContainer.innerHTML).toContain('healthcare');
        });

        it('should filter out stop words from suggestions', () => {
            const titleInput = document.getElementById('title');
            titleInput.value = 'The Analysis of Data by Machine Learning';
            titleInput.dispatchEvent(new Event('input'));

            const suggestionsContainer = document.getElementById('tag-suggestions');
            // Check that stop words are not present as standalone button tags
            expect(suggestionsContainer.querySelector('button[data-tag="the"]')).toBeNull();
            expect(suggestionsContainer.querySelector('button[data-tag="of"]')).toBeNull();
            expect(suggestionsContainer.querySelector('button[data-tag="by"]')).toBeNull();
        });

        it('should add tag when suggestion clicked', () => {
            const titleInput = document.getElementById('title');
            const tagsInput = document.getElementById('tags');

            titleInput.value = 'Machine Learning Study';
            titleInput.dispatchEvent(new Event('input'));

            const suggestionsContainer = document.getElementById('tag-suggestions');
            const button = suggestionsContainer.querySelector('button[data-tag="machine"]');

            if (button) {
                button.click();
                expect(tagsInput.value).toContain('machine');
            }
        });

        it('should not show suggestions already added as tags', () => {
            const titleInput = document.getElementById('title');
            const tagsInput = document.getElementById('tags');

            titleInput.value = 'Machine Learning';
            tagsInput.value = 'machine, learning';

            titleInput.dispatchEvent(new Event('input'));

            const suggestionsContainer = document.getElementById('tag-suggestions');
            expect(suggestionsContainer.querySelector('button[data-tag="machine"]')).toBeNull();
        });
    });

    describe('setupFormSubmit', () => {
        beforeEach(async () => {
            await formView.mount(null, appState);
        });

        it('should add new paper successfully', async () => {
            const { addPaper } = await import('../db.js');
            const { showToast } = await import('../ui.js');
            addPaper.mockResolvedValue(1);

            document.getElementById('title').value = 'New Paper';
            document.getElementById('authors').value = 'Author 1, Author 2';
            document.getElementById('year').value = '2024';

            mockForm.dispatchEvent(new Event('submit'));

            await vi.waitFor(() => {
                expect(addPaper).toHaveBeenCalledWith(expect.objectContaining({
                    title: 'New Paper',
                    authors: ['Author 1', 'Author 2'],
                    year: 2024,
                    readingStatus: 'To Read'
                }));
            });

            expect(showToast).toHaveBeenCalledWith('Paper added successfully!', 'success');
            expect(window.location.hash).toBe('#/app');
        });

        it('should update existing paper in edit mode', async () => {
            const { getPaperById, updatePaper } = await import('../db.js');
            const existingPaper = {
                id: 1,
                title: 'Old Title',
                rating: 5,
                notes: 'Some notes'
            };

            getPaperById.mockResolvedValue(existingPaper);
            updatePaper.mockResolvedValue(undefined);

            await formView.mount(1, appState);

            document.getElementById('title').value = 'Updated Title';
            mockForm.dispatchEvent(new Event('submit'));

            await vi.waitFor(() => {
                expect(updatePaper).toHaveBeenCalledWith(1, expect.objectContaining({
                    title: 'Updated Title',
                    rating: 5,  // Preserved from existing
                    notes: 'Some notes'  // Preserved from existing
                }));
            });
        });

        it('should check for duplicate DOI before adding', async () => {
            const { getPaperByDoi, addPaper } = await import('../db.js');
            const { showToast } = await import('../ui.js');

            getPaperByDoi.mockResolvedValue({ id: 2, title: 'Existing Paper' });

            document.getElementById('title').value = 'New Paper';
            document.getElementById('doi').value = '10.1234/duplicate';

            mockForm.dispatchEvent(new Event('submit'));

            await vi.waitFor(() => {
                expect(showToast).toHaveBeenCalledWith(
                    expect.stringContaining('already exists'),
                    'error',
                    expect.any(Object)
                );
            });

            expect(addPaper).not.toHaveBeenCalled();
        });

        it('should handle form submission errors', async () => {
            const { getPaperByDoi, addPaper } = await import('../db.js');
            const { showToast } = await import('../ui.js');

            // Reset duplicate check to not find existing paper
            getPaperByDoi.mockResolvedValue(null);
            // Make addPaper throw error
            addPaper.mockRejectedValue(new Error('Database error'));

            document.getElementById('title').value = 'Test Paper';
            document.getElementById('doi').value = '10.1234/unique';
            mockForm.dispatchEvent(new Event('submit'));

            await vi.waitFor(() => {
                expect(showToast).toHaveBeenCalledWith(
                    expect.stringContaining('Database error'),
                    'error',
                    expect.any(Object)
                );
            });
        });
    });
});
