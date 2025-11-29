export const homeView = `
        <div class="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div class="max-w-7xl mx-auto mb-8">
                <form id="quick-add-form" class="bg-white dark:bg-stone-900/70 p-4 rounded-lg border border-stone-200 dark:border-stone-800 w-full max-w-full">
                    <label for="quick-add-doi" class="block text-sm font-semibold text-stone-700 dark:text-stone-300 mb-2 sm:mb-0 sm:inline-block sm:mr-3">Quick Add by DOI</label>
                    <div class="flex items-center gap-2 sm:inline-flex sm:gap-3">
                        <input type="text" id="quick-add-doi" class="block flex-1 min-w-0 h-10 rounded-md border border-stone-300 dark:border-stone-700 shadow-sm focus:border-primary focus:ring-primary dark:bg-stone-800 dark:text-white sm:text-sm px-3 max-w-full sm:min-w-[600px] lg:min-w-[800px]" placeholder="DOI or URL (e.g., 10.1234/example or https://doi.org/...)">
                        <button type="submit" class="flex items-center justify-center gap-2 h-10 w-10 sm:w-auto sm:px-4 bg-primary text-white text-sm font-bold rounded-lg hover:bg-primary/90 transition-colors flex-shrink-0">
                            <span class="material-symbols-outlined text-lg sm:text-base">add</span>
                            <span class="hidden sm:inline">Add</span>
                        </button>
                    </div>
                </form>
            </div>
            <div class="max-w-7xl mx-auto">
                <!-- Filter Chips (hidden by default) -->
                <div id="filter-chips-container" class="hidden mb-4"></div>
                <!-- Batch Action Toolbar (hidden by default) -->
                <div id="batch-action-toolbar" class="hidden bg-primary/10 dark:bg-primary/20 border border-primary/30 dark:border-primary/30 rounded-lg p-4 mb-6">
                    <div class="flex flex-col lg:flex-row lg:items-center gap-4">
                        <div class="flex items-center gap-2 flex-shrink-0">
                            <span class="material-symbols-outlined text-primary">check_circle</span>
                            <span id="selected-count" class="text-sm font-semibold text-stone-900 dark:text-stone-100">0 selected</span>
                        </div>
                        <div class="flex flex-col sm:flex-row gap-2 flex-1 min-w-0 flex-wrap">
                            <div class="flex items-center gap-2">
                                <label for="batch-status-select" class="text-xs font-medium text-stone-600 dark:text-stone-400 whitespace-nowrap">Status:</label>
                                <select id="batch-status-select" class="h-9 bg-white dark:bg-stone-800 border border-stone-300 dark:border-stone-700 rounded-md focus:ring-primary focus:border-primary text-xs text-stone-900 dark:text-stone-100 px-2 w-36">
                                    <option value="">Select...</option>
                                </select>
                            </div>
                            <div class="flex items-center gap-2">
                                <label for="batch-tags-input" class="text-xs font-medium text-stone-600 dark:text-stone-400 whitespace-nowrap">Tags:</label>
                                <input type="text" id="batch-tags-input" placeholder="tag1, tag2" class="h-9 px-2 bg-white dark:bg-stone-800 border border-stone-300 dark:border-stone-700 rounded-md focus:ring-primary focus:border-primary text-xs text-stone-900 dark:text-stone-100 w-36">
                                <button id="batch-add-tags-btn" class="h-9 px-3 bg-primary text-white text-xs font-semibold rounded-md hover:bg-primary/90 transition-colors whitespace-nowrap">Add</button>
                                <button id="batch-remove-tags-btn" class="h-9 px-3 bg-stone-200 dark:bg-stone-700 text-stone-700 dark:text-stone-300 text-xs font-semibold rounded-md hover:bg-stone-300 dark:hover:bg-stone-600 transition-colors whitespace-nowrap">Remove</button>
                            </div>
                            <button id="batch-delete-btn" class="h-9 px-3 bg-red-500 text-white text-xs font-semibold rounded-md hover:bg-red-600 transition-colors whitespace-nowrap flex items-center gap-1 flex-shrink-0">
                                <span class="material-symbols-outlined text-sm">delete</span>
                                <span>Delete</span>
                            </button>
                            <button id="batch-export-bibliography-btn" class="h-9 px-3 bg-primary text-white text-xs font-semibold rounded-md hover:bg-primary/90 transition-colors whitespace-nowrap flex items-center gap-1.5 flex-shrink-0">
                                <span class="material-symbols-outlined text-sm">description</span>
                                <span>Export Bibliography</span>
                            </button>
                        </div>
                        <button id="clear-selection-btn" class="text-xs font-medium text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-100 underline whitespace-nowrap flex-shrink-0 lg:ml-auto">Clear Selection</button>
                    </div>
                </div>
                <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6 gap-4">
                    <div class="flex items-center gap-3">
                        <label class="flex items-center cursor-pointer">
                            <input type="checkbox" id="select-all-checkbox" class="w-4 h-4 text-primary border-stone-300 rounded focus:ring-primary dark:border-stone-700 dark:bg-stone-800">
                            <span class="ml-2 text-sm font-medium text-stone-700 dark:text-stone-300">Select All</span>
                        </label>
                        <h2 class="text-2xl font-bold">All Papers</h2>
                    </div>
                    <select id="sort-select" class="w-full sm:w-auto h-10 bg-white dark:bg-stone-900 border border-stone-300 dark:border-stone-700 rounded-lg focus:ring-primary focus:border-primary text-sm text-stone-900 dark:text-stone-100">
                        <option value="date_added">Sort by Date Added</option>
                        <option value="last_updated">Sort by Last Updated</option>
                        <option value="title_asc">Sort by Title (A-Z)</option>
                        <option value="year_desc">Sort by Publication Year</option>
                        <option value="status_asc">Sort by Status</option>
                        <option value="progress_desc">Sort by Reading Progress</option>
                        <option value="rating_desc">Sort by Rating (Highest First)</option>
                        <option value="rating_asc">Sort by Rating (Lowest First)</option>
                    </select>
                </div>
                <div class="space-y-4" id="paper-list">
                    <!-- Paper list will be rendered here by JavaScript -->
                    <p class="text-stone-500 dark:text-stone-400">No papers yet. Click "Add Paper" to get started!</p>
                </div>
                <!-- Pagination Controls -->
                <div id="pagination-container" class="hidden mt-8">
                    <div class="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-lg p-4">
                        <div class="flex items-center gap-4">
                            <span id="pagination-info" class="text-sm text-stone-600 dark:text-stone-400">
                                Showing <span class="font-semibold text-stone-900 dark:text-stone-100">1-25</span> of <span class="font-semibold text-stone-900 dark:text-stone-100">100</span> papers
                            </span>
                            <div class="flex items-center gap-2">
                                <label for="items-per-page" class="text-sm text-stone-600 dark:text-stone-400 whitespace-nowrap">Per page:</label>
                                <select id="items-per-page" class="h-8 bg-white dark:bg-stone-800 border border-stone-300 dark:border-stone-700 rounded-md focus:ring-primary focus:border-primary text-sm text-stone-900 dark:text-stone-100">
                                    <option value="10">10</option>
                                    <option value="25" selected>25</option>
                                    <option value="50">50</option>
                                    <option value="100">100</option>
                                </select>
                            </div>
                        </div>
                        <nav id="pagination-nav" class="flex items-center gap-1">
                            <!-- Pagination buttons will be rendered here -->
                        </nav>
                    </div>
                </div>
            </div>
        </div>
    `;
