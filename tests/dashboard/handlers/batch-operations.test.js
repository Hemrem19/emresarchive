/**
 * Tests for dashboard/handlers/batch-operations.js - Batch Operations Handlers
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// Mock dependencies
const mockExecuteBatchOperation = vi.fn();
const mockUpdatePaperInCache = vi.fn();
const mockRemovePapersFromCache = vi.fn();
const mockParseTags = vi.fn();
const mockAddTagsToPaper = vi.fn();
const mockRemoveTagsFromPaper = vi.fn();

vi.mock('../../../dashboard/utils/batch-operations-utils.js', () => ({
    executeBatchOperation: (...args) => mockExecuteBatchOperation(...args),
    updatePaperInCache: (...args) => mockUpdatePaperInCache(...args),
    removePapersFromCache: (...args) => mockRemovePapersFromCache(...args),
    parseTags: (...args) => mockParseTags(...args),
    addTagsToPaper: (...args) => mockAddTagsToPaper(...args),
    removeTagsFromPaper: (...args) => mockRemoveTagsFromPaper(...args)
}));

const mockShowModal = vi.fn();
const mockCloseModal = vi.fn();

vi.mock('../../../dashboard/services/modal-manager.js', () => ({
    showModal: (...args) => mockShowModal(...args),
    closeModal: (...args) => mockCloseModal(...args)
}));

const mockGenerateBibliography = vi.fn();
const mockExportBibliographyToFile = vi.fn();
const mockCopyBibliographyToClipboard = vi.fn();

vi.mock('../../../citation.js', () => ({
    generateBibliography: (...args) => mockGenerateBibliography(...args),
    exportBibliographyToFile: (...args) => mockExportBibliographyToFile(...args),
    copyBibliographyToClipboard: (...args) => mockCopyBibliographyToClipboard(...args)
}));

const mockShowToast = vi.fn();
const mockRenderSidebarTags = vi.fn();

vi.mock('../../../ui.js', () => ({
    showToast: (...args) => mockShowToast(...args),
    renderSidebarTags: (...args) => mockRenderSidebarTags(...args)
}));

// Mock templates
vi.mock('../../../views/index.js', () => ({
    views: {
        bibliographyExportModal: '<div>Mock Modal HTML</div>'
    }
}));

describe('batch-operations.js - Batch Operations Handlers', () => {
    let appState;
    let mockApplyFiltersAndRender;
    let mockUpdateBatchToolbar;

    beforeEach(() => {
        vi.clearAllMocks();

        appState = {
            selectedPaperIds: new Set([1, 2]),
            allPapersCache: [
                { id: 1, title: 'Paper 1', tags: ['ml'], readingStatus: 'To Read' },
                { id: 2, title: 'Paper 2', tags: ['ai'], readingStatus: 'Reading' },
                { id: 3, title: 'Paper 3', tags: ['dl'], readingStatus: 'Finished' }
            ]
        };

        mockApplyFiltersAndRender = vi.fn();
        mockUpdateBatchToolbar = vi.fn();

        // Create DOM elements matching actual implementation
        document.body.innerHTML = `
            <select id="batch-status-select">
                <option value="">Select...</option>
                <option value="Reading">Reading</option>
                <option value="Finished">Finished</option>
            </select>
            <input id="batch-tags-input" type="text" value="new-tag" />
            <button id="batch-add-tags-btn">Add Tags</button>
            <button id="batch-remove-tags-btn">Remove Tags</button>
            <button id="batch-delete-btn">Delete</button>
            <button id="batch-export-bibliography-btn">Export</button>
        `;
    });

    afterEach(() => {
        document.body.innerHTML = '';
    });

    describe('Batch Status Change Handler', () => {
        it('should update status for selected papers', async () => {
            const { createBatchStatusChangeHandler } = await import('../../../dashboard/handlers/batch-operations.js');
            const handler = createBatchStatusChangeHandler(appState, mockApplyFiltersAndRender);

            // Mock successful batch operation
            mockExecuteBatchOperation.mockResolvedValue({
                successCount: 2,
                results: [
                    { paperId: 1, success: true },
                    { paperId: 2, success: true }
                ]
            });

            const event = { target: { value: 'Finished' } };
            await handler(event);

            // Verify executeBatchOperation called with correct args
            expect(mockExecuteBatchOperation).toHaveBeenCalledWith(
                [1, 2],
                expect.any(Function),
                expect.objectContaining({ actionName: 'Update status to "Finished"' })
            );

            // Verify operation generator logic
            const opGenerator = mockExecuteBatchOperation.mock.calls[0][1];
            const op = opGenerator(1);
            expect(op).toEqual({ type: 'update', id: 1, data: { readingStatus: 'Finished' } });

            // Verify cache update
            expect(mockUpdatePaperInCache).toHaveBeenCalledTimes(2);
            expect(mockUpdatePaperInCache).toHaveBeenCalledWith(expect.any(Array), 1, { readingStatus: 'Finished' });

            // Verify render called
            expect(mockApplyFiltersAndRender).toHaveBeenCalled();

            // Verify select reset
            expect(event.target.value).toBe('');
        });

        it('should handle partial failures', async () => {
            const { createBatchStatusChangeHandler } = await import('../../../dashboard/handlers/batch-operations.js');
            const handler = createBatchStatusChangeHandler(appState, mockApplyFiltersAndRender);

            mockExecuteBatchOperation.mockResolvedValue({
                successCount: 1,
                results: [
                    { paperId: 1, success: true },
                    { paperId: 2, success: false }
                ]
            });

            await handler({ target: { value: 'Finished' } });

            // Should only update cache for successful one
            expect(mockUpdatePaperInCache).toHaveBeenCalledTimes(1);
            expect(mockUpdatePaperInCache).toHaveBeenCalledWith(expect.any(Array), 1, { readingStatus: 'Finished' });
            expect(mockApplyFiltersAndRender).toHaveBeenCalled();
        });

        it('should do nothing if no status selected', async () => {
            const { createBatchStatusChangeHandler } = await import('../../../dashboard/handlers/batch-operations.js');
            const handler = createBatchStatusChangeHandler(appState, mockApplyFiltersAndRender);

            await handler({ target: { value: '' } });

            expect(mockExecuteBatchOperation).not.toHaveBeenCalled();
        });
    });

    describe('Batch Add Tags Handler', () => {
        it('should add tags to selected papers', async () => {
            const { createBatchAddTagsHandler } = await import('../../../dashboard/handlers/batch-operations.js');
            const handler = createBatchAddTagsHandler(appState, mockApplyFiltersAndRender);

            mockParseTags.mockReturnValue(['new-tag']);
            mockAddTagsToPaper.mockReturnValue(['existing', 'new-tag']);

            mockExecuteBatchOperation.mockResolvedValue({
                successCount: 2,
                results: [
                    { paperId: 1, success: true, result: { data: { tags: ['ml', 'new-tag'] } } },
                    { paperId: 2, success: true, result: { data: { tags: ['ai', 'new-tag'] } } }
                ]
            });

            await handler();

            expect(mockParseTags).toHaveBeenCalledWith('new-tag');
            expect(mockExecuteBatchOperation).toHaveBeenCalledWith(
                [1, 2],
                expect.any(Function),
                expect.objectContaining({ actionName: 'Add tags' })
            );

            // Verify operation generator
            const opGenerator = mockExecuteBatchOperation.mock.calls[0][1];
            const op = opGenerator(1);
            expect(op).toEqual({ type: 'update', id: 1, data: { tags: ['existing', 'new-tag'] } });

            expect(mockUpdatePaperInCache).toHaveBeenCalledTimes(2);
            expect(mockRenderSidebarTags).toHaveBeenCalled();
            expect(mockApplyFiltersAndRender).toHaveBeenCalled();

            // Verify input cleared
            expect(document.getElementById('batch-tags-input').value).toBe('');
        });

        it('should do nothing if input is empty', async () => {
            const { createBatchAddTagsHandler } = await import('../../../dashboard/handlers/batch-operations.js');
            const handler = createBatchAddTagsHandler(appState, mockApplyFiltersAndRender);

            document.getElementById('batch-tags-input').value = '   ';
            await handler();

            expect(mockExecuteBatchOperation).not.toHaveBeenCalled();
        });
    });

    describe('Batch Remove Tags Handler', () => {
        it('should remove tags from selected papers', async () => {
            const { createBatchRemoveTagsHandler } = await import('../../../dashboard/handlers/batch-operations.js');
            const handler = createBatchRemoveTagsHandler(appState, mockApplyFiltersAndRender);

            mockParseTags.mockReturnValue(['ml']);
            mockRemoveTagsFromPaper.mockReturnValue(['other']);

            mockExecuteBatchOperation.mockResolvedValue({
                successCount: 1,
                results: [
                    { paperId: 1, success: true, result: { data: { tags: ['other'] } } }
                ]
            });

            await handler();

            expect(mockExecuteBatchOperation).toHaveBeenCalledWith(
                [1, 2],
                expect.any(Function),
                expect.objectContaining({ actionName: 'Remove tags' })
            );

            // Verify operation generator
            const opGenerator = mockExecuteBatchOperation.mock.calls[0][1];
            const op = opGenerator(1);
            expect(op).toEqual({ type: 'update', id: 1, data: { tags: ['other'] } });

            expect(mockUpdatePaperInCache).toHaveBeenCalled();
            expect(mockRenderSidebarTags).toHaveBeenCalled();
            expect(mockApplyFiltersAndRender).toHaveBeenCalled();
        });
    });

    describe('Batch Delete Handler', () => {
        it('should delete selected papers after confirmation', async () => {
            const { createBatchDeleteHandler } = await import('../../../dashboard/handlers/batch-operations.js');
            const handler = createBatchDeleteHandler(appState, mockApplyFiltersAndRender, mockUpdateBatchToolbar);

            // Mock confirm
            vi.spyOn(window, 'confirm').mockReturnValue(true);

            mockExecuteBatchOperation.mockResolvedValue({
                successCount: 2,
                results: [
                    { paperId: 1, success: true },
                    { paperId: 2, success: true }
                ]
            });

            mockRemovePapersFromCache.mockReturnValue([{ id: 3 }]); // Only paper 3 remains

            const originalCache = [...appState.allPapersCache];
            await handler();

            expect(window.confirm).toHaveBeenCalled();
            expect(mockExecuteBatchOperation).toHaveBeenCalledWith(
                [1, 2],
                expect.any(Function),
                expect.objectContaining({ actionName: 'Delete papers' })
            );

            // Verify operation generator
            const opGenerator = mockExecuteBatchOperation.mock.calls[0][1];
            expect(opGenerator(1)).toEqual({ type: 'delete', id: 1 });

            expect(mockRemovePapersFromCache).toHaveBeenCalledWith(originalCache, [1, 2]);
            expect(appState.selectedPaperIds.size).toBe(0);
            expect(mockRenderSidebarTags).toHaveBeenCalled();
            expect(mockUpdateBatchToolbar).toHaveBeenCalled();
            expect(mockApplyFiltersAndRender).toHaveBeenCalled();
        });

        it('should cancel deletion if not confirmed', async () => {
            const { createBatchDeleteHandler } = await import('../../../dashboard/handlers/batch-operations.js');
            const handler = createBatchDeleteHandler(appState, mockApplyFiltersAndRender, mockUpdateBatchToolbar);

            vi.spyOn(window, 'confirm').mockReturnValue(false);

            await handler();

            expect(mockExecuteBatchOperation).not.toHaveBeenCalled();
        });
    });

    describe('Batch Export Bibliography Handler', () => {
        it('should show export modal', async () => {
            const { createBatchExportBibliographyHandler } = await import('../../../dashboard/handlers/batch-operations.js');
            const handler = createBatchExportBibliographyHandler(appState);

            await handler();

            expect(mockShowModal).toHaveBeenCalledWith(expect.objectContaining({
                id: 'bibliography-export-modal',
                handlers: expect.any(Object),
                onOpen: expect.any(Function)
            }));
        });

        it('should handle copy to clipboard in modal', async () => {
            const { createBatchExportBibliographyHandler } = await import('../../../dashboard/handlers/batch-operations.js');
            const handler = createBatchExportBibliographyHandler(appState);

            // Setup DOM for modal interaction
            document.body.innerHTML += `
                <select id="bibliography-format-select"><option value="text">Text</option></select>
                <select id="bibliography-style-select"><option value="apa">APA</option></select>
            `;

            await handler();

            const modalConfig = mockShowModal.mock.calls[0][0];
            const copyHandler = modalConfig.handlers['bibliography-copy-btn'];

            mockGenerateBibliography.mockReturnValue('Ref 1\nRef 2');
            mockCopyBibliographyToClipboard.mockResolvedValue(true);

            await copyHandler.callback();

            expect(mockGenerateBibliography).toHaveBeenCalled();
            expect(mockCopyBibliographyToClipboard).toHaveBeenCalledWith('Ref 1\nRef 2');
            expect(mockShowToast).toHaveBeenCalledWith(expect.stringContaining('copied'), 'success');
        });

        it('should handle download in modal', async () => {
            const { createBatchExportBibliographyHandler } = await import('../../../dashboard/handlers/batch-operations.js');
            const handler = createBatchExportBibliographyHandler(appState);

            // Setup DOM for modal interaction
            document.body.innerHTML += `
                <select id="bibliography-format-select"><option value="bibtex">BibTeX</option></select>
                <select id="bibliography-style-select"><option value="apa">APA</option></select>
            `;

            await handler();

            const modalConfig = mockShowModal.mock.calls[0][0];
            const downloadHandler = modalConfig.handlers['bibliography-download-btn'];

            mockGenerateBibliography.mockReturnValue('@article{...}');

            await downloadHandler.callback();

            expect(mockGenerateBibliography).toHaveBeenCalled();
            expect(mockExportBibliographyToFile).toHaveBeenCalledWith('@article{...}', 'bibtex');
            expect(mockShowToast).toHaveBeenCalledWith(expect.stringContaining('downloaded'), 'success');
        });

        it('should show error toast if no papers selected', async () => {
            const { createBatchExportBibliographyHandler } = await import('../../../dashboard/handlers/batch-operations.js');
            appState.selectedPaperIds.clear();
            const handler = createBatchExportBibliographyHandler(appState);

            await handler();

            expect(mockShowToast).toHaveBeenCalledWith(expect.stringContaining('Please select'), 'warning');
            expect(mockShowModal).not.toHaveBeenCalled();
        });
    });
});
