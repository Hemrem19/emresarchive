// core/commandPalette.js
// Command Palette for Quick Navigation and Search

import { views as templates } from '../views/index.js';
import { getStatusOrder } from '../config.js';

/**
 * Creates and manages the command palette for quick navigation
 * 
 * @param {Object} appState - Application state object
 * @returns {Object} Command palette instance with methods
 */
export const createCommandPalette = (appState) => {
    return {
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
                { name: 'Paper Network', icon: 'device_hub', action: () => window.location.hash = '#/graph' },
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
};

