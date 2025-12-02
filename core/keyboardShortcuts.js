// core/keyboardShortcuts.js
// Global Keyboard Shortcuts

import { applyFiltersAndRender } from './filters.js';

/**
 * Creates and manages global keyboard shortcuts
 * 
 * @param {Object} commandPalette - Command palette instance
 * @returns {Object} Keyboard shortcuts instance with methods
 */
export const createKeyboardShortcuts = (commandPalette, appState) => {
    return {
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

                // Handle Esc key - ALWAYS works, even when typing
                if (e.key === 'Escape') {
                    e.preventDefault();
                    
                    // If typing in an input/textarea, blur it first
                    if (isTyping && activeElement) {
                        activeElement.blur();
                        // Don't proceed with other Esc actions - just blur
                        return;
                    }
                    
                    // If not typing, handle normal Esc behavior
                    this.handleEscape();
                    return;
                }

                // Skip other shortcuts if typing
                if (isTyping) return;

                // Selection shortcuts (dashboard)
                // Ctrl + A → select all visible papers
                if (e.ctrlKey && !e.shiftKey && e.key.toLowerCase() === 'a') {
                    if (this.isOnDashboard()) {
                        e.preventDefault();
                        this.selectAllVisible();
                    }
                    return;
                }

                // Ctrl + Shift + D → focus Quick Add DOI (check this BEFORE Ctrl+D)
                if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 'd') {
                    if (this.isOnDashboard()) {
                        e.preventDefault();
                        this.focusQuickAddDoi();
                    }
                    return;
                }

                // Ctrl + D → clear selection (only if Shift is NOT pressed)
                if (e.ctrlKey && !e.shiftKey && e.key.toLowerCase() === 'd') {
                    if (this.isOnDashboard()) {
                        e.preventDefault();
                        this.clearSelection();
                    }
                    return;
                }

                // Delete → batch delete selected
                if (e.key === 'Delete') {
                    if (this.isOnDashboard() && appState.selectedPaperIds.size > 0) {
                        e.preventDefault();
                        const deleteBtn = document.getElementById('batch-delete-btn');
                        if (deleteBtn) deleteBtn.click();
                    }
                    return;
                }

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
                        window.location.hash = '#/app';
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
            // Close shortcuts help modal if open
            const helpModal = document.getElementById('shortcuts-help-modal');
            if (helpModal && !helpModal.classList.contains('hidden')) {
                helpModal.classList.add('hidden');
                return;
            }

            // Close command palette if open
            if (commandPalette.isOpen) {
                commandPalette.close();
                return;
            }

            // If on dashboard and there are selections, clear them
            if (this.isOnDashboard() && appState && appState.selectedPaperIds && appState.selectedPaperIds.size > 0) {
                this.clearSelection();
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

        isOnDashboard() {
            const hash = window.location.hash || '#/';
            return hash === '#/' || hash.startsWith('#/filter/') || hash.startsWith('#/status/') || hash.startsWith('#/tag/');
        },

        clearSelection() {
            if (!appState || !appState.selectedPaperIds) return;
            appState.selectedPaperIds.clear();
            applyFiltersAndRender(appState);
        },

        selectAllVisible() {
            if (!appState || !appState.selectedPaperIds) return;
            const checkboxes = document.querySelectorAll('.paper-checkbox');
            checkboxes.forEach(cb => {
                cb.checked = true;
                const id = parseInt(cb.dataset.paperId, 10);
                if (!Number.isNaN(id)) appState.selectedPaperIds.add(id);
            });
            applyFiltersAndRender(appState);
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

        focusQuickAddDoi() {
            const doiInput = document.getElementById('quick-add-doi');
            if (doiInput) {
                doiInput.focus();
                doiInput.select();
                doiInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
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

                                <!-- Dashboard Shortcuts -->
                                <div>
                                    <h3 class="text-sm font-semibold text-stone-500 dark:text-stone-400 uppercase tracking-wider mb-3">Dashboard</h3>
                                    <div class="space-y-2">
                                        <div class="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-stone-50 dark:hover:bg-stone-800/50">
                                            <span class="text-sm text-stone-700 dark:text-stone-300">Select all visible papers</span>
                                            <div class="flex gap-1">
                                                <kbd class="px-2 py-1 text-xs bg-stone-100 dark:bg-stone-800 rounded border border-stone-300 dark:border-stone-700">Ctrl</kbd>
                                                <kbd class="px-2 py-1 text-xs bg-stone-100 dark:bg-stone-800 rounded border border-stone-300 dark:border-stone-700">A</kbd>
                                            </div>
                                        </div>
                                        <div class="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-stone-50 dark:hover:bg-stone-800/50">
                                            <span class="text-sm text-stone-700 dark:text-stone-300">Clear selection</span>
                                            <div class="flex gap-1 items-center">
                                                <kbd class="px-2 py-1 text-xs bg-stone-100 dark:bg-stone-800 rounded border border-stone-300 dark:border-stone-700">Ctrl</kbd>
                                                <kbd class="px-2 py-1 text-xs bg-stone-100 dark:bg-stone-800 rounded border border-stone-300 dark:border-stone-700">D</kbd>
                                                <span class="text-stone-400 mx-1">or</span>
                                                <kbd class="px-2 py-1 text-xs bg-stone-100 dark:bg-stone-800 rounded border border-stone-300 dark:border-stone-700">Esc</kbd>
                                            </div>
                                        </div>
                                        <div class="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-stone-50 dark:hover:bg-stone-800/50">
                                            <span class="text-sm text-stone-700 dark:text-stone-300">Delete selected papers</span>
                                            <kbd class="px-2 py-1 text-xs bg-stone-100 dark:bg-stone-800 rounded border border-stone-300 dark:border-stone-700">Del</kbd>
                                        </div>
                                        <div class="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-stone-50 dark:hover:bg-stone-800/50">
                                            <span class="text-sm text-stone-700 dark:text-stone-300">Focus Quick Add by DOI</span>
                                            <div class="flex gap-1 items-center">
                                                <kbd class="px-2 py-1 text-xs bg-stone-100 dark:bg-stone-800 rounded border border-stone-300 dark:border-stone-700">Ctrl</kbd>
                                                <kbd class="px-2 py-1 text-xs bg-stone-100 dark:bg-stone-800 rounded border border-stone-300 dark:border-stone-700">Shift</kbd>
                                                <kbd class="px-2 py-1 text-xs bg-stone-100 dark:bg-stone-800 rounded border border-stone-300 dark:border-stone-700">D</kbd>
                                            </div>
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

            // Show modal
            if (modal) modal.classList.remove('hidden');
        }
    };
};

