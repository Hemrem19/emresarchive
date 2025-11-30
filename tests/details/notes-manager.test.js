// Tests for details/notes.manager.js
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { notesManager } from '../../details/notes.manager.js';
import { updatePaper } from '../../db/papers.js';

// Mock updatePaper
vi.mock('../../db/papers.js', () => ({
    updatePaper: vi.fn()
}));

describe('details/notes.manager.js', () => {
    let notesEditor;

    beforeEach(() => {
        // Create DOM element
        notesEditor = document.createElement('div');
        notesEditor.id = 'notes-editor';
        notesEditor.contentEditable = 'true';
        notesEditor.innerHTML = '';
        document.body.appendChild(notesEditor);
    });

    afterEach(() => {
        notesManager.cleanup(notesEditor);
        if (notesEditor.parentNode) {
            notesEditor.parentNode.removeChild(notesEditor);
        }
        vi.clearAllMocks();
    });

    describe('initialize', () => {
        it('should initialize notes manager with paper ID and editor', () => {
            notesManager.initialize(1, notesEditor, 'Initial notes');

            expect(notesEditor.innerHTML).toBe('Initial notes');
        });

        it('should initialize with empty string if no initial notes', () => {
            notesManager.initialize(1, notesEditor, null);

            expect(notesEditor.innerHTML).toBe('');
        });

        it('should initialize with empty string if initial notes is undefined', () => {
            notesManager.initialize(1, notesEditor, undefined);

            expect(notesEditor.innerHTML).toBe('');
        });

        it('should set up blur event handler for auto-save', async () => {
            notesManager.initialize(1, notesEditor, 'Initial notes');

            // Change content
            notesEditor.innerHTML = 'Updated notes content';

            // Trigger blur event
            const blurEvent = new Event('blur');
            notesEditor.dispatchEvent(blurEvent);

            // Wait for async save
            await new Promise(resolve => setTimeout(resolve, 0));

            expect(updatePaper).toHaveBeenCalledWith(1, { notes: 'Updated notes content' });
        });

        it('should not save if content has not changed', async () => {
            notesManager.initialize(1, notesEditor, 'Initial notes');

            // Trigger blur without changing content
            const blurEvent = new Event('blur');
            notesEditor.dispatchEvent(blurEvent);

            await new Promise(resolve => setTimeout(resolve, 0));

            expect(updatePaper).not.toHaveBeenCalled();
        });

        it('should save when content changes from empty to something', async () => {
            notesManager.initialize(1, notesEditor, '');

            notesEditor.innerHTML = 'New notes';

            const blurEvent = new Event('blur');
            notesEditor.dispatchEvent(blurEvent);

            await new Promise(resolve => setTimeout(resolve, 0));

            expect(updatePaper).toHaveBeenCalledWith(1, { notes: 'New notes' });
        });

        it('should save when content changes to empty', async () => {
            notesManager.initialize(1, notesEditor, 'Initial notes');

            notesEditor.innerHTML = '';

            const blurEvent = new Event('blur');
            notesEditor.dispatchEvent(blurEvent);

            await new Promise(resolve => setTimeout(resolve, 0));

            expect(updatePaper).toHaveBeenCalledWith(1, { notes: '' });
        });

        it('should handle multiple blur events correctly', async () => {
            notesManager.initialize(1, notesEditor, 'Initial notes');

            // First change and blur
            notesEditor.innerHTML = 'First update';
            notesEditor.dispatchEvent(new Event('blur'));
            await new Promise(resolve => setTimeout(resolve, 0));

            expect(updatePaper).toHaveBeenCalledWith(1, { notes: 'First update' });
            expect(updatePaper).toHaveBeenCalledTimes(1);

            // Second change and blur
            notesEditor.innerHTML = 'Second update';
            notesEditor.dispatchEvent(new Event('blur'));
            await new Promise(resolve => setTimeout(resolve, 0));

            expect(updatePaper).toHaveBeenCalledWith(1, { notes: 'Second update' });
            expect(updatePaper).toHaveBeenCalledTimes(2);
        });

        it('should preserve HTML formatting in notes', async () => {
            const htmlContent = '<p>First paragraph</p><ul><li>Item 1</li><li>Item 2</li></ul>';
            notesManager.initialize(1, notesEditor, '');

            notesEditor.innerHTML = htmlContent;
            notesEditor.dispatchEvent(new Event('blur'));

            await new Promise(resolve => setTimeout(resolve, 0));

            expect(updatePaper).toHaveBeenCalledWith(1, { notes: htmlContent });
        });

        it('should handle null editor gracefully', () => {
            expect(() => {
                notesManager.initialize(1, null, 'Initial notes');
            }).not.toThrow();
        });
    });

    describe('cleanup', () => {
        it('should remove event listener when cleaned up', async () => {
            notesManager.initialize(1, notesEditor, 'Initial notes');

            // Cleanup
            notesManager.cleanup(notesEditor);

            // Try to trigger save after cleanup
            notesEditor.innerHTML = 'Updated after cleanup';
            notesEditor.dispatchEvent(new Event('blur'));

            await new Promise(resolve => setTimeout(resolve, 0));

            // Should not save after cleanup
            expect(updatePaper).not.toHaveBeenCalled();
        });

        it('should clear internal state', () => {
            notesManager.initialize(1, notesEditor, 'Initial notes');

            notesManager.cleanup(notesEditor);

            expect(notesManager.paperId).toBeNull();
            expect(notesManager.notesSaveHandler).toBeNull();
        });

        it('should handle cleanup with null editor', () => {
            notesManager.initialize(1, notesEditor, 'Initial notes');

            expect(() => {
                notesManager.cleanup(null);
            }).not.toThrow();
        });

        it('should handle cleanup without prior initialization', () => {
            expect(() => {
                notesManager.cleanup(notesEditor);
            }).not.toThrow();
        });
    });
});
