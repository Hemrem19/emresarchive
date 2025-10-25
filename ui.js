import { getStatusOrder } from './config.js';

export const escapeHtml = (unsafe) => unsafe.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");

export const showToast = (message, type = 'success') => {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    const bgColor = type === 'error' ? 'bg-red-500' : 'bg-green-500';
    
    toast.className = `toast p-4 rounded-lg shadow-lg text-white ${bgColor}`;
    toast.textContent = message;

    container.appendChild(toast);

    setTimeout(() => {
        toast.classList.add('opacity-0', 'transition-opacity', 'duration-500');
        setTimeout(() => {
            toast.remove();
        }, 500);
    }, 3000);
};

/**
 * Sorts an array of papers based on a given key.
 * @param {Array<Object>} papers - The array of papers to sort.
 * @param {string} sortBy - The key to sort by ('date_added', 'title_asc', 'year_desc', 'status_asc').
 * @returns {Array<Object>} A new array with the sorted papers.
 */
export const sortPapers = (papers, sortBy) => {
    let sortedPapers = [...papers]; // Create a shallow copy to avoid mutating the original array
    switch (sortBy) {
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

export const renderPaperList = (papers, searchTerm = '') => {
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

    const paperItemsHtml = papers.map(paper => `
        <div class="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-lg p-4 flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <div class="flex-grow">
                <div class="flex items-center gap-2 mb-1">
                    <span 
                        class="h-2.5 w-2.5 rounded-full flex-shrink-0 ${statusColors[paper.readingStatus] || 'bg-stone-400'}" 
                        title="Status: ${paper.readingStatus}"
                    ></span>
                    <a href="#/details/${paper.id}" class="font-bold text-lg text-stone-900 dark:text-stone-100 hover:text-primary dark:hover:text-primary transition-colors">${highlightText(paper.title, searchTerm)}</a>
                </div>
                <p class="text-sm text-stone-500 dark:text-stone-400 mb-2">${highlightText(paper.authors.join(', '), searchTerm)} - ${paper.year || 'N/A'}</p>
                ${paper.tags && paper.tags.length > 0 ? `
                    <div class="flex flex-wrap gap-2">
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
    `).join('');

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

export const highlightActiveSidebarLink = () => {
    const path = window.location.hash;
    
    document.querySelectorAll('.sidebar-status-link, .sidebar-tag, .sidebar-all-papers-link').forEach(el => {
        el.classList.remove('text-primary', 'bg-primary/10', 'dark:bg-primary/20');
        el.classList.add('text-stone-500', 'dark:text-stone-400', 'hover:text-stone-900', 'dark:hover:text-stone-100', 'hover:bg-stone-100', 'dark:hover:bg-stone-800');
    });

    const setActive = (selector) => {
        document.querySelectorAll(selector).forEach(el => {
            el.classList.add('text-primary', 'bg-primary/10', 'dark:bg-primary/20');
            el.classList.remove('text-stone-500', 'dark:text-stone-400');
        });
    };

    if (path.startsWith('#/status/')) {
        setActive(`.sidebar-status-link[data-status="${decodeURIComponent(path.split('/')[2])}"]`);
    } else if (path.startsWith('#/tag/')) {
        setActive(`.sidebar-tag[data-tag="${decodeURIComponent(path.split('/')[2])}"]`);
    } else if (path === '#/' || path === '') {
        setActive('.sidebar-all-papers-link');
    }
};