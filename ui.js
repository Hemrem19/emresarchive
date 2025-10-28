import { getStatusOrder } from './config.js';

export const escapeHtml = (unsafe) => unsafe.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");

/**
 * Displays a toast notification with support for different types and actions.
 * @param {string} message - The message to display.
 * @param {string} type - Type of toast: 'success', 'error', 'warning', 'info'.
 * @param {Object} options - Additional options.
 * @param {number} options.duration - Duration in ms (default: 3000, 0 = persistent).
 * @param {Array} options.actions - Array of action objects {label, onClick}.
 */
export const showToast = (message, type = 'success', options = {}) => {
    const container = document.getElementById('toast-container');
    if (!container) {
        console.error('Toast container not found');
        return;
    }

    const { duration = 3000, actions = [] } = options;

    // Define colors and icons for each toast type
    const toastStyles = {
        success: {
            bg: 'bg-green-500',
            icon: 'check_circle',
            iconColor: 'text-white'
        },
        error: {
            bg: 'bg-red-500',
            icon: 'error',
            iconColor: 'text-white'
        },
        warning: {
            bg: 'bg-yellow-500',
            icon: 'warning',
            iconColor: 'text-white'
        },
        info: {
            bg: 'bg-blue-500',
            icon: 'info',
            iconColor: 'text-white'
        }
    };

    const style = toastStyles[type] || toastStyles.success;

    const toast = document.createElement('div');
    toast.className = `toast ${style.bg} p-4 rounded-lg shadow-lg text-white flex items-start gap-3 min-w-[300px] max-w-md`;

    // Build toast content
    let toastContent = `
        <span class="material-symbols-outlined ${style.iconColor} flex-shrink-0">${style.icon}</span>
        <div class="flex-1 min-w-0">
            <p class="text-sm font-medium leading-relaxed break-words">${escapeHtml(message)}</p>
    `;

    // Add action buttons if provided
    if (actions.length > 0) {
        toastContent += `
            <div class="flex gap-2 mt-2">
                ${actions.map((action, idx) => `
                    <button class="toast-action-btn text-xs font-semibold px-3 py-1 rounded bg-white/20 hover:bg-white/30 transition-colors" data-action-idx="${idx}">
                        ${escapeHtml(action.label)}
                    </button>
                `).join('')}
            </div>
        `;
    }

    toastContent += `</div>`;

    // Add close button for persistent toasts
    if (duration === 0) {
        toastContent += `
            <button class="toast-close-btn flex-shrink-0 p-1 hover:bg-white/20 rounded transition-colors" title="Close">
                <span class="material-symbols-outlined text-lg">close</span>
            </button>
        `;
    }

    toast.innerHTML = toastContent;

    // Attach action button event listeners
    actions.forEach((action, idx) => {
        const btn = toast.querySelector(`[data-action-idx="${idx}"]`);
        if (btn && action.onClick) {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                action.onClick();
                // Auto-remove toast after action
                removeToast(toast);
            });
        }
    });

    // Attach close button listener for persistent toasts
    const closeBtn = toast.querySelector('.toast-close-btn');
    if (closeBtn) {
        closeBtn.addEventListener('click', () => removeToast(toast));
    }

    container.appendChild(toast);

    // Auto-remove after duration (if not persistent)
    if (duration > 0) {
        setTimeout(() => removeToast(toast), duration);
    }
};

/**
 * Helper to remove a toast with animation.
 * @param {HTMLElement} toast - The toast element to remove.
 */
const removeToast = (toast) => {
    if (!toast || !toast.parentElement) return;
    
    toast.classList.add('opacity-0', 'transition-opacity', 'duration-500');
    setTimeout(() => {
        toast.remove();
    }, 500);
};

/**
 * Formats a date as a relative time string (e.g., "2 days ago", "just now").
 * @param {Date|string} date - The date to format.
 * @returns {string} A human-readable relative time string.
 */
export const formatRelativeTime = (date) => {
    if (!date) return 'Never';
    
    const now = new Date();
    const then = date instanceof Date ? date : new Date(date);
    const diffMs = now - then;
    const diffSeconds = Math.floor(diffMs / 1000);
    const diffMinutes = Math.floor(diffSeconds / 60);
    const diffHours = Math.floor(diffMinutes / 60);
    const diffDays = Math.floor(diffHours / 24);
    const diffWeeks = Math.floor(diffDays / 7);
    const diffMonths = Math.floor(diffDays / 30);
    const diffYears = Math.floor(diffDays / 365);

    if (diffSeconds < 60) return 'Just now';
    if (diffMinutes < 60) return `${diffMinutes} minute${diffMinutes > 1 ? 's' : ''} ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    if (diffWeeks < 4) return `${diffWeeks} week${diffWeeks > 1 ? 's' : ''} ago`;
    if (diffMonths < 12) return `${diffMonths} month${diffMonths > 1 ? 's' : ''} ago`;
    return `${diffYears} year${diffYears > 1 ? 's' : ''} ago`;
};

/**
 * Sorts an array of papers based on a given key.
 * @param {Array<Object>} papers - The array of papers to sort.
 * @param {string} sortBy - The key to sort by ('date_added', 'last_updated', 'title_asc', 'year_desc', 'status_asc').
 * @returns {Array<Object>} A new array with the sorted papers.
 */
export const sortPapers = (papers, sortBy) => {
    let sortedPapers = [...papers]; // Create a shallow copy to avoid mutating the original array
    switch (sortBy) {
        case 'last_updated':
            sortedPapers.sort((a, b) => {
                const aTime = a.updatedAt ? new Date(a.updatedAt).getTime() : (a.createdAt ? new Date(a.createdAt).getTime() : 0);
                const bTime = b.updatedAt ? new Date(b.updatedAt).getTime() : (b.createdAt ? new Date(b.createdAt).getTime() : 0);
                return bTime - aTime; // Most recently updated first
            });
            break;
        case 'title_asc':
            sortedPapers.sort((a, b) => a.title.localeCompare(b.title));
            break;
        case 'year_desc':
            sortedPapers.sort((a, b) => (b.year || 0) - (a.year || 0));
            break;
        case 'status_asc':
            const customStatusOrder = getStatusOrder();
            sortedPapers.sort((a, b) => (customStatusOrder.indexOf(a.readingStatus) ?? 99) - (customStatusOrder.indexOf(b.readingStatus) ?? 99));
            break;
        case 'date_added':
        default:
            sortedPapers.sort((a, b) => b.createdAt - a.createdAt);
            break;
    }
    return sortedPapers;
};

/**
 * Highlights occurrences of a search term within a text string.
 * @param {string} text - The text to highlight.
 * @param {string} term - The search term to highlight.
 * @returns {string} The text with matching terms wrapped in <mark> tags.
 */
const highlightText = (text, term) => {
    if (!term || !text) return escapeHtml(text || '');
    // Escape special regex characters from the search term
    const escapedTerm = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`(${escapedTerm})`, 'gi');
    // Escape the full text to prevent XSS, then apply highlighting
    return escapeHtml(text).replace(regex, `<mark class="bg-yellow-200 dark:bg-yellow-500/50 rounded-sm px-0.5 py-px">$1</mark>`);
};

/**
 * Extracts a snippet from notes containing the search term.
 * @param {string} notes - The full notes text.
 * @param {string} searchTerm - The search term to find.
 * @param {number} maxLength - Maximum length of the snippet.
 * @returns {string} The extracted snippet or empty string if no match.
 */
const extractNoteSnippet = (notes, searchTerm, maxLength = 150) => {
    if (!notes || !searchTerm) return '';
    
    const notesLower = notes.toLowerCase();
    const termLower = searchTerm.toLowerCase().trim();
    
    // Handle exact phrase search
    const isExactMatch = termLower.startsWith('"') && termLower.endsWith('"');
    const searchPhrase = isExactMatch ? termLower.substring(1, termLower.length - 1) : termLower;
    
    // Find the first occurrence of the search term
    const index = notesLower.indexOf(searchPhrase.split(' ')[0]);
    if (index === -1) return '';
    
    // Extract snippet around the match
    const start = Math.max(0, index - 50);
    const end = Math.min(notes.length, index + maxLength);
    let snippet = notes.substring(start, end);
    
    // Trim to word boundaries
    if (start > 0) {
        const firstSpace = snippet.indexOf(' ');
        if (firstSpace > 0) snippet = '...' + snippet.substring(firstSpace);
    }
    if (end < notes.length) {
        const lastSpace = snippet.lastIndexOf(' ');
        if (lastSpace > 0) snippet = snippet.substring(0, lastSpace) + '...';
    }
    
    return snippet;
};

/**
 * Checks if search term matches in notes for a given paper.
 * @param {Object} paper - The paper object.
 * @param {string} searchTerm - The search term.
 * @returns {boolean} True if notes contain the search term.
 */
const hasNotesMatch = (paper, searchTerm) => {
    if (!searchTerm || !paper.notes) return false;
    
    const notesLower = paper.notes.toLowerCase();
    const termLower = searchTerm.toLowerCase().trim();
    
    const isExactMatch = termLower.startsWith('"') && termLower.endsWith('"');
    
    if (isExactMatch) {
        const phrase = termLower.substring(1, termLower.length - 1);
        return notesLower.includes(phrase);
    } else {
        const searchWords = termLower.split(' ').filter(w => w);
        return searchWords.every(word => notesLower.includes(word));
    }
};

export const renderPaperList = (papers, searchTerm = '', selectedIds = new Set()) => {
    const paperListContainer = document.getElementById('paper-list');
    if (!paperListContainer) return;
    
    if (papers.length === 0) {
        paperListContainer.innerHTML = `<p class="text-stone-500 dark:text-stone-400">No papers found for the current filter.</p>`;
        return;
    }

    const statusColors = {
        'To Read': 'bg-yellow-500',
        'Reading': 'bg-blue-500',
        'Finished': 'bg-green-500',
        'Archived': 'bg-stone-500',
    };

    const statusOrder = getStatusOrder();

    const paperItemsHtml = papers.map(paper => {
        const isSelected = selectedIds.has(paper.id);
        const showNoteSnippet = searchTerm && hasNotesMatch(paper, searchTerm);
        const noteSnippet = showNoteSnippet ? extractNoteSnippet(paper.notes, searchTerm) : '';
        
        return `
        <div class="paper-card bg-white dark:bg-stone-900 border-2 ${isSelected ? 'border-primary/50 bg-primary/5 dark:bg-primary/10' : 'border-stone-200 dark:border-stone-800'} rounded-lg p-4 flex flex-col sm:flex-row items-start sm:items-center gap-4 transition-all duration-200" data-paper-id="${paper.id}">
            <div class="flex items-center gap-3 sm:flex-shrink-0">
                <input type="checkbox" class="paper-checkbox w-4 h-4 text-primary border-stone-300 rounded focus:ring-primary dark:border-stone-700 dark:bg-stone-800 cursor-pointer" data-paper-id="${paper.id}" ${isSelected ? 'checked' : ''}>
                <span 
                    class="h-2.5 w-2.5 rounded-full flex-shrink-0 ${statusColors[paper.readingStatus] || 'bg-stone-400'}" 
                    title="Status: ${paper.readingStatus}"
                ></span>
            </div>
            <div class="flex-grow">
                <div class="flex items-center gap-2 mb-1">
                    ${showNoteSnippet ? `<span class="material-symbols-outlined text-green-600 dark:text-green-400 text-sm mr-1" title="Match found in notes">description</span>` : ''}
                    <a href="#/details/${paper.id}" class="font-bold text-lg text-stone-900 dark:text-stone-100 hover:text-primary dark:hover:text-primary transition-colors">${highlightText(paper.title, searchTerm)}</a>
                </div>
                <p class="text-sm text-stone-500 dark:text-stone-400 mb-2">${highlightText(paper.authors.join(', '), searchTerm)} - ${paper.year || 'N/A'}</p>
                ${showNoteSnippet && noteSnippet ? `
                    <div class="mt-2 mb-3 p-3 bg-green-50 dark:bg-green-900/10 border border-green-200 dark:border-green-800/30 rounded-md">
                        <div class="flex items-start gap-2">
                            <span class="material-symbols-outlined text-green-600 dark:text-green-400 text-sm mt-0.5 flex-shrink-0">notes</span>
                            <div class="flex-1 min-w-0">
                                <p class="text-xs font-medium text-green-800 dark:text-green-300 mb-1">Match found in notes:</p>
                                <p class="text-sm text-stone-700 dark:text-stone-300 italic leading-relaxed">${highlightText(noteSnippet, searchTerm)}</p>
                            </div>
                        </div>
                    </div>
                ` : ''}
                ${paper.tags && paper.tags.length > 0 ? `
                    <div class="flex flex-wrap gap-2 ${showNoteSnippet ? 'mt-2' : ''}">
                        ${paper.tags.map(tag => `<span class="text-xs font-medium bg-primary/10 text-primary px-2 py-1 rounded-full">#${tag}</span>`).join('')}
                    </div>
                ` : ''}
            </div>
            <div class="flex flex-col sm:flex-row items-end sm:items-center gap-2 mt-2 sm:mt-0 flex-shrink-0 w-full sm:w-auto">
                <select class="reading-status-select w-full sm:w-32 h-8 bg-white dark:bg-stone-800 border border-stone-300 dark:border-stone-700 rounded-lg focus:ring-primary focus:border-primary text-xs text-stone-900 dark:text-stone-100" data-id="${paper.id}">
                    ${statusOrder.map(status => `<option value="${status}" ${paper.readingStatus === status ? 'selected' : ''}>${status}</option>`).join('')}
                </select>
                <div class="flex items-center gap-1 self-end">
                    ${paper.hasPdf ? `<span class="material-symbols-outlined text-stone-400 dark:text-stone-500 text-lg" title="PDF attached">attachment</span>` : ''}
                    <a href="#/edit/${paper.id}" class="edit-paper-btn p-1 rounded-full text-stone-500 hover:bg-stone-200 dark:hover:bg-stone-700" title="Edit Paper">
                        <span class="material-symbols-outlined text-lg">edit</span>
                    </a>
                    <button class="delete-paper-btn p-1 rounded-full text-red-500 hover:bg-red-100 dark:hover:bg-red-900/50" data-id="${paper.id}" title="Delete Paper">
                        <span class="material-symbols-outlined text-lg">delete</span>
                    </button>
                </div>
            </div>
        </div>
    `;
    }).join('');

    paperListContainer.innerHTML = paperItemsHtml;
};

export const renderSidebarTags = (papers) => {
    const tagsSection = document.getElementById('sidebar-tags-section');
    const mobileTagsSection = document.getElementById('mobile-sidebar-tags-section');

    if (!tagsSection || !mobileTagsSection) return;

    const allTags = papers.flatMap(p => p.tags || []);
    const uniqueTags = [...new Set(allTags)].sort();

    if (uniqueTags.length === 0) {
        tagsSection.innerHTML = '';
        mobileTagsSection.innerHTML = '';
        return;
    }

    const tagsHtml = `
        <h3 class="px-3 text-xs font-semibold uppercase text-stone-500 dark:text-stone-400 tracking-wider mb-2">Tags</h3>
        <div class="flex flex-wrap gap-2 px-3" id="sidebar-tags-list">
            ${uniqueTags.map(tag => `
                <a href="#/tag/${encodeURIComponent(tag)}" 
                   class="sidebar-tag text-xs font-medium bg-stone-100 text-stone-800 dark:bg-stone-800 dark:text-stone-300 px-2 py-1 rounded-full cursor-pointer hover:bg-primary/20 dark:hover:bg-primary/30 transition-colors"
                   data-tag="${escapeHtml(tag)}">
                   #${escapeHtml(tag)}
                </a>
            `).join('')}
        </div>
    `;

    tagsSection.innerHTML = tagsHtml;
    mobileTagsSection.innerHTML = tagsHtml;
};

/**
 * Renders collections in the sidebar.
 * @param {Array<Object>} collections - Array of collection objects.
 */
export const renderSidebarCollections = (collections) => {
    const collectionsSection = document.getElementById('sidebar-collections-section');
    const mobileCollectionsSection = document.getElementById('mobile-sidebar-collections-section');

    if (!collectionsSection || !mobileCollectionsSection) return;

    if (!collections || collections.length === 0) {
        collectionsSection.innerHTML = '';
        mobileCollectionsSection.innerHTML = '';
        return;
    }

    const collectionsHtml = `
        <div class="flex items-center justify-between px-3 mb-2">
            <h3 class="text-xs font-semibold uppercase text-stone-500 dark:text-stone-400 tracking-wider">Collections</h3>
            <button id="save-collection-btn" class="p-1 rounded hover:bg-stone-200 dark:hover:bg-stone-700 transition-colors" title="Save current filters as collection">
                <span class="material-symbols-outlined text-sm text-stone-500 dark:text-stone-400">add_circle</span>
            </button>
        </div>
        <div class="space-y-1">
            ${collections.map(collection => `
                <div class="collection-item group flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors" data-collection-id="${collection.id}">
                    <span class="material-symbols-outlined text-lg ${collection.color || 'text-primary'}">${collection.icon || 'folder'}</span>
                    <span class="flex-1 text-sm font-medium text-stone-700 dark:text-stone-300 collection-name">${escapeHtml(collection.name)}</span>
                    <button class="edit-collection-btn opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-stone-200 dark:hover:bg-stone-700 transition-all" data-collection-id="${collection.id}" title="Edit collection">
                        <span class="material-symbols-outlined text-sm text-stone-500 dark:text-stone-400">edit</span>
                    </button>
                </div>
            `).join('')}
        </div>
    `;

    collectionsSection.innerHTML = collectionsHtml;
    mobileCollectionsSection.innerHTML = collectionsHtml;
};

export const highlightActiveSidebarLink = () => {
    const path = window.location.hash;
    
    // Reset all links to inactive state
    document.querySelectorAll('.sidebar-status-link, .sidebar-tag, .sidebar-all-papers-link, .collection-item').forEach(el => {
        el.classList.remove('text-primary', 'bg-primary/10', 'dark:bg-primary/20');
        el.classList.add('text-stone-500', 'dark:text-stone-400', 'hover:text-stone-900', 'dark:hover:text-stone-100', 'hover:bg-stone-100', 'dark:hover:bg-stone-800');
    });

    const setActive = (selector) => {
        document.querySelectorAll(selector).forEach(el => {
            el.classList.add('text-primary', 'bg-primary/10', 'dark:bg-primary/20');
            el.classList.remove('text-stone-500', 'dark:text-stone-400');
        });
    };

    // Handle collection: #/collection/123
    if (path.startsWith('#/collection/')) {
        const collectionId = decodeURIComponent(path.split('/')[2]);
        setActive(`.collection-item[data-collection-id="${collectionId}"]`);
    }
    // Handle compound filters: #/filter/status:Reading/tag:ml
    else if (path.startsWith('#/filter/')) {
        const parts = path.substring(9).split('/'); // Remove '#/filter/'
        parts.forEach(part => {
            if (part.startsWith('status:')) {
                const status = decodeURIComponent(part.substring(7));
                setActive(`.sidebar-status-link[data-status="${status}"]`);
            } else if (part.startsWith('tag:')) {
                const tag = decodeURIComponent(part.substring(4));
                setActive(`.sidebar-tag[data-tag="${tag}"]`);
            }
        });
    }
    // Handle single status filter: #/status/Reading
    else if (path.startsWith('#/status/')) {
        const status = decodeURIComponent(path.split('/')[2]);
        setActive(`.sidebar-status-link[data-status="${status}"]`);
    }
    // Handle single tag filter: #/tag/ml
    else if (path.startsWith('#/tag/')) {
        const tag = decodeURIComponent(path.split('/')[2]);
        setActive(`.sidebar-tag[data-tag="${tag}"]`);
    }
    // No filters active - highlight "All Papers"
    else if (path === '#/' || path === '') {
        setActive('.sidebar-all-papers-link');
    }
};