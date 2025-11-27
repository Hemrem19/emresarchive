export const docsView = `
<div class="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-12">
    <!-- Hero Section -->
    <div class="mb-12 text-center">
        <div class="inline-flex items-center justify-center w-16 h-16 mb-6 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/10 dark:from-primary/30 dark:to-primary/20">
            <span class="material-symbols-outlined text-primary text-4xl">menu_book</span>
        </div>
        <h1 class="text-4xl sm:text-5xl font-bold text-stone-900 dark:text-white mb-4 bg-gradient-to-r from-stone-900 to-stone-700 dark:from-white dark:to-stone-300 bg-clip-text text-transparent">
            How to Use citavErs
        </h1>
        <p class="text-xl text-stone-600 dark:text-stone-400 max-w-2xl mx-auto mb-6">
            Your complete guide to mastering citavErs. Learn all the features and organize your research library like a pro.
        </p>
        <div class="inline-flex items-center gap-3 px-4 py-3 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/30 dark:to-indigo-900/30 border border-blue-200/50 dark:border-blue-800/50 rounded-xl shadow-sm">
            <span class="material-symbols-outlined text-blue-600 dark:text-blue-400 text-xl">lightbulb</span>
            <span class="text-sm font-medium text-blue-900 dark:text-blue-100">
                <strong>Quick Start:</strong> All your data is stored locally. No account required!
            </span>
        </div>
    </div>

    <div class="space-y-16">
        <!-- Getting Started -->
        <section id="getting-started" class="scroll-mt-20">
            <div class="flex items-center gap-3 mb-6">
                <div class="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-primary/20 to-primary/10 dark:from-primary/30 dark:to-primary/20">
                    <span class="material-symbols-outlined text-primary text-xl">start</span>
                </div>
                <h2 class="text-3xl font-bold text-stone-900 dark:text-white">Getting Started</h2>
            </div>
            
            <div class="bg-white/80 dark:bg-stone-900/80 backdrop-blur-sm rounded-2xl border border-stone-200/50 dark:border-stone-800/50 shadow-xl shadow-stone-200/50 dark:shadow-stone-900/50 p-8 space-y-8">
                <div>
                    <h3 class="text-xl font-bold text-stone-900 dark:text-white mb-4 flex items-center gap-2">
                        <span class="w-1.5 h-1.5 rounded-full bg-primary"></span>
                        Adding Your First Paper
                    </h3>
                    <p class="text-stone-700 dark:text-stone-300 mb-6 text-lg">
                        Get started by adding papers to your library. Choose the method that works best for you:
                    </p>
                    
                    <div class="grid md:grid-cols-3 gap-4">
                        <div class="group relative p-6 bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 rounded-xl border border-amber-200/50 dark:border-amber-800/50 hover:shadow-lg hover:scale-[1.02] transition-all duration-300">
                            <div class="absolute top-4 right-4 w-12 h-12 rounded-lg bg-amber-500/10 dark:bg-amber-500/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                                <span class="material-symbols-outlined text-amber-600 dark:text-amber-400 text-2xl">bolt</span>
                            </div>
                            <div class="mt-8">
                                <h4 class="font-bold text-stone-900 dark:text-white mb-3 text-lg">Quick Add by DOI</h4>
                                <p class="text-sm text-stone-600 dark:text-stone-400 mb-4">
                                    Fastest way to add papers. Just paste a DOI and metadata is fetched automatically.
                                </p>
                                <ol class="list-decimal list-inside space-y-2 text-sm text-stone-700 dark:text-stone-300">
                                    <li>Find "Quick Add by DOI" in sidebar</li>
                                    <li>Paste DOI or URL</li>
                                    <li>Press Enter</li>
                                </ol>
                                <div class="mt-4 p-3 bg-amber-100/50 dark:bg-amber-900/30 rounded-lg border border-amber-200/50 dark:border-amber-800/50">
                                    <p class="text-xs font-medium text-amber-900 dark:text-amber-200">
                                        💡 Pro Tip: Works with full DOI URLs too!
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div class="group relative p-6 bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-900/20 rounded-xl border border-blue-200/50 dark:border-blue-800/50 hover:shadow-lg hover:scale-[1.02] transition-all duration-300">
                            <div class="absolute top-4 right-4 w-12 h-12 rounded-lg bg-blue-500/10 dark:bg-blue-500/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                                <span class="material-symbols-outlined text-blue-600 dark:text-blue-400 text-2xl">edit_document</span>
                            </div>
                            <div class="mt-8">
                                <h4 class="font-bold text-stone-900 dark:text-white mb-3 text-lg">Manual Entry</h4>
                                <p class="text-sm text-stone-600 dark:text-stone-400 mb-4">
                                    Full control over paper details. Perfect when you don't have a DOI.
                                </p>
                                <ol class="list-decimal list-inside space-y-2 text-sm text-stone-700 dark:text-stone-300">
                                    <li>Click "Add Paper" <kbd class="ml-1 px-1.5 py-0.5 bg-stone-200 dark:bg-stone-700 rounded text-xs">N</kbd></li>
                                    <li>Fill in the form</li>
                                    <li>Upload PDF (optional)</li>
                                    <li>Save</li>
                                </ol>
                            </div>
                        </div>

                        <div class="group relative p-6 bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 rounded-xl border border-purple-200/50 dark:border-purple-800/50 hover:shadow-lg hover:scale-[1.02] transition-all duration-300">
                            <div class="absolute top-4 right-4 w-12 h-12 rounded-lg bg-purple-500/10 dark:bg-purple-500/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                                <span class="material-symbols-outlined text-purple-600 dark:text-purple-400 text-2xl">upload_file</span>
                            </div>
                            <div class="mt-8">
                                <h4 class="font-bold text-stone-900 dark:text-white mb-3 text-lg">Import Backup</h4>
                                <p class="text-sm text-stone-600 dark:text-stone-400 mb-4">
                                    Restore from a previous backup or import from Zotero/Mendeley.
                                </p>
                                <ol class="list-decimal list-inside space-y-2 text-sm text-stone-700 dark:text-stone-300">
                                    <li>Go to Settings</li>
                                    <li>Data Management</li>
                                    <li>Import Data</li>
                                </ol>
                                <div class="mt-4 p-3 bg-yellow-100/50 dark:bg-yellow-900/30 rounded-lg border border-yellow-200/50 dark:border-yellow-800/50">
                                    <p class="text-xs font-medium text-yellow-900 dark:text-yellow-200">
                                        ⚠️ Replaces all current data
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </section>

        <!-- Managing Papers -->
        <section id="managing-papers" class="scroll-mt-20">
            <div class="flex items-center gap-3 mb-6">
                <div class="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-primary/20 to-primary/10 dark:from-primary/30 dark:to-primary/20">
                    <span class="material-symbols-outlined text-primary text-xl">library_books</span>
                </div>
                <h2 class="text-3xl font-bold text-stone-900 dark:text-white">Managing Papers</h2>
            </div>
            
            <div class="bg-white/80 dark:bg-stone-900/80 backdrop-blur-sm rounded-2xl border border-stone-200/50 dark:border-stone-800/50 shadow-xl shadow-stone-200/50 dark:shadow-stone-900/50 p-8 space-y-8">
                <div class="grid md:grid-cols-2 gap-6">
                    <div class="p-5 bg-gradient-to-br from-stone-50 to-stone-100/50 dark:from-stone-800/50 dark:to-stone-900/50 rounded-xl border border-stone-200/50 dark:border-stone-700/50">
                        <div class="flex items-center gap-3 mb-3">
                            <span class="material-symbols-outlined text-primary text-2xl">visibility</span>
                            <h4 class="font-bold text-stone-900 dark:text-white">View Details</h4>
                        </div>
                        <p class="text-sm text-stone-600 dark:text-stone-400">Click any paper card to see full metadata, notes, PDFs, and related papers.</p>
                    </div>
                    <div class="p-5 bg-gradient-to-br from-stone-50 to-stone-100/50 dark:from-stone-800/50 dark:to-stone-900/50 rounded-xl border border-stone-200/50 dark:border-stone-700/50">
                        <div class="flex items-center gap-3 mb-3">
                            <span class="material-symbols-outlined text-primary text-2xl">edit</span>
                            <h4 class="font-bold text-stone-900 dark:text-white">Edit Paper</h4>
                        </div>
                        <p class="text-sm text-stone-600 dark:text-stone-400">Update any field including title, authors, tags, status, and notes anytime.</p>
                    </div>
                </div>

                <div>
                    <h3 class="text-xl font-bold text-stone-900 dark:text-white mb-4 flex items-center gap-2">
                        <span class="w-1.5 h-1.5 rounded-full bg-primary"></span>
                        Reading Status
                    </h3>
                    <div class="grid md:grid-cols-4 gap-3">
                        <div class="p-4 bg-gradient-to-br from-blue-50 to-blue-100/50 dark:from-blue-900/20 dark:to-blue-800/20 rounded-xl border border-blue-200/50 dark:border-blue-800/50 text-center">
                            <div class="text-2xl mb-2">📖</div>
                            <div class="font-bold text-stone-900 dark:text-white text-sm mb-1">To Read</div>
                            <div class="text-xs text-stone-600 dark:text-stone-400">Planned papers</div>
                        </div>
                        <div class="p-4 bg-gradient-to-br from-green-50 to-green-100/50 dark:from-green-900/20 dark:to-green-800/20 rounded-xl border border-green-200/50 dark:border-green-800/50 text-center">
                            <div class="text-2xl mb-2">👁️</div>
                            <div class="font-bold text-stone-900 dark:text-white text-sm mb-1">Reading</div>
                            <div class="text-xs text-stone-600 dark:text-stone-400">In progress</div>
                        </div>
                        <div class="p-4 bg-gradient-to-br from-emerald-50 to-emerald-100/50 dark:from-emerald-900/20 dark:to-emerald-800/20 rounded-xl border border-emerald-200/50 dark:border-emerald-800/50 text-center">
                            <div class="text-2xl mb-2">✅</div>
                            <div class="font-bold text-stone-900 dark:text-white text-sm mb-1">Finished</div>
                            <div class="text-xs text-stone-600 dark:text-stone-400">Completed</div>
                        </div>
                        <div class="p-4 bg-gradient-to-br from-stone-50 to-stone-100/50 dark:from-stone-800/20 dark:to-stone-700/20 rounded-xl border border-stone-200/50 dark:border-stone-700/50 text-center">
                            <div class="text-2xl mb-2">📦</div>
                            <div class="font-bold text-stone-900 dark:text-white text-sm mb-1">Archived</div>
                            <div class="text-xs text-stone-600 dark:text-stone-400">Reference</div>
                        </div>
                    </div>
                </div>

                <div class="p-5 bg-gradient-to-r from-primary/10 to-primary/5 dark:from-primary/20 dark:to-primary/10 rounded-xl border border-primary/20 dark:border-primary/30">
                    <div class="flex items-start gap-3">
                        <span class="material-symbols-outlined text-primary text-xl mt-0.5">info</span>
                        <div>
                            <p class="font-semibold text-stone-900 dark:text-white mb-1">Reading Progress Tracking</p>
                            <p class="text-sm text-stone-600 dark:text-stone-400">When a paper is set to "Reading", track your progress with current page and total pages. The progress bar updates automatically!</p>
                        </div>
                    </div>
                </div>
            </div>
        </section>

        <!-- Search and Filtering -->
        <section id="search-filtering" class="scroll-mt-20">
            <div class="flex items-center gap-3 mb-6">
                <div class="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-primary/20 to-primary/10 dark:from-primary/30 dark:to-primary/20">
                    <span class="material-symbols-outlined text-primary text-xl">search</span>
                </div>
                <h2 class="text-3xl font-bold text-stone-900 dark:text-white">Search & Filtering</h2>
            </div>
            
            <div class="bg-white/80 dark:bg-stone-900/80 backdrop-blur-sm rounded-2xl border border-stone-200/50 dark:border-stone-800/50 shadow-xl shadow-stone-200/50 dark:shadow-stone-900/50 p-8 space-y-8">
                <div class="grid md:grid-cols-2 gap-4">
                    <div class="p-5 bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20 rounded-xl border border-indigo-200/50 dark:border-indigo-800/50">
                        <div class="flex items-center gap-2 mb-3">
                            <span class="material-symbols-outlined text-indigo-600 dark:text-indigo-400">search</span>
                            <h4 class="font-bold text-stone-900 dark:text-white">All Fields</h4>
                            <span class="ml-auto px-2 py-0.5 bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 text-xs font-medium rounded-full">Default</span>
                        </div>
                        <p class="text-sm text-stone-600 dark:text-stone-400 mb-2">Searches across titles, authors, and notes simultaneously.</p>
                        <p class="text-xs text-stone-500 dark:text-stone-500">Perfect for general searches</p>
                    </div>
                    <div class="p-5 bg-gradient-to-br from-cyan-50 to-blue-50 dark:from-cyan-900/20 dark:to-blue-900/20 rounded-xl border border-cyan-200/50 dark:border-cyan-800/50">
                        <div class="flex items-center gap-2 mb-3">
                            <span class="material-symbols-outlined text-cyan-600 dark:text-cyan-400">description</span>
                            <h4 class="font-bold text-stone-900 dark:text-white">Notes Only</h4>
                        </div>
                        <p class="text-sm text-stone-600 dark:text-stone-400 mb-2">Searches only within your notes.</p>
                        <p class="text-xs text-stone-500 dark:text-stone-500">Find papers by concepts you've written about</p>
                    </div>
                </div>

                <div class="p-5 bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 rounded-xl border border-amber-200/50 dark:border-amber-800/50">
                    <h4 class="font-bold text-stone-900 dark:text-white mb-3 flex items-center gap-2">
                        <span class="material-symbols-outlined text-amber-600 dark:text-amber-400">tips_and_updates</span>
                        Search Tips
                    </h4>
                    <div class="grid md:grid-cols-2 gap-3 text-sm">
                        <div class="flex items-start gap-2">
                            <span class="text-amber-600 dark:text-amber-400 mt-0.5">•</span>
                            <span class="text-stone-700 dark:text-stone-300"><strong>Exact phrases:</strong> Use quotes <code class="bg-amber-100 dark:bg-amber-900/50 px-1.5 py-0.5 rounded text-xs">"machine learning"</code></span>
                        </div>
                        <div class="flex items-start gap-2">
                            <span class="text-amber-600 dark:text-amber-400 mt-0.5">•</span>
                            <span class="text-stone-700 dark:text-stone-300"><strong>Keyboard:</strong> Press <kbd class="bg-amber-100 dark:bg-amber-900/50 px-1.5 py-0.5 rounded text-xs">/</kbd> to focus search</span>
                        </div>
                        <div class="flex items-start gap-2">
                            <span class="text-amber-600 dark:text-amber-400 mt-0.5">•</span>
                            <span class="text-stone-700 dark:text-stone-300"><strong>Real-time:</strong> Results update as you type</span>
                        </div>
                        <div class="flex items-start gap-2">
                            <span class="text-amber-600 dark:text-amber-400 mt-0.5">•</span>
                            <span class="text-stone-700 dark:text-stone-300"><strong>Case-insensitive:</strong> No need to match case</span>
                        </div>
                    </div>
                </div>
            </div>
        </section>

        <!-- Batch Operations -->
        <section id="batch-operations" class="scroll-mt-20">
            <div class="flex items-center gap-3 mb-6">
                <div class="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-primary/20 to-primary/10 dark:from-primary/30 dark:to-primary/20">
                    <span class="material-symbols-outlined text-primary text-xl">select_all</span>
                </div>
                <h2 class="text-3xl font-bold text-stone-900 dark:text-white">Batch Operations</h2>
            </div>
            
            <div class="bg-white/80 dark:bg-stone-900/80 backdrop-blur-sm rounded-2xl border border-stone-200/50 dark:border-stone-800/50 shadow-xl shadow-stone-200/50 dark:shadow-stone-900/50 p-8 space-y-6">
                <p class="text-lg text-stone-700 dark:text-stone-300">
                    Select multiple papers at once to perform bulk operations. Perfect for organizing large libraries!
                </p>
                <div class="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div class="p-4 bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-xl border border-green-200/50 dark:border-green-800/50">
                        <div class="text-2xl mb-2">📊</div>
                        <div class="font-bold text-stone-900 dark:text-white mb-1 text-sm">Change Status</div>
                        <div class="text-xs text-stone-600 dark:text-stone-400">Update status for multiple papers</div>
                    </div>
                    <div class="p-4 bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 rounded-xl border border-purple-200/50 dark:border-purple-800/50">
                        <div class="text-2xl mb-2">🏷️</div>
                        <div class="font-bold text-stone-900 dark:text-white mb-1 text-sm">Manage Tags</div>
                        <div class="text-xs text-stone-600 dark:text-stone-400">Add/remove tags in bulk</div>
                    </div>
                    <div class="p-4 bg-gradient-to-br from-red-50 to-rose-50 dark:from-red-900/20 dark:to-rose-900/20 rounded-xl border border-red-200/50 dark:border-red-800/50">
                        <div class="text-2xl mb-2">🗑️</div>
                        <div class="font-bold text-stone-900 dark:text-white mb-1 text-sm">Delete Papers</div>
                        <div class="text-xs text-stone-600 dark:text-stone-400">Remove multiple papers</div>
                    </div>
                    <div class="p-4 bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-900/20 rounded-xl border border-blue-200/50 dark:border-blue-800/50">
                        <div class="text-2xl mb-2">📝</div>
                        <div class="font-bold text-stone-900 dark:text-white mb-1 text-sm">Export Citations</div>
                        <div class="text-xs text-stone-600 dark:text-stone-400">Generate bibliography</div>
                    </div>
                </div>
            </div>
        </section>

        <!-- Keyboard Shortcuts -->
        <section id="keyboard-shortcuts" class="scroll-mt-20">
            <div class="flex items-center gap-3 mb-6">
                <div class="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-primary/20 to-primary/10 dark:from-primary/30 dark:to-primary/20">
                    <span class="material-symbols-outlined text-primary text-xl">keyboard</span>
                </div>
                <h2 class="text-3xl font-bold text-stone-900 dark:text-white">Keyboard Shortcuts</h2>
            </div>
            
            <div class="bg-white/80 dark:bg-stone-900/80 backdrop-blur-sm rounded-2xl border border-stone-200/50 dark:border-stone-800/50 shadow-xl shadow-stone-200/50 dark:shadow-stone-900/50 p-8">
                <p class="text-stone-700 dark:text-stone-300 mb-6 text-center">
                    Speed up your workflow. Press <kbd class="px-2 py-1 bg-stone-200 dark:bg-stone-700 rounded text-sm font-mono">?</kbd> anytime to see this list!
                </p>
                <div class="grid md:grid-cols-2 gap-6">
                    <div>
                        <h3 class="text-lg font-bold text-stone-900 dark:text-white mb-4 flex items-center gap-2">
                            <span class="w-1.5 h-1.5 rounded-full bg-primary"></span>
                            Global Shortcuts
                        </h3>
                        <div class="space-y-2">
                            <div class="flex items-center justify-between p-3 bg-gradient-to-r from-stone-50 to-stone-100/50 dark:from-stone-800/50 dark:to-stone-900/50 rounded-lg hover:shadow-md transition-shadow">
                                <span class="text-sm text-stone-700 dark:text-stone-300">Command palette</span>
                                <kbd class="px-2.5 py-1 bg-stone-200 dark:bg-stone-700 rounded text-xs font-mono">Ctrl+K</kbd>
                            </div>
                            <div class="flex items-center justify-between p-3 bg-gradient-to-r from-stone-50 to-stone-100/50 dark:from-stone-800/50 dark:to-stone-900/50 rounded-lg hover:shadow-md transition-shadow">
                                <span class="text-sm text-stone-700 dark:text-stone-300">New paper</span>
                                <kbd class="px-2.5 py-1 bg-stone-200 dark:bg-stone-700 rounded text-xs font-mono">N</kbd>
                            </div>
                            <div class="flex items-center justify-between p-3 bg-gradient-to-r from-stone-50 to-stone-100/50 dark:from-stone-800/50 dark:to-stone-900/50 rounded-lg hover:shadow-md transition-shadow">
                                <span class="text-sm text-stone-700 dark:text-stone-300">Focus search</span>
                                <kbd class="px-2.5 py-1 bg-stone-200 dark:bg-stone-700 rounded text-xs font-mono">/</kbd>
                            </div>
                            <div class="flex items-center justify-between p-3 bg-gradient-to-r from-stone-50 to-stone-100/50 dark:from-stone-800/50 dark:to-stone-900/50 rounded-lg hover:shadow-md transition-shadow">
                                <span class="text-sm text-stone-700 dark:text-stone-300">Go to dashboard</span>
                                <div class="flex gap-1 items-center">
                                    <kbd class="px-2.5 py-1 bg-stone-200 dark:bg-stone-700 rounded text-xs font-mono">G</kbd>
                                    <span class="text-xs text-stone-500">then</span>
                                    <kbd class="px-2.5 py-1 bg-stone-200 dark:bg-stone-700 rounded text-xs font-mono">H</kbd>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div>
                        <h3 class="text-lg font-bold text-stone-900 dark:text-white mb-4 flex items-center gap-2">
                            <span class="w-1.5 h-1.5 rounded-full bg-primary"></span>
                            Dashboard Shortcuts
                        </h3>
                        <div class="space-y-2">
                            <div class="flex items-center justify-between p-3 bg-gradient-to-r from-stone-50 to-stone-100/50 dark:from-stone-800/50 dark:to-stone-900/50 rounded-lg hover:shadow-md transition-shadow">
                                <span class="text-sm text-stone-700 dark:text-stone-300">Select all</span>
                                <kbd class="px-2.5 py-1 bg-stone-200 dark:bg-stone-700 rounded text-xs font-mono">Ctrl+A</kbd>
                            </div>
                            <div class="flex items-center justify-between p-3 bg-gradient-to-r from-stone-50 to-stone-100/50 dark:from-stone-800/50 dark:to-stone-900/50 rounded-lg hover:shadow-md transition-shadow">
                                <span class="text-sm text-stone-700 dark:text-stone-300">Clear selection</span>
                                <kbd class="px-2.5 py-1 bg-stone-200 dark:bg-stone-700 rounded text-xs font-mono">Ctrl+D</kbd>
                            </div>
                            <div class="flex items-center justify-between p-3 bg-gradient-to-r from-stone-50 to-stone-100/50 dark:from-stone-800/50 dark:to-stone-900/50 rounded-lg hover:shadow-md transition-shadow">
                                <span class="text-sm text-stone-700 dark:text-stone-300">Delete selected</span>
                                <kbd class="px-2.5 py-1 bg-stone-200 dark:bg-stone-700 rounded text-xs font-mono">Delete</kbd>
                            </div>
                            <div class="flex items-center justify-between p-3 bg-gradient-to-r from-stone-50 to-stone-100/50 dark:from-stone-800/50 dark:to-stone-900/50 rounded-lg hover:shadow-md transition-shadow">
                                <span class="text-sm text-stone-700 dark:text-stone-300">Quick Add DOI</span>
                                <kbd class="px-2.5 py-1 bg-stone-200 dark:bg-stone-700 rounded text-xs font-mono">Ctrl+Shift+D</kbd>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </section>

        <!-- PDF Management -->
        <section id="pdf-management" class="scroll-mt-20">
            <div class="flex items-center gap-3 mb-6">
                <div class="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-primary/20 to-primary/10 dark:from-primary/30 dark:to-primary/20">
                    <span class="material-symbols-outlined text-primary text-xl">picture_as_pdf</span>
                </div>
                <h2 class="text-3xl font-bold text-stone-900 dark:text-white">PDF Management</h2>
            </div>
            
            <div class="bg-white/80 dark:bg-stone-900/80 backdrop-blur-sm rounded-2xl border border-stone-200/50 dark:border-stone-800/50 shadow-xl shadow-stone-200/50 dark:shadow-stone-900/50 p-8 space-y-6">
                <div class="p-6 bg-gradient-to-br from-red-50 to-rose-50 dark:from-red-900/20 dark:to-rose-900/20 rounded-xl border border-red-200/50 dark:border-red-800/50">
                    <h3 class="text-lg font-bold text-stone-900 dark:text-white mb-3 flex items-center gap-2">
                        <span class="material-symbols-outlined text-red-600 dark:text-red-400">upload</span>
                        Uploading PDFs
                    </h3>
                    <ol class="list-decimal list-inside space-y-2 text-stone-700 dark:text-stone-300 ml-2">
                        <li>When adding or editing a paper, scroll to "PDF File" section</li>
                        <li>Click "Choose File" or drag and drop a PDF</li>
                        <li>PDF is stored in cloud storage (requires account)</li>
                        <li>PDFs are automatically linked to the paper</li>
                    </ol>
                    <div class="mt-4 p-3 bg-yellow-100/50 dark:bg-yellow-900/30 rounded-lg border border-yellow-200/50 dark:border-yellow-800/50">
                        <p class="text-sm font-medium text-yellow-900 dark:text-yellow-200">📌 Note: PDF uploads require cloud sync (free account). Local-only mode doesn't support PDF storage.</p>
                    </div>
                </div>
                <div class="p-6 bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-900/20 rounded-xl border border-blue-200/50 dark:border-blue-800/50">
                    <h3 class="text-lg font-bold text-stone-900 dark:text-white mb-3 flex items-center gap-2">
                        <span class="material-symbols-outlined text-blue-600 dark:text-blue-400">visibility</span>
                        Built-in PDF Viewer
                    </h3>
                    <p class="text-stone-700 dark:text-stone-300 mb-4">View PDFs directly in the app with a full-featured viewer:</p>
                    <div class="grid md:grid-cols-2 gap-3 text-sm">
                        <div class="flex items-center gap-2">
                            <span class="material-symbols-outlined text-blue-600 dark:text-blue-400 text-lg">zoom_in</span>
                            <span class="text-stone-700 dark:text-stone-300"><strong>Zoom:</strong> Mouse wheel, buttons, or pinch</span>
                        </div>
                        <div class="flex items-center gap-2">
                            <span class="material-symbols-outlined text-blue-600 dark:text-blue-400 text-lg">navigate_next</span>
                            <span class="text-stone-700 dark:text-stone-300"><strong>Navigation:</strong> Arrow keys or page buttons</span>
                        </div>
                        <div class="flex items-center gap-2">
                            <span class="material-symbols-outlined text-blue-600 dark:text-blue-400 text-lg">rotate_right</span>
                            <span class="text-stone-700 dark:text-stone-300"><strong>Rotation:</strong> Rotate 90° clockwise/counter-clockwise</span>
                        </div>
                        <div class="flex items-center gap-2">
                            <span class="material-symbols-outlined text-blue-600 dark:text-blue-400 text-lg">search</span>
                            <span class="text-stone-700 dark:text-stone-300"><strong>Search:</strong> Press <kbd class="bg-blue-100 dark:bg-blue-900/50 px-1.5 py-0.5 rounded text-xs">Ctrl+F</kbd> to search text</span>
                        </div>
                        <div class="flex items-center gap-2">
                            <span class="material-symbols-outlined text-blue-600 dark:text-blue-400 text-lg">download</span>
                            <span class="text-stone-700 dark:text-stone-300"><strong>Download:</strong> Save PDF to your computer</span>
                        </div>
                        <div class="flex items-center gap-2">
                            <span class="material-symbols-outlined text-blue-600 dark:text-blue-400 text-lg">fullscreen</span>
                            <span class="text-stone-700 dark:text-stone-300"><strong>Fullscreen:</strong> Distraction-free reading</span>
                        </div>
                    </div>
                </div>
            </div>
        </section>

        <!-- Paper Linking & Network -->
        <section id="paper-linking" class="scroll-mt-20">
            <div class="flex items-center gap-3 mb-6">
                <div class="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-primary/20 to-primary/10 dark:from-primary/30 dark:to-primary/20">
                    <span class="material-symbols-outlined text-primary text-xl">hub</span>
                </div>
                <h2 class="text-3xl font-bold text-stone-900 dark:text-white">Paper Linking & Network</h2>
            </div>
            
            <div class="bg-white/80 dark:bg-stone-900/80 backdrop-blur-sm rounded-2xl border border-stone-200/50 dark:border-stone-800/50 shadow-xl shadow-stone-200/50 dark:shadow-stone-900/50 p-8 space-y-6">
                <div class="p-6 bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 rounded-xl border border-purple-200/50 dark:border-purple-800/50">
                    <h3 class="text-lg font-bold text-stone-900 dark:text-white mb-3 flex items-center gap-2">
                        <span class="material-symbols-outlined text-purple-600 dark:text-purple-400">link</span>
                        Linking Related Papers
                    </h3>
                    <ol class="list-decimal list-inside space-y-2 text-stone-700 dark:text-stone-300 ml-2">
                        <li>Open a paper's detail page</li>
                        <li>Scroll to "Related Papers" section</li>
                        <li>Click "Link Paper" and type a paper title</li>
                        <li>Select from dropdown to create link</li>
                        <li>Links are bidirectional - both papers show the relationship</li>
                    </ol>
                    <div class="mt-4 p-3 bg-purple-100/50 dark:bg-purple-900/30 rounded-lg border border-purple-200/50 dark:border-purple-800/50">
                        <p class="text-sm font-medium text-purple-900 dark:text-purple-200">💡 Use Case: Link papers that cite each other, papers in the same research area, or papers that build on each other's work.</p>
                    </div>
                </div>
                <div class="p-6 bg-gradient-to-br from-indigo-50 to-blue-50 dark:from-indigo-900/20 dark:to-blue-900/20 rounded-xl border border-indigo-200/50 dark:border-indigo-800/50">
                    <h3 class="text-lg font-bold text-stone-900 dark:text-white mb-3 flex items-center gap-2">
                        <span class="material-symbols-outlined text-indigo-600 dark:text-indigo-400">device_hub</span>
                        Paper Network Graph
                    </h3>
                    <p class="text-stone-700 dark:text-stone-300 mb-4">Visualize all paper relationships in an interactive network graph:</p>
                    <div class="grid md:grid-cols-2 gap-4 text-sm">
                        <div>
                            <p class="font-semibold text-stone-900 dark:text-white mb-2">Interactions:</p>
                            <ul class="space-y-1 text-stone-600 dark:text-stone-400 ml-4 list-disc">
                                <li>Click and drag to move nodes</li>
                                <li>Scroll to zoom in/out</li>
                                <li>Click node to highlight connections</li>
                                <li>Double-click to open paper</li>
                            </ul>
                        </div>
                        <div>
                            <p class="font-semibold text-stone-900 dark:text-white mb-2">Features:</p>
                            <ul class="space-y-1 text-stone-600 dark:text-stone-400 ml-4 list-disc">
                                <li>Filter by status or tags</li>
                                <li>Multiple layout options</li>
                                <li>Node size shows connections</li>
                                <li>Edges show relationships</li>
                            </ul>
                        </div>
                    </div>
                </div>
            </div>
        </section>

        <!-- Citations -->
        <section id="citations" class="scroll-mt-20">
            <div class="flex items-center gap-3 mb-6">
                <div class="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-primary/20 to-primary/10 dark:from-primary/30 dark:to-primary/20">
                    <span class="material-symbols-outlined text-primary text-xl">format_quote</span>
                </div>
                <h2 class="text-3xl font-bold text-stone-900 dark:text-white">Citation Export</h2>
            </div>
            
            <div class="bg-white/80 dark:bg-stone-900/80 backdrop-blur-sm rounded-2xl border border-stone-200/50 dark:border-stone-800/50 shadow-xl shadow-stone-200/50 dark:shadow-stone-900/50 p-8 space-y-6">
                <div class="p-6 bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-900/20 dark:to-teal-900/20 rounded-xl border border-emerald-200/50 dark:border-emerald-800/50">
                    <h3 class="text-lg font-bold text-stone-900 dark:text-white mb-4 flex items-center gap-2">
                        <span class="material-symbols-outlined text-emerald-600 dark:text-emerald-400">style</span>
                        Supported Formats
                    </h3>
                    <p class="text-stone-700 dark:text-stone-300 mb-4">citavErs supports 6 major citation styles:</p>
                    <div class="grid md:grid-cols-3 gap-2">
                        <div class="p-3 bg-white/50 dark:bg-stone-800/50 rounded-lg text-sm font-medium text-stone-700 dark:text-stone-300">APA</div>
                        <div class="p-3 bg-white/50 dark:bg-stone-800/50 rounded-lg text-sm font-medium text-stone-700 dark:text-stone-300">MLA</div>
                        <div class="p-3 bg-white/50 dark:bg-stone-800/50 rounded-lg text-sm font-medium text-stone-700 dark:text-stone-300">IEEE</div>
                        <div class="p-3 bg-white/50 dark:bg-stone-800/50 rounded-lg text-sm font-medium text-stone-700 dark:text-stone-300">Chicago</div>
                        <div class="p-3 bg-white/50 dark:bg-stone-800/50 rounded-lg text-sm font-medium text-stone-700 dark:text-stone-300">Harvard</div>
                        <div class="p-3 bg-white/50 dark:bg-stone-800/50 rounded-lg text-sm font-medium text-stone-700 dark:text-stone-300">Vancouver</div>
                    </div>
                </div>
                <div class="p-6 bg-gradient-to-br from-cyan-50 to-blue-50 dark:from-cyan-900/20 dark:to-blue-900/20 rounded-xl border border-cyan-200/50 dark:border-cyan-800/50">
                    <h3 class="text-lg font-bold text-stone-900 dark:text-white mb-3 flex items-center gap-2">
                        <span class="material-symbols-outlined text-cyan-600 dark:text-cyan-400">file_download</span>
                        Exporting Citations
                    </h3>
                    <ol class="list-decimal list-inside space-y-2 text-stone-700 dark:text-stone-300 ml-2">
                        <li>Open a paper's detail page</li>
                        <li>Click the "Cite" button</li>
                        <li>Choose citation format</li>
                        <li>Select bibliography style (numbered or alphabetical)</li>
                        <li>Copy to clipboard or download as .txt</li>
                    </ol>
                    <div class="mt-4 p-3 bg-cyan-100/50 dark:bg-cyan-900/30 rounded-lg border border-cyan-200/50 dark:border-cyan-800/50">
                        <p class="text-sm font-medium text-cyan-900 dark:text-cyan-200">🚀 Batch Export: Select multiple papers and export citations for all at once!</p>
                    </div>
                </div>
            </div>
        </section>

        <!-- Command Palette -->
        <section id="command-palette" class="scroll-mt-20">
            <div class="flex items-center gap-3 mb-6">
                <div class="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-primary/20 to-primary/10 dark:from-primary/30 dark:to-primary/20">
                    <span class="material-symbols-outlined text-primary text-xl">tune</span>
                </div>
                <h2 class="text-3xl font-bold text-stone-900 dark:text-white">Command Palette</h2>
            </div>
            
            <div class="bg-white/80 dark:bg-stone-900/80 backdrop-blur-sm rounded-2xl border border-stone-200/50 dark:border-stone-800/50 shadow-xl shadow-stone-200/50 dark:shadow-stone-900/50 p-8 space-y-6">
                <div class="p-6 bg-gradient-to-br from-violet-50 to-purple-50 dark:from-violet-900/20 dark:to-purple-900/20 rounded-xl border border-violet-200/50 dark:border-violet-800/50">
                    <p class="text-stone-700 dark:text-stone-300 mb-4 text-lg">
                        Your universal search and navigation tool. Press <kbd class="px-2.5 py-1 bg-violet-100 dark:bg-violet-900/50 rounded text-sm font-mono">Ctrl+K</kbd> (or <kbd class="px-2.5 py-1 bg-violet-100 dark:bg-violet-900/50 rounded text-sm font-mono">Cmd+K</kbd> on Mac) from anywhere.
                    </p>
                    <div class="grid md:grid-cols-2 gap-4">
                        <div>
                            <h4 class="font-bold text-stone-900 dark:text-white mb-3">What You Can Do</h4>
                            <ul class="space-y-2 text-sm text-stone-700 dark:text-stone-300 ml-4 list-disc">
                                <li>Search papers by title</li>
                                <li>Navigate to views</li>
                                <li>Filter by status or tags</li>
                                <li>Access collections</li>
                                <li>Quick actions</li>
                            </ul>
                        </div>
                        <div>
                            <h4 class="font-bold text-stone-900 dark:text-white mb-3">Using the Palette</h4>
                            <ul class="space-y-2 text-sm text-stone-700 dark:text-stone-300 ml-4 list-disc">
                                <li>Type to filter results</li>
                                <li>Use <kbd class="bg-violet-100 dark:bg-violet-900/50 px-1.5 py-0.5 rounded text-xs">↑↓</kbd> to navigate</li>
                                <li>Press <kbd class="bg-violet-100 dark:bg-violet-900/50 px-1.5 py-0.5 rounded text-xs">Enter</kbd> to execute</li>
                                <li>Press <kbd class="bg-violet-100 dark:bg-violet-900/50 px-1.5 py-0.5 rounded text-xs">Esc</kbd> to close</li>
                                <li>Results grouped by category</li>
                            </ul>
                        </div>
                    </div>
                </div>
            </div>
        </section>

        <!-- Data Management -->
        <section id="data-management" class="scroll-mt-20">
            <div class="flex items-center gap-3 mb-6">
                <div class="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-primary/20 to-primary/10 dark:from-primary/30 dark:to-primary/20">
                    <span class="material-symbols-outlined text-primary text-xl">storage</span>
                </div>
                <h2 class="text-3xl font-bold text-stone-900 dark:text-white">Data Management</h2>
            </div>
            
            <div class="bg-white/80 dark:bg-stone-900/80 backdrop-blur-sm rounded-2xl border border-stone-200/50 dark:border-stone-800/50 shadow-xl shadow-stone-200/50 dark:shadow-stone-900/50 p-8 space-y-6">
                <div class="grid md:grid-cols-2 gap-6">
                    <div class="p-6 bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-xl border border-green-200/50 dark:border-green-800/50">
                        <h3 class="text-lg font-bold text-stone-900 dark:text-white mb-3 flex items-center gap-2">
                            <span class="material-symbols-outlined text-green-600 dark:text-green-400">file_download</span>
                            Export Data
                        </h3>
                        <p class="text-stone-700 dark:text-stone-300 mb-3 text-sm">Create a complete backup of all your papers, notes, PDFs, and collections.</p>
                        <ol class="list-decimal list-inside space-y-1 text-sm text-stone-600 dark:text-stone-400 ml-2">
                            <li>Go to Settings</li>
                            <li>Data Management section</li>
                            <li>Click "Export Data"</li>
                            <li>JSON file downloads</li>
                        </ol>
                    </div>
                    <div class="p-6 bg-gradient-to-br from-orange-50 to-amber-50 dark:from-orange-900/20 dark:to-amber-900/20 rounded-xl border border-orange-200/50 dark:border-orange-800/50">
                        <h3 class="text-lg font-bold text-stone-900 dark:text-white mb-3 flex items-center gap-2">
                            <span class="material-symbols-outlined text-orange-600 dark:text-orange-400">file_upload</span>
                            Import Data
                        </h3>
                        <p class="text-stone-700 dark:text-stone-300 mb-3 text-sm">Restore from backup or import from Zotero/Mendeley.</p>
                        <ul class="space-y-1 text-sm text-stone-600 dark:text-stone-400 ml-4 list-disc">
                            <li>From backup (JSON)</li>
                            <li>From Zotero/Mendeley (RIS)</li>
                            <li>Cloud restore option</li>
                        </ul>
                        <div class="mt-3 p-2 bg-yellow-100/50 dark:bg-yellow-900/30 rounded border border-yellow-200/50 dark:border-yellow-800/50">
                            <p class="text-xs font-medium text-yellow-900 dark:text-yellow-200">⚠️ Replaces all current data</p>
                        </div>
                    </div>
                </div>
                <div class="p-6 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-xl border border-blue-200/50 dark:border-blue-800/50">
                    <h3 class="text-lg font-bold text-stone-900 dark:text-white mb-3 flex items-center gap-2">
                        <span class="material-symbols-outlined text-blue-600 dark:text-blue-400">cloud_sync</span>
                        Cloud Sync (Optional)
                    </h3>
                    <p class="text-stone-700 dark:text-stone-300 mb-3">Enable cloud sync to access your library from multiple devices.</p>
                    <ol class="list-decimal list-inside space-y-1 text-sm text-stone-600 dark:text-stone-400 ml-2">
                        <li>Create free account</li>
                        <li>Verify email address</li>
                        <li>Enable in Settings</li>
                        <li>Automatic sync across devices</li>
                    </ol>
                    <div class="mt-3 p-3 bg-blue-100/50 dark:bg-blue-900/30 rounded-lg border border-blue-200/50 dark:border-blue-800/50">
                        <p class="text-sm font-medium text-blue-900 dark:text-blue-200">✨ Benefits: Multi-device access, PDF storage, automatic backups</p>
                    </div>
                </div>
            </div>
        </section>

        <!-- Tips & Tricks -->
        <section id="tips-tricks" class="scroll-mt-20">
            <div class="flex items-center gap-3 mb-6">
                <div class="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-primary/20 to-primary/10 dark:from-primary/30 dark:to-primary/20">
                    <span class="material-symbols-outlined text-primary text-xl">tips_and_updates</span>
                </div>
                <h2 class="text-3xl font-bold text-stone-900 dark:text-white">Tips & Tricks</h2>
            </div>
            
            <div class="grid md:grid-cols-2 gap-4">
                <div class="p-5 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-xl border border-blue-200/50 dark:border-blue-800/50 hover:shadow-lg transition-shadow">
                    <div class="flex items-start gap-3">
                        <span class="material-symbols-outlined text-blue-600 dark:text-blue-400 text-2xl">bookmark</span>
                        <div>
                            <h4 class="font-bold text-stone-900 dark:text-white mb-1">Organize with Collections</h4>
                            <p class="text-sm text-stone-600 dark:text-stone-400">Save filter combinations as collections for quick access by project or course.</p>
                        </div>
                    </div>
                </div>
                <div class="p-5 bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 rounded-xl border border-purple-200/50 dark:border-purple-800/50 hover:shadow-lg transition-shadow">
                    <div class="flex items-start gap-3">
                        <span class="material-symbols-outlined text-purple-600 dark:text-purple-400 text-2xl">label</span>
                        <div>
                            <h4 class="font-bold text-stone-900 dark:text-white mb-1">Strategic Tagging</h4>
                            <p class="text-sm text-stone-600 dark:text-stone-400">Create consistent tags (e.g., "nlp", "cv", "thesis-2024") for powerful filtering.</p>
                        </div>
                    </div>
                </div>
                <div class="p-5 bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-xl border border-green-200/50 dark:border-green-800/50 hover:shadow-lg transition-shadow">
                    <div class="flex items-start gap-3">
                        <span class="material-symbols-outlined text-green-600 dark:text-green-400 text-2xl">hub</span>
                        <div>
                            <h4 class="font-bold text-stone-900 dark:text-white mb-1">Link Related Papers</h4>
                            <p class="text-sm text-stone-600 dark:text-stone-400">Build a knowledge graph to visualize research connections.</p>
                        </div>
                    </div>
                </div>
                <div class="p-5 bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 rounded-xl border border-amber-200/50 dark:border-amber-800/50 hover:shadow-lg transition-shadow">
                    <div class="flex items-start gap-3">
                        <span class="material-symbols-outlined text-amber-600 dark:text-amber-400 text-2xl">tune</span>
                        <div>
                            <h4 class="font-bold text-stone-900 dark:text-white mb-1">Use Command Palette</h4>
                            <p class="text-sm text-stone-600 dark:text-stone-400">Press <kbd class="bg-amber-100 dark:bg-amber-900/50 px-1.5 py-0.5 rounded text-xs">Ctrl+K</kbd> for quick navigation and search.</p>
                        </div>
                    </div>
                </div>
            </div>
        </section>

        <!-- Troubleshooting -->
        <section id="troubleshooting" class="scroll-mt-20">
            <div class="flex items-center gap-3 mb-6">
                <div class="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-primary/20 to-primary/10 dark:from-primary/30 dark:to-primary/20">
                    <span class="material-symbols-outlined text-primary text-xl">help</span>
                </div>
                <h2 class="text-3xl font-bold text-stone-900 dark:text-white">Troubleshooting</h2>
            </div>
            
            <div class="bg-white/80 dark:bg-stone-900/80 backdrop-blur-sm rounded-2xl border border-stone-200/50 dark:border-stone-800/50 shadow-xl shadow-stone-200/50 dark:shadow-stone-900/50 p-8">
                <div class="grid md:grid-cols-2 gap-4">
                    <div class="p-5 bg-gradient-to-br from-red-50 to-rose-50 dark:from-red-900/20 dark:to-rose-900/20 rounded-xl border border-red-200/50 dark:border-red-800/50">
                        <div class="flex items-start gap-3">
                            <span class="material-symbols-outlined text-red-600 dark:text-red-400 text-2xl">help</span>
                            <div>
                                <h4 class="font-bold text-stone-900 dark:text-white mb-2">DOI not found</h4>
                                <p class="text-sm text-stone-600 dark:text-stone-400">Some DOIs may not be in the database. Try manual entry or check the DOI format.</p>
                            </div>
                        </div>
                    </div>
                    <div class="p-5 bg-gradient-to-br from-orange-50 to-amber-50 dark:from-orange-900/20 dark:to-amber-900/20 rounded-xl border border-orange-200/50 dark:border-orange-800/50">
                        <div class="flex items-start gap-3">
                            <span class="material-symbols-outlined text-orange-600 dark:text-orange-400 text-2xl">warning</span>
                            <div>
                                <h4 class="font-bold text-stone-900 dark:text-white mb-2">Data disappeared</h4>
                                <p class="text-sm text-stone-600 dark:text-stone-400">If you cleared browser data, export backups regularly. Cloud sync restores automatically.</p>
                            </div>
                        </div>
                    </div>
                    <div class="p-5 bg-gradient-to-br from-yellow-50 to-orange-50 dark:from-yellow-900/20 dark:to-orange-900/20 rounded-xl border border-yellow-200/50 dark:border-yellow-800/50">
                        <div class="flex items-start gap-3">
                            <span class="material-symbols-outlined text-yellow-600 dark:text-yellow-400 text-2xl">picture_as_pdf</span>
                            <div>
                                <h4 class="font-bold text-stone-900 dark:text-white mb-2">PDF won't upload</h4>
                                <p class="text-sm text-stone-600 dark:text-stone-400">PDF uploads require cloud sync and an authenticated account. Sign in and verify email.</p>
                            </div>
                        </div>
                    </div>
                    <div class="p-5 bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-900/20 rounded-xl border border-blue-200/50 dark:border-blue-800/50">
                        <div class="flex items-start gap-3">
                            <span class="material-symbols-outlined text-blue-600 dark:text-blue-400 text-2xl">keyboard</span>
                            <div>
                                <h4 class="font-bold text-stone-900 dark:text-white mb-2">Search not working</h4>
                                <p class="text-sm text-stone-600 dark:text-stone-400">Make sure you're not in an input field. Press <kbd class="bg-blue-100 dark:bg-blue-900/50 px-1.5 py-0.5 rounded text-xs">Esc</kbd> to exit inputs.</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    </div>
</div>
`;

