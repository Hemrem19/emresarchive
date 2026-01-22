import { getPaperById, updatePaper } from '../db.js';
import { escapeHtml, showToast, formatRelativeTime } from '../ui.js';
import { views as templates } from '../views/index.js';
import { generateCitation } from '../citation.js';
import { getPdfDownloadUrl, getPdfViewUrl } from '../api/papers.js';
import { isCloudSyncEnabled } from '../config.js';
import { isAuthenticated } from '../api/auth.js';
import { getApiBaseUrl } from '../config.js';
import { createRatingInput } from '../components/rating-input.js';

import { notesManager } from './notes.manager.js';
import { summaryManager } from './summary.manager.js';
import { relatedManager } from './related.manager.js';

export const detailsView = {
    paperId: null,
    hasUnsavedChanges: false,

    async mount(paperId, appState) {
        this.paperId = paperId;
        this.hasUnsavedChanges = false; // Reset state
        const container = document.getElementById('paper-details-container');
        if (!container) return;

        let paper = await getPaperById(paperId);

        if (!paper) {
            container.innerHTML = `<h2>Paper not found</h2><p>The requested paper could not be found. <a href="#/app" class="text-primary hover:underline">Go back to dashboard</a>.</p>`;
            return;
        }

        this.render(paper);
        this.setupEventListeners(paper, appState);
    },

    unmount() {
        const notesEditor = document.getElementById('notes-editor');
        const summaryEditor = document.getElementById('summary-editor');
        notesManager.cleanup(notesEditor);
        summaryManager.cleanup(summaryEditor);
        relatedManager.cleanup();

        // Clean up citation modal if open
        const citationModal = document.getElementById('citation-modal');
        if (citationModal) citationModal.remove();

        console.log('Details view unmounted.');
        this.paperId = null;
    },

    render(paper) {
        const container = document.getElementById('paper-details-container');
        if (!paper) return;

        const detailsHtml = `
        <div class="flex flex-col xl:flex-row gap-8">
            <aside class="w-full xl:w-96 order-2 xl:order-1 space-y-6">
                <div class="rounded-2xl border border-white/5 bg-slate-900/60 backdrop-blur-xl shadow-2xl shadow-black/40 p-6 space-y-6">
                    <div class="flex items-start justify-between gap-4">
                        <div class="flex-1">
                            <p class="text-[11px] uppercase tracking-[0.4em] text-slate-500 mb-3">Paper</p>
                            <h1 class="text-2xl font-bold text-white leading-snug">${escapeHtml(paper.title)}</h1>
                            <p class="text-sm text-slate-400 mt-3">${escapeHtml((paper.authors && Array.isArray(paper.authors) ? paper.authors.join(', ') : 'Unknown Author'))}</p>
                        </div>
                        <a href="#/edit/${paper.id}" class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-white/10 bg-white/5 text-slate-200 text-sm font-semibold hover:border-blue-400/40 hover:text-white transition-colors">
                            <span class="material-symbols-outlined text-lg">edit</span>
                            <span>Edit</span>
                        </a>
                        <button id="save-changes-btn" class="hidden inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-green-500/30 bg-green-500/10 text-green-400 text-sm font-semibold hover:bg-green-500/20 hover:text-green-300 transition-all">
                            <span class="material-symbols-outlined text-lg">save</span>
                            <span>Save Changes</span>
                        </button>
                    </div>
                    <div class="space-y-3 text-sm text-slate-300">
                        <div class="flex justify-between gap-3">
                            <span class="text-slate-500">Journal</span>
                            <span class="text-right">${escapeHtml(paper.journal || 'N/A')}</span>
                        </div>
                        <div class="flex justify-between gap-3">
                            <span class="text-slate-500">Year</span>
                            <span>${paper.year || 'N/A'}</span>
                        </div>
                        <div class="flex justify-between gap-3 items-start">
                            <span class="text-slate-500 whitespace-nowrap">DOI / URL</span>
                            ${paper.doi ? `
                                <a class="text-blue-300 hover:text-white transition-colors truncate max-w-[200px]" href="https://doi.org/${paper.doi}" target="_blank" rel="noopener noreferrer">${escapeHtml(paper.doi)}</a>
                            ` : `<span class="text-slate-500">N/A</span>`}
                        </div>
                        <div class="flex justify-between gap-3">
                            <span class="text-slate-500">Status</span>
                            <span>${escapeHtml(paper.readingStatus || 'N/A')}</span>
                        </div>
                        ${paper.updatedAt ? `
                            <div class="flex justify-between gap-3 pt-3 border-t border-white/5 text-xs uppercase tracking-wide text-slate-500">
                                <span>Last updated</span>
                                <span class="text-slate-300">${formatRelativeTime(paper.updatedAt)}</span>
                            </div>
                        ` : ''}
                    </div>
                    <div>
                        <div class="flex items-center justify-between mb-3">
                            <h3 class="text-sm font-semibold text-white tracking-wide uppercase">Rating</h3>
                            <span class="text-xs text-slate-500">0-10</span>
                        </div>
                        <div id="rating-container"></div>
                    </div>
                    ${paper.readingStatus === 'Reading' ? `
                        <div class="space-y-4">
                            <div class="flex items-center justify-between">
                                <h3 class="text-sm font-semibold text-white tracking-wide uppercase">Reading Progress</h3>
                                <span class="text-xs text-slate-500">Live</span>
                            </div>
                            <div class="flex gap-3">
                                <div class="flex-1">
                                    <label class="text-xs text-slate-500 uppercase tracking-wide mb-1 block">Current Page</label>
                                    <input type="number" id="current-page-input" min="0" value="${paper.readingProgress?.currentPage || 0}" class="w-full h-11 px-3 rounded-xl border border-white/10 bg-slate-900/70 text-slate-100 text-sm focus:border-blue-500 focus:ring-blue-500/40 transition-all">
                                </div>
                                <div class="flex-1">
                                    <label class="text-xs text-slate-500 uppercase tracking-wide mb-1 block">Total Pages</label>
                                    <input type="number" id="total-pages-input" min="1" value="${paper.readingProgress?.totalPages || 0}" class="w-full h-11 px-3 rounded-xl border border-white/10 bg-slate-900/70 text-slate-100 text-sm focus:border-blue-500 focus:ring-blue-500/40 transition-all">
                                </div>
                            </div>
                            <div id="progress-display" class="p-4 rounded-xl border border-white/5 bg-white/5">
                                ${this.renderProgressBar(paper.readingProgress)}
                            </div>
                        </div>
                    ` : ''}
                    ${paper.tags && paper.tags.length > 0 ? `
                        <div>
                            <h3 class="text-sm font-semibold text-white tracking-wide uppercase mb-3">Tags</h3>
                            <div class="flex flex-wrap gap-2">
                                ${paper.tags.map(tag => `
                                    <span class="px-3 py-1 rounded-full text-[11px] font-semibold bg-blue-500/10 border border-blue-500/30 text-blue-200">#${escapeHtml(tag)}</span>
                                `).join('')}
                            </div>
                        </div>
                    ` : ''}
                    ${paper.hasPdf ? `
                        <div class="space-y-3">
                            <h3 class="text-sm font-semibold text-white tracking-wide uppercase">File</h3>
                            <button id="read-paper-btn" class="w-full flex items-center justify-center gap-2 py-3 px-4 text-sm font-semibold text-white bg-primary rounded-xl shadow-lg shadow-blue-500/30 hover:bg-primary-dark transition-all">
                                <span class="material-symbols-outlined text-base">menu_book</span>
                                <span>Read Paper</span>
                            </button>
                            <button id="download-pdf-btn" class="w-full flex items-center justify-center gap-2 py-3 px-4 text-sm font-semibold text-slate-200 border border-white/10 rounded-xl bg-white/5 hover:bg-white/10 transition-all">
                                <span class="material-symbols-outlined text-base">download</span>
                                <span>Download PDF</span>
                            </button>
                        </div>
                    ` : ''}
                    <div class="space-y-3">
                        <h3 class="text-sm font-semibold text-white tracking-wide uppercase">Actions</h3>
                        <button id="generate-citation-btn" class="w-full flex items-center justify-center gap-2 py-3 px-4 text-sm font-semibold text-slate-200 border border-white/10 rounded-xl bg-gradient-to-r from-white/5 to-white/10 hover:from-white/10 hover:to-white/20 transition-all">
                            <span class="material-symbols-outlined text-base">format_quote</span>
                            <span>Generate Citation</span>
                        </button>
                    </div>
                    <div>
                        <div class="flex justify-between items-center mb-3">
                            <h3 class="text-sm font-semibold text-white tracking-wide uppercase">Related Papers</h3>
                            <button id="add-link-btn" class="text-xs font-semibold text-blue-300 hover:text-white transition-colors">+ Add Link</button>
                        </div>
                        <div id="related-papers-list" class="space-y-3 text-sm text-slate-300">
                            <!-- Linked papers render here -->
                        </div>
                    </div>
                </div>
            </aside>
            <section class="flex-1 order-1 xl:order-2">
                <div class="rounded-2xl border border-white/5 bg-slate-900/60 backdrop-blur-xl shadow-2xl shadow-black/50 flex flex-col h-full overflow-hidden">
                    <nav id="details-tabs" class="flex flex-wrap gap-2 px-4 pt-4 border-b border-white/5 bg-white/5">
                        <button data-tab="abstract" class="tab-btn px-4 py-2 rounded-xl border border-transparent text-xs font-semibold tracking-wide text-slate-400 hover:text-white hover:border-white/10 transition-all">Abstract</button>
                        <button data-tab="summary" class="tab-btn px-4 py-2 rounded-xl border border-transparent text-xs font-semibold tracking-wide text-slate-400 hover:text-white hover:border-white/10 transition-all">Summary</button>
                        <button data-tab="notes" class="tab-btn px-4 py-2 rounded-xl border border-primary text-xs font-semibold tracking-wide text-primary bg-primary/10 shadow-inner shadow-blue-500/30">Notes</button>
                    </nav>

                    <div id="abstract-panel" class="tab-panel hidden flex-grow flex flex-col">
                        <div class="p-6 overflow-y-auto text-slate-200 leading-relaxed">
                            ${paper.abstract ? `
                                <div class="prose prose-invert max-w-none">
                                    <p class="whitespace-pre-wrap">${escapeHtml(paper.abstract)}</p>
                                </div>
                            ` : `
                                <div class="flex flex-col items-center justify-center text-center py-16 gap-3">
                                    <span class="material-symbols-outlined text-4xl text-slate-700">draft</span>
                                    <p class="text-slate-500 text-sm">No abstract available for this paper.</p>
                                </div>
                            `}
                        </div>
                    </div>

                    <div id="summary-panel" class="tab-panel hidden flex-grow flex flex-col">
                        <div class="border-b border-white/5 bg-white/5 p-2 flex items-center gap-1 flex-shrink-0" id="summary-toolbar">
                            <button data-command="bold" class="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors">
                                <span class="material-symbols-outlined">format_bold</span>
                            </button>
                            <button data-command="italic" class="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors">
                                <span class="material-symbols-outlined">format_italic</span>
                            </button>
                            <button data-command="insertUnorderedList" class="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors">
                                <span class="material-symbols-outlined">format_list_bulleted</span>
                            </button>
                            <button data-command="insertOrderedList" class="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors">
                                <span class="material-symbols-outlined">format_list_numbered</span>
                            </button>
                        </div>
                        <div id="summary-editor" contenteditable="true" class="w-full flex-grow p-6 text-slate-100 leading-relaxed focus:outline-none overflow-auto" placeholder="Write a summary of this paper..."></div>
                    </div>

                    <div id="notes-panel" class="tab-panel flex-grow flex flex-col">
                        <div class="border-b border-white/5 bg-white/5 p-2 flex items-center gap-1 flex-shrink-0" id="notes-toolbar">
                            <button data-command="bold" class="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors">
                                <span class="material-symbols-outlined">format_bold</span>
                            </button>
                            <button data-command="italic" class="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors">
                                <span class="material-symbols-outlined">format_italic</span>
                            </button>
                            <button data-command="insertUnorderedList" class="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors">
                                <span class="material-symbols-outlined">format_list_bulleted</span>
                            </button>
                            <button data-command="insertOrderedList" class="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors">
                                <span class="material-symbols-outlined">format_list_numbered</span>
                            </button>
                        </div>
                        <div id="notes-editor" contenteditable="true" class="w-full flex-grow p-6 text-slate-100 leading-relaxed focus:outline-none overflow-auto" placeholder="Start writing your notes here..."></div>
                    </div>

                    <!-- Future PDF Panel slot -->
                </div>
            </section>
        </div>
        `;
        container.innerHTML = detailsHtml;
    },

    async setupEventListeners(paper, appState) {
        const paperId = paper.id;

        // Initialize Notes Manager
        const notesEditor = document.getElementById('notes-editor');
        notesManager.initialize(paperId, notesEditor, paper.notes, () => this.markAsDirty(appState));

        // Initialize Summary Manager
        const summaryEditor = document.getElementById('summary-editor');
        summaryManager.initialize(paperId, summaryEditor, paper.summary || null, () => this.markAsDirty(appState));

        // Save Button Handler
        const saveBtn = document.getElementById('save-changes-btn');
        if (saveBtn) {
            saveBtn.addEventListener('click', () => this.saveTextUpdates(appState));
        }

        // Initialize Related Papers Manager
        const relatedPapersList = document.getElementById('related-papers-list');
        const addLinkBtn = document.getElementById('add-link-btn');
        await relatedManager.initialize(paperId, {
            list: relatedPapersList,
            addBtn: addLinkBtn
        });

        // Initialize Rating Component
        const ratingContainer = document.getElementById('rating-container');
        if (ratingContainer) {
            const ratingComponent = createRatingInput({
                value: paper.rating || null,
                onChange: async (newRating) => {
                    try {
                        await updatePaper(paperId, { rating: newRating });
                        paper.rating = newRating;
                        showToast(newRating ? `Rating set to ${newRating}/10` : 'Rating cleared', 'success');
                    } catch (error) {
                        console.error('Error updating rating:', error);
                        showToast('Failed to update rating', 'error');
                    }
                },
                readOnly: false,
                size: 'md',
                displayMode: 'slider'
            });
            ratingContainer.appendChild(ratingComponent);
        }

        // Read Paper
        const readPaperBtn = document.getElementById('read-paper-btn');
        if (readPaperBtn && (paper.pdfFile || paper.s3Key || paper.pdfUrl)) {
            readPaperBtn.addEventListener('click', async () => {
                try {
                    if (paper.pdfFile) {
                        // Local file handling (simplified for now)
                        const url = URL.createObjectURL(paper.pdfFile);
                        if (window.Capacitor && window.Capacitor.isNativePlatform()) {
                            showToast('Opening local files on mobile is limited. Try downloading.', 'warning');
                        } else {
                            window.open(url, '_blank');
                        }
                    } else if (paper.s3Key || paper.pdfUrl) {
                        const useCloudSync = isCloudSyncEnabled() && isAuthenticated();
                        if (useCloudSync) {
                            showToast('Opening paper...', 'info');
                            const { downloadUrl } = await getPdfDownloadUrl(paperId);

                            if (window.Capacitor && window.Capacitor.isNativePlatform()) {
                                const { Browser } = Capacitor.Plugins;
                                await Browser.open({ url: downloadUrl });
                            } else {
                                window.open(downloadUrl, '_blank');
                            }
                        } else {
                            showToast('Cloud sync is required for cloud-stored PDFs', 'error');
                        }
                    }
                } catch (error) {
                    console.error('Error opening paper:', error);
                    showToast('Failed to open paper', 'error');
                }
            });
        }

        const downloadPdfBtn = document.getElementById('download-pdf-btn');
        if (downloadPdfBtn && (paper.pdfFile || paper.s3Key)) {
            downloadPdfBtn.addEventListener('click', async () => {
                try {
                    if (paper.pdfFile) {
                        const url = URL.createObjectURL(paper.pdfFile);
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = `${paper.title || 'download'}.pdf`;
                        document.body.appendChild(a);
                        a.click();
                        document.body.removeChild(a);
                        URL.revokeObjectURL(url);
                    } else if (paper.s3Key) {
                        const useCloudSync = isCloudSyncEnabled() && isAuthenticated();
                        if (useCloudSync) {
                            showToast('Getting download link...', 'info');
                            const { proxyUrl, downloadUrl } = await getPdfDownloadUrl(paperId);
                            const a = document.createElement('a');
                            a.href = downloadUrl;
                            a.download = `${paper.title || 'download'}.pdf`;
                            a.target = '_blank';
                            document.body.appendChild(a);
                            a.click();
                            document.body.removeChild(a);
                            showToast('Download started', 'success');
                        } else {
                            showToast('Cloud sync is required for cloud-stored PDFs', 'error');
                        }
                    }
                } catch (error) {
                    console.error('Error downloading PDF:', error);
                    showToast('Failed to download PDF', 'error');
                }
            });
        }

        // Reading Progress
        const currentPageInput = document.getElementById('current-page-input');
        const totalPagesInput = document.getElementById('total-pages-input');
        if (currentPageInput && totalPagesInput) {
            const updateProgress = async () => {
                const currentPage = parseInt(currentPageInput.value) || 0;
                const totalPages = parseInt(totalPagesInput.value) || 0;

                if (currentPage < 0 || totalPages < 0) {
                    showToast('Page numbers must be positive', 'warning');
                    return;
                }
                if (currentPage > totalPages && totalPages > 0) {
                    showToast('Current page cannot exceed total pages', 'warning');
                    return;
                }

                try {
                    await updatePaper(paperId, { readingProgress: { currentPage, totalPages } });
                    const progressDisplay = document.getElementById('progress-display');
                    if (progressDisplay) {
                        progressDisplay.innerHTML = this.renderProgressBar({ currentPage, totalPages });
                    }
                } catch (error) {
                    console.error('Error updating reading progress:', error);
                    showToast('Failed to save reading progress', 'error');
                }
            };

            currentPageInput.addEventListener('blur', updateProgress);
            totalPagesInput.addEventListener('blur', updateProgress);
            currentPageInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); updateProgress(); } });
            totalPagesInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); updateProgress(); } });
        }

        // Notes Toolbar
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

        // Tab Switching
        const tabButtons = document.querySelectorAll('#details-tabs .tab-btn');
        const tabPanels = document.querySelectorAll('.tab-panel');

        tabButtons.forEach(button => {
            button.addEventListener('click', () => {
                const targetTab = button.dataset.tab;

                // Update button states
                tabButtons.forEach(btn => {
                    btn.classList.remove('border-primary', 'text-primary', 'bg-primary/10', 'shadow-inner', 'shadow-blue-500/30');
                    btn.classList.add('border-transparent', 'text-slate-400');
                });
                button.classList.remove('border-transparent', 'text-slate-400');
                button.classList.add('border-primary', 'text-primary', 'bg-primary/10', 'shadow-inner', 'shadow-blue-500/30');

                // Show/hide panels
                tabPanels.forEach(panel => {
                    panel.classList.add('hidden');
                });
                const targetPanel = document.getElementById(`${targetTab}-panel`);
                if (targetPanel) {
                    targetPanel.classList.remove('hidden');
                }
            });
        });

        // Citation Generation
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

                const closeModal = () => modal.remove();
                closeModalBtn.addEventListener('click', closeModal);
                doneBtn.addEventListener('click', closeModal);
                modal.addEventListener('click', (e) => { if (e.target.id === 'citation-modal') closeModal(); });
                modalContent.addEventListener('click', (e) => {
                    if (e.target.classList.contains('copy-citation-btn')) {
                        const format = e.target.dataset.format;
                        const textToCopy = document.getElementById(`${format}-citation-text`).textContent;
                        navigator.clipboard.writeText(textToCopy).then(() => showToast('Citation copied to clipboard!'));
                    }
                });
            });
        }
    },

    renderProgressBar(readingProgress) {
        const current = readingProgress?.currentPage || 0;
        const total = readingProgress?.totalPages || 0;

        if (total === 0 || current === 0) {
            return `<p class="text-sm text-slate-500 text-center">Set page numbers to track progress</p>`;
        }

        const percentage = Math.min(Math.round((current / total) * 100), 100);

        return `
            <div class="space-y-3">
                <div class="flex justify-between items-center text-xs uppercase tracking-wide text-slate-400">
                    <span>Page ${current} of ${total}</span>
                    <span class="text-blue-300 font-semibold">${percentage}%</span>
                </div>
                <div class="w-full h-2.5 bg-slate-800 rounded-full overflow-hidden">
                    <div class="h-full bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500 transition-all duration-500" style="width: ${percentage}%"></div>
                </div>
            </div>
        `;
    },

    calculateProgress(current, total) {
        if (!current || !total || total === 0) return 0;
        return Math.min(Math.round((current / total) * 100), 100);
    },

    markAsDirty(appState) {
        if (!this.hasUnsavedChanges) {
            this.hasUnsavedChanges = true;
            if (appState) appState.hasUnsavedChanges = true;

            const saveBtn = document.getElementById('save-changes-btn');
            if (saveBtn) {
                saveBtn.classList.remove('hidden');
            }
        }
    },

    async saveTextUpdates(appState) {
        if (!this.paperId) return;

        const notesEditor = document.getElementById('notes-editor');
        const summaryEditor = document.getElementById('summary-editor');

        const updates = {};
        if (notesEditor) updates.notes = notesEditor.innerHTML;
        if (summaryEditor) updates.summary = summaryEditor.innerHTML;

        try {
            await updatePaper(this.paperId, updates);

            this.hasUnsavedChanges = false;
            if (appState) appState.hasUnsavedChanges = false;

            const saveBtn = document.getElementById('save-changes-btn');
            if (saveBtn) {
                saveBtn.classList.add('hidden');
            }

            showToast('Changes saved successfully', 'success');
        } catch (error) {
            console.error('Error saving changes:', error);
            showToast('Failed to save changes', 'error');
        }
    }
};
