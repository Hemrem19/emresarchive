
import { updatePaper } from '../db.js';

export const notesManager = {
    notesSaveHandler: null,
    paperId: null,

    initialize(paperId, notesEditor, initialNotes, onDirty) {
        this.paperId = paperId;
        if (notesEditor) {
            notesEditor.innerHTML = initialNotes || '';
            const initialContent = notesEditor.innerHTML;

            // Mark as dirty on input
            notesEditor.addEventListener('input', () => {
                if (onDirty) onDirty();
            });

            // Auto-save on blur
            this.notesSaveHandler = async () => {
                const currentContent = notesEditor.innerHTML;
                if (currentContent !== this.lastSavedContent) {
                    try {
                        await updatePaper(this.paperId, { notes: currentContent });
                        this.lastSavedContent = currentContent;
                    } catch (error) {
                        console.error('Error auto-saving notes:', error);
                    }
                }
            };
            this.lastSavedContent = initialContent;

            notesEditor.addEventListener('blur', this.notesSaveHandler);
        }
    },

    cleanup(notesEditor) {
        if (notesEditor && this.notesSaveHandler) {
            notesEditor.removeEventListener('blur', this.notesSaveHandler);
            this.notesSaveHandler = null;
        }
        this.paperId = null;
        this.lastSavedContent = null;
    }
};
