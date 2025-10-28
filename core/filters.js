// core/filters.js
// Filter and Pagination Logic

import { sortPapers, renderPaperList, highlightActiveSidebarLink } from '../ui.js';

/**
 * Filters papers based on active filters (status, tags, search)
 * 
 * @param {Array} papers - Array of paper objects
 * @param {Object} appState - Application state object
 * @returns {Array} Filtered array of papers
 */
export const getFilteredPapers = (papers, appState) => {
    let filtered = [...papers];

    // Apply status filter
    if (appState.activeFilters.status) {
        filtered = filtered.filter(p => p.readingStatus === appState.activeFilters.status);
    }

    // Apply tag filters (multiple tags - paper must have ALL selected tags)
    if (appState.activeFilters.tags && appState.activeFilters.tags.length > 0) {
        filtered = filtered.filter(p => 
            p.tags && appState.activeFilters.tags.every(tag => p.tags.includes(tag))
        );
    }

    // Apply search filter
    const searchTerm = appState.currentSearchTerm;
    if (searchTerm) {
        const isExactMatch = searchTerm.startsWith('"') && searchTerm.endsWith('"');

        if (appState.searchMode === 'notes') {
            // Notes-only search mode
            if (isExactMatch) {
                const phrase = searchTerm.substring(1, searchTerm.length - 1);
                if (phrase) {
                    filtered = filtered.filter(paper => 
                        paper.notes?.toLowerCase().includes(phrase)
                    );
                }
            } else {
                const searchWords = searchTerm.split(' ').filter(w => w);
                filtered = filtered.filter(paper => {
                    return searchWords.every(word => 
                        paper.notes?.toLowerCase().includes(word)
                    );
                });
            }
        } else {
            // All fields search mode (default)
            if (isExactMatch) {
                const phrase = searchTerm.substring(1, searchTerm.length - 1);
                if (phrase) {
                    filtered = filtered.filter(paper =>
                        paper.title.toLowerCase().includes(phrase) ||
                        paper.authors.some(author => author.toLowerCase().includes(phrase)) ||
                        paper.tags?.some(tag => tag.toLowerCase().includes(phrase)) ||
                        paper.notes?.toLowerCase().includes(phrase)
                    );
                }
            } else {
                const searchWords = searchTerm.split(' ').filter(w => w);
                filtered = filtered.filter(paper => {
                    return searchWords.every(word =>
                        paper.title.toLowerCase().includes(word) ||
                        paper.authors.some(author => author.toLowerCase().includes(word)) ||
                        paper.tags?.some(tag => tag.toLowerCase().includes(word)) ||
                        paper.notes?.toLowerCase().includes(word)
                    );
                });
            }
        }
    }
    return filtered;
};

/**
 * Updates the URL hash based on active filters
 * 
 * @param {Object} appState - Application state object
 */
export const updateUrlHash = (appState) => {
    const { status, tags } = appState.activeFilters;
    const hasFilters = status || (tags && tags.length > 0);
    
    if (hasFilters) {
        let hashParts = [];
        if (status) {
            hashParts.push(`status:${encodeURIComponent(status)}`);
        }
        if (tags && tags.length > 0) {
            tags.forEach(tag => {
                hashParts.push(`tag:${encodeURIComponent(tag)}`);
            });
        }
        window.location.hash = `#/filter/${hashParts.join('/')}`;
    } else {
        window.location.hash = '#/';
    }
};

/**
 * Parses the URL hash and updates active filters in appState
 * 
 * @param {Object} appState - Application state object
 */
export const parseUrlHash = (appState) => {
    const path = window.location.hash;
    
    // Reset filters
    appState.activeFilters.status = null;
    appState.activeFilters.tags = [];

    // Parse compound filter format: #/filter/status:Reading/tag:ml/tag:ai
    if (path.startsWith('#/filter/')) {
        const parts = path.substring(9).split('/'); // Remove '#/filter/'
        parts.forEach(part => {
            if (part.startsWith('status:')) {
                appState.activeFilters.status = decodeURIComponent(part.substring(7));
            } else if (part.startsWith('tag:')) {
                appState.activeFilters.tags.push(decodeURIComponent(part.substring(4)));
            }
        });
    }
    // Legacy: Parse single status filter: #/status/Reading
    else if (path.startsWith('#/status/')) {
        appState.activeFilters.status = decodeURIComponent(path.split('/')[2]);
    }
    // Legacy: Parse single tag filter: #/tag/ml
    else if (path.startsWith('#/tag/')) {
        appState.activeFilters.tags.push(decodeURIComponent(path.split('/')[2]));
    }
};

/**
 * Renders visual filter chips showing active filters
 * 
 * @param {Object} appState - Application state object
 * @param {Function} applyFiltersAndRender - Callback to re-apply filters
 */
export const renderFilterChips = (appState, applyFiltersAndRender) => {
    const container = document.getElementById('filter-chips-container');
    if (!container) return;

    const chips = [];
    
    // Search term chip
    if (appState.currentSearchTerm) {
        chips.push(`
            <div class="flex items-center gap-2 bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200 px-3 py-1.5 rounded-full text-sm font-medium">
                <span class="material-symbols-outlined text-base">search</span>
                <span>Search: "${appState.currentSearchTerm}"</span>
                <button class="remove-filter-btn hover:bg-green-200 dark:hover:bg-green-800/50 rounded-full p-0.5 transition-colors" data-filter-type="search">
                    <span class="material-symbols-outlined text-base">close</span>
                </button>
            </div>
        `);
    }
    
    // Status filter chip
    if (appState.activeFilters.status) {
        chips.push(`
            <div class="flex items-center gap-2 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200 px-3 py-1.5 rounded-full text-sm font-medium">
                <span class="material-symbols-outlined text-base">filter_list</span>
                <span>Status: ${appState.activeFilters.status}</span>
                <button class="remove-filter-btn hover:bg-blue-200 dark:hover:bg-blue-800/50 rounded-full p-0.5 transition-colors" data-filter-type="status">
                    <span class="material-symbols-outlined text-base">close</span>
                </button>
            </div>
        `);
    }

    // Tag filter chips (one chip per tag)
    if (appState.activeFilters.tags && appState.activeFilters.tags.length > 0) {
        appState.activeFilters.tags.forEach(tag => {
            chips.push(`
                <div class="flex items-center gap-2 bg-primary/10 text-primary px-3 py-1.5 rounded-full text-sm font-medium">
                    <span class="material-symbols-outlined text-base">tag</span>
                    <span>${tag}</span>
                    <button class="remove-tag-btn hover:bg-primary/20 rounded-full p-0.5 transition-colors" data-tag="${tag}">
                        <span class="material-symbols-outlined text-base">close</span>
                    </button>
                </div>
            `);
        });
    }

    if (chips.length > 0) {
        container.innerHTML = `
            <div class="flex items-center gap-2 flex-wrap">
                ${chips.join('')}
                <button id="clear-all-filters-btn" class="text-xs font-medium text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-100 underline ml-2">
                    Clear all filters
                </button>
            </div>
        `;
        container.classList.remove('hidden');

        // Add event listener for remove filter buttons (status and search)
        container.querySelectorAll('.remove-filter-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const filterType = btn.dataset.filterType;
                if (filterType === 'search') {
                    appState.currentSearchTerm = '';
                    const searchInput = document.getElementById('search-input');
                    if (searchInput) searchInput.value = '';
                } else {
                    appState.activeFilters[filterType] = null;
                }
                appState.pagination.currentPage = 1; // Reset to first page
                updateUrlHash(appState);
                renderFilterChips(appState, applyFiltersAndRender);
                applyFiltersAndRender();
            });
        });

        // Add event listener for remove tag buttons
        container.querySelectorAll('.remove-tag-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const tag = btn.dataset.tag;
                const tagIndex = appState.activeFilters.tags.indexOf(tag);
                if (tagIndex > -1) {
                    appState.activeFilters.tags.splice(tagIndex, 1);
                }
                appState.pagination.currentPage = 1; // Reset to first page
                updateUrlHash(appState);
                renderFilterChips(appState, applyFiltersAndRender);
                applyFiltersAndRender();
            });
        });

        // Add event listener for clear all button
        const clearAllBtn = document.getElementById('clear-all-filters-btn');
        if (clearAllBtn) {
            clearAllBtn.addEventListener('click', () => {
                appState.activeFilters.status = null;
                appState.activeFilters.tags = [];
                appState.currentSearchTerm = '';
                // Clear search input
                const searchInput = document.getElementById('search-input');
                if (searchInput) searchInput.value = '';
                appState.pagination.currentPage = 1; // Reset to first page
                updateUrlHash(appState);
                renderFilterChips(appState, applyFiltersAndRender);
                applyFiltersAndRender();
            });
        }
    } else {
        container.innerHTML = '';
        container.classList.add('hidden');
    }
};

/**
 * Calculates pagination metadata (total pages, valid current page)
 * 
 * @param {number} totalItems - Total number of items after filtering
 * @param {Object} appState - Application state object
 */
export const calculatePagination = (totalItems, appState) => {
    appState.pagination.totalItems = totalItems;
    appState.pagination.totalPages = Math.ceil(totalItems / appState.pagination.itemsPerPage);
    
    // Ensure current page is within valid range
    if (appState.pagination.currentPage > appState.pagination.totalPages) {
        appState.pagination.currentPage = Math.max(1, appState.pagination.totalPages);
    }
};

/**
 * Gets papers for the current page
 * 
 * @param {Array} papers - Array of papers (after filtering and sorting)
 * @param {Object} appState - Application state object
 * @returns {Array} Paginated subset of papers
 */
export const getPaginatedPapers = (papers, appState) => {
    const startIndex = (appState.pagination.currentPage - 1) * appState.pagination.itemsPerPage;
    const endIndex = startIndex + appState.pagination.itemsPerPage;
    return papers.slice(startIndex, endIndex);
};

/**
 * Renders pagination controls (page numbers, prev/next buttons)
 * 
 * @param {Object} appState - Application state object
 * @param {Function} applyFiltersAndRender - Callback to re-apply filters
 */
export const renderPaginationControls = (appState, applyFiltersAndRender) => {
    const container = document.getElementById('pagination-container');
    const infoSpan = document.getElementById('pagination-info');
    const navElement = document.getElementById('pagination-nav');
    
    if (!container || !infoSpan || !navElement) return;

    const { currentPage, totalPages, itemsPerPage, totalItems } = appState.pagination;

    // Hide pagination if no papers or only one page
    if (totalItems === 0 || totalPages <= 1) {
        container.classList.add('hidden');
        return;
    }

    container.classList.remove('hidden');

    // Update info text
    const startItem = (currentPage - 1) * itemsPerPage + 1;
    const endItem = Math.min(currentPage * itemsPerPage, totalItems);
    infoSpan.innerHTML = `Showing <span class="font-semibold text-stone-900 dark:text-stone-100">${startItem}-${endItem}</span> of <span class="font-semibold text-stone-900 dark:text-stone-100">${totalItems}</span> papers`;

    // Generate page buttons
    const buttons = [];

    // Previous button
    buttons.push(`
        <button 
            class="pagination-btn px-3 py-1.5 text-sm font-medium rounded-md border border-stone-300 dark:border-stone-700 ${currentPage === 1 ? 'text-stone-400 dark:text-stone-600 cursor-not-allowed' : 'text-stone-700 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800'}"
            data-page="${currentPage - 1}"
            ${currentPage === 1 ? 'disabled' : ''}
        >
            Previous
        </button>
    `);

    // Page number buttons with smart truncation
    const maxButtons = 7; // Maximum number of page buttons to show
    let startPage = 1;
    let endPage = totalPages;

    if (totalPages > maxButtons) {
        const halfButtons = Math.floor(maxButtons / 2);
        if (currentPage <= halfButtons + 1) {
            // Near the start
            endPage = maxButtons - 1;
        } else if (currentPage >= totalPages - halfButtons) {
            // Near the end
            startPage = totalPages - maxButtons + 2;
        } else {
            // In the middle
            startPage = currentPage - halfButtons;
            endPage = currentPage + halfButtons;
        }
    }

    // First page button
    if (startPage > 1) {
        buttons.push(`
            <button 
                class="pagination-btn px-3 py-1.5 text-sm font-medium rounded-md border border-stone-300 dark:border-stone-700 text-stone-700 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800"
                data-page="1"
            >
                1
            </button>
        `);
        if (startPage > 2) {
            buttons.push(`<span class="px-2 text-stone-500">...</span>`);
        }
    }

    // Page number buttons
    for (let i = startPage; i <= endPage; i++) {
        const isActive = i === currentPage;
        buttons.push(`
            <button 
                class="pagination-btn px-3 py-1.5 text-sm font-medium rounded-md border ${isActive ? 'bg-primary text-white border-primary' : 'border-stone-300 dark:border-stone-700 text-stone-700 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800'}"
                data-page="${i}"
                ${isActive ? 'disabled' : ''}
            >
                ${i}
            </button>
        `);
    }

    // Last page button
    if (endPage < totalPages) {
        if (endPage < totalPages - 1) {
            buttons.push(`<span class="px-2 text-stone-500">...</span>`);
        }
        buttons.push(`
            <button 
                class="pagination-btn px-3 py-1.5 text-sm font-medium rounded-md border border-stone-300 dark:border-stone-700 text-stone-700 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800"
                data-page="${totalPages}"
            >
                ${totalPages}
            </button>
        `);
    }

    // Next button
    buttons.push(`
        <button 
            class="pagination-btn px-3 py-1.5 text-sm font-medium rounded-md border border-stone-300 dark:border-stone-700 ${currentPage === totalPages ? 'text-stone-400 dark:text-stone-600 cursor-not-allowed' : 'text-stone-700 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800'}"
            data-page="${currentPage + 1}"
            ${currentPage === totalPages ? 'disabled' : ''}
        >
            Next
        </button>
    `);

    navElement.innerHTML = buttons.join('');

    // Add click handlers for pagination buttons
    navElement.querySelectorAll('.pagination-btn').forEach(btn => {
        if (!btn.disabled) {
            btn.addEventListener('click', () => {
                const page = parseInt(btn.dataset.page, 10);
                if (page >= 1 && page <= totalPages && page !== currentPage) {
                    appState.pagination.currentPage = page;
                    applyFiltersAndRender();
                    // Smooth scroll to top of paper list
                    document.getElementById('paper-list')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }
            });
        }
    });
};

/**
 * Main function to apply all filters, sort, paginate, and render results
 * 
 * @param {Object} appState - Application state object
 */
export const applyFiltersAndRender = (appState) => {
    let filteredPapers = getFilteredPapers(appState.allPapersCache, appState);
    const sortedPapers = sortPapers(filteredPapers, appState.currentSortBy);
    
    // Calculate pagination
    calculatePagination(sortedPapers.length, appState);
    
    // Get papers for current page
    const paginatedPapers = getPaginatedPapers(sortedPapers, appState);
    
    renderPaperList(paginatedPapers, appState.currentSearchTerm, appState.selectedPaperIds);
    renderFilterChips(appState, () => applyFiltersAndRender(appState));
    renderPaginationControls(appState, () => applyFiltersAndRender(appState));
    highlightActiveSidebarLink();
};

