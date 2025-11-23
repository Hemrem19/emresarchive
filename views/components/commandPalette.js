export const commandPaletteView = `
        <div id="command-palette-overlay" class="hidden fixed inset-0 bg-black/60 z-50 flex items-start justify-center pt-[15vh] animate-fade-in">
            <div id="command-palette-modal" class="bg-white dark:bg-stone-900 rounded-xl shadow-2xl w-full max-w-2xl mx-4 overflow-hidden border border-stone-200 dark:border-stone-800 animate-slide-down">
                <!-- Search Input -->
                <div class="p-4 border-b border-stone-200 dark:border-stone-800">
                    <div class="flex items-center gap-3">
                        <span class="material-symbols-outlined text-stone-400 dark:text-stone-500">search</span>
                        <input 
                            type="text" 
                            id="command-palette-input" 
                            placeholder="Search papers, tags, collections, actions..."
                            class="flex-1 bg-transparent border-none outline-none text-lg text-stone-900 dark:text-stone-100 placeholder:text-stone-400 dark:placeholder:text-stone-500"
                            autocomplete="off"
                            spellcheck="false"
                        />
                        <kbd class="hidden sm:inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-stone-500 dark:text-stone-400 bg-stone-100 dark:bg-stone-800 rounded border border-stone-300 dark:border-stone-700">
                            <span class="text-xs">ESC</span>
                        </kbd>
                    </div>
                </div>

                <!-- Results Container -->
                <div id="command-palette-results" class="max-h-[60vh] overflow-y-auto">
                    <!-- Default state - before search -->
                    <div id="command-palette-empty" class="p-8 text-center text-stone-500 dark:text-stone-400">
                        <span class="material-symbols-outlined text-4xl mb-3 block text-stone-300 dark:text-stone-700">search</span>
                        <p class="text-sm font-medium mb-1">Quick Navigation</p>
                        <p class="text-xs">Search papers, tags, collections, or actions</p>
                    </div>
                    
                    <!-- Results will be dynamically rendered here -->
                    <div id="command-palette-results-list" class="hidden"></div>
                    
                    <!-- No results state -->
                    <div id="command-palette-no-results" class="hidden p-8 text-center text-stone-500 dark:text-stone-400">
                        <span class="material-symbols-outlined text-4xl mb-3 block text-stone-300 dark:text-stone-700">search_off</span>
                        <p class="text-sm font-medium">No results found</p>
                        <p class="text-xs">Try a different search term</p>
                    </div>
                </div>

                <!-- Footer with keyboard hints -->
                <div class="px-4 py-2 bg-stone-50 dark:bg-stone-900/50 border-t border-stone-200 dark:border-stone-800 flex items-center justify-between text-xs text-stone-500 dark:text-stone-400">
                    <div class="flex items-center gap-4">
                        <span class="flex items-center gap-1">
                            <kbd class="px-1.5 py-0.5 bg-white dark:bg-stone-800 rounded border border-stone-300 dark:border-stone-700">↑↓</kbd>
                            Navigate
                        </span>
                        <span class="flex items-center gap-1">
                            <kbd class="px-1.5 py-0.5 bg-white dark:bg-stone-800 rounded border border-stone-300 dark:border-stone-700">↵</kbd>
                            Select
                        </span>
                        <span class="flex items-center gap-1">
                            <kbd class="px-1.5 py-0.5 bg-white dark:bg-stone-800 rounded border border-stone-300 dark:border-stone-700">ESC</kbd>
                            Close
                        </span>
                    </div>
                    <div class="hidden sm:block">
                        <span class="flex items-center gap-1">
                            <kbd class="px-1.5 py-0.5 bg-white dark:bg-stone-800 rounded border border-stone-300 dark:border-stone-700">Ctrl</kbd>
                            <kbd class="px-1.5 py-0.5 bg-white dark:bg-stone-800 rounded border border-stone-300 dark:border-stone-700">K</kbd>
                            to reopen
                        </span>
                    </div>
                </div>
            </div>
        </div>`;
