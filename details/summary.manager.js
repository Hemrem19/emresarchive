
import { updatePaper } from '../db.js';

export const summaryManager = {
    summarySaveHandler: null,
    paperId: null,

    initialize(paperId, summaryEditor, initialSummary, onDirty) {
        this.paperId = paperId;
        if (summaryEditor) {
            summaryEditor.innerHTML = initialSummary || '';
            const initialContent = summaryEditor.innerHTML;

            // Setup toolbar buttons
            const toolbar = document.getElementById('summary-toolbar');
            if (toolbar) {
                toolbar.addEventListener('click', (e) => {
                    if (e.target.closest('button[data-command]')) {
                        e.preventDefault();
                        const command = e.target.closest('button[data-command]').dataset.command;
                        document.execCommand(command, false, null);
                        summaryEditor.focus();
                    }
                });
            }

            // Mark as dirty on input
            summaryEditor.addEventListener('input', () => {
                if (onDirty) onDirty();
            });

            // Auto-save on blur
            this.summarySaveHandler = async () => {
                const currentContent = summaryEditor.innerHTML;
                // Save if content changed (compare normalized or just direct string if simplest)
                // Note: initialContent logic might need to track lastSavedContent for multiple blurs
                if (currentContent !== this.lastSavedContent) {
                    try {
                        await updatePaper(this.paperId, { summary: currentContent });
                        this.lastSavedContent = currentContent;
                    } catch (error) {
                        console.error('Error auto-saving summary:', error);
                    }
                }
            };
            this.lastSavedContent = initialContent;

            summaryEditor.addEventListener('blur', this.summarySaveHandler);
        }
    },

    cleanup(summaryEditor) {
        if (summaryEditor && this.summarySaveHandler) {
            summaryEditor.removeEventListener('blur', this.summarySaveHandler);
            this.summarySaveHandler = null;
        }
        this.paperId = null;
        this.lastSavedContent = null;
    }
};

