

export const summaryManager = {
    summarySaveHandler: null,
    paperId: null,

    initialize(paperId, summaryEditor, initialSummary, onDirty) {
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

            // Mark as dirty on input
            summaryEditor.addEventListener('input', () => {
                if (onDirty) onDirty();
            });
        }
    },

    cleanup(summaryEditor) {
        this.paperId = null;
    }
};

