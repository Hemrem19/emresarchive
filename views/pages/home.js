export const homeView = `
        <div class="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
            
            <!-- Quick Add Section -->
            <div class="max-w-7xl mx-auto mb-8">
                <form id="quick-add-form" class="glass-panel p-4 rounded-xl border border-slate-700/50 w-full max-w-full shadow-sm">
                    <label for="quick-add-doi" class="block text-sm font-semibold text-slate-300 mb-2 sm:mb-0 sm:inline-block sm:mr-3">Quick Add by DOI</label>
                    <div class="flex items-center gap-2 sm:inline-flex sm:gap-3 w-full sm:w-auto">
                        <input type="text" id="quick-add-doi" 
                            class="block flex-1 min-w-0 h-10 rounded-lg border border-slate-600 bg-slate-800/50 text-white placeholder-slate-500 focus:border-blue-500 focus:ring-blue-500 sm:text-sm px-3 w-full sm:min-w-[400px] lg:min-w-[600px] transition-all shadow-inner" 
                            placeholder="DOI or URL (e.g., 10.1234/example or https://doi.org/...)">
                        <button type="submit" class="flex items-center justify-center gap-2 h-10 w-10 sm:w-auto sm:px-4 bg-primary hover:bg-blue-600 text-white text-sm font-bold rounded-lg transition-all shadow-lg shadow-blue-500/20 hover:shadow-blue-500/30 flex-shrink-0 active:scale-95">
                            <span class="material-symbols-outlined text-lg sm:text-base">add</span>
                            <span class="hidden sm:inline">Add</span>
                        </button>
                    </div>
                </form>
            </div>

            <div class="max-w-7xl mx-auto">
                
                <!-- Batch Action Toolbar (hidden by default) -->
                <div id="batch-action-toolbar" class="hidden glass-panel border-blue-500/30 bg-blue-500/10 rounded-xl p-4 mb-6 shadow-lg shadow-blue-900/20 animate-fade-in">
                    <div class="flex flex-col lg:flex-row lg:items-center gap-4">
                        <div class="flex items-center gap-2 flex-shrink-0">
                            <span class="material-symbols-outlined text-blue-400">check_circle</span>
                            <span id="selected-count" class="text-sm font-bold text-white">0 selected</span>
                        </div>
                        <div class="flex flex-col sm:flex-row gap-2 flex-1 min-w-0 flex-wrap">
                            <div class="flex items-center gap-2">
                                <label for="batch-status-select" class="text-xs font-medium text-slate-400 whitespace-nowrap">Status:</label>
                                <select id="batch-status-select" class="h-9 bg-slate-800 border border-slate-600 rounded-lg focus:ring-blue-500 focus:border-blue-500 text-xs text-white px-2 w-36">
                                    <option value="">Select...</option>
                                </select>
                            </div>
                            <div class="flex items-center gap-2">
                                <label for="batch-tags-input" class="text-xs font-medium text-slate-400 whitespace-nowrap">Tags:</label>
                                <input type="text" id="batch-tags-input" placeholder="tag1, tag2" class="h-9 px-2 bg-slate-800 border border-slate-600 rounded-lg focus:ring-blue-500 focus:border-blue-500 text-xs text-white w-36">
                                <button id="batch-add-tags-btn" class="h-9 px-3 bg-blue-600 text-white text-xs font-semibold rounded-lg hover:bg-blue-500 transition-colors whitespace-nowrap">Add</button>
                                <button id="batch-remove-tags-btn" class="h-9 px-3 bg-slate-700 text-slate-300 text-xs font-semibold rounded-lg hover:bg-slate-600 transition-colors whitespace-nowrap">Remove</button>
                            </div>
                            <button id="batch-delete-btn" class="h-9 px-3 bg-red-500/20 text-red-400 border border-red-500/30 text-xs font-semibold rounded-lg hover:bg-red-500/30 transition-colors whitespace-nowrap flex items-center gap-1 flex-shrink-0">
                                <span class="material-symbols-outlined text-sm">delete</span>
                                <span>Delete</span>
                            </button>
                            <button id="batch-export-bibliography-btn" class="h-9 px-3 bg-blue-600/20 text-blue-400 border border-blue-500/30 text-xs font-semibold rounded-lg hover:bg-blue-500/30 transition-colors whitespace-nowrap flex items-center gap-1.5 flex-shrink-0">
                                <span class="material-symbols-outlined text-sm">description</span>
                                <span>Export Bibliography</span>
                            </button>
                        </div>
                        <button id="clear-selection-btn" class="text-xs font-medium text-slate-400 hover:text-white underline whitespace-nowrap flex-shrink-0 lg:ml-auto">Clear Selection</button>
                    </div>
                </div>

                <!-- Filters & Sort (Clean Row) -->
                <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                    <div class="flex items-center gap-2 overflow-x-auto pb-2 sm:pb-0 no-scrollbar flex-1">
                        <h2 class="text-2xl font-bold text-white mr-2 whitespace-nowrap">All Papers</h2>
                        
                        <!-- Active Filters (Pills) -->
                        <div id="filter-chips-container" class="hidden flex items-center gap-2">
                            <!-- Pills will be injected here -->
                        </div>
                    </div>

                    <div class="flex items-center gap-4 flex-shrink-0">
                        <label class="flex items-center cursor-pointer group">
                            <input type="checkbox" id="select-all-checkbox" class="w-4 h-4 text-blue-500 border-slate-600 rounded focus:ring-blue-500 bg-slate-800/50 transition-all group-hover:border-blue-400">
                            <span class="ml-2 text-sm font-medium text-slate-400 group-hover:text-slate-200 transition-colors">Select All</span>
                        </label>
                        <div class="h-4 w-px bg-slate-700"></div>
                        <div class="flex items-center gap-2 text-sm text-slate-400">
                            <span>Sort:</span>
                            <select id="sort-select" class="h-9 bg-slate-800/50 border border-slate-700 rounded-lg focus:ring-blue-500 focus:border-blue-500 text-sm text-slate-200 px-2 pr-8 cursor-pointer hover:bg-slate-700/50 transition-colors">
                                <option value="date_added">Date Added</option>
                                <option value="last_updated">Last Updated</option>
                                <option value="title_asc">Title (A-Z)</option>
                                <option value="year_desc">Publication Year</option>
                                <option value="status_asc">Status</option>
                                <option value="progress_desc">Reading Progress</option>
                                <option value="rating_desc">Rating (High-Low)</option>
                                <option value="rating_asc">Rating (Low-High)</option>
                            </select>
                        </div>
                    </div>
                </div>

                <div class="space-y-3 pb-20" id="paper-list">
                    <!-- Paper list will be rendered here by JavaScript -->
                    <div class="text-center py-12">
                         <p class="text-slate-500 text-lg">No papers yet.</p>
                         <p class="text-slate-600 text-sm mt-2">Click "Add Paper" to start building your library.</p>
                    </div>
                </div>

                <!-- Pagination Controls -->
                <div id="pagination-container" class="hidden mt-8">
                    <div class="flex flex-col sm:flex-row items-center justify-between gap-4 glass-panel border border-slate-700/50 rounded-xl p-4">
                        <div class="flex items-center gap-4">
                            <span id="pagination-info" class="text-sm text-slate-400">
                                Showing <span class="font-semibold text-white">1-25</span> of <span class="font-semibold text-white">100</span> papers
                            </span>
                            <div class="flex items-center gap-2">
                                <label for="items-per-page" class="text-sm text-slate-400 whitespace-nowrap">Per page:</label>
                                <select id="items-per-page" class="h-8 bg-slate-800 border border-slate-600 rounded-lg focus:ring-blue-500 focus:border-blue-500 text-sm text-slate-200">
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
