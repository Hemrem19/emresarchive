import { updatePaper } from '../db.js';

export const summaryManager = {
    summarySaveHandler: null,
    paperId: null,

    initialize(paperId, summaryEditor, initialSummary) {
        this.paperId = paperId;
        if (summaryEditor) {
            summaryEditor.innerHTML = initialSummary || '';

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

            this.summarySaveHandler = async () => {
                const newSummary = summaryEditor.innerHTML;
                if (newSummary === initialSummary) return;
                await updatePaper(paperId, { summary: newSummary });
                initialSummary = newSummary; // Update local state
                console.log(`Summary for paper ${paperId} updated.`);
            };
            summaryEditor.addEventListener('blur', this.summarySaveHandler);
        }
    },

    cleanup(summaryEditor) {
        if (summaryEditor && this.summarySaveHandler) {
            summaryEditor.removeEventListener('blur', this.summarySaveHandler);
        }
        this.summarySaveHandler = null;
        this.paperId = null;
    }
};

