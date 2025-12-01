/**
 * Dashboard Quick Add Handler Tests
 * Tests for quick-add.js event handlers
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
    createQuickAddHandler,
    registerQuickAddHandler,
    unregisterQuickAddHandler
} from '../../dashboard/handlers/quick-add.js';
import { createMockPaper } from '../helpers.js';

// Mock dependencies
vi.mock('../../db.js');
vi.mock('../../ui.js');
vi.mock('../../api.js');

import { getPaperById, addPaper, getPaperByDoi } from '../../db.js';
import { showToast } from '../../ui.js';
import { fetchDoiMetadata, normalizePaperIdentifier } from '../../api.js';

describe('dashboard/handlers/quick-add.js', () => {
    let appState;
    let applyFiltersAndRender;

    beforeEach(() => {
        // Reset appState
        appState = {
            allPapersCache: []
        };

        // Mock applyFiltersAndRender
        applyFiltersAndRender = vi.fn();

        // Setup mock DOM
        document.body.innerHTML = `
      <form id="quick-add-form">
        <input id="quick-add-doi" type="text" />
      </form>
    `;

        // Reset mocks
        vi.clearAllMocks();
    });

    afterEach(() => {
        document.body.innerHTML = '';
    });

    describe('createQuickAddHandler', () => {
        it('should do nothing if input is empty', async () => {
            const handler = createQuickAddHandler(appState, applyFiltersAndRender);
            const event = { preventDefault: vi.fn() };

            const doiInput = document.getElementById('quick-add-doi');
            doiInput.value = '   ';

            await handler(event);

            expect(event.preventDefault).toHaveBeenCalled();
            expect(normalizePaperIdentifier).not.toHaveBeenCalled();
        });

        it('should show warning for arXiv papers', async () => {
            const handler = createQuickAddHandler(appState, applyFiltersAndRender);
            const event = { preventDefault: vi.fn() };

            normalizePaperIdentifier.mockReturnValue({
                type: 'arxiv',
                error: 'arXiv papers are not yet supported'
            });

            const doiInput = document.getElementById('quick-add-doi');
            doiInput.value = '2301.12345';

            await handler(event);

            expect(showToast).toHaveBeenCalledWith(
                expect.stringContaining('arXiv'),
                'warning',
                expect.any(Object)
            );
        });

        it('should show error for unsupported formats', async () => {
            const handler = createQuickAddHandler(appState, applyFiltersAndRender);
            const event = { preventDefault: vi.fn() };

            normalizePaperIdentifier.mockReturnValue({
                type: 'unsupported',
                error: 'Invalid format'
            });


            normalizePaperIdentifier.mockReturnValue({
                type: 'doi',
                value: '10.1234/test',
                original: '10.1234/test'
            });

            const existingPaper = createMockPaper({ title: 'Existing Paper' });
            getPaperByDoi.mockResolvedValue(existingPaper);

            const doiInput = document.getElementById('quick-add-doi');
            doiInput.value = '10.1234/test';

            await handler(event);

            expect(getPaperByDoi).toHaveBeenCalledWith('10.1234/test');
            expect(showToast).toHaveBeenCalledWith(
                expect.stringContaining('already exists'),
                'error',
                expect.any(Object)
            );
            expect(fetchDoiMetadata).not.toHaveBeenCalled();
        });

        it('should add paper successfully when valid DOI provided', async () => {
            const handler = createQuickAddHandler(appState, applyFiltersAndRender);
            const event = { preventDefault: vi.fn() };

            normalizePaperIdentifier.mockReturnValue({
                type: 'doi',
                value: '10.1234/test',
                original: '10.1234/test'
            });

            getPaperByDoi.mockResolvedValue(null); // No duplicate
            fetchDoiMetadata.mockResolvedValue({
                title: 'New Paper',
                authors: ['Author 1'],
                year: 2023,
                doi: '10.1234/test'
            });
            addPaper.mockResolvedValue(1);
            const mockPaper = createMockPaper({ id: 1, title: 'New Paper' });
            getPaperById.mockResolvedValue(mockPaper);

            const doiInput = document.getElementById('quick-add-doi');
            doiInput.value = '10.1234/test';

            await handler(event);

            expect(addPaper).toHaveBeenCalled();
            expect(getPaperById).toHaveBeenCalledWith(1);
            expect(appState.allPapersCache).toHaveLength(1);
            expect(appState.allPapersCache[0]).toEqual(mockPaper);
            expect(doiInput.value).toBe('');
            expect(applyFiltersAndRender).toHaveBeenCalled();
            expect(showToast).toHaveBeenCalledWith('Paper added successfully!', 'success');
        });

        it('should show info toast when URL is detected', async () => {
            const handler = createQuickAddHandler(appState, applyFiltersAndRender);
            const event = { preventDefault: vi.fn() };

            normalizePaperIdentifier.mockReturnValue({
                type: 'doi',
                value: '10.1234/test',
                original: 'https://doi.org/10.1234/test' // URL detected
            });

            getPaperByDoi.mockResolvedValue(null);
            fetchDoiMetadata.mockResolvedValue({
                title: 'New Paper',
                doi: '10.1234/test'
            });
            addPaper.mockResolvedValue(1);
            getPaperById.mockResolvedValue(createMockPaper({ id: 1 }));

            const doiInput = document.getElementById('quick-add-doi');
            doiInput.value = 'https://doi.org/10.1234/test';

            await handler(event);

            expect(showToast).toHaveBeenCalledWith(
                expect.stringContaining('Detected DOI'),
                'info',
                expect.any(Object)
            );
        });

        it('should handle fetch metadata error gracefully', async () => {
            const handler = createQuickAddHandler(appState, applyFiltersAndRender);
            const event = { preventDefault: vi.fn() };

            normalizePaperIdentifier.mockReturnValue({
                type: 'doi',
                value: '10.1234/test',
                original: '10.1234/test'
            });

            getPaperByDoi.mockResolvedValue(null);
            fetchDoiMetadata.mockRejectedValue(new Error('Network error'));

            const doiInput = document.getElementById('quick-add-doi');
            doiInput.value = '10.1234/test';

            await handler(event);

            expect(showToast).toHaveBeenCalledWith(
                'Network error',
                'error',
                expect.objectContaining({
                    actions: expect.arrayContaining([
                        expect.objectContaining({ label: 'Retry' })
                    ])
                })
            );
        });

        it('should continue if duplicate check fails', async () => {
            const handler = createQuickAddHandler(appState, applyFiltersAndRender);
            const event = { preventDefault: vi.fn() };

            normalizePaperIdentifier.mockReturnValue({
                type: 'doi',
                value: '10.1234/test',
                original: '10.1234/test'
            });

            getPaperByDoi.mockRejectedValue(new Error('DB error'));
            fetchDoiMetadata.mockResolvedValue({ title: 'New Paper', doi: '10.1234/test' });
            addPaper.mockResolvedValue(1);
            getPaperById.mockResolvedValue(createMockPaper({ id: 1 }));

            const doiInput = document.getElementById('quick-add-doi');
            doiInput.value = '10.1234/test';

            await handler(event);

            // Should still proceed with add
            expect(fetchDoiMetadata).toHaveBeenCalled();
            expect(addPaper).toHaveBeenCalled();
        });

        it('should add paper to beginning of cache', async () => {
            appState.allPapersCache = [createMockPaper({ id: 1 }), createMockPaper({ id: 2 })];

            const handler = createQuickAddHandler(appState, applyFiltersAndRender);
            const event = { preventDefault: vi.fn() };

            normalizePaperIdentifier.mockReturnValue({
                type: 'doi',
                value: '10.1234/test',
                original: '10.1234/test'
            });

            getPaperByDoi.mockResolvedValue(null);
            fetchDoiMetadata.mockResolvedValue({ title: 'New Paper', doi: '10.1234/test' });
            addPaper.mockResolvedValue(3);
            const newPaper = createMockPaper({ id: 3, title: 'New Paper' });
            getPaperById.mockResolvedValue(newPaper);

            const doiInput = document.getElementById('quick-add-doi');
            doiInput.value = '10.1234/test';

            await handler(event);

            expect(appState.allPapersCache).toHaveLength(3);
            expect(appState.allPapersCache[0]).toEqual(newPaper);
        });
    });

    describe('registerQuickAddHandler', () => {
        it('should register quick add form submit handler', () => {
            const handlers = registerQuickAddHandler(appState, applyFiltersAndRender);

            expect(handlers.quickAddHandler).toBeDefined();
            expect(typeof handlers.quickAddHandler).toBe('function');
        });

        it('should handle missing form gracefully', () => {
            document.body.innerHTML = '';

            const handlers = registerQuickAddHandler(appState, applyFiltersAndRender);

            expect(handlers).toEqual({});
        });
    });

    describe('unregisterQuickAddHandler', () => {
        it('should remove quick add form submit listener', async () => {
            const handlers = registerQuickAddHandler(appState, applyFiltersAndRender);

            normalizePaperIdentifier.mockReturnValue({
                type: 'doi',
                value: '10.1234/test',
                original: '10.1234/test'
            });

            unregisterQuickAddHandler(handlers);

            const form = document.getElementById('quick-add-form');
            const doiInput = document.getElementById('quick-add-doi');
            doiInput.value = '10.1234/test';

            form.dispatchEvent(new Event('submit'));

            // Handler should not be called after unregistering
            expect(normalizePaperIdentifier).not.toHaveBeenCalled();
        });

        it('should handle missing form in unregister', () => {
            const handlers = { quickAddHandler: vi.fn() };
            document.body.innerHTML = '';

            expect(() => unregisterQuickAddHandler(handlers)).not.toThrow();
        });

        it('should handle missing handler gracefully', () => {
            expect(() => unregisterQuickAddHandler({})).not.toThrow();
        });
    });
});
