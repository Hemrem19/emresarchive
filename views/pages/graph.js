export const graphView = `
        <div class="flex-grow flex flex-col w-full min-h-0 relative bg-slate-900 text-slate-100 overflow-hidden">
            <!-- Graph Container -->
            <div id="graph-network" class="absolute inset-0 w-full h-full z-0"></div>

            <!-- Floating Header / Controls -->
            <div class="absolute top-4 left-4 right-4 z-20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pointer-events-none">
                <!-- Title & Search (Glassmorphism) -->
                <div class="flex items-center gap-4 pointer-events-auto bg-slate-800/80 backdrop-blur-md border border-slate-700/50 p-2 rounded-xl shadow-lg">
                    <div class="px-2 hidden sm:block">
                        <h1 class="text-lg font-bold text-white leading-tight">Paper Network</h1>
                    </div>
                    <div class="h-8 w-px bg-slate-700 hidden sm:block"></div>
                    <div class="relative">
                        <span class="material-symbols-outlined absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-lg">search</span>
                        <input 
                            id="graph-search-input" 
                            type="text" 
                            placeholder="Search..." 
                            class="w-48 sm:w-64 h-9 pl-9 pr-3 bg-slate-900/50 border border-slate-700 rounded-lg focus:ring-1 focus:ring-primary focus:border-primary text-sm text-white placeholder-slate-500 transition-all"
                        />
                    </div>
                </div>

                <!-- Filters & Actions (Glassmorphism) -->
                <div class="flex items-center gap-2 pointer-events-auto bg-slate-800/80 backdrop-blur-md border border-slate-700/50 p-2 rounded-xl shadow-lg">
                    <select id="graph-status-filter" class="h-9 pl-2 pr-8 bg-slate-900/50 border border-slate-700 rounded-lg focus:ring-1 focus:ring-primary focus:border-primary text-xs text-white">
                        <option value="">All Status</option>
                        <option value="To Read">To Read</option>
                        <option value="Reading">Reading</option>
                        <option value="Finished">Finished</option>
                    </select>

                    <select id="graph-tag-filter" class="h-9 pl-2 pr-8 bg-slate-900/50 border border-slate-700 rounded-lg focus:ring-1 focus:ring-primary focus:border-primary text-xs text-white max-w-[100px]">
                        <option value="">All Tags</option>
                    </select>

                    <button id="graph-generate-btn" class="h-9 px-3 bg-primary hover:bg-primary/90 text-white text-xs font-semibold rounded-lg transition-colors shadow-lg shadow-primary/20 flex items-center gap-1">
                        <span class="material-symbols-outlined text-sm">refresh</span>
                        <span class="hidden sm:inline">Generate</span>
                    </button>
                </div>
            </div>

            <!-- Side Panel (Details) -->
            <div id="graph-side-panel" class="absolute top-4 bottom-4 right-4 w-80 sm:w-96 bg-slate-800/95 backdrop-blur-xl border border-slate-700/50 rounded-xl shadow-2xl z-30 transform translate-x-[110%] transition-transform duration-300 ease-in-out flex flex-col">
                <!-- Panel Header -->
                <div class="p-4 border-b border-slate-700/50 flex items-start justify-between gap-2">
                    <h2 id="panel-title" class="text-lg font-bold text-white leading-snug">Paper Details</h2>
                    <button id="panel-close-btn" class="p-1 hover:bg-slate-700 rounded-lg text-slate-400 hover:text-white transition-colors">
                        <span class="material-symbols-outlined">close</span>
                    </button>
                </div>
                <!-- Panel Content -->
                <div id="panel-content" class="flex-grow overflow-y-auto p-4 space-y-4">
                    <!-- Dynamic content will be injected here -->
                    <div class="animate-pulse space-y-3">
                        <div class="h-4 bg-slate-700 rounded w-3/4"></div>
                        <div class="h-3 bg-slate-700 rounded w-1/2"></div>
                        <div class="h-20 bg-slate-700 rounded w-full"></div>
                    </div>
                </div>
                <!-- Panel Footer -->
                <div class="p-4 border-t border-slate-700/50 bg-slate-900/30 rounded-b-xl">
                    <button id="panel-open-btn" class="w-full py-2 bg-primary hover:bg-primary/90 text-white font-semibold rounded-lg transition-colors shadow-lg shadow-primary/20">
                        Open Full Details
                    </button>
                </div>
            </div>

            <!-- Legend (Bottom Left) -->
            <div class="absolute bottom-4 left-4 z-20 bg-slate-800/80 backdrop-blur-md border border-slate-700/50 p-3 rounded-xl shadow-lg">
                <h3 class="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Legend</h3>
                <div class="space-y-1.5">
                    <div class="flex items-center gap-2">
                        <span class="w-3 h-3 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.5)]"></span>
                        <span class="text-xs text-slate-300">Reading</span>
                    </div>
                    <div class="flex items-center gap-2">
                        <span class="w-3 h-3 rounded-full bg-yellow-500 shadow-[0_0_8px_rgba(234,179,8,0.5)]"></span>
                        <span class="text-xs text-slate-300">To Read</span>
                    </div>
                    <div class="flex items-center gap-2">
                        <span class="w-3 h-3 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]"></span>
                        <span class="text-xs text-slate-300">Finished</span>
                    </div>
                    <div class="flex items-center gap-2">
                        <span class="w-3 h-3 rounded-full bg-slate-500"></span>
                        <span class="text-xs text-slate-300">Other</span>
                    </div>
                </div>
            </div>

            <!-- Zoom Controls (Bottom Right) -->
            <div class="absolute bottom-4 right-4 z-20 flex flex-col gap-2 bg-slate-800/80 backdrop-blur-md border border-slate-700/50 p-1.5 rounded-xl shadow-lg">
                <button id="graph-zoom-in" class="p-2 hover:bg-slate-700 rounded-lg text-slate-300 hover:text-white transition-colors" title="Zoom In">
                    <span class="material-symbols-outlined">add</span>
                </button>
                <button id="graph-zoom-out" class="p-2 hover:bg-slate-700 rounded-lg text-slate-300 hover:text-white transition-colors" title="Zoom Out">
                    <span class="material-symbols-outlined">remove</span>
                </button>
                <button id="graph-fit" class="p-2 hover:bg-slate-700 rounded-lg text-slate-300 hover:text-white transition-colors" title="Fit to Screen">
                    <span class="material-symbols-outlined">center_focus_strong</span>
                </button>
            </div>
            
            <!-- Empty State -->
            <div id="graph-empty-state" class="hidden absolute inset-0 flex flex-col items-center justify-center p-8 text-center z-10 pointer-events-none">
                <div class="w-24 h-24 bg-slate-800/50 rounded-full flex items-center justify-center mb-6 backdrop-blur-sm border border-slate-700">
                    <span class="material-symbols-outlined text-5xl text-slate-500">hub</span>
                </div>
                <h3 class="text-2xl font-bold text-white mb-2">No Connections Yet</h3>
                <p class="text-slate-400 max-w-md mb-6">
                    Start building your knowledge graph by adding "Related Papers" in the paper details view.
                </p>
                <a href="#/" class="px-6 py-2.5 bg-primary hover:bg-primary/90 text-white font-semibold rounded-lg transition-colors shadow-lg shadow-primary/20 pointer-events-auto">
                    Browse Library
                </a>
            </div>
            
            <!-- Tooltip (Custom) -->
            <div id="graph-tooltip" class="hidden absolute bg-slate-800/95 backdrop-blur-xl border border-slate-700/50 rounded-lg shadow-2xl p-3 max-w-xs pointer-events-none z-50 transition-opacity duration-200">
                <div id="graph-tooltip-content"></div>
            </div>
        </div>
    `;
