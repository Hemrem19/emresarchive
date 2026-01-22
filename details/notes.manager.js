

export const notesManager = {
    notesSaveHandler: null,
    paperId: null,

    initialize(paperId, notesEditor, initialNotes, onDirty) {
        this.paperId = paperId;
        if (notesEditor) {
            notesEditor.innerHTML = initialNotes || '';

            // Mark as dirty on input
            notesEditor.addEventListener('input', () => {
                if (onDirty) onDirty();
            });
        }
    },

    cleanup(notesEditor) {
        // No event listeners to clean up that would cause issues
        this.paperId = null;
    }
};
