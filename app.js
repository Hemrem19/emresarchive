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

    // Command Palette Module
    const commandPalette = {
        isOpen: false,
        selectedIndex: 0,
        results: [],

        init() {
            // Render command palette HTML into container
            const container = document.getElementById('command-palette-container');
            if (container) {
                container.innerHTML = templates.commandPalette;
            }

            // Add global keyboard listener
            document.addEventListener('keydown', (e) => {
                // Ctrl+K or Cmd+K to open palette
                if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
                    e.preventDefault();
                    this.toggle();
                }
            });

            // Setup event listeners
            const overlay = document.getElementById('command-palette-overlay');
            const input = document.getElementById('command-palette-input');

            // Close on overlay click
            if (overlay) {
                overlay.addEventListener('click', (e) => {
                    if (e.target === overlay) {
                        this.close();
                    }
                });
            }

            // Input event for search
            if (input) {
                input.addEventListener('input', (e) => {
                    this.search(e.target.value);
                });

                // Keyboard navigation
                input.addEventListener('keydown', (e) => {
                    if (e.key === 'ArrowDown') {
                        e.preventDefault();
                        this.navigate(1);
                    } else if (e.key === 'ArrowUp') {
                        e.preventDefault();
                        this.navigate(-1);
                    } else if (e.key === 'Enter') {
                        e.preventDefault();
                        this.executeSelected();
                    } else if (e.key === 'Escape') {
                        e.preventDefault();
                        this.close();
                    }
                });
            }
        },

        toggle() {
            if (this.isOpen) {
                this.close();
            } else {
                this.open();
            }
        },

        open() {
            const overlay = document.getElementById('command-palette-overlay');
            const input = document.getElementById('command-palette-input');
            
            if (overlay) {
                overlay.classList.remove('hidden');
                this.isOpen = true;
                
                // Focus input
                if (input) {
                    setTimeout(() => input.focus(), 100);
                }

                // Show default state
                this.showDefaultState();
            }
        },

        close() {
            const overlay = document.getElementById('command-palette-overlay');
            const input = document.getElementById('command-palette-input');
            
            if (overlay) {
                overlay.classList.add('hidden');
                this.isOpen = false;
                this.selectedIndex = 0;
                this.results = [];
                
                // Clear input
                if (input) {
                    input.value = '';
                }

                // Reset to default state
                this.showDefaultState();
            }
        },

        showDefaultState() {
            const empty = document.getElementById('command-palette-empty');
            const resultsList = document.getElementById('command-palette-results-list');
            const noResults = document.getElementById('command-palette-no-results');

            if (empty) empty.classList.remove('hidden');
            if (resultsList) resultsList.classList.add('hidden');
            if (noResults) noResults.classList.add('hidden');
        },

        search(query) {
            if (!query.trim()) {
                this.showDefaultState();
                this.results = [];
                this.selectedIndex = 0;
                return;
            }

            const lowerQuery = query.toLowerCase();
            this.results = [];

            // Search papers
            appState.allPapersCache.forEach(paper => {
                const titleMatch = paper.title.toLowerCase().includes(lowerQuery);
                const authorsMatch = paper.authors.some(author => author.toLowerCase().includes(lowerQuery));
                
                if (titleMatch || authorsMatch) {
                    this.results.push({
                        type: 'paper',
                        icon: 'description',
                        title: paper.title,
                        subtitle: `${paper.authors.join(', ')} · ${paper.year || 'N/A'}`,
                        action: () => window.location.hash = `#/details/${paper.id}`
                    });
                }
            });

            // Search tags
            const allTags = [...new Set(appState.allPapersCache.flatMap(p => p.tags || []))];
            allTags.forEach(tag => {
                if (tag.toLowerCase().includes(lowerQuery)) {
                    this.results.push({
                        type: 'tag',
                        icon: 'label',
                        title: `#${tag}`,
                        subtitle: 'Filter by tag',
                        action: () => window.location.hash = `#/tag/${encodeURIComponent(tag)}`
                    });
                }
            });

            // Search collections
            if (appState.collectionsCache) {
                appState.collectionsCache.forEach(collection => {
                    if (collection.name.toLowerCase().includes(lowerQuery)) {
                        this.results.push({
                            type: 'collection',
                            icon: collection.icon || 'folder',
                            title: collection.name,
                            subtitle: 'Saved collection',
                            action: () => {
                                // Apply collection filters (simulate click on collection)
                                const collectionItems = document.querySelectorAll(`.collection-item[data-collection-id="${collection.id}"]`);
                                if (collectionItems.length > 0) {
                                    collectionItems[0].click();
                                }
                            }
                        });
                    }
                });
            }

            // Search status filters
            const statuses = getStatusOrder();
            statuses.forEach(status => {
                if (status.toLowerCase().includes(lowerQuery)) {
                    this.results.push({
                        type: 'status',
                        icon: 'filter_alt',
                        title: status,
                        subtitle: 'Filter by status',
                        action: () => window.location.hash = `#/status/${encodeURIComponent(status)}`
                    });
                }
            });

            // Search actions
            const actions = [
                { name: 'Add New Paper', icon: 'add_circle', action: () => window.location.hash = '#/add' },
                { name: 'Export Data', icon: 'download', action: () => window.location.hash = '#/settings' },
                { name: 'Import Data', icon: 'upload', action: () => window.location.hash = '#/settings' },
                { name: 'Settings', icon: 'settings', action: () => window.location.hash = '#/settings' },
                { name: 'Dashboard', icon: 'inbox', action: () => window.location.hash = '#/' }
            ];

            actions.forEach(action => {
                if (action.name.toLowerCase().includes(lowerQuery)) {
                    this.results.push({
                        type: 'action',
                        icon: action.icon,
                        title: action.name,
                        subtitle: 'Quick action',
                        action: action.action
                    });
                }
            });

            // Render results
            this.renderResults();
        },

        renderResults() {
            const empty = document.getElementById('command-palette-empty');
            const resultsList = document.getElementById('command-palette-results-list');
            const noResults = document.getElementById('command-palette-no-results');

            if (this.results.length === 0) {
                if (empty) empty.classList.add('hidden');
                if (resultsList) resultsList.classList.add('hidden');
                if (noResults) noResults.classList.remove('hidden');
                return;
            }

            // Hide empty and no results states
            if (empty) empty.classList.add('hidden');
            if (noResults) noResults.classList.add('hidden');
            if (resultsList) resultsList.classList.remove('hidden');

            // Group results by type
            const groupedResults = {};
            this.results.forEach((result, index) => {
                result.index = index;
                if (!groupedResults[result.type]) {
                    groupedResults[result.type] = [];
                }
                groupedResults[result.type].push(result);
            });

            // Render grouped results
            const typeLabels = {
                paper: 'Papers',
                tag: 'Tags',
                collection: 'Collections',
                status: 'Status Filters',
                action: 'Actions'
            };

            let html = '';
            Object.keys(groupedResults).forEach(type => {
                html += `
                    <div class="py-2">
                        <div class="px-4 py-2 text-xs font-semibold text-stone-500 dark:text-stone-400 uppercase tracking-wider">
                            ${typeLabels[type] || type}
                        </div>
                        ${groupedResults[type].map(result => `
                            <div class="command-palette-item px-4 py-3 cursor-pointer flex items-center gap-3 ${result.index === this.selectedIndex ? 'selected' : ''}" data-index="${result.index}">
                                <span class="material-symbols-outlined text-stone-600 dark:text-stone-400 text-xl">${result.icon}</span>
                                <div class="flex-1 min-w-0">
                                    <div class="text-sm font-medium text-stone-900 dark:text-stone-100 truncate">${this.escapeHtml(result.title)}</div>
                                    <div class="text-xs text-stone-500 dark:text-stone-400 truncate">${this.escapeHtml(result.subtitle)}</div>
                                </div>
                                <kbd class="hidden sm:inline-flex px-1.5 py-0.5 text-xs text-stone-500 dark:text-stone-400 bg-stone-100 dark:bg-stone-800 rounded border border-stone-300 dark:border-stone-700">↵</kbd>
                            </div>
                        `).join('')}
                    </div>
                `;
            });

            if (resultsList) {
                resultsList.innerHTML = html;
            }

            // Add click handlers
            document.querySelectorAll('.command-palette-item').forEach(item => {
                item.addEventListener('click', () => {
                    const index = parseInt(item.dataset.index, 10);
                    this.selectedIndex = index;
                    this.executeSelected();
                });
            });

            // Reset selected index
            this.selectedIndex = 0;
        },

        navigate(direction) {
            if (this.results.length === 0) return;

            this.selectedIndex += direction;

            // Wrap around
            if (this.selectedIndex < 0) {
                this.selectedIndex = this.results.length - 1;
            } else if (this.selectedIndex >= this.results.length) {
                this.selectedIndex = 0;
            }

            // Update visual selection
            document.querySelectorAll('.command-palette-item').forEach(item => {
                const index = parseInt(item.dataset.index, 10);
                if (index === this.selectedIndex) {
                    item.classList.add('selected');
                    item.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
                } else {
                    item.classList.remove('selected');
                }
            });
        },

        executeSelected() {
            if (this.results.length === 0 || !this.results[this.selectedIndex]) return;

            const selected = this.results[this.selectedIndex];
            if (selected.action) {
                selected.action();
                this.close();
            }
        },

        escapeHtml(text) {
            const div = document.createElement('div');
            div.textContent = text;
            return div.innerHTML;
        }
    };

    // Initialize command palette
    commandPalette.init();

    // Global Keyboard Shortcuts Module
    const keyboardShortcuts = {
        sequenceKey: null, // For multi-key shortcuts like "g h"
        sequenceTimeout: null,

        init() {
            document.addEventListener('keydown', (e) => {
                // Don't trigger shortcuts when typing in inputs, textareas, or contenteditable
                const activeElement = document.activeElement;
                const isTyping = activeElement && (
                    activeElement.tagName === 'INPUT' ||
                    activeElement.tagName === 'TEXTAREA' ||
                    activeElement.isContentEditable ||
                    activeElement.id === 'command-palette-input' // Exclude command palette
                );

                // Allow Esc even when typing
                if (e.key === 'Escape' && !isTyping) {
                    this.handleEscape();
                    return;
                }

                // Skip other shortcuts if typing
                if (isTyping) return;

                // Handle sequence shortcuts (e.g., "g h" for go home)
                if (this.sequenceKey) {
                    this.handleSequence(e);
                    return;
                }

                // Single-key shortcuts
                switch(e.key.toLowerCase()) {
                    case 'n':
                        e.preventDefault();
                        this.newPaper();
                        break;
                    case '/':
                        e.preventDefault();
                        this.focusSearch();
                        break;
                    case '?':
                        e.preventDefault();
                        this.showHelp();
                        break;
                    case 'g':
                        e.preventDefault();
                        this.startSequence('g');
                        break;
                }
            });
        },

        startSequence(key) {
            this.sequenceKey = key;
            // Clear sequence after 1.5 seconds if no second key pressed
            if (this.sequenceTimeout) clearTimeout(this.sequenceTimeout);
            this.sequenceTimeout = setTimeout(() => {
                this.sequenceKey = null;
            }, 1500);
        },

        handleSequence(e) {
            const secondKey = e.key.toLowerCase();
            
            if (this.sequenceKey === 'g') {
                switch(secondKey) {
                    case 'h':
                        e.preventDefault();
                        window.location.hash = '#/';
                        break;
                    case 's':
                        e.preventDefault();
                        window.location.hash = '#/settings';
                        break;
                }
            }

            // Clear sequence
            this.sequenceKey = null;
            if (this.sequenceTimeout) clearTimeout(this.sequenceTimeout);
        },

        handleEscape() {
            // Close command palette if open
            if (commandPalette.isOpen) {
                commandPalette.close();
                return;
            }

            // If on details or form, go back to dashboard
            const currentHash = window.location.hash;
            if (currentHash.startsWith('#/details/') || 
                currentHash.startsWith('#/edit/') || 
                currentHash === '#/add') {
                window.location.hash = '#/';
            }
        },

        newPaper() {
            window.location.hash = '#/add';
        },

        focusSearch() {
            const searchInput = document.getElementById('search-input');
            if (searchInput) {
                searchInput.focus();
                searchInput.select();
            }
        },

        showHelp() {
            // Create and show help modal
            const helpModal = document.getElementById('shortcuts-help-modal');
            if (helpModal) {
                helpModal.classList.remove('hidden');
            } else {
                // Create help modal if it doesn't exist
                this.createHelpModal();
            }
        },

        createHelpModal() {
            const modalHtml = `
                <div id="shortcuts-help-modal" class="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
                    <div class="bg-white dark:bg-stone-900 rounded-xl shadow-2xl w-full max-w-2xl max-h-[80vh] overflow-hidden border border-stone-200 dark:border-stone-800">
                        <!-- Header -->
                        <div class="p-6 border-b border-stone-200 dark:border-stone-800 flex items-center justify-between">
                            <h2 class="text-2xl font-bold text-stone-900 dark:text-stone-100">Keyboard Shortcuts</h2>
                            <button id="close-shortcuts-help" class="p-2 rounded-lg hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors">
                                <span class="material-symbols-outlined text-stone-600 dark:text-stone-400">close</span>
                            </button>
                        </div>

                        <!-- Content -->
                        <div class="p-6 overflow-y-auto max-h-[60vh]">
                            <div class="space-y-6">
                                <!-- Global Shortcuts -->
                                <div>
                                    <h3 class="text-sm font-semibold text-stone-500 dark:text-stone-400 uppercase tracking-wider mb-3">Global</h3>
                                    <div class="space-y-2">
                                        <div class="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-stone-50 dark:hover:bg-stone-800/50">
                                            <span class="text-sm text-stone-700 dark:text-stone-300">Open command palette</span>
                                            <div class="flex gap-1">
                                                <kbd class="px-2 py-1 text-xs bg-stone-100 dark:bg-stone-800 rounded border border-stone-300 dark:border-stone-700">Ctrl</kbd>
                                                <kbd class="px-2 py-1 text-xs bg-stone-100 dark:bg-stone-800 rounded border border-stone-300 dark:border-stone-700">K</kbd>
                                            </div>
                                        </div>
                                        <div class="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-stone-50 dark:hover:bg-stone-800/50">
                                            <span class="text-sm text-stone-700 dark:text-stone-300">New paper</span>
                                            <kbd class="px-2 py-1 text-xs bg-stone-100 dark:bg-stone-800 rounded border border-stone-300 dark:border-stone-700">N</kbd>
                                        </div>
                                        <div class="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-stone-50 dark:hover:bg-stone-800/50">
                                            <span class="text-sm text-stone-700 dark:text-stone-300">Focus search</span>
                                            <kbd class="px-2 py-1 text-xs bg-stone-100 dark:bg-stone-800 rounded border border-stone-300 dark:border-stone-700">/</kbd>
                                        </div>
                                        <div class="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-stone-50 dark:hover:bg-stone-800/50">
                                            <span class="text-sm text-stone-700 dark:text-stone-300">Go to dashboard</span>
                                            <div class="flex gap-1">
                                                <kbd class="px-2 py-1 text-xs bg-stone-100 dark:bg-stone-800 rounded border border-stone-300 dark:border-stone-700">G</kbd>
                                                <span class="text-stone-400">then</span>
                                                <kbd class="px-2 py-1 text-xs bg-stone-100 dark:bg-stone-800 rounded border border-stone-300 dark:border-stone-700">H</kbd>
                                            </div>
                                        </div>
                                        <div class="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-stone-50 dark:hover:bg-stone-800/50">
                                            <span class="text-sm text-stone-700 dark:text-stone-300">Go to settings</span>
                                            <div class="flex gap-1">
                                                <kbd class="px-2 py-1 text-xs bg-stone-100 dark:bg-stone-800 rounded border border-stone-300 dark:border-stone-700">G</kbd>
                                                <span class="text-stone-400">then</span>
                                                <kbd class="px-2 py-1 text-xs bg-stone-100 dark:bg-stone-800 rounded border border-stone-300 dark:border-stone-700">S</kbd>
                                            </div>
                                        </div>
                                        <div class="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-stone-50 dark:hover:bg-stone-800/50">
                                            <span class="text-sm text-stone-700 dark:text-stone-300">Close / Go back</span>
                                            <kbd class="px-2 py-1 text-xs bg-stone-100 dark:bg-stone-800 rounded border border-stone-300 dark:border-stone-700">Esc</kbd>
                                        </div>
                                        <div class="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-stone-50 dark:hover:bg-stone-800/50">
                                            <span class="text-sm text-stone-700 dark:text-stone-300">Show this help</span>
                                            <kbd class="px-2 py-1 text-xs bg-stone-100 dark:bg-stone-800 rounded border border-stone-300 dark:border-stone-700">?</kbd>
                                        </div>
                                    </div>
                                </div>

                                <!-- Command Palette -->
                                <div>
                                    <h3 class="text-sm font-semibold text-stone-500 dark:text-stone-400 uppercase tracking-wider mb-3">Command Palette</h3>
                                    <div class="space-y-2">
                                        <div class="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-stone-50 dark:hover:bg-stone-800/50">
                                            <span class="text-sm text-stone-700 dark:text-stone-300">Navigate results</span>
                                            <div class="flex gap-1">
                                                <kbd class="px-2 py-1 text-xs bg-stone-100 dark:bg-stone-800 rounded border border-stone-300 dark:border-stone-700">↑</kbd>
                                                <kbd class="px-2 py-1 text-xs bg-stone-100 dark:bg-stone-800 rounded border border-stone-300 dark:border-stone-700">↓</kbd>
                                            </div>
                                        </div>
                                        <div class="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-stone-50 dark:hover:bg-stone-800/50">
                                            <span class="text-sm text-stone-700 dark:text-stone-300">Execute selected</span>
                                            <kbd class="px-2 py-1 text-xs bg-stone-100 dark:bg-stone-800 rounded border border-stone-300 dark:border-stone-700">Enter</kbd>
                                        </div>
                                        <div class="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-stone-50 dark:hover:bg-stone-800/50">
                                            <span class="text-sm text-stone-700 dark:text-stone-300">Close palette</span>
                                            <kbd class="px-2 py-1 text-xs bg-stone-100 dark:bg-stone-800 rounded border border-stone-300 dark:border-stone-700">Esc</kbd>
                                        </div>
                                    </div>
                                </div>

                                <!-- Tips -->
                                <div class="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                                    <div class="flex gap-2">
                                        <span class="material-symbols-outlined text-blue-600 dark:text-blue-400 text-xl">info</span>
                                        <div>
                                            <p class="text-sm font-medium text-blue-900 dark:text-blue-100 mb-1">Pro Tip</p>
                                            <p class="text-xs text-blue-800 dark:text-blue-200">Shortcuts don't work while typing in input fields. Press <kbd class="px-1 py-0.5 text-xs bg-blue-100 dark:bg-blue-900 rounded">Esc</kbd> to exit an input and use shortcuts.</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <!-- Footer -->
                        <div class="p-4 bg-stone-50 dark:bg-stone-900/50 border-t border-stone-200 dark:border-stone-800 flex justify-end">
                            <button id="close-shortcuts-help-btn" class="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors text-sm font-semibold">
                                Got it!
                            </button>
                        </div>
                    </div>
                </div>
            `;

            // Add modal to body
            document.body.insertAdjacentHTML('beforeend', modalHtml);

            // Add event listeners
            const modal = document.getElementById('shortcuts-help-modal');
            const closeBtn = document.getElementById('close-shortcuts-help');
            const closeBtnFooter = document.getElementById('close-shortcuts-help-btn');

            const closeModal = () => {
                if (modal) modal.classList.add('hidden');
            };

            if (closeBtn) closeBtn.addEventListener('click', closeModal);
            if (closeBtnFooter) closeBtnFooter.addEventListener('click', closeModal);
            
            // Close on overlay click
            if (modal) {
                modal.addEventListener('click', (e) => {
                    if (e.target === modal) closeModal();
                });
            }

            // Close on Esc
            document.addEventListener('keydown', (e) => {
                if (e.key === 'Escape' && modal && !modal.classList.contains('hidden')) {
                    closeModal();
                }
            });
        }
    };

    // Initialize keyboard shortcuts
    keyboardShortcuts.init();

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