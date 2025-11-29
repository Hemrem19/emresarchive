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

    async mount(paperId, appState) {
        this.paperId = paperId;
        const container = document.getElementById('paper-details-container');
        if (!container) return;

        let paper = await getPaperById(paperId);

        if (!paper) {
            container.innerHTML = `<h2>Paper not found</h2><p>The requested paper could not be found. <a href="#/" class="text-primary hover:underline">Go back to dashboard</a>.</p>`;
            return;
        }

        this.render(paper);
        this.setupEventListeners(paper);
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
        <div class="flex flex-col lg:flex-row gap-8">
            <aside class="w-full lg:w-96 lg:flex-shrink-0 order-2 lg:order-1">
                <div class="space-y-6 bg-white dark:bg-stone-900/70 p-6 rounded-lg border border-stone-200 dark:border-stone-800">
                    <div>
                        <div class="flex items-start justify-between gap-3 mb-2">
                            <h1 class="text-xl font-bold text-stone-900 dark:text-white flex-1">${escapeHtml(paper.title)}</h1>
                            <a href="#/edit/${paper.id}" class="flex items-center gap-1.5 px-3 py-1.5 bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 text-stone-700 dark:text-stone-300 rounded-lg transition-colors text-sm font-medium whitespace-nowrap">
                                <span class="material-symbols-outlined text-lg">edit</span>
                                <span>Edit</span>
                            </a>
                        </div>
                        <p class="text-sm text-stone-600 dark:text-stone-400">${escapeHtml((paper.authors && Array.isArray(paper.authors) ? paper.authors.join(', ') : 'Unknown Author'))}</p>
                    </div>
                    <div class="space-y-3 text-sm">
                        <div class="flex justify-between"><span class="font-medium text-stone-500 dark:text-stone-400">Journal:</span><span class="text-stone-700 dark:text-stone-300 text-right">${escapeHtml(paper.journal || 'N/A')}</span></div>
                        <div class="flex justify-between"><span class="font-medium text-stone-500 dark:text-stone-400">Year:</span><span class="text-stone-700 dark:text-stone-300">${paper.year || 'N/A'}</span></div>
                        <div class="flex justify-between items-start"><span class="font-medium text-stone-500 dark:text-stone-400">DOI/URL:</span><a class="text-primary hover:underline truncate text-right" href="${paper.doi ? `https://doi.org/${paper.doi}` : '#'}" target="_blank" rel="noopener noreferrer">${escapeHtml(paper.doi || 'N/A')}</a></div>
                        <div class="flex justify-between"><span class="font-medium text-stone-500 dark:text-stone-400">Status:</span><span class="text-stone-700 dark:text-stone-300">${escapeHtml(paper.readingStatus || 'N/A')}</span></div>
                        ${paper.updatedAt ? `<div class="flex justify-between items-center pt-2 border-t border-stone-200 dark:border-stone-700"><span class="font-medium text-stone-500 dark:text-stone-400">Last updated:</span><span class="text-stone-600 dark:text-stone-400 text-sm">${formatRelativeTime(paper.updatedAt)}</span></div>` : ''}
                    </div>
                    <div>
                        <h3 class="text-base font-bold text-stone-900 dark:text-white mb-3">Rating</h3>
                        <div id="rating-container"></div>
                    </div>
                    ${paper.readingStatus === 'Reading' ? `
                        <div>
                            <h3 class="text-base font-bold text-stone-900 dark:text-white mb-3">Reading Progress</h3>
                            <div class="space-y-3">
                                <div class="flex gap-2 items-center">
                                    <div class="flex-1">
                                        <label class="block text-xs font-medium text-stone-500 dark:text-stone-400 mb-1">Current Page</label>
                                        <input type="number" id="current-page-input" min="0" value="${paper.readingProgress?.currentPage || 0}" class="w-full h-10 px-3 rounded-md border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 text-sm focus:ring-2 focus:ring-primary focus:border-primary">
                                    </div>
                                    <div class="flex-1">
                                        <label class="block text-xs font-medium text-stone-500 dark:text-stone-400 mb-1">Total Pages</label>
                                        <input type="number" id="total-pages-input" min="1" value="${paper.readingProgress?.totalPages || 0}" class="w-full h-10 px-3 rounded-md border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 text-sm focus:ring-2 focus:ring-primary focus:border-primary">
                                    </div>
                                </div>
                                <div id="progress-display" class="p-3 bg-stone-50 dark:bg-stone-800/50 rounded-lg">
                                    ${this.renderProgressBar(paper.readingProgress)}
                                </div>
                            </div>
                        </div>
                    ` : ''}
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
                            <div class="space-y-2">
                                <button id="read-paper-btn" class="w-full flex items-center justify-center gap-2 py-2 px-4 text-sm font-semibold text-white bg-primary rounded-lg hover:bg-primary/90">
                                    <span class="material-symbols-outlined">menu_book</span> Read Paper
                                </button>
                                <button id="download-pdf-btn" class="w-full flex items-center justify-center gap-2 py-2 px-4 text-sm font-semibold text-stone-700 dark:text-stone-200 bg-stone-100 dark:bg-stone-800 rounded-lg hover:bg-stone-200 dark:hover:bg-stone-700">
                                    <span class="material-symbols-outlined">download</span> Download PDF
                                </button>
                            </div>
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
                            <button data-tab="abstract" class="tab-btn shrink-0 border-b-2 border-transparent px-1 py-3 text-sm font-medium text-stone-500 dark:text-stone-400 hover:text-stone-700 dark:hover:text-stone-300 hover:border-stone-300 dark:hover:border-stone-600 transition-colors">Abstract</button>
                            <button data-tab="summary" class="tab-btn shrink-0 border-b-2 border-transparent px-1 py-3 text-sm font-medium text-stone-500 dark:text-stone-400 hover:text-stone-700 dark:hover:text-stone-300 hover:border-stone-300 dark:hover:border-stone-600 transition-colors">Summary</button>
                            <button data-tab="notes" class="tab-btn shrink-0 border-b-2 border-primary px-1 py-3 text-sm font-medium text-primary">Notes</button>
                        </nav>
                    </div>

                    <!-- Abstract Panel -->
                    <div id="abstract-panel" class="tab-panel hidden flex-grow flex flex-col">
                        <div class="p-6 overflow-y-auto">
                            ${paper.abstract ? `
                                <div class="prose prose-stone dark:prose-invert max-w-none">
                                    <p class="text-stone-700 dark:text-stone-300 whitespace-pre-wrap leading-relaxed">${escapeHtml(paper.abstract)}</p>
                                </div>
                            ` : `
                                <div class="flex flex-col items-center justify-center h-full text-center py-12">
                                    <span class="material-symbols-outlined text-4xl text-stone-300 dark:text-stone-700 mb-4">description</span>
                                    <p class="text-stone-500 dark:text-stone-400">No abstract available for this paper.</p>
                                </div>
                            `}
                        </div>
                    </div>

                    <!-- Summary Panel -->
                    <div id="summary-panel" class="tab-panel hidden flex-grow flex flex-col">
                        <div class="border-b border-stone-200 dark:border-stone-800 p-2 flex items-center gap-1 flex-shrink-0" id="summary-toolbar">
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
                        <div id="summary-editor" contenteditable="true" class="w-full flex-grow p-4 bg-transparent focus:outline-none resize-y overflow-auto" placeholder="Write a summary of this paper..."></div>
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

                </div>
            </div>
        </div>
        `;
        container.innerHTML = detailsHtml;
    },

    async setupEventListeners(paper) {
        const paperId = paper.id;

        // Initialize Notes Manager
        const notesEditor = document.getElementById('notes-editor');
        notesManager.initialize(paperId, notesEditor, paper.notes);

        // Initialize Summary Manager
        const summaryEditor = document.getElementById('summary-editor');
        summaryManager.initialize(paperId, summaryEditor, paper.summary || null);

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
                    btn.classList.remove('border-primary', 'text-primary');
                    btn.classList.add('border-transparent', 'text-stone-500', 'dark:text-stone-400');
                });
                button.classList.remove('border-transparent', 'text-stone-500', 'dark:text-stone-400');
                button.classList.add('border-primary', 'text-primary');
                
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
            return `<p class="text-sm text-stone-500 dark:text-stone-400 text-center">Set page numbers to track progress</p>`;
        }

        const percentage = Math.min(Math.round((current / total) * 100), 100);

        return `
            <div class="space-y-2">
                <div class="flex justify-between items-center text-sm">
                    <span class="text-stone-600 dark:text-stone-300 font-medium">Page ${current} of ${total}</span>
                    <span class="text-primary font-bold">${percentage}%</span>
                </div>
                <div class="w-full h-2 bg-stone-200 dark:bg-stone-700 rounded-full overflow-hidden">
                    <div class="h-full bg-primary transition-all duration-300" style="width: ${percentage}%"></div>
                </div>
            </div>
        `;
    },

    calculateProgress(current, total) {
        if (!current || !total || total === 0) return 0;
        return Math.min(Math.round((current / total) * 100), 100);
    }
};
