import { updatePaper } from '../db.js';

export const notesManager = {
    notesSaveHandler: null,
    paperId: null,

    initialize(paperId, notesEditor, initialNotes) {
        this.paperId = paperId;
        if (notesEditor) {
            notesEditor.innerHTML = initialNotes || '';

            this.notesSaveHandler = async () => {
                const newNotes = notesEditor.innerHTML;
                if (newNotes === initialNotes) return;
                await updatePaper(paperId, { notes: newNotes });
                initialNotes = newNotes; // Update local state
                console.log(`Notes for paper ${paperId} updated.`);
            };
            notesEditor.addEventListener('blur', this.notesSaveHandler);
        }
    },

    cleanup(notesEditor) {
        if (notesEditor && this.notesSaveHandler) {
            notesEditor.removeEventListener('blur', this.notesSaveHandler);
        }
        this.notesSaveHandler = null;
        this.paperId = null;
    }
};
