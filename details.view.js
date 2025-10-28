import { getPaperById, updatePaper, getAllPapers, getAnnotationsByPaperId, addAnnotation, deleteAnnotation } from './db.js';
import { escapeHtml, showToast, formatRelativeTime } from './ui.js';
import { views as templates } from './views.js';
import { generateCitation } from './citation.js';

export const detailsView = {
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
                        <div class="flex justify-between"><span class="font-medium text-stone-500 dark:text-stone-400">Status:</span><span class="text-stone-700 dark:text-stone-300">${escapeHtml(paper.readingStatus || 'N/A')}</span></div>
                        ${paper.updatedAt ? `<div class="flex justify-between items-center pt-2 border-t border-stone-200 dark:border-stone-700"><span class="font-medium text-stone-500 dark:text-stone-400">Last updated:</span><span class="text-stone-600 dark:text-stone-400 text-sm">${formatRelativeTime(paper.updatedAt)}</span></div>` : ''}
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
                        <div id="pdf-panel" class="tab-panel hidden flex-grow flex flex-col">
                            <!-- PDF Toolbar -->
                            <div class="flex items-center justify-between px-4 py-3 border-b border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-900/50 flex-shrink-0">
                                <!-- Navigation Controls -->
                                <div class="flex items-center gap-2">
                                    <button id="pdf-prev-page" class="p-2 rounded hover:bg-stone-200 dark:hover:bg-stone-700 text-stone-600 dark:text-stone-300 disabled:opacity-50 disabled:cursor-not-allowed" title="Previous Page">
                                        <span class="material-symbols-outlined">chevron_left</span>
                                    </button>
                                    <div class="flex items-center gap-1 text-sm">
                                        <input type="number" id="pdf-page-input" min="1" class="w-16 h-8 px-2 text-center border border-stone-300 dark:border-stone-700 rounded bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100" value="1">
                                        <span class="text-stone-600 dark:text-stone-400">/ <span id="pdf-total-pages">-</span></span>
                                    </div>
                                    <button id="pdf-next-page" class="p-2 rounded hover:bg-stone-200 dark:hover:bg-stone-700 text-stone-600 dark:text-stone-300 disabled:opacity-50 disabled:cursor-not-allowed" title="Next Page">
                                        <span class="material-symbols-outlined">chevron_right</span>
                                    </button>
                                </div>
                                
                                <!-- Zoom Controls -->
                                <div class="flex items-center gap-2">
                                    <button id="pdf-zoom-out" class="p-2 rounded hover:bg-stone-200 dark:hover:bg-stone-700 text-stone-600 dark:text-stone-300" title="Zoom Out">
                                        <span class="material-symbols-outlined">zoom_out</span>
                                    </button>
                                    <select id="pdf-zoom-select" class="h-8 px-2 text-sm border border-stone-300 dark:border-stone-700 rounded bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100">
                                        <option value="auto">Auto</option>
                                        <option value="page-fit">Page Fit</option>
                                        <option value="page-width">Page Width</option>
                                        <option value="0.5">50%</option>
                                        <option value="0.75">75%</option>
                                        <option value="1" selected>100%</option>
                                        <option value="1.25">125%</option>
                                        <option value="1.5">150%</option>
                                        <option value="2">200%</option>
                                    </select>
                                    <button id="pdf-zoom-in" class="p-2 rounded hover:bg-stone-200 dark:hover:bg-stone-700 text-stone-600 dark:text-stone-300" title="Zoom In">
                                        <span class="material-symbols-outlined">zoom_in</span>
                                    </button>
                                </div>
                                
                                <!-- Search Controls -->
                                <div class="flex items-center gap-1" id="pdf-search-container">
                                    <button id="pdf-search-toggle" class="p-2 rounded hover:bg-stone-200 dark:hover:bg-stone-700 text-stone-600 dark:text-stone-300" title="Search in PDF">
                                        <span class="material-symbols-outlined">search</span>
                                    </button>
                                    <div id="pdf-search-box" class="hidden flex items-center gap-1">
                                        <input type="text" id="pdf-search-input" placeholder="Search in PDF..." class="w-40 h-8 px-2 text-sm border border-stone-300 dark:border-stone-700 rounded bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 focus:ring-2 focus:ring-primary focus:border-primary">
                                        <span id="pdf-search-count" class="text-xs text-stone-500 dark:text-stone-400 whitespace-nowrap hidden">0 of 0</span>
                                        <button id="pdf-search-prev" class="p-1 rounded hover:bg-stone-200 dark:hover:bg-stone-700 text-stone-600 dark:text-stone-300 disabled:opacity-50" title="Previous Match" disabled>
                                            <span class="material-symbols-outlined text-sm">arrow_upward</span>
                                        </button>
                                        <button id="pdf-search-next" class="p-1 rounded hover:bg-stone-200 dark:hover:bg-stone-700 text-stone-600 dark:text-stone-300 disabled:opacity-50" title="Next Match" disabled>
                                            <span class="material-symbols-outlined text-sm">arrow_downward</span>
                                        </button>
                                        <button id="pdf-search-close" class="p-1 rounded hover:bg-stone-200 dark:hover:bg-stone-700 text-stone-600 dark:text-stone-300" title="Close Search">
                                            <span class="material-symbols-outlined text-sm">close</span>
                                        </button>
                                    </div>
                                </div>
                                
                                <!-- Highlight Controls -->
                                <div class="flex items-center gap-1 border-l border-stone-300 dark:border-stone-700 pl-2">
                                    <button id="pdf-highlight-toggle" class="p-2 rounded hover:bg-stone-200 dark:hover:bg-stone-700 text-stone-600 dark:text-stone-300" title="Toggle Highlight Mode" data-active="false">
                                        <span class="material-symbols-outlined">highlighter_size_3</span>
                                    </button>
                                    <div id="pdf-highlight-colors" class="hidden flex items-center gap-1 border-l border-stone-300 dark:border-stone-700 pl-1">
                                        <button class="highlight-color w-6 h-6 rounded border-2 border-transparent hover:border-stone-400" data-color="yellow" style="background-color: #fef08a;" title="Yellow"></button>
                                        <button class="highlight-color w-6 h-6 rounded border-2 border-transparent hover:border-stone-400" data-color="orange" style="background-color: #fed7aa;" title="Orange"></button>
                                        <button class="highlight-color w-6 h-6 rounded border-2 border-transparent hover:border-stone-400" data-color="green" style="background-color: #bbf7d0;" title="Green"></button>
                                        <button class="highlight-color w-6 h-6 rounded border-2 border-stone-400" data-color="blue" style="background-color: #bfdbfe;" title="Blue (Selected)"></button>
                                    </div>
                                </div>
                                
                                <!-- Additional Controls -->
                                <div class="flex items-center gap-2">
                                    <button id="pdf-rotate" class="p-2 rounded hover:bg-stone-200 dark:hover:bg-stone-700 text-stone-600 dark:text-stone-300" title="Rotate">
                                        <span class="material-symbols-outlined">rotate_90_degrees_cw</span>
                                    </button>
                                    <button id="pdf-fullscreen" class="p-2 rounded hover:bg-stone-200 dark:hover:bg-stone-700 text-stone-600 dark:text-stone-300" title="Fullscreen">
                                        <span class="material-symbols-outlined">fullscreen</span>
                                    </button>
                                </div>
                            </div>
                            
                            <!-- PDF Canvas Container -->
                            <div id="pdf-canvas-container" class="flex-grow overflow-auto bg-stone-100 dark:bg-stone-900 flex items-start justify-center p-4">
                                <div id="pdf-page-wrapper" class="relative">
                                    <canvas id="pdf-canvas" class="shadow-lg bg-white"></canvas>
                                    <!-- Annotations layer will go here -->
                                    <div id="pdf-annotations-layer" class="absolute top-0 left-0 w-full h-full pointer-events-none"></div>
                                </div>
                            </div>
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

    // Reading Progress Event Listeners
    const currentPageInput = document.getElementById('current-page-input');
    const totalPagesInput = document.getElementById('total-pages-input');
    
    if (currentPageInput && totalPagesInput) {
        const updateProgress = async () => {
            const currentPage = parseInt(currentPageInput.value) || 0;
            const totalPages = parseInt(totalPagesInput.value) || 0;
            
            // Validate inputs
            if (currentPage < 0 || totalPages < 0) {
                showToast('Page numbers must be positive', 'warning');
                return;
            }
            
            if (currentPage > totalPages && totalPages > 0) {
                showToast('Current page cannot exceed total pages', 'warning');
                return;
            }
            
            try {
                // Update the paper with new progress
                await updatePaper(paperId, {
                    readingProgress: {
                        currentPage,
                        totalPages
                    }
                });
                
                // Update the progress display
                const progressDisplay = document.getElementById('progress-display');
                if (progressDisplay) {
                    progressDisplay.innerHTML = this.renderProgressBar({ currentPage, totalPages });
                }
                
                console.log(`Progress updated for paper ${paperId}: ${currentPage}/${totalPages}`);
            } catch (error) {
                console.error('Error updating reading progress:', error);
                showToast('Failed to save reading progress', 'error');
            }
        };
        
        currentPageInput.addEventListener('blur', updateProgress);
        totalPagesInput.addEventListener('blur', updateProgress);
        
        // Also update on Enter key
        currentPageInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                updateProgress();
            }
        });
        totalPagesInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                updateProgress();
            }
        });
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

    // PDF.js Viewer State
    const pdfState = {
        pdfDoc: null,
        currentPage: 1,
        totalPages: 0,
        scale: 1.0,
        rotation: 0,
        rendering: false,
        // Search state
        searchQuery: '',
        searchMatches: [],
        currentMatchIndex: -1,
        pageTextCache: new Map(), // Cache extracted text per page
        // Annotation state
        highlightMode: false,
        selectedColor: 'blue',
        annotations: [], // All annotations for this paper
        annotationsOnCurrentPage: [] // Filtered annotations for current page
    };

    // PDF.js Rendering Function
    const renderPdfPage = async (pageNum) => {
        if (pdfState.rendering) return;
        pdfState.rendering = true;

        try {
            const page = await pdfState.pdfDoc.getPage(pageNum);
            const canvas = document.getElementById('pdf-canvas');
            const ctx = canvas.getContext('2d');
            
            // Get device pixel ratio for high-DPI displays (Retina, etc.)
            const pixelRatio = window.devicePixelRatio || 1;
            
            // Adaptive rendering scale for crisp quality at ALL zoom levels
            // Low zoom (<100%): Render at minimum 2.0x for quality
            // High zoom (>=100%): Render at 2x the zoom level for excellent quality
            const MIN_RENDER_SCALE = 2.0;
            const renderScale = pdfState.scale < 1.0
                ? MIN_RENDER_SCALE  // Fixed high quality for small views
                : pdfState.scale * pixelRatio * 2.0;  // Proportional scaling for large views
            
            // Calculate viewport for rendering (high resolution)
            let renderViewport = page.getViewport({ scale: renderScale, rotation: pdfState.rotation });
            
            // Calculate viewport for display (actual zoom level)
            let displayViewport = page.getViewport({ scale: pdfState.scale, rotation: pdfState.rotation });
            
            // Set canvas internal dimensions to high resolution
            canvas.height = renderViewport.height;
            canvas.width = renderViewport.width;
            
            // Set canvas CSS dimensions to match desired zoom level
            canvas.style.width = `${displayViewport.width}px`;
            canvas.style.height = `${displayViewport.height}px`;
            
            // Update annotations layer size to match display size
            const annotationsLayer = document.getElementById('pdf-annotations-layer');
            if (annotationsLayer) {
                annotationsLayer.style.width = `${displayViewport.width}px`;
                annotationsLayer.style.height = `${displayViewport.height}px`;
            }
            
            // Render PDF page at high resolution
            const renderContext = {
                canvasContext: ctx,
                viewport: renderViewport
            };
            
            await page.render(renderContext).promise;
            
            // Update page number display
            pdfState.currentPage = pageNum;
            const pageInput = document.getElementById('pdf-page-input');
            if (pageInput) pageInput.value = pageNum;
            
            // Update navigation button states
            const prevBtn = document.getElementById('pdf-prev-page');
            const nextBtn = document.getElementById('pdf-next-page');
            if (prevBtn) prevBtn.disabled = pageNum <= 1;
            if (nextBtn) nextBtn.disabled = pageNum >= pdfState.totalPages;
            
            // Re-highlight search results if active search
            if (pdfState.searchQuery && pdfState.searchMatches.length > 0) {
                // Use setTimeout to ensure rendering is complete
                setTimeout(() => highlightSearchResults(), 50);
            }
            
            // Render saved annotations for current page
            setTimeout(() => renderAnnotations(), 50);
            
        } catch (error) {
            console.error('Error rendering PDF page:', error);
            showToast('Failed to render PDF page', 'error');
        } finally {
            pdfState.rendering = false;
        }
    };

    // Load PDF Document
    const loadPdfDocument = async (pdfFile) => {
        if (!pdfFile || !window.pdfjsLib) {
            console.error('PDF.js not loaded or no PDF file provided');
            return;
        }

        try {
            const arrayBuffer = await pdfFile.arrayBuffer();
            const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
            pdfState.pdfDoc = await loadingTask.promise;
            pdfState.totalPages = pdfState.pdfDoc.numPages;
            
            // Update total pages display
            const totalPagesEl = document.getElementById('pdf-total-pages');
            if (totalPagesEl) totalPagesEl.textContent = pdfState.totalPages;
            
            // Render first page
            await renderPdfPage(1);
            
            console.log(`PDF loaded: ${pdfState.totalPages} pages`);
            
            // Load annotations for this paper
            await loadAnnotations();
        } catch (error) {
            console.error('Error loading PDF:', error);
            showToast('Failed to load PDF document', 'error');
        }
    };

    // ====================  ANNOTATION FUNCTIONS ====================
    
    // Load all annotations for the current paper
    const loadAnnotations = async () => {
        try {
            pdfState.annotations = await getAnnotationsByPaperId(paper.id);
            console.log(`Loaded ${pdfState.annotations.length} annotations`);
        } catch (error) {
            console.error('Error loading annotations:', error);
            pdfState.annotations = [];
        }
    };
    
    // Render annotations on the current page
    const renderAnnotations = () => {
        const annotationsLayer = document.getElementById('pdf-annotations-layer');
        if (!annotationsLayer || !pdfState.pdfDoc) return;
        
        // Clear existing annotations
        annotationsLayer.innerHTML = '';
        
        // Filter annotations for current page
        const pageAnnotations = pdfState.annotations.filter(
            ann => ann.pageNumber === pdfState.currentPage && ann.type === 'highlight'
        );
        
        // Render each highlight
        pageAnnotations.forEach(annotation => {
            if (annotation.rects && annotation.rects.length > 0) {
                annotation.rects.forEach(rect => {
                    const highlight = document.createElement('div');
                    highlight.className = 'pdf-highlight';
                    highlight.dataset.annotationId = annotation.id;
                    highlight.style.position = 'absolute';
                    highlight.style.left = `${rect.x}px`;
                    highlight.style.top = `${rect.y}px`;
                    highlight.style.width = `${rect.width}px`;
                    highlight.style.height = `${rect.height}px`;
                    highlight.style.backgroundColor = getHighlightColor(annotation.color);
                    highlight.style.opacity = '0.4';
                    highlight.style.cursor = 'pointer';
                    highlight.style.pointerEvents = 'auto';
                    highlight.title = `${annotation.color} highlight - Click to delete`;
                    
                    // Delete on click
                    highlight.addEventListener('click', async (e) => {
                        e.stopPropagation();
                        if (confirm('Delete this highlight?')) {
                            await deleteHighlight(annotation.id);
                        }
                    });
                    
                    annotationsLayer.appendChild(highlight);
                });
            }
        });
    };
    
    // Create highlight from text selection
    const createHighlightFromSelection = async () => {
        const selection = window.getSelection();
        if (!selection || selection.rangeCount === 0 || selection.isCollapsed) {
            showToast('Please select some text to highlight', 'info');
            return;
        }
        
        const selectedText = selection.toString().trim();
        if (!selectedText) return;
        
        try {
            // Extract text content with positions for current page
            const page = await pdfState.pdfDoc.getPage(pdfState.currentPage);
            const textContent = await page.getTextContent();
            const viewport = page.getViewport({ scale: pdfState.scale, rotation: pdfState.rotation });
            
            // Find the selected text in PDF text layer
            const rects = [];
            let searchText = '';
            
            for (let i = 0; i < textContent.items.length; i++) {
                const item = textContent.items[i];
                searchText += item.str;
                
                if (searchText.includes(selectedText)) {
                    // Calculate bounding box for this text item
                    const tx = pdfjsLib.Util.transform(viewport.transform, item.transform);
                    const x = tx[4];
                    const y = viewport.height - tx[5] - item.height;
                    const width = item.width;
                    const height = item.height;
                    
                    rects.push({ x, y, width, height });
                    break;
                }
            }
            
            if (rects.length === 0) {
                showToast('Could not locate selected text in PDF', 'warning');
                return;
            }
            
            // Save annotation to database
            const annotation = {
                paperId: paper.id,
                type: 'highlight',
                pageNumber: pdfState.currentPage,
                color: pdfState.selectedColor,
                textContent: selectedText,
                rects: rects
            };
            
            const id = await addAnnotation(annotation);
            annotation.id = id;
            pdfState.annotations.push(annotation);
            
            // Re-render annotations
            renderAnnotations();
            
            // Clear selection
            selection.removeAllRanges();
            
            showToast(`Highlighted in ${pdfState.selectedColor}`, 'success');
        } catch (error) {
            console.error('Error creating highlight:', error);
            showToast('Failed to create highlight', 'error');
        }
    };
    
    // Delete a highlight
    const deleteHighlight = async (annotationId) => {
        try {
            await deleteAnnotation(annotationId);
            pdfState.annotations = pdfState.annotations.filter(ann => ann.id !== annotationId);
            renderAnnotations();
            showToast('Highlight deleted', 'success');
        } catch (error) {
            console.error('Error deleting highlight:', error);
            showToast('Failed to delete highlight', 'error');
        }
    };
    
    // Get color value for highlight
    const getHighlightColor = (colorName) => {
        const colors = {
            yellow: '#fef08a',
            orange: '#fed7aa',
            green: '#bbf7d0',
            blue: '#bfdbfe'
        };
        return colors[colorName] || colors.blue;
    };

    // Tab Switching
    const tabsContainer = document.getElementById('details-tabs');
    if (tabsContainer) {
        const notesPanel = document.getElementById('notes-panel');
        const pdfPanel = document.getElementById('pdf-panel');

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
                if (!pdfState.pdfDoc && paper.pdfFile) {
                    loadPdfDocument(paper.pdfFile);
                }
            } else {
                notesPanel.classList.remove('hidden');
                pdfPanel.classList.add('hidden');
            }
        });
    }

    // PDF Navigation Controls
    const prevPageBtn = document.getElementById('pdf-prev-page');
    const nextPageBtn = document.getElementById('pdf-next-page');
    const pageInput = document.getElementById('pdf-page-input');

    if (prevPageBtn) {
        prevPageBtn.addEventListener('click', () => {
            if (pdfState.currentPage > 1) {
                renderPdfPage(pdfState.currentPage - 1);
            }
        });
    }

    if (nextPageBtn) {
        nextPageBtn.addEventListener('click', () => {
            if (pdfState.currentPage < pdfState.totalPages) {
                renderPdfPage(pdfState.currentPage + 1);
            }
        });
    }

    if (pageInput) {
        pageInput.addEventListener('change', (e) => {
            const pageNum = parseInt(e.target.value);
            if (pageNum >= 1 && pageNum <= pdfState.totalPages) {
                renderPdfPage(pageNum);
            } else {
                e.target.value = pdfState.currentPage;
            }
        });
        
        pageInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                pageInput.blur();
            }
        });
    }

    // PDF Zoom Controls
    const zoomInBtn = document.getElementById('pdf-zoom-in');
    const zoomOutBtn = document.getElementById('pdf-zoom-out');
    const zoomSelect = document.getElementById('pdf-zoom-select');

    if (zoomInBtn) {
        zoomInBtn.addEventListener('click', () => {
            pdfState.scale = Math.min(pdfState.scale + 0.25, 3.0);
            zoomSelect.value = pdfState.scale;
            renderPdfPage(pdfState.currentPage);
        });
    }

    if (zoomOutBtn) {
        zoomOutBtn.addEventListener('click', () => {
            pdfState.scale = Math.max(pdfState.scale - 0.25, 0.25);
            zoomSelect.value = pdfState.scale;
            renderPdfPage(pdfState.currentPage);
        });
    }

    if (zoomSelect) {
        zoomSelect.addEventListener('change', (e) => {
            const value = e.target.value;
            if (value === 'auto' || value === 'page-fit' || value === 'page-width') {
                // TODO: Implement auto-fit logic
                pdfState.scale = 1.0;
            } else {
                pdfState.scale = parseFloat(value);
            }
            renderPdfPage(pdfState.currentPage);
        });
    }

    // PDF Rotation Control
    const rotateBtn = document.getElementById('pdf-rotate');
    if (rotateBtn) {
        rotateBtn.addEventListener('click', () => {
            pdfState.rotation = (pdfState.rotation + 90) % 360;
            renderPdfPage(pdfState.currentPage);
        });
    }

    // PDF Fullscreen Control
    const fullscreenBtn = document.getElementById('pdf-fullscreen');
    if (fullscreenBtn) {
        fullscreenBtn.addEventListener('click', () => {
            // Use the entire PDF panel (includes toolbar) for fullscreen
            const pdfPanel = document.getElementById('pdf-panel');
            if (pdfPanel) {
                if (!document.fullscreenElement) {
                    pdfPanel.requestFullscreen().catch(err => {
                        console.error('Error attempting to enable fullscreen:', err);
                        showToast('Failed to enter fullscreen mode', 'error');
                    });
                } else {
                    document.exitFullscreen();
                }
            }
        });
        
        // Update fullscreen icon when entering/exiting fullscreen
        document.addEventListener('fullscreenchange', () => {
            const icon = fullscreenBtn.querySelector('.material-symbols-outlined');
            if (icon) {
                icon.textContent = document.fullscreenElement ? 'fullscreen_exit' : 'fullscreen';
            }
        });
    }

    // PDF Highlight Controls
    const highlightToggle = document.getElementById('pdf-highlight-toggle');
    const highlightColors = document.getElementById('pdf-highlight-colors');
    
    if (highlightToggle) {
        highlightToggle.addEventListener('click', () => {
            pdfState.highlightMode = !pdfState.highlightMode;
            highlightToggle.dataset.active = pdfState.highlightMode;
            
            if (pdfState.highlightMode) {
                highlightToggle.classList.add('bg-primary', 'text-white');
                highlightToggle.classList.remove('text-stone-600', 'dark:text-stone-300');
                highlightColors.classList.remove('hidden');
                showToast('Highlight mode ON - Select text to highlight', 'info');
            } else {
                highlightToggle.classList.remove('bg-primary', 'text-white');
                highlightToggle.classList.add('text-stone-600', 'dark:text-stone-300');
                highlightColors.classList.add('hidden');
                showToast('Highlight mode OFF', 'info');
            }
        });
    }
    
    // Color selection buttons
    if (highlightColors) {
        const colorButtons = highlightColors.querySelectorAll('.highlight-color');
        colorButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                // Update selected color
                pdfState.selectedColor = btn.dataset.color;
                
                // Update UI to show selected color
                colorButtons.forEach(b => {
                    b.classList.remove('border-2', 'border-stone-400');
                    b.classList.add('border-2', 'border-transparent');
                });
                btn.classList.remove('border-transparent');
                btn.classList.add('border-stone-400');
            });
        });
    }
    
    // Listen for mouseup on PDF canvas to create highlights
    const pdfCanvasContainer = document.getElementById('pdf-canvas-container');
    if (pdfCanvasContainer) {
        pdfCanvasContainer.addEventListener('mouseup', async (e) => {
            if (pdfState.highlightMode && pdfState.pdfDoc) {
                // Small delay to ensure selection is complete
                setTimeout(() => {
                    createHighlightFromSelection();
                }, 100);
            }
        });
    }

    // PDF Search Functionality
    const extractTextFromPage = async (pageNum) => {
        // Check cache first
        if (pdfState.pageTextCache.has(pageNum)) {
            return pdfState.pageTextCache.get(pageNum);
        }

        try {
            const page = await pdfState.pdfDoc.getPage(pageNum);
            const textContent = await page.getTextContent();
            const textItems = textContent.items.map(item => item.str);
            const pageText = textItems.join(' ');
            
            // Cache the extracted text
            pdfState.pageTextCache.set(pageNum, pageText);
            return pageText;
        } catch (error) {
            console.error(`Error extracting text from page ${pageNum}:`, error);
            return '';
        }
    };

    const searchInPdf = async (query) => {
        if (!query || query.trim().length === 0) {
            pdfState.searchMatches = [];
            pdfState.currentMatchIndex = -1;
            pdfState.searchQuery = '';
            updateSearchUI();
            // Clear highlights immediately
            const annotationsLayer = document.getElementById('pdf-annotations-layer');
            if (annotationsLayer) annotationsLayer.innerHTML = '';
            return;
        }

        pdfState.searchQuery = query.toLowerCase();
        pdfState.searchMatches = [];
        pdfState.currentMatchIndex = -1;

        // Search through all pages
        for (let pageNum = 1; pageNum <= pdfState.totalPages; pageNum++) {
            const pageText = await extractTextFromPage(pageNum);
            const pageLower = pageText.toLowerCase();
            
            // Find all occurrences in this page
            let startIndex = 0;
            while ((startIndex = pageLower.indexOf(pdfState.searchQuery, startIndex)) !== -1) {
                pdfState.searchMatches.push({ page: pageNum, index: startIndex });
                startIndex += pdfState.searchQuery.length;
            }
        }

        if (pdfState.searchMatches.length > 0) {
            pdfState.currentMatchIndex = 0;
            // Navigate to first match
            const firstMatch = pdfState.searchMatches[0];
            if (pdfState.currentPage !== firstMatch.page) {
                await renderPdfPage(firstMatch.page);
            }
        }

        updateSearchUI();
        highlightSearchResults();
    };

    const highlightSearchResults = async () => {
        const annotationsLayer = document.getElementById('pdf-annotations-layer');
        
        if (!annotationsLayer || pdfState.searchMatches.length === 0) {
            // Clear existing highlights
            if (annotationsLayer) annotationsLayer.innerHTML = '';
            return;
        }

        // Clear existing highlights
        annotationsLayer.innerHTML = '';

        // Get matches on current page
        const currentPageMatches = pdfState.searchMatches.filter(m => m.page === pdfState.currentPage);
        
        if (currentPageMatches.length === 0) return;

        try {
            const page = await pdfState.pdfDoc.getPage(pdfState.currentPage);
            const textContent = await page.getTextContent();
            
            // Get device pixel ratio for proper scaling
            const pixelRatio = window.devicePixelRatio || 1;
            const MIN_RENDER_SCALE = 2.0;
            const renderScale = pdfState.scale < 1.0
                ? MIN_RENDER_SCALE
                : pdfState.scale * pixelRatio * 2.0;
            
            // Calculate viewport (same as rendering)
            const viewport = page.getViewport({ scale: renderScale, rotation: pdfState.rotation });
            const displayViewport = page.getViewport({ scale: pdfState.scale, rotation: pdfState.rotation });
            
            // Build text positions map
            const textItems = textContent.items;
            let fullText = '';
            const positions = [];
            
            for (let i = 0; i < textItems.length; i++) {
                const item = textItems[i];
                const text = item.str;
                const startIndex = fullText.length;
                fullText += text + ' ';
                
                // Store position info for this text item
                positions.push({
                    startIndex: startIndex,
                    endIndex: startIndex + text.length,
                    transform: item.transform,
                    width: item.width,
                    height: item.height,
                    text: text
                });
            }
            
            // Find all matches in the full text
            const searchLower = pdfState.searchQuery.toLowerCase();
            const fullTextLower = fullText.toLowerCase();
            const pageMatches = [];
            
            let startIdx = 0;
            while ((startIdx = fullTextLower.indexOf(searchLower, startIdx)) !== -1) {
                pageMatches.push({ start: startIdx, end: startIdx + searchLower.length });
                startIdx += searchLower.length;
            }
            
            // Find the index of the current match on this page
            let currentMatchIndexOnPage = -1;
            if (pdfState.currentMatchIndex >= 0) {
                const currentMatch = pdfState.searchMatches[pdfState.currentMatchIndex];
                if (currentMatch && currentMatch.page === pdfState.currentPage) {
                    // Count how many matches on this page come before the current match
                    currentMatchIndexOnPage = pdfState.searchMatches
                        .filter(m => m.page === pdfState.currentPage && m.index < currentMatch.index)
                        .length;
                }
            }
            
            // Create highlight overlays for each match
            pageMatches.forEach((match, matchIndex) => {
                // Find which text item(s) contain this match
                for (let i = 0; i < positions.length; i++) {
                    const pos = positions[i];
                    
                    // Check if this position overlaps with the match
                    if (match.start < pos.endIndex && match.end > pos.startIndex) {
                        // Calculate the portion of the match in this text item
                        const matchStartInItem = Math.max(0, match.start - pos.startIndex);
                        const matchEndInItem = Math.min(pos.text.length, match.end - pos.startIndex);
                        
                        // Calculate highlight rectangle in PDF coordinates
                        const tx = pos.transform[4];
                        const ty = pos.transform[5];
                        const fontSize = Math.sqrt(pos.transform[2] * pos.transform[2] + pos.transform[3] * pos.transform[3]);
                        
                        // Estimate character width
                        const charWidth = pos.width / pos.text.length;
                        const highlightWidth = charWidth * (matchEndInItem - matchStartInItem);
                        const highlightX = tx + (charWidth * matchStartInItem);
                        
                        // Convert PDF coordinates to viewport coordinates
                        const [x1, y1] = viewport.convertToViewportPoint(highlightX, ty);
                        const [x2, y2] = viewport.convertToViewportPoint(highlightX + highlightWidth, ty + fontSize);
                        
                        // Calculate proper dimensions (handle rotation)
                        const viewportX = Math.min(x1, x2);
                        const viewportY = Math.min(y1, y2);
                        const viewportWidth = Math.abs(x2 - x1);
                        const viewportHeight = Math.abs(y2 - y1);
                        
                        // Scale to display coordinates
                        const scaleRatio = displayViewport.width / viewport.width;
                        const displayX = viewportX * scaleRatio;
                        const displayY = viewportY * scaleRatio;
                        const displayWidth = viewportWidth * scaleRatio;
                        const displayHeight = viewportHeight * scaleRatio;
                        
                        // Create highlight element
                        const highlight = document.createElement('div');
                        highlight.className = 'absolute pointer-events-none';
                        highlight.style.left = `${displayX}px`;
                        highlight.style.top = `${displayY}px`;
                        highlight.style.width = `${displayWidth}px`;
                        highlight.style.height = `${displayHeight}px`;
                        
                        // Determine if this is the current match
                        const isCurrentMatch = matchIndex === currentMatchIndexOnPage;
                        
                        // Style: current match = orange, others = yellow
                        if (isCurrentMatch) {
                            highlight.style.backgroundColor = 'rgba(255, 165, 0, 0.4)'; // Orange
                            highlight.style.border = '2px solid rgba(255, 140, 0, 0.8)';
                        } else {
                            highlight.style.backgroundColor = 'rgba(255, 255, 0, 0.3)'; // Yellow
                        }
                        
                        annotationsLayer.appendChild(highlight);
                    }
                }
            });
            
        } catch (error) {
            console.error('Error highlighting search results:', error);
            // Fallback: show simple badge if highlighting fails
            const matchInfo = document.createElement('div');
            matchInfo.className = 'absolute top-2 left-2 bg-yellow-200 dark:bg-yellow-600 text-stone-900 dark:text-white px-2 py-1 rounded text-xs font-medium shadow';
            matchInfo.textContent = `${currentPageMatches.length} match${currentPageMatches.length > 1 ? 'es' : ''} on this page`;
            annotationsLayer.appendChild(matchInfo);
        }
    };

    const updateSearchUI = () => {
        const countEl = document.getElementById('pdf-search-count');
        const prevBtn = document.getElementById('pdf-search-prev');
        const nextBtn = document.getElementById('pdf-search-next');

        if (pdfState.searchMatches.length === 0) {
            if (countEl) {
                countEl.classList.add('hidden');
            }
            if (prevBtn) prevBtn.disabled = true;
            if (nextBtn) nextBtn.disabled = true;
        } else {
            if (countEl) {
                countEl.textContent = `${pdfState.currentMatchIndex + 1} of ${pdfState.searchMatches.length}`;
                countEl.classList.remove('hidden');
            }
            if (prevBtn) prevBtn.disabled = pdfState.currentMatchIndex <= 0;
            if (nextBtn) nextBtn.disabled = pdfState.currentMatchIndex >= pdfState.searchMatches.length - 1;
        }
    };

    const navigateSearchMatch = async (direction) => {
        if (pdfState.searchMatches.length === 0) return;

        if (direction === 'next' && pdfState.currentMatchIndex < pdfState.searchMatches.length - 1) {
            pdfState.currentMatchIndex++;
        } else if (direction === 'prev' && pdfState.currentMatchIndex > 0) {
            pdfState.currentMatchIndex--;
        } else {
            return; // No navigation needed
        }

        const match = pdfState.searchMatches[pdfState.currentMatchIndex];
        if (match.page !== pdfState.currentPage) {
            await renderPdfPage(match.page);
        }

        updateSearchUI();
        highlightSearchResults();
    };

    // Search UI Event Listeners
    const searchToggle = document.getElementById('pdf-search-toggle');
    const searchBox = document.getElementById('pdf-search-box');
    const searchInput = document.getElementById('pdf-search-input');
    const searchClose = document.getElementById('pdf-search-close');
    const searchPrev = document.getElementById('pdf-search-prev');
    const searchNext = document.getElementById('pdf-search-next');

    if (searchToggle && searchBox) {
        searchToggle.addEventListener('click', () => {
            searchBox.classList.toggle('hidden');
            if (!searchBox.classList.contains('hidden')) {
                searchInput?.focus();
            } else {
                // Clear search when closing
                if (searchInput) searchInput.value = '';
                searchInPdf('');
            }
        });
    }

    if (searchClose) {
        searchClose.addEventListener('click', () => {
            searchBox?.classList.add('hidden');
            if (searchInput) searchInput.value = '';
            searchInPdf('');
        });
    }

    if (searchInput) {
        // Search on input with debounce
        let searchTimeout;
        searchInput.addEventListener('input', (e) => {
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(() => {
                searchInPdf(e.target.value);
            }, 300); // 300ms debounce
        });

        // Search on Enter key
        searchInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                clearTimeout(searchTimeout);
                searchInPdf(e.target.value);
            }
        });
    }

    if (searchPrev) {
        searchPrev.addEventListener('click', () => navigateSearchMatch('prev'));
    }

    if (searchNext) {
        searchNext.addEventListener('click', () => navigateSearchMatch('next'));
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
    },

    // Helper method to render progress bar
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

    // Helper method to calculate progress percentage
    calculateProgress(current, total) {
        if (!current || !total || total === 0) return 0;
        return Math.min(Math.round((current / total) * 100), 100);
    }
};