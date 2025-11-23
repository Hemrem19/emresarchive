export const graphView = `
        <div class="flex-grow flex flex-col h-full">
            <!-- Graph Header -->
            <div class="bg-white dark:bg-stone-900 border-b border-stone-200 dark:border-stone-800 px-4 sm:px-6 lg:px-8 py-4">
                <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                        <h1 class="text-2xl font-bold text-stone-900 dark:text-white">Paper Network</h1>
                        <p class="text-sm text-stone-600 dark:text-stone-400 mt-1">Visualize relationships between your papers</p>
                    </div>
                    
                    <!-- Controls -->
                    <div class="flex flex-wrap items-center gap-2">
                        <!-- Search -->
                        <div class="relative flex-grow sm:flex-grow-0">
                            <span class="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-stone-400 dark:text-stone-500">search</span>
                            <input 
                                id="graph-search-input" 
                                type="text" 
                                placeholder="Search papers..." 
                                class="w-full sm:w-64 h-10 pl-10 pr-4 bg-white dark:bg-stone-800 border border-stone-300 dark:border-stone-700 rounded-lg focus:ring-primary focus:border-primary text-sm"
                            />
                        </div>
                        
                        <!-- Status Filter -->
                        <select id="graph-status-filter" class="h-10 pl-3 pr-8 bg-white dark:bg-stone-800 border border-stone-300 dark:border-stone-700 rounded-lg focus:ring-primary focus:border-primary text-sm">
                            <option value="">All Status</option>
                            <option value="To Read">To Read</option>
                            <option value="Reading">Reading</option>
                            <option value="Completed">Completed</option>
                        </select>

                        <!-- Tag Filter -->
                        <select id="graph-tag-filter" class="h-10 pl-3 pr-8 bg-white dark:bg-stone-800 border border-stone-300 dark:border-stone-700 rounded-lg focus:ring-primary focus:border-primary text-sm">
                            <option value="">All Tags</option>
                        </select>

                        <!-- Generate Network Button -->
                        <button id="generate-network-btn" class="h-10 px-4 bg-primary text-white hover:bg-primary/90 rounded-lg transition-colors">Generate Network</button>
                    </div>
                </div>
                            
            <!-- Graph Container -->
            <div class="flex-grow relative bg-stone-50 dark:bg-stone-900/50">
                <div id="graph-network" class="w-full h-full"></div>

                <!-- Zoom Controls (Floating) -->
                <div class="absolute bottom-4 right-4 flex flex-col gap-2 bg-white dark:bg-stone-800 rounded-lg shadow-lg border border-stone-200 dark:border-stone-700 p-2">
                    <button id="graph-zoom-in" class="p-2 hover:bg-stone-100 dark:hover:bg-stone-700 rounded transition-colors" title="Zoom In">
                        <span class="material-symbols-outlined">zoom_in</span>
                    </button>
                    <div class="h-px bg-stone-200 dark:bg-stone-700"></div>
                    <button id="graph-zoom-out" class="p-2 hover:bg-stone-100 dark:hover:bg-stone-700 rounded transition-colors" title="Zoom Out">
                        <span class="material-symbols-outlined">zoom_out</span>
                    </button>
                    <div class="h-px bg-stone-200 dark:bg-stone-700"></div>
                    <button id="graph-fit" class="p-2 hover:bg-stone-100 dark:hover:bg-stone-700 rounded transition-colors" title="Fit to Screen">
                        <span class="material-symbols-outlined">fit_screen</span>
                    </button>
                </div>
                
                <!-- Empty State -->
                <div id="graph-empty-state" class="hidden absolute inset-0 flex flex-col items-center justify-center p-8 text-center">
                    <span class="material-symbols-outlined text-6xl text-stone-300 dark:text-stone-700 mb-4">device_hub</span>
                    <h3 class="text-lg font-semibold text-stone-900 dark:text-white mb-2">No Connected Papers</h3>
                    <p class="text-sm text-stone-600 dark:text-stone-400 max-w-md mb-4">
                        Papers will appear here once you link them together using the "Related Papers" feature in paper details.
                    </p>
                    <a href="#/" class="text-primary hover:underline text-sm font-medium">Browse Papers</a>
                </div>
                
                <!-- Tooltip (for hover) -->
                <div id="graph-tooltip" class="hidden absolute bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-lg shadow-xl p-4 max-w-sm pointer-events-none z-50">
                    <div id="graph-tooltip-content"></div>
                </div>
            </div>
        </div>
    `;
