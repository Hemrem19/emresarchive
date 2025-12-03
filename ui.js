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
        case 'progress_desc':
            sortedPapers.sort((a, b) => {
                // Calculate percentage for each paper
                const aProgress = a.readingProgress?.totalPages > 0
                    ? ((a.readingProgress?.currentPage || 0) / a.readingProgress.totalPages) * 100
                    : -1; // Papers without progress go to the end
                const bProgress = b.readingProgress?.totalPages > 0
                    ? ((b.readingProgress?.currentPage || 0) / b.readingProgress.totalPages) * 100
                    : -1;
                return bProgress - aProgress; // Highest progress first
            });
            break;
        case 'rating_desc':
            sortedPapers.sort((a, b) => {
                // Papers with rating come first, then unrated papers
                const aRating = (a.rating !== null && a.rating !== undefined) ? a.rating : -1;
                const bRating = (b.rating !== null && b.rating !== undefined) ? b.rating : -1;
                return bRating - aRating; // Highest rating first, unrated at end
            });
            break;
        case 'rating_asc':
            sortedPapers.sort((a, b) => {
                // Papers with rating come first, then unrated papers
                const aRating = (a.rating !== null && a.rating !== undefined) ? a.rating : 11; // Unrated goes to end
                const bRating = (b.rating !== null && b.rating !== undefined) ? b.rating : 11;
                return aRating - bRating; // Lowest rating first, unrated at end
            });
            break;
        case 'date_added':
        default:
            sortedPapers.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
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
export const highlightText = (text, term) => {
    if (!term || !text) return escapeHtml(text || '');
    // Escape special regex characters from the search term
    const escapedTerm = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`(${escapedTerm})`, 'gi');
    // Escape the full text to prevent XSS, then apply highlighting
    return escapeHtml(text).replace(regex, `<mark class="bg-yellow-500/30 text-yellow-200 rounded-sm px-0.5 py-px">$1</mark>`);
};

/**
 * Extracts a snippet from notes containing the search term.
 * @param {string} notes - The full notes text.
 * @param {string} searchTerm - The search term to find.
 * @param {number} maxLength - Maximum length of the snippet.
 * @returns {string} The extracted snippet or empty string if no match.
 */
export const extractNoteSnippet = (notes, searchTerm, maxLength = 150) => {
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
export const hasNotesMatch = (paper, searchTerm) => {
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
        paperListContainer.innerHTML = `
            <div class="text-center py-12">
                <p class="text-slate-500 text-lg">No papers found.</p>
                <p class="text-slate-600 text-sm mt-2">Try adjusting your filters or search term.</p>
            </div>`;
        return;
    }

    const statusColors = {
        'Reading': 'bg-blue-500',
        'To Read': 'bg-yellow-500',
        'Finished': 'bg-green-500',
        'Archived': 'bg-slate-500'
    };

    const statusOrder = getStatusOrder();

    const paperItemsHtml = papers.map(paper => {
        const isSelected = selectedIds.has(paper.id);
        const showNoteSnippet = searchTerm && hasNotesMatch(paper, searchTerm);
        const noteSnippet = showNoteSnippet ? extractNoteSnippet(paper.notes, searchTerm) : '';
        const hasNotes = paper.notes && typeof paper.notes === 'string' && paper.notes.trim().length > 0;
        const statusColor = statusColors[paper.readingStatus] || 'bg-slate-500';

        return `
        <div class="paper-card rounded-xl p-5 group cursor-pointer relative overflow-hidden ${isSelected ? 'border-blue-500/50 bg-blue-500/5' : ''}" data-paper-id="${paper.id}">
            <div class="absolute left-0 top-0 bottom-0 w-1 ${statusColor} rounded-l-xl shadow-[0_0_10px_rgba(0,0,0,0.3)]"></div>
            
            <div class="flex items-start gap-3 sm:gap-4 pl-2">
                <!-- Icon Box -->
                <div class="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-gradient-to-br from-slate-800 to-slate-900 border border-white/5 flex items-center justify-center flex-shrink-0 text-slate-400 group-hover:text-blue-400 group-hover:border-blue-500/30 transition-colors shadow-lg">
                    <span class="material-symbols-outlined text-[20px] sm:text-[24px]">${paper.hasPdf ? 'picture_as_pdf' : 'description'}</span>
                </div>

                <!-- Content -->
                <div class="flex-1 min-w-0">
                    <div class="flex items-start justify-between gap-3 sm:gap-4">
                        <h3 class="text-base sm:text-lg font-bold text-slate-100 group-hover:text-blue-400 transition-colors leading-tight mb-1 line-clamp-3 sm:line-clamp-2">
                            <a href="#/details/${paper.id}" class="hover:underline">${highlightText(paper.title, searchTerm)}</a>
                        </h3>
                        
                        <!-- Actions (Visible on Hover/Focus) -->
                        <div class="flex items-center gap-0.5 sm:gap-1 opacity-0 group-hover:opacity-100 transition-all transform translate-x-2 group-hover:translate-x-0">
                            <input type="checkbox" class="paper-checkbox w-4 h-4 text-blue-500 border-slate-600 rounded focus:ring-blue-500 bg-slate-800/50 mr-2 cursor-pointer" data-paper-id="${paper.id}" ${isSelected ? 'checked' : ''}>
                            
                            <select class="reading-status-select h-8 bg-slate-800/80 border border-slate-700 rounded-lg text-xs text-slate-300 focus:ring-blue-500 focus:border-blue-500 mr-1 hidden sm:block" data-id="${paper.id}">
                                ${statusOrder.map(status => `<option value="${status}" ${paper.readingStatus === status ? 'selected' : ''}>${status}</option>`).join('')}
                            </select>

                            <a href="#/edit/${paper.id}" class="p-2 hover:bg-blue-500/20 rounded-lg text-slate-400 hover:text-blue-400 transition-colors" title="Edit">
                                <span class="material-symbols-outlined text-[20px]">edit</span>
                            </a>
                            <button class="delete-paper-btn p-2 hover:bg-red-500/20 rounded-lg text-slate-400 hover:text-red-400 transition-colors" data-id="${paper.id}" title="Delete">
                                <span class="material-symbols-outlined text-[20px]">delete</span>
                            </button>
                        </div>
                    </div>
                    
                    <p class="text-sm text-slate-400 mb-3 truncate font-medium">
                        ${highlightText(paper.authors.join(', '), searchTerm)}
                    </p>

                    <div class="flex flex-wrap items-center gap-2 sm:gap-3 text-xs text-slate-500">
                        ${paper.year ? `
                        <span class="flex items-center gap-1.5 bg-slate-800/50 px-2.5 py-1 rounded-md border border-white/5">
                            <span class="material-symbols-outlined text-[14px]">calendar_today</span> ${paper.year}
                        </span>` : ''}
                        
                        ${paper.rating !== null && paper.rating !== undefined ? `
                        <span class="flex items-center gap-1 text-yellow-500 font-bold bg-yellow-500/10 px-2 py-1 rounded-md border border-yellow-500/20">
                            <span class="material-symbols-outlined text-[14px] fill-current">star</span> ${paper.rating}
                        </span>` : ''}

                        ${hasNotes ? `
                        <button class="expand-notes-btn flex items-center gap-1 text-slate-400 hover:text-blue-400 transition-colors px-2 py-1 rounded hover:bg-white/5" data-paper-id="${paper.id}">
                            <span class="material-symbols-outlined text-[16px] expand-icon">expand_more</span>
                            <span>Notes</span>
                        </button>` : ''}
                        
                        <!-- Tags -->
                        ${paper.tags && paper.tags.length > 0 ? `
                        <div class="flex flex-wrap gap-1.5 sm:gap-2 ml-auto sm:ml-0">
                            ${paper.tags.map(tag => {
                                const tagColor = getTagColor(tag);
                                return `<span class="px-3 py-1.5 rounded-full text-[11px] font-semibold ${tagColor.bg} ${tagColor.text} ${tagColor.border} tracking-wide shadow-sm hover:shadow-md transition-all duration-200 hover:scale-105">#${highlightText(tag, searchTerm)}</span>`;
                            }).join('')}
                        </div>` : ''}
                    </div>

                    ${showNoteSnippet && noteSnippet ? `
                        <div class="mt-3 p-3 bg-green-500/10 border border-green-500/20 rounded-lg">
                            <div class="flex items-start gap-2">
                                <span class="material-symbols-outlined text-green-400 text-sm mt-0.5 flex-shrink-0">notes</span>
                                <div class="flex-1 min-w-0">
                                    <p class="text-xs font-medium text-green-400 mb-1">Match found in notes:</p>
                                    <p class="text-sm text-slate-300 italic leading-relaxed">${highlightText(noteSnippet, searchTerm)}</p>
                                </div>
                            </div>
                        </div>
                    ` : ''}

                    ${hasNotes ? `
                        <div class="notes-expandable-section hidden mt-3 p-4 bg-slate-800/50 border border-white/5 rounded-lg" data-paper-id="${paper.id}">
                            <div class="prose prose-invert max-w-none text-sm text-slate-300">
                                <div class="notes-content">${paper.notes}</div>
                            </div>
                        </div>
                    ` : ''}

                    ${paper.readingStatus === 'Reading' && paper.readingProgress?.totalPages > 0 ? `
                        <div class="mt-3 w-full h-1 bg-slate-700 rounded-full overflow-hidden">
                            <div class="h-full bg-blue-500 transition-all duration-300" style="width: ${Math.min(Math.round(((paper.readingProgress.currentPage || 0) / paper.readingProgress.totalPages) * 100), 100)}%"></div>
                        </div>
                    ` : ''}
                </div>
            </div>
        </div>
        `;
    }).join('');

    paperListContainer.innerHTML = paperItemsHtml;
};

/**
 * Gets a consistent color scheme for a tag based on its name.
 * Uses a hash function to deterministically assign colors.
 * @param {string} tagName - The tag name
 * @returns {Object} Object with bg, text, and border color classes
 */
export const getTagColor = (tagName) => {
    // Modern color palette with good contrast in dark mode
    const colorPalettes = [
        { bg: 'bg-blue-500/15', text: 'text-blue-300', border: 'border border-blue-400/30' },
        { bg: 'bg-purple-500/15', text: 'text-purple-300', border: 'border border-purple-400/30' },
        { bg: 'bg-pink-500/15', text: 'text-pink-300', border: 'border border-pink-400/30' },
        { bg: 'bg-emerald-500/15', text: 'text-emerald-300', border: 'border border-emerald-400/30' },
        { bg: 'bg-cyan-500/15', text: 'text-cyan-300', border: 'border border-cyan-400/30' },
        { bg: 'bg-amber-500/15', text: 'text-amber-300', border: 'border border-amber-400/30' },
        { bg: 'bg-rose-500/15', text: 'text-rose-300', border: 'border border-rose-400/30' },
        { bg: 'bg-indigo-500/15', text: 'text-indigo-300', border: 'border border-indigo-400/30' },
        { bg: 'bg-teal-500/15', text: 'text-teal-300', border: 'border border-teal-400/30' },
        { bg: 'bg-orange-500/15', text: 'text-orange-300', border: 'border border-orange-400/30' },
        { bg: 'bg-violet-500/15', text: 'text-violet-300', border: 'border border-violet-400/30' },
        { bg: 'bg-fuchsia-500/15', text: 'text-fuchsia-300', border: 'border border-fuchsia-400/30' },
    ];

    // Simple hash function for consistent color assignment
    let hash = 0;
    for (let i = 0; i < tagName.length; i++) {
        hash = ((hash << 5) - hash) + tagName.charCodeAt(i);
        hash = hash & hash; // Convert to 32-bit integer
    }

    // Use absolute value and modulo to get index
    const index = Math.abs(hash) % colorPalettes.length;
    return colorPalettes[index];
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
        <h3 class="px-3 text-xs font-semibold uppercase text-slate-500 dark:text-slate-400 tracking-wider mb-2">Tags</h3>
        <div class="flex flex-wrap gap-2 px-3" id="sidebar-tags-list">
            ${uniqueTags.map(tag => {
                const tagColor = getTagColor(tag);
                return `
                <a href="#/app/tag/${encodeURIComponent(tag)}" 
                   class="sidebar-tag text-xs font-semibold ${tagColor.bg} ${tagColor.text} ${tagColor.border} px-3 py-1.5 rounded-full cursor-pointer hover:shadow-md transition-all duration-200 hover:scale-105 shadow-sm"
                   data-tag="${escapeHtml(tag)}">
                   #${escapeHtml(tag)}
                </a>
            `;
            }).join('')}
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

    // Always show the Collections header and + button, even if no collections exist
    const collectionsHtml = `
        <div class="flex items-center justify-between px-3 mb-2">
            <h3 class="text-xs font-semibold uppercase text-slate-500 dark:text-slate-400 tracking-wider">Collections</h3>
            <button id="save-collection-btn" class="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-white transition-colors" title="Save current filters as collection">
                <span class="material-symbols-outlined text-sm">add_circle</span>
            </button>
        </div>
        ${(!collections || collections.length === 0) ? `
            <div class="px-3 py-4 text-center">
                <p class="text-xs text-slate-500">No saved collections yet.</p>
                <p class="text-xs text-slate-600 mt-1">Apply filters and click + to save</p>
            </div>
        ` : `
            <div class="space-y-1">
                ${collections.map(collection => `
                    <div class="collection-item group flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer hover:bg-white/5 transition-colors" data-collection-id="${collection.id}">
                        <span class="material-symbols-outlined text-lg ${collection.color || 'text-blue-400'} opacity-70 group-hover:opacity-100">${collection.icon || 'folder'}</span>
                        <span class="flex-1 text-sm font-medium text-slate-400 group-hover:text-white collection-name transition-colors">${escapeHtml(collection.name)}</span>
                        <button class="edit-collection-btn opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-slate-700 transition-all" data-collection-id="${collection.id}" title="Edit collection">
                            <span class="material-symbols-outlined text-sm text-slate-400 hover:text-white">edit</span>
                        </button>
                    </div>
                `).join('')}
            </div>
        `}
    `;

    collectionsSection.innerHTML = collectionsHtml;
    mobileCollectionsSection.innerHTML = collectionsHtml;
};

export const highlightActiveSidebarLink = () => {
    const path = window.location.hash;

    // Reset all links to inactive state
    document.querySelectorAll('.sidebar-status-link, .sidebar-tag, .sidebar-all-papers-link, .sidebar-docs-link, .collection-item').forEach(el => {
        el.classList.remove('text-blue-400', 'bg-blue-500/10', 'border-blue-500/10', 'ring-2', 'ring-blue-400/50', 'ring-offset-2', 'ring-offset-slate-900', 'scale-110');
        el.classList.add('text-slate-400', 'hover:text-white', 'hover:bg-white/5');
        // Remove specific classes added by setActive for tags
        if (el.classList.contains('sidebar-tag')) {
            // Remove active state classes
            el.classList.remove('ring-2', 'ring-blue-400/50', 'ring-offset-2', 'ring-offset-slate-900', 'scale-110');
            el.classList.add('hover:scale-105');
            // Restore original tag colors (will be handled by getTagColor)
            const tag = el.dataset.tag;
            if (tag) {
                const tagColor = getTagColor(tag);
                // Remove old color classes
                el.classList.remove('bg-slate-800', 'text-slate-300', 'bg-blue-500/20', 'text-blue-300', 'text-blue-400', 'bg-blue-500/10', 'border-blue-500/10');
                // Add correct color classes
                el.classList.add(tagColor.bg, tagColor.text, tagColor.border);
            }
        }
    });

    const setActive = (selector) => {
        document.querySelectorAll(selector).forEach(el => {
            el.classList.add('text-blue-400', 'bg-blue-500/10', 'border-blue-500/10');
            el.classList.remove('text-slate-400', 'hover:text-white', 'hover:bg-white/5');
            if (el.classList.contains('sidebar-tag')) {
                // Highlight active tag with ring and scale
                el.classList.add('ring-2', 'ring-blue-400/50', 'ring-offset-2', 'ring-offset-slate-900', 'scale-110');
                el.classList.remove('hover:scale-105');
            }
        });
    };

    // Handle collection: #/collection/123
    if (path.startsWith('#/collection/')) {
        const collectionId = decodeURIComponent(path.split('/')[2]);
        setActive(`.collection-item[data-collection-id="${collectionId}"]`);
    }
    // Handle compound filters
    else if (path.startsWith('#/app/filter/')) {
        const parts = path.substring(14).split('/'); 
        parts.forEach(part => {
            if (part.startsWith('status:')) {
                const status = decodeURIComponent(part.substring(7));
                setActive(`.sidebar-status-link[data-status="${status}"]`);
            } else if (part.startsWith('tag:')) {
                const tag = decodeURIComponent(part.substring(4));
                setActive(`.sidebar-tag[data-tag="${tag}"]`);
            }
        });
    } else if (path.startsWith('#/filter/')) {
        // Legacy support
        const parts = path.substring(9).split('/'); 
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
    // Handle single status filter
    else if (path.startsWith('#/app/status/')) {
        const status = decodeURIComponent(path.split('/')[3]);
        setActive(`.sidebar-status-link[data-status="${status}"]`);
    } else if (path.startsWith('#/status/')) {
        const status = decodeURIComponent(path.split('/')[2]);
        setActive(`.sidebar-status-link[data-status="${status}"]`);
    }
    // Handle single tag filter
    else if (path.startsWith('#/app/tag/')) {
        const tag = decodeURIComponent(path.split('/')[3]);
        setActive(`.sidebar-tag[data-tag="${tag}"]`);
    } else if (path.startsWith('#/tag/')) {
        const tag = decodeURIComponent(path.split('/')[2]);
        setActive(`.sidebar-tag[data-tag="${tag}"]`);
    }
    // Documentation page
    else if (path.startsWith('#/docs')) {
        setActive('.sidebar-docs-link');
    }
    // No filters active - highlight "All Papers" (for #/app route)
    else if (path === '#/app' || path === '') {
        setActive('.sidebar-all-papers-link');
    }
};
