import { getPaperById, updatePaper, getAllPapers } from './db.js';
import { escapeHtml, showToast, formatRelativeTime } from './ui.js';
import { views as templates } from './views.js';
import { generateCitation } from './citation.js';

export const detailsView = {
    pdfUrl: null,
    notesSaveHandler: null,
    paperId: null,
    closeModalHandler: null,

    async mount(paperId, appState) {
        this.paperId = paperId;
        const container = document.getElementById('paper-details-container');
        if (!container) return;

        const paper = await getPaperById(paperId);

        if (!paper) {
            container.innerHTML = `<h2>Paper not found</h2><p>The requested paper could not be found. <a href="#/" class="text-primary hover:underline">Go back to dashboard</a>.</p>`;
            return;
        }

        // Render the view's HTML
        this.render(paper);

        // Set up event listeners and state
        this.setupEventListeners(paper);
    },

    unmount() {
        // Clean up resources created by this view
        if (this.pdfUrl) {
            URL.revokeObjectURL(this.pdfUrl);
            this.pdfUrl = null;
            console.log(`PDF object URL for paper ${this.paperId} revoked.`);
        }

        const notesEditor = document.getElementById('notes-editor');
        if (notesEditor && this.notesSaveHandler) {
            notesEditor.removeEventListener('blur', this.notesSaveHandler);
        }

        // Clean up the link modal and its listeners if they exist
        const modal = document.getElementById('link-modal');
        if (modal) {
            const closeModalBtn = document.getElementById('close-link-modal-btn');
            if (closeModalBtn && this.closeModalHandler) {
                closeModalBtn.removeEventListener('click', this.closeModalHandler);
                modal.removeEventListener('click', this.closeModalHandler);
            }
            modal.remove(); // Ensure modal is removed from DOM
        }

        console.log('Details view unmounted.');
        this.paperId = null;
    },

    render(paper) {
        const container = document.getElementById('paper-details-container');
    if (!paper) {
        container.innerHTML = `<h2>Paper not found</h2><p>The requested paper could not be found. <a href="#/" class="text-primary hover:underline">Go back to dashboard</a>.</p>`;
        return;
    }

    const detailsHtml = `
        <div class="flex flex-col lg:flex-row gap-8">
            <aside class="w-full lg:w-96 lg:flex-shrink-0 order-2 lg:order-1">
                <div class="space-y-6 bg-white dark:bg-stone-900/70 p-6 rounded-lg border border-stone-200 dark:border-stone-800">
                    <div>
                        <h1 class="text-xl font-bold text-stone-900 dark:text-white">${escapeHtml(paper.title)}</h1>
                        <p class="mt-2 text-sm text-stone-600 dark:text-stone-400">${escapeHtml(paper.authors.join(', '))}</p>
                    </div>
                    <div class="space-y-3 text-sm">
                        <div class="flex justify-between"><span class="font-medium text-stone-500 dark:text-stone-400">Journal:</span><span class="text-stone-700 dark:text-stone-300 text-right">${escapeHtml(paper.journal || 'N/A')}</span></div>
                        <div class="flex justify-between"><span class="font-medium text-stone-500 dark:text-stone-400">Year:</span><span class="text-stone-700 dark:text-stone-300">${paper.year || 'N/A'}</span></div>
                        <div class="flex justify-between items-start"><span class="font-medium text-stone-500 dark:text-stone-400">DOI/URL:</span><a class="text-primary hover:underline truncate text-right" href="${paper.doi ? `https://doi.org/${paper.doi}` : '#'}" target="_blank" rel="noopener noreferrer">${escapeHtml(paper.doi || 'N/A')}</a></div>
                        ${paper.updatedAt ? `<div class="flex justify-between items-center pt-2 border-t border-stone-200 dark:border-stone-700"><span class="font-medium text-stone-500 dark:text-stone-400">Last updated:</span><span class="text-stone-600 dark:text-stone-400 text-sm">${formatRelativeTime(paper.updatedAt)}</span></div>` : ''}
                    </div>
                    ${paper.tags && paper.tags.length > 0 ? `
                        <div>
                            <h3 class="text-base font-bold text-stone-900 dark:text-white mb-3">Tags</h3>
                            <div class="flex flex-wrap gap-2">
                                ${paper.tags.map(tag => `<span class="text-xs font-medium bg-primary/10 text-primary px-2 py-1 rounded-full">#${escapeHtml(tag)}</span>`).join('')}
                            </div>
                        </div>
                    ` : ''}
                    ${paper.hasPdf ? `
                        <div>
                            <h3 class="text-base font-bold text-stone-900 dark:text-white mb-3">File</h3>
                            <button id="download-pdf-btn" class="w-full flex items-center justify-center gap-2 py-2 px-4 text-sm font-semibold text-white bg-primary rounded-lg hover:bg-primary/90">
                                <span class="material-symbols-outlined">download</span> Download PDF
                            </button>
                        </div>
                    ` : ''}
                    <div>
                        <h3 class="text-base font-bold text-stone-900 dark:text-white mb-3">Actions</h3>
                        <button id="generate-citation-btn" class="w-full flex items-center justify-center gap-2 py-2 px-4 text-sm font-semibold text-stone-700 dark:text-stone-200 bg-stone-100 dark:bg-stone-800 rounded-lg hover:bg-stone-200 dark:hover:bg-stone-700">
                            <span class="material-symbols-outlined">format_quote</span> Generate Citation
                        </button>
                    </div>
                    <div>
                        <div class="flex justify-between items-center mb-3">
                            <h3 class="text-base font-bold text-stone-900 dark:text-white">Related Papers</h3>
                            <button id="add-link-btn" class="text-sm font-medium text-primary hover:underline">Add Link</button>
                        </div>
                        <div id="related-papers-list" class="space-y-2">
                            <!-- Linked papers will be rendered here -->
                        </div>
                    </div>
                </div>
            </aside>
            <div class="flex-1 order-1 lg:order-2">
                <div class="bg-white dark:bg-stone-900/70 rounded-lg border border-stone-200 dark:border-stone-800 flex flex-col h-full">
                    <!-- Tab Navigation -->
                    <div class="border-b border-stone-200 dark:border-stone-800 flex-shrink-0">
                        <nav class="-mb-px flex gap-x-6 px-4" id="details-tabs">
                            <button data-tab="notes" class="tab-btn shrink-0 border-b-2 border-primary px-1 py-3 text-sm font-medium text-primary">Notes</button>
                            ${paper.hasPdf ? `<button data-tab="pdf" class="tab-btn shrink-0 border-b-2 border-transparent px-1 py-3 text-sm font-medium text-stone-500 hover:border-stone-300 hover:text-stone-700 dark:text-stone-400 dark:hover:border-stone-600 dark:hover:text-stone-200">PDF Preview</button>` : ''}
                        </nav>
                    </div>

                    <!-- Notes Panel -->
                    <div id="notes-panel" class="tab-panel flex-grow flex flex-col">
                        <div class="border-b border-stone-200 dark:border-stone-800 p-2 flex items-center gap-1 flex-shrink-0" id="notes-toolbar">
                            <button data-command="bold" class="p-2 rounded hover:bg-stone-100 dark:hover:bg-stone-800 text-stone-600 dark:text-stone-300">
                                <span class="material-symbols-outlined">format_bold</span>
                            </button>
                            <button data-command="italic" class="p-2 rounded hover:bg-stone-100 dark:hover:bg-stone-800 text-stone-600 dark:text-stone-300">
                                <span class="material-symbols-outlined">format_italic</span>
                            </button>
                            <button data-command="insertUnorderedList" class="p-2 rounded hover:bg-stone-100 dark:hover:bg-stone-800 text-stone-600 dark:text-stone-300">
                                <span class="material-symbols-outlined">format_list_bulleted</span>
                            </button>
                            <button data-command="insertOrderedList" class="p-2 rounded hover:bg-stone-100 dark:hover:bg-stone-800 text-stone-600 dark:text-stone-300">
                                <span class="material-symbols-outlined">format_list_numbered</span>
                            </button>
                        </div>
                        <div id="notes-editor" contenteditable="true" class="w-full flex-grow p-4 bg-transparent focus:outline-none resize-y overflow-auto" placeholder="Start writing your notes here..."></div>
                    </div>

                    <!-- PDF Panel -->
                    ${paper.hasPdf ? `
                        <div id="pdf-panel" class="tab-panel hidden flex-grow">
                            <iframe id="pdf-viewer" class="w-full h-full min-h-[80vh]" src=""></iframe>
                        </div>
                    ` : ''}
                </div>
            </div>
        </div>
    `;
        container.innerHTML = detailsHtml;
    },

    async setupEventListeners(paper) {
        const paperId = paper.id;

    const notesEditor = document.getElementById('notes-editor');
    if (notesEditor) {
        notesEditor.innerHTML = paper.notes || '';

        this.notesSaveHandler = async () => {
            const newNotes = notesEditor.innerHTML;
            if (newNotes === paper.notes) return;
            await updatePaper(paperId, { notes: newNotes });
            paper.notes = newNotes; // Update the local paper object to prevent stale data issues
            console.log(`Notes for paper ${paperId} updated.`);
        };
        notesEditor.addEventListener('blur', this.notesSaveHandler);

        const downloadPdfBtn = document.getElementById('download-pdf-btn');
        if (downloadPdfBtn && paper.pdfFile) {
            downloadPdfBtn.addEventListener('click', () => {
                const url = URL.createObjectURL(paper.pdfFile);
                const a = document.createElement('a');
                a.href = url;
                a.download = `${paper.title || 'download'}.pdf`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
            });
        }
    }

    const notesToolbar = document.getElementById('notes-toolbar');
    if (notesToolbar) {
        notesToolbar.addEventListener('click', (e) => {
            const button = e.target.closest('button');
            if (button && button.dataset.command) {
                e.preventDefault();
                document.execCommand(button.dataset.command, false, null);
                notesEditor.focus();
            }
        });
    }

    const tabsContainer = document.getElementById('details-tabs');
    if (tabsContainer) {
        const notesPanel = document.getElementById('notes-panel');
        const pdfPanel = document.getElementById('pdf-panel');
        const pdfViewer = document.getElementById('pdf-viewer');

        tabsContainer.addEventListener('click', (e) => {
            const tabButton = e.target.closest('.tab-btn');
            if (!tabButton) return;

            tabsContainer.querySelectorAll('.tab-btn').forEach(btn => {
                btn.classList.remove('border-primary', 'text-primary');
                btn.classList.add('border-transparent', 'text-stone-500');
            });
            tabButton.classList.add('border-primary', 'text-primary');
            tabButton.classList.remove('border-transparent', 'text-stone-500');

            if (tabButton.dataset.tab === 'pdf') {
                notesPanel.classList.add('hidden');
                pdfPanel.classList.remove('hidden');
                if (!this.pdfUrl && paper.pdfFile) {
                    this.pdfUrl = URL.createObjectURL(paper.pdfFile);
                    pdfViewer.src = this.pdfUrl;
                }
            } else {
                notesPanel.classList.remove('hidden');
                pdfPanel.classList.add('hidden');
            }
        });
    }

    const relatedPapersList = document.getElementById('related-papers-list');
    const addLinkBtn = document.getElementById('add-link-btn');

    const renderRelatedPapers = async () => {
        // Refetch the paper to get the most up-to-date relatedPaperIds
        const currentPaper = await getPaperById(paper.id);
        if (!currentPaper.relatedPaperIds || currentPaper.relatedPaperIds.length === 0) {
            relatedPapersList.innerHTML = `<p class="text-sm text-stone-500">No related papers linked.</p>`;
            return;
        }
        const relatedPapers = await Promise.all(currentPaper.relatedPaperIds.map(id => getPaperById(id)));
        relatedPapersList.innerHTML = relatedPapers
            .filter(p => p) // Filter out any null papers if a linked paper was deleted
            .map(p => `
                <div class="flex justify-between items-center group -mx-1 px-1 py-0.5 rounded-md hover:bg-stone-100 dark:hover:bg-stone-800/50">
                    <a href="#/details/${p.id}" class="block text-sm text-primary hover:underline truncate pr-2">${escapeHtml(p.title)}</a>
                    <button class="remove-link-btn p-1 rounded-full text-red-500 opacity-0 group-hover:opacity-100 transition-opacity" data-remove-id="${p.id}" title="Remove link">
                        <span class="material-symbols-outlined text-base">link_off</span>
                    </button>
                </div>
            `)
            .join('');
    };

    await renderRelatedPapers();

    relatedPapersList.addEventListener('click', async (e) => {
        const removeBtn = e.target.closest('.remove-link-btn');
        if (removeBtn) {
            e.preventDefault();
            const idToRemove = parseInt(removeBtn.dataset.removeId, 10);
            const currentPaper = await getPaperById(paper.id);
            const updatedRelatedIds = (currentPaper.relatedPaperIds || []).filter(id => id !== idToRemove);
            await updatePaper(paper.id, { relatedPaperIds: updatedRelatedIds });
            await renderRelatedPapers();
            showToast('Paper link removed.');
        }
    });

    addLinkBtn.addEventListener('click', async () => {
        // Add modal to the DOM only when needed
        if (document.getElementById('link-modal')) return; // Prevent multiple modals

        document.body.insertAdjacentHTML('beforeend', templates.linkModal);
        
        const modal = document.getElementById('link-modal');
        const modalList = document.getElementById('link-modal-list');
        const linkSearchInput = document.getElementById('link-search-input');
        const closeModalBtn = document.getElementById('close-link-modal-btn');

        modal.classList.remove('hidden');

        const allPapers = await getAllPapers();
        const currentPaper = await getPaperById(paper.id); // Get fresh data
        const papersToLink = allPapers.filter(p => 
            p.id !== currentPaper.id && !(currentPaper.relatedPaperIds || []).includes(p.id)
        );

        const renderLinkablePapers = (papers) => {
            if (papers.length === 0) {
                modalList.innerHTML = `<p class="text-sm text-stone-500">No other papers available to link.</p>`;
                return;
            }
            modalList.innerHTML = papers.map(p => `
                <div class="p-2 border-b dark:border-stone-800 flex justify-between items-center">
                    <span class="text-sm">${escapeHtml(p.title)}</span>
                    <button class="link-paper-btn text-sm text-primary hover:underline" data-link-id="${p.id}">Link</button>
                </div>
            `).join('');
        };

        renderLinkablePapers(papersToLink);

        const searchHandler = (e) => {
            const searchTerm = e.target.value.toLowerCase();
            const filtered = papersToLink.filter(p => p.title.toLowerCase().includes(searchTerm));
            renderLinkablePapers(filtered);
        };
        linkSearchInput.addEventListener('input', searchHandler);

        const linkHandler = async (e) => {
            if (e.target.classList.contains('link-paper-btn')) {
                const linkId = parseInt(e.target.dataset.linkId, 10);
                const freshPaper = await getPaperById(paper.id);
                const newRelatedIds = [...(freshPaper.relatedPaperIds || []), linkId];
                await updatePaper(paper.id, { relatedPaperIds: newRelatedIds });
                
                await renderRelatedPapers();
                closeModal();
                showToast('Paper linked successfully!');
            }
        };
        modalList.addEventListener('click', linkHandler);

        const closeModal = () => {
            const modalToRemove = document.getElementById('link-modal');
            if (modalToRemove) {
                // Clean up listeners to prevent memory leaks
                linkSearchInput.removeEventListener('input', searchHandler);
                modalList.removeEventListener('click', linkHandler);
                closeModalBtn.removeEventListener('click', this.closeModalHandler);
                modalToRemove.removeEventListener('click', this.closeModalHandler);
                modalToRemove.remove();
            }
        };

        this.closeModalHandler = (e) => {
            // Close if clicking the button or the background overlay
            if (e.target.id === 'close-link-modal-btn' || e.target.id === 'link-modal') {
                closeModal();
            }
        };

        closeModalBtn.addEventListener('click', this.closeModalHandler);
        modal.addEventListener('click', this.closeModalHandler);
    });

    const generateCitationBtn = document.getElementById('generate-citation-btn');
    if (generateCitationBtn) {
        generateCitationBtn.addEventListener('click', () => {
            if (document.getElementById('citation-modal')) return;

            document.body.insertAdjacentHTML('beforeend', templates.citationModal);
            const modal = document.getElementById('citation-modal');
            const modalContent = document.getElementById('citation-modal-content');
            const closeModalBtn = document.getElementById('close-citation-modal-btn');
            const doneBtn = document.getElementById('citation-modal-done-btn');

            const apaCitation = generateCitation(paper, 'apa');
            const ieeeCitation = generateCitation(paper, 'ieee');

            modalContent.innerHTML = `
                <div class="space-y-2">
                    <div class="flex justify-between items-center">
                        <label class="text-sm font-bold text-stone-800 dark:text-stone-200">APA Format</label>
                        <button class="copy-citation-btn text-sm font-medium text-primary hover:underline" data-format="apa">Copy</button>
                    </div>
                    <p id="apa-citation-text" class="p-3 bg-stone-100 dark:bg-stone-800/50 rounded-lg text-sm font-mono">${apaCitation}</p>
                </div>
                <div class="space-y-2">
                    <div class="flex justify-between items-center">
                        <label class="text-sm font-bold text-stone-800 dark:text-stone-200">IEEE Format</label>
                        <button class="copy-citation-btn text-sm font-medium text-primary hover:underline" data-format="ieee">Copy</button>
                    </div>
                    <p id="ieee-citation-text" class="p-3 bg-stone-100 dark:bg-stone-800/50 rounded-lg text-sm font-mono">${ieeeCitation}</p>
                </div>
            `;

            modal.classList.remove('hidden');

            const closeModal = () => {
                modal.remove();
            };

            closeModalBtn.addEventListener('click', closeModal);
            doneBtn.addEventListener('click', closeModal);
            modal.addEventListener('click', (e) => {
                if (e.target.id === 'citation-modal') closeModal();
            });

            modalContent.addEventListener('click', (e) => {
                if (e.target.classList.contains('copy-citation-btn')) {
                    const format = e.target.dataset.format;
                    const textToCopy = document.getElementById(`${format}-citation-text`).textContent;
                    navigator.clipboard.writeText(textToCopy).then(() => {
                        showToast('Citation copied to clipboard!');
                    });
                }
            });
        });
    }
}
}