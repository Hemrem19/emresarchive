import { openDB } from './db.js';
import { views as templates } from './views.js';
import { highlightActiveSidebarLink, sortPapers, renderPaperList } from './ui.js';
import { dashboardView } from './dashboard.view.js';
import { detailsView } from './details.view.js';
import { formView } from './form.view.js';
import { settingsView } from './settings.view.js';
import { getStatusOrder } from './config.js';

document.addEventListener('DOMContentLoaded', async () => {

    // Helper function to render a view and execute post-render scripts
    const applyTheme = () => {
        const isDarkMode = localStorage.getItem('theme') === 'dark';
        if (isDarkMode) {
            document.documentElement.classList.add('dark');
        } else {
            document.documentElement.classList.remove('dark');
        }
    };

    applyTheme(); // Apply theme on initial load
    
    const renderSidebarStatusLinks = () => {
        const desktopList = document.getElementById('sidebar-status-list');
        const mobileList = document.getElementById('mobile-sidebar-status-list');
        const statusOrder = getStatusOrder();
        const statusColors = {
            'Reading': 'bg-blue-500',
            'To Read': 'bg-yellow-500',
            'Finished': 'bg-green-500',
            'Archived': 'bg-stone-500',
        };

        const linksHtml = statusOrder.map(status => `
            <a href="#/status/${encodeURIComponent(status)}" data-status="${status}" class="sidebar-status-link flex items-center gap-3 px-3 py-2 rounded-lg text-stone-500 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-100 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors">
                <span class="h-2 w-2 rounded-full ${statusColors[status] || 'bg-gray-400'}"></span>
                <span class="text-sm font-medium">${status}</span>
            </a>
        `).join('');

        if (desktopList) desktopList.innerHTML = linksHtml;
        if (mobileList) mobileList.innerHTML = linksHtml;
    };

    renderSidebarStatusLinks(); // Initial render on page load
    
    const app = document.getElementById('app');
    const appState = {
        allPapersCache: [],
        collectionsCache: [], // Saved filter collections
        // Initialize hasUnsavedChanges to false. It will be set to true by formView if changes are made.
        // This flag is managed by the formView module.
        hasUnsavedChanges: false, 
        currentSortBy: localStorage.getItem('currentSortBy') || 'date_added',
        currentSearchTerm: localStorage.getItem('searchTerm') || '',
        currentPath: window.location.hash.substring(1) || '/',
        currentView: null,
        selectedPaperIds: new Set(), // Track selected papers for batch operations
        activeFilters: {
            status: null,  // e.g., 'To Read'
            tag: null,     // e.g., 'machine-learning'
        },
        pagination: {
            currentPage: 1,
            itemsPerPage: parseInt(localStorage.getItem('itemsPerPage')) || 25,
            totalItems: 0,
            totalPages: 0
        },
        searchMode: localStorage.getItem('searchMode') || 'all' // 'all' or 'notes'
    };
    
    const renderView = (viewContent, setupFn = null) => {
        app.innerHTML = viewContent;
        // Defer execution of setupFn to allow the browser to parse the new HTML and create DOM elements.
        // This prevents race conditions where view mount methods try to access elements not yet in the DOM.
        if (setupFn && typeof setupFn === 'function') {
            setTimeout(() => setupFn(), 0);
        }
    };

    // Function to handle browser's native beforeunload event
    const handleBeforeUnload = (event) => {
        // Only prompt if there are unsaved changes AND we are on the add/edit form
        if (appState.hasUnsavedChanges && (appState.currentPath.startsWith('/add') || appState.currentPath.startsWith('/edit/'))) {
            event.preventDefault();
            // Chrome requires returnValue to be set
            event.returnValue = ''; 
            return 'You have unsaved changes. Are you sure you want to leave?';
        }
        return undefined; // Allow navigation
    };

    // Helper to get papers filtered by active filters and search input
    const getFilteredPapers = (papers) => {
        let filtered = [...papers];

        // Apply status filter
        if (appState.activeFilters.status) {
            filtered = filtered.filter(p => p.readingStatus === appState.activeFilters.status);
        }

        // Apply tag filter
        if (appState.activeFilters.tag) {
            filtered = filtered.filter(p => p.tags && p.tags.includes(appState.activeFilters.tag));
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

    // Helper to update URL hash based on active filters
    const updateUrlHash = () => {
        const { status, tag } = appState.activeFilters;
        if (status && tag) {
            window.location.hash = `#/filter/status:${encodeURIComponent(status)}/tag:${encodeURIComponent(tag)}`;
        } else if (status) {
            window.location.hash = `#/status/${encodeURIComponent(status)}`;
        } else if (tag) {
            window.location.hash = `#/tag/${encodeURIComponent(tag)}`;
        } else {
            window.location.hash = '#/';
        }
    };

    // Helper to parse URL hash and update active filters
    const parseUrlHash = () => {
        const path = window.location.hash;
        
        // Reset filters
        appState.activeFilters.status = null;
        appState.activeFilters.tag = null;

        // Parse compound filter format: #/filter/status:Reading/tag:ml
        if (path.startsWith('#/filter/')) {
            const parts = path.substring(9).split('/'); // Remove '#/filter/'
            parts.forEach(part => {
                if (part.startsWith('status:')) {
                    appState.activeFilters.status = decodeURIComponent(part.substring(7));
                } else if (part.startsWith('tag:')) {
                    appState.activeFilters.tag = decodeURIComponent(part.substring(4));
                }
            });
        }
        // Parse single status filter: #/status/Reading
        else if (path.startsWith('#/status/')) {
            appState.activeFilters.status = decodeURIComponent(path.split('/')[2]);
        }
        // Parse single tag filter: #/tag/ml
        else if (path.startsWith('#/tag/')) {
            appState.activeFilters.tag = decodeURIComponent(path.split('/')[2]);
        }
    };

    // Helper to render filter chips
    const renderFilterChips = () => {
        const container = document.getElementById('filter-chips-container');
        if (!container) return;

        const chips = [];
        
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

        if (appState.activeFilters.tag) {
            chips.push(`
                <div class="flex items-center gap-2 bg-primary/10 text-primary px-3 py-1.5 rounded-full text-sm font-medium">
                    <span class="material-symbols-outlined text-base">tag</span>
                    <span>Tag: ${appState.activeFilters.tag}</span>
                    <button class="remove-filter-btn hover:bg-primary/20 rounded-full p-0.5 transition-colors" data-filter-type="tag">
                        <span class="material-symbols-outlined text-base">close</span>
                    </button>
                </div>
            `);
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

            // Add event listener for remove filter buttons
            container.querySelectorAll('.remove-filter-btn').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const filterType = btn.dataset.filterType;
                    appState.activeFilters[filterType] = null;
                    appState.pagination.currentPage = 1; // Reset to first page
                    updateUrlHash();
                    renderFilterChips();
                    applyFiltersAndRender();
                });
            });

            // Add event listener for clear all button
            const clearAllBtn = document.getElementById('clear-all-filters-btn');
            if (clearAllBtn) {
                clearAllBtn.addEventListener('click', () => {
                    appState.activeFilters.status = null;
                    appState.activeFilters.tag = null;
                    appState.pagination.currentPage = 1; // Reset to first page
                    updateUrlHash();
                    renderFilterChips();
                    applyFiltersAndRender();
                });
            }
        } else {
            container.innerHTML = '';
            container.classList.add('hidden');
        }
    };

    // Helper to calculate pagination
    const calculatePagination = (totalItems) => {
        appState.pagination.totalItems = totalItems;
        appState.pagination.totalPages = Math.ceil(totalItems / appState.pagination.itemsPerPage);
        
        // Ensure current page is within valid range
        if (appState.pagination.currentPage > appState.pagination.totalPages) {
            appState.pagination.currentPage = Math.max(1, appState.pagination.totalPages);
        }
    };

    // Helper to get papers for current page
    const getPaginatedPapers = (papers) => {
        const startIndex = (appState.pagination.currentPage - 1) * appState.pagination.itemsPerPage;
        const endIndex = startIndex + appState.pagination.itemsPerPage;
        return papers.slice(startIndex, endIndex);
    };

    // Helper to render pagination controls
    const renderPaginationControls = () => {
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

    // Helper to apply current filters and sort, then render the list
    const applyFiltersAndRender = () => {
        let filteredPapers = getFilteredPapers(appState.allPapersCache);
        const sortedPapers = sortPapers(filteredPapers, appState.currentSortBy);
        
        // Calculate pagination
        calculatePagination(sortedPapers.length);
        
        // Get papers for current page
        const paginatedPapers = getPaginatedPapers(sortedPapers);
        
        renderPaperList(paginatedPapers, appState.currentSearchTerm, appState.selectedPaperIds);
        renderFilterChips();
        renderPaginationControls();
        highlightActiveSidebarLink();
    };

    // --- GLOBAL EVENT LISTENERS ---
    const searchInput = document.getElementById('search-input');
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            appState.currentSearchTerm = e.target.value.toLowerCase().trim(); // Update global state
            localStorage.setItem('searchTerm', appState.currentSearchTerm); // Persist to localStorage
            appState.pagination.currentPage = 1; // Reset to first page when search changes

            // If not on a dashboard-like view, navigate to home to show results. (Improved condition)
            // The router will then call setupDashboard, which will apply the filters.
            if (window.location.hash !== '#/' && !window.location.hash.startsWith('#/tag/') && !window.location.hash.startsWith('#/status/') && !window.location.hash.startsWith('#/filter/')) {
                window.location.hash = '#/'; // Navigate to home
            } else {
                // If already on a dashboard-like view, just re-render with the new search term
                applyFiltersAndRender(); // Re-filter and re-render using the updated appState.currentSearchTerm
            }
        });
    }

    // --- Sidebar Filter Toggle Logic ---
    // Intercept clicks on sidebar status and tag links to toggle filters instead of replacing
    document.addEventListener('click', (e) => {
        const statusLink = e.target.closest('.sidebar-status-link');
        const tagLink = e.target.closest('.sidebar-tag');
        const allPapersLink = e.target.closest('.sidebar-all-papers-link');

        if (statusLink) {
            e.preventDefault();
            const status = statusLink.dataset.status;
            
            // Toggle: if clicking the same status, remove it; otherwise set/change it
            if (appState.activeFilters.status === status) {
                appState.activeFilters.status = null;
            } else {
                appState.activeFilters.status = status;
            }
            
            appState.pagination.currentPage = 1; // Reset to first page when filter changes
            updateUrlHash();
            applyFiltersAndRender();
        } else if (tagLink) {
            e.preventDefault();
            const tag = tagLink.dataset.tag;
            
            // Toggle: if clicking the same tag, remove it; otherwise set/change it
            if (appState.activeFilters.tag === tag) {
                appState.activeFilters.tag = null;
            } else {
                appState.activeFilters.tag = tag;
            }
            
            appState.pagination.currentPage = 1; // Reset to first page when filter changes
            updateUrlHash();
            applyFiltersAndRender();
        } else if (allPapersLink) {
            e.preventDefault();
            // Clear all filters
            appState.activeFilters.status = null;
            appState.activeFilters.tag = null;
            appState.pagination.currentPage = 1; // Reset to first page
            updateUrlHash();
            applyFiltersAndRender();
        }
    });

    // --- Mobile Sidebar Logic ---
    const mobileMenuBtn = document.getElementById('mobile-menu-btn');
    const closeMobileMenuBtn = document.getElementById('close-mobile-menu-btn');
    const mobileSidebar = document.getElementById('mobile-sidebar');
    const mobileSidebarOverlay = document.getElementById('mobile-sidebar-overlay');

    const openMobileMenu = () => {
        mobileSidebar.classList.remove('-translate-x-full');
        mobileSidebarOverlay.classList.remove('hidden');
    };

    const closeMobileMenu = () => {
        mobileSidebar.classList.add('-translate-x-full');
        mobileSidebarOverlay.classList.add('hidden');
    };

    if (mobileMenuBtn && closeMobileMenuBtn && mobileSidebar && mobileSidebarOverlay) {
        mobileMenuBtn.addEventListener('click', openMobileMenu);
        closeMobileMenuBtn.addEventListener('click', closeMobileMenu);
        mobileSidebarOverlay.addEventListener('click', closeMobileMenu);
        // Close menu when a link inside it is clicked
        mobileSidebar.addEventListener('click', (e) => {
            if (e.target.closest('a')) {
                closeMobileMenu();
            }
        });
    }

    // --- ROUTER ---
    const router = async () => { // Made async to allow await for confirm
        // Get the hash from the URL, remove the '#'
        const requestedPath = window.location.hash.substring(1) || '/';

        // Check for unsaved changes before navigating away from add/edit form
        if (appState.hasUnsavedChanges && (appState.currentPath.startsWith('/add') || appState.currentPath.startsWith('/edit/')) && requestedPath !== appState.currentPath) {
            const confirmNavigation = confirm('You have unsaved changes. Are you sure you want to leave?');
            if (!confirmNavigation) {
                // User cancelled navigation, revert hash to current path
                window.location.hash = appState.currentPath;
                return;
            }
            // If user confirmed, reset unsaved changes flag
            appState.hasUnsavedChanges = false;
            window.removeEventListener('beforeunload', handleBeforeUnload); // Remove listener as we are leaving the form
        }

        // Unmount the previous view if it has an unmount method
        if (appState.currentView && typeof appState.currentView.unmount === 'function') {
            appState.currentView.unmount(appState);
            appState.currentView = null; // Clear the current view
        }

        // CRITICAL FIX: Update the current path *before* rendering the new view.
        appState.currentPath = requestedPath;
        
        // Simple routing logic
        if (requestedPath === '/add') {
            appState.currentView = formView;
            renderView(templates.add, () => appState.currentView.mount(null, appState));
        } else if (requestedPath.startsWith('/details/')) {
            const id = parseInt(requestedPath.split('/')[2], 10);
            appState.currentView = detailsView; // Set the new current view
            renderView(templates.details, () => appState.currentView.mount(id, appState));
        } else if (requestedPath.startsWith('/edit/')) {
            const id = parseInt(requestedPath.split('/')[2], 10);
            appState.currentView = formView;
            renderView(templates.add, () => appState.currentView.mount(id, appState));
        } else if (requestedPath === '/settings') {
            appState.currentView = settingsView;
            renderView(templates.settings, async () => {
                await appState.currentView.mount(appState);
                renderSidebarStatusLinks(); // Re-render in case order changed
            });
        } else if (requestedPath === '/' || requestedPath.startsWith('/tag/') || requestedPath.startsWith('/status/') || requestedPath.startsWith('/filter/')) {
            // Parse URL hash to update filters
            parseUrlHash();
            
            appState.currentView = dashboardView; // Set the new current view
            // All dashboard-like views
            renderView(templates.home, async () => {
                await appState.currentView.mount(appState, applyFiltersAndRender);
                applyFiltersAndRender(); // This now handles the initial render correctly
            });
        } else {
            renderView(`<h1>404 - Not Found</h1>`);
        }
    };

    // Listen for hash changes to update the view
    window.addEventListener('hashchange', router);
    window.addEventListener('hashchange', highlightActiveSidebarLink); // This should be called inside the router after a view is rendered

    // Initialize the database first, then run the initial routing and setup.
    openDB().then(() => {
        console.log('IndexedDB initialized.');
        router(); // Initial load
        highlightActiveSidebarLink(); // Also highlight on initial load
    }).catch(console.error);
});