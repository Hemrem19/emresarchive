export const docsView = `
<div class="max-w-4xl mx-auto px-4 py-8">
    <div class="mb-8">
        <h1 class="text-3xl font-bold text-stone-900 dark:text-white mb-4">How to Use citavErs</h1>
        <p class="text-lg text-stone-600 dark:text-stone-400 mb-2">
            Welcome to citavErs, your personal research paper manager. This comprehensive guide will help you master all features and organize your academic library efficiently.
        </p>
        <div class="flex items-center gap-2 text-sm text-stone-500 dark:text-stone-400 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 p-3 rounded-lg">
            <span class="material-symbols-outlined text-blue-600 dark:text-blue-400">lightbulb</span>
            <span><strong>Tip:</strong> All your data is stored locally in your browser. No account required to get started!</span>
        </div>
    </div>

    <div class="space-y-12">
        <!-- Getting Started -->
        <section id="getting-started" class="scroll-mt-20">
            <h2 class="text-2xl font-bold text-stone-900 dark:text-white mb-4 flex items-center gap-2">
                <span class="material-symbols-outlined text-primary">start</span>
                Getting Started
            </h2>
            <div class="bg-white dark:bg-stone-900 rounded-xl border border-stone-200 dark:border-stone-800 p-6 space-y-6">
                <div>
                    <h3 class="text-lg font-bold text-stone-900 dark:text-white mb-3">Adding Your First Paper</h3>
                    <p class="text-stone-700 dark:text-stone-300 mb-4">
                        There are three ways to add papers to your library:
                    </p>
                    
                    <div class="space-y-4">
                        <div class="p-4 bg-stone-50 dark:bg-stone-800/50 rounded-lg border border-stone-200 dark:border-stone-700">
                            <div class="flex items-start gap-3 mb-2">
                                <span class="material-symbols-outlined text-primary text-xl">bolt</span>
                                <div class="flex-1">
                                    <h4 class="font-bold text-stone-900 dark:text-white mb-2">Quick Add by DOI (Fastest)</h4>
                                    <ol class="list-decimal list-inside space-y-1 text-sm text-stone-700 dark:text-stone-300 ml-2">
                                        <li>Find the "Quick Add by DOI" input in the sidebar</li>
                                        <li>Paste a DOI (e.g., <code class="bg-stone-200 dark:bg-stone-700 px-1.5 py-0.5 rounded">10.1038/nature12373</code>) or DOI URL</li>
                                        <li>Press Enter or click "Add"</li>
                                        <li>The app automatically fetches title, authors, journal, year, and other metadata</li>
                                    </ol>
                                    <div class="mt-3 p-2 bg-blue-50 dark:bg-blue-900/20 rounded text-xs text-blue-800 dark:text-blue-200">
                                        <strong>Pro Tip:</strong> You can paste full DOI URLs like <code class="bg-blue-100 dark:bg-blue-900 px-1 rounded">https://doi.org/10.1038/nature12373</code> - the app will extract the DOI automatically!
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div class="p-4 bg-stone-50 dark:bg-stone-800/50 rounded-lg border border-stone-200 dark:border-stone-700">
                            <div class="flex items-start gap-3 mb-2">
                                <span class="material-symbols-outlined text-primary text-xl">edit_document</span>
                                <div class="flex-1">
                                    <h4 class="font-bold text-stone-900 dark:text-white mb-2">Manual Entry</h4>
                                    <ol class="list-decimal list-inside space-y-1 text-sm text-stone-700 dark:text-stone-300 ml-2">
                                        <li>Click the "Add Paper" button in the header (or press <kbd class="px-1.5 py-0.5 bg-stone-200 dark:bg-stone-700 rounded text-xs">N</kbd>)</li>
                                        <li>Fill in the form with paper details: title, authors, journal, year, etc.</li>
                                        <li>Optionally upload a PDF file</li>
                                        <li>Add tags and set reading status</li>
                                        <li>Click "Save Paper"</li>
                                    </ol>
                                </div>
                            </div>
                        </div>

                        <div class="p-4 bg-stone-50 dark:bg-stone-800/50 rounded-lg border border-stone-200 dark:border-stone-700">
                            <div class="flex items-start gap-3 mb-2">
                                <span class="material-symbols-outlined text-primary text-xl">upload_file</span>
                                <div class="flex-1">
                                    <h4 class="font-bold text-stone-900 dark:text-white mb-2">Import from Backup</h4>
                                    <ol class="list-decimal list-inside space-y-1 text-sm text-stone-700 dark:text-stone-300 ml-2">
                                        <li>Go to Settings (click the gear icon in sidebar)</li>
                                        <li>Scroll to "Data Management" section</li>
                                        <li>Click "Import Data" and select a JSON backup file</li>
                                        <li>Confirm the import (this will replace all current data)</li>
                                    </ol>
                                    <div class="mt-3 p-2 bg-yellow-50 dark:bg-yellow-900/20 rounded text-xs text-yellow-800 dark:text-yellow-200">
                                        <strong>Warning:</strong> Importing will replace all your current papers. Export first to create a backup!
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </section>

        <!-- Managing Papers -->
        <section id="managing-papers" class="scroll-mt-20">
            <h2 class="text-2xl font-bold text-stone-900 dark:text-white mb-4 flex items-center gap-2">
                <span class="material-symbols-outlined text-primary">library_books</span>
                Managing Papers
            </h2>
            <div class="bg-white dark:bg-stone-900 rounded-xl border border-stone-200 dark:border-stone-800 p-6 space-y-6">
                <div>
                    <h3 class="text-lg font-bold text-stone-900 dark:text-white mb-3">Viewing and Editing Papers</h3>
                    <ul class="space-y-3 text-stone-700 dark:text-stone-300">
                        <li class="flex items-start gap-3">
                            <span class="material-symbols-outlined text-primary mt-0.5">visibility</span>
                            <div>
                                <span class="font-bold text-stone-900 dark:text-white">View Details:</span>
                                Click any paper card on the dashboard to open its detail page. Here you can see all metadata, read notes, view PDFs, and manage related papers.
                            </div>
                        </li>
                        <li class="flex items-start gap-3">
                            <span class="material-symbols-outlined text-primary mt-0.5">edit</span>
                            <div>
                                <span class="font-bold text-stone-900 dark:text-white">Edit Paper:</span>
                                Click the "Edit" button on the paper detail page, or use the edit icon on a paper card. Update any field including title, authors, tags, status, and notes.
                            </div>
                        </li>
                        <li class="flex items-start gap-3">
                            <span class="material-symbols-outlined text-primary mt-0.5">delete</span>
                            <div>
                                <span class="font-bold text-stone-900 dark:text-white">Delete Paper:</span>
                                Click the delete icon on a paper card or in the detail view. You'll be asked to confirm before deletion.
                            </div>
                        </li>
                    </ul>
                </div>

                <div>
                    <h3 class="text-lg font-bold text-stone-900 dark:text-white mb-3">Reading Status</h3>
                    <p class="text-stone-700 dark:text-stone-300 mb-3">
                        Track your reading progress with four status categories:
                    </p>
                    <div class="grid md:grid-cols-2 gap-3">
                        <div class="p-3 bg-stone-50 dark:bg-stone-800/50 rounded-lg">
                            <div class="font-bold text-stone-900 dark:text-white mb-1">📖 To Read</div>
                            <div class="text-sm text-stone-600 dark:text-stone-400">Papers you plan to read</div>
                        </div>
                        <div class="p-3 bg-stone-50 dark:bg-stone-800/50 rounded-lg">
                            <div class="font-bold text-stone-900 dark:text-white mb-1">👁️ Reading</div>
                            <div class="text-sm text-stone-600 dark:text-stone-400">Currently reading (enables progress tracking)</div>
                        </div>
                        <div class="p-3 bg-stone-50 dark:bg-stone-800/50 rounded-lg">
                            <div class="font-bold text-stone-900 dark:text-white mb-1">✅ Finished</div>
                            <div class="text-sm text-stone-600 dark:text-stone-400">Completed papers</div>
                        </div>
                        <div class="p-3 bg-stone-50 dark:bg-stone-800/50 rounded-lg">
                            <div class="font-bold text-stone-900 dark:text-white mb-1">📦 Archived</div>
                            <div class="text-sm text-stone-600 dark:text-stone-400">Reference papers, less active</div>
                        </div>
                    </div>
                    <div class="mt-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg text-sm text-blue-800 dark:text-blue-200">
                        <strong>Reading Progress:</strong> When a paper is set to "Reading", you can track your progress by entering current page and total pages. The progress bar updates automatically!
                    </div>
                </div>

                <div>
                    <h3 class="text-lg font-bold text-stone-900 dark:text-white mb-3">Tags and Organization</h3>
                    <ul class="space-y-2 text-stone-700 dark:text-stone-300">
                        <li class="flex items-start gap-3">
                            <span class="material-symbols-outlined text-primary mt-0.5">label</span>
                            <div>
                                <span class="font-bold text-stone-900 dark:text-white">Adding Tags:</span>
                                When adding or editing a paper, type tags in the tags field separated by commas (e.g., <code class="bg-stone-200 dark:bg-stone-700 px-1.5 py-0.5 rounded">machine-learning, nlp, 2024</code>). Tags are case-insensitive and automatically deduplicated.
                            </div>
                        </li>
                        <li class="flex items-start gap-3">
                            <span class="material-symbols-outlined text-primary mt-0.5">filter_list</span>
                            <div>
                                <span class="font-bold text-stone-900 dark:text-white">Filtering by Tags:</span>
                                Click any tag in the sidebar to filter papers. You can select multiple tags - papers must match ALL selected tags. Use the filter chips at the top to remove filters.
                            </div>
                        </li>
                        <li class="flex items-start gap-3">
                            <span class="material-symbols-outlined text-primary mt-0.5">bookmark</span>
                            <div>
                                <span class="font-bold text-stone-900 dark:text-white">Collections:</span>
                                Save filter combinations as collections for quick access. Go to Settings → Collections to create, edit, or delete collections.
                            </div>
                        </li>
                    </ul>
                </div>

                <div>
                    <h3 class="text-lg font-bold text-stone-900 dark:text-white mb-3">Rich Text Notes</h3>
                    <p class="text-stone-700 dark:text-stone-300 mb-3">
                        Take detailed notes for each paper with full formatting support:
                    </p>
                    <ul class="space-y-2 text-sm text-stone-700 dark:text-stone-300 ml-4 list-disc">
                        <li><strong>Bold</strong>, <em>italic</em>, and <u>underline</u> text</li>
                        <li>Bullet and numbered lists</li>
                        <li>Headings (H1, H2, H3)</li>
                        <li>Code blocks and inline code</li>
                        <li>Links and blockquotes</li>
                    </ul>
                    <div class="mt-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg text-sm text-blue-800 dark:text-blue-200">
                        <strong>Search in Notes:</strong> Use the search mode toggle to search only within notes. This is perfect for finding papers by specific concepts or findings you've written about!
                    </div>
                </div>
            </div>
        </section>

        <!-- Search and Filtering -->
        <section id="search-filtering" class="scroll-mt-20">
            <h2 class="text-2xl font-bold text-stone-900 dark:text-white mb-4 flex items-center gap-2">
                <span class="material-symbols-outlined text-primary">search</span>
                Search & Filtering
            </h2>
            <div class="bg-white dark:bg-stone-900 rounded-xl border border-stone-200 dark:border-stone-800 p-6 space-y-6">
                <div>
                    <h3 class="text-lg font-bold text-stone-900 dark:text-white mb-3">Search Modes</h3>
                    <div class="space-y-3">
                        <div class="p-4 bg-stone-50 dark:bg-stone-800/50 rounded-lg">
                            <div class="font-bold text-stone-900 dark:text-white mb-2">All Fields (Default)</div>
                            <p class="text-sm text-stone-700 dark:text-stone-300 mb-2">
                                Searches across paper titles, authors, and notes simultaneously. Perfect for general searches.
                            </p>
                            <div class="text-xs text-stone-500 dark:text-stone-400">
                                <strong>Example:</strong> Searching "neural network" finds papers with that phrase in title, author names, or notes.
                            </div>
                        </div>
                        <div class="p-4 bg-stone-50 dark:bg-stone-800/50 rounded-lg">
                            <div class="font-bold text-stone-900 dark:text-white mb-2">Notes Only</div>
                            <p class="text-sm text-stone-700 dark:text-stone-300 mb-2">
                                Searches only within your notes. Great for finding papers by concepts, findings, or ideas you've written about.
                            </p>
                            <div class="text-xs text-stone-500 dark:text-stone-400">
                                <strong>Example:</strong> Search "transfer learning" in notes to find papers where you've discussed this concept.
                            </div>
                        </div>
                    </div>
                </div>

                <div>
                    <h3 class="text-lg font-bold text-stone-900 dark:text-white mb-3">Search Tips</h3>
                    <ul class="space-y-2 text-sm text-stone-700 dark:text-stone-300 ml-4 list-disc">
                        <li><strong>Exact Phrases:</strong> Use double quotes for exact matches: <code class="bg-stone-200 dark:bg-stone-700 px-1.5 py-0.5 rounded">"machine learning"</code></li>
                        <li><strong>Multiple Keywords:</strong> Type multiple words to search for all of them independently</li>
                        <li><strong>Case Insensitive:</strong> Searches are not case-sensitive</li>
                        <li><strong>Real-time:</strong> Results update as you type</li>
                        <li><strong>Keyboard Shortcut:</strong> Press <kbd class="px-1.5 py-0.5 bg-stone-200 dark:bg-stone-700 rounded text-xs">/</kbd> to focus the search bar</li>
                    </ul>
                </div>

                <div>
                    <h3 class="text-lg font-bold text-stone-900 dark:text-white mb-3">Advanced Filtering</h3>
                    <p class="text-stone-700 dark:text-stone-300 mb-3">
                        Combine multiple filters for precise results:
                    </p>
                    <ul class="space-y-2 text-sm text-stone-700 dark:text-stone-300 ml-4 list-disc">
                        <li><strong>Status Filters:</strong> Filter by reading status (To Read, Reading, Finished, Archived)</li>
                        <li><strong>Tag Filters:</strong> Select multiple tags - papers must match ALL selected tags (AND logic)</li>
                        <li><strong>Combined Filters:</strong> Mix status and tags for very specific results</li>
                        <li><strong>Filter Chips:</strong> Active filters appear as chips at the top - click × to remove</li>
                        <li><strong>URL-Based:</strong> Filter state is saved in the URL, so you can bookmark specific filter combinations</li>
                    </ul>
                </div>

                <div>
                    <h3 class="text-lg font-bold text-stone-900 dark:text-white mb-3">Sorting Options</h3>
                    <p class="text-stone-700 dark:text-stone-300 mb-2">
                        Use the sort dropdown to organize papers by:
                    </p>
                    <div class="grid md:grid-cols-2 gap-2 text-sm">
                        <div class="p-2 bg-stone-50 dark:bg-stone-800/50 rounded">📅 Date Added (Newest First)</div>
                        <div class="p-2 bg-stone-50 dark:bg-stone-800/50 rounded">📅 Date Added (Oldest First)</div>
                        <div class="p-2 bg-stone-50 dark:bg-stone-800/50 rounded">🔄 Last Updated (Most Recent)</div>
                        <div class="p-2 bg-stone-50 dark:bg-stone-800/50 rounded">📖 Title (A-Z)</div>
                        <div class="p-2 bg-stone-50 dark:bg-stone-800/50 rounded">👤 Author (A-Z)</div>
                        <div class="p-2 bg-stone-50 dark:bg-stone-800/50 rounded">📆 Year (Newest First)</div>
                    </div>
                </div>
            </div>
        </section>

        <!-- Batch Operations -->
        <section id="batch-operations" class="scroll-mt-20">
            <h2 class="text-2xl font-bold text-stone-900 dark:text-white mb-4 flex items-center gap-2">
                <span class="material-symbols-outlined text-primary">select_all</span>
                Batch Operations
            </h2>
            <div class="bg-white dark:bg-stone-900 rounded-xl border border-stone-200 dark:border-stone-800 p-6 space-y-6">
                <p class="text-stone-700 dark:text-stone-300">
                    Select multiple papers at once to perform bulk operations. This is perfect for organizing large libraries!
                </p>

                <div>
                    <h3 class="text-lg font-bold text-stone-900 dark:text-white mb-3">Selecting Papers</h3>
                    <ul class="space-y-2 text-sm text-stone-700 dark:text-stone-300 ml-4 list-disc">
                        <li><strong>Individual Selection:</strong> Click the checkbox on any paper card</li>
                        <li><strong>Select All:</strong> Press <kbd class="px-1.5 py-0.5 bg-stone-200 dark:bg-stone-700 rounded text-xs">Ctrl+A</kbd> (or <kbd class="px-1.5 py-0.5 bg-stone-200 dark:bg-stone-700 rounded text-xs">Cmd+A</kbd> on Mac) to select all visible papers</li>
                        <li><strong>Clear Selection:</strong> Press <kbd class="px-1.5 py-0.5 bg-stone-200 dark:bg-stone-700 rounded text-xs">Ctrl+D</kbd> or <kbd class="px-1.5 py-0.5 bg-stone-200 dark:bg-stone-700 rounded text-xs">Esc</kbd></li>
                        <li><strong>Selection Counter:</strong> The number of selected papers appears in the batch actions toolbar</li>
                    </ul>
                </div>

                <div>
                    <h3 class="text-lg font-bold text-stone-900 dark:text-white mb-3">Available Batch Actions</h3>
                    <div class="space-y-3">
                        <div class="p-3 bg-stone-50 dark:bg-stone-800/50 rounded-lg">
                            <div class="font-bold text-stone-900 dark:text-white mb-1">📊 Change Status</div>
                            <div class="text-sm text-stone-600 dark:text-stone-400">Select papers, choose a new status from the dropdown, and all selected papers update instantly.</div>
                        </div>
                        <div class="p-3 bg-stone-50 dark:bg-stone-800/50 rounded-lg">
                            <div class="font-bold text-stone-900 dark:text-white mb-1">🏷️ Manage Tags</div>
                            <div class="text-sm text-stone-600 dark:text-stone-400">Add or remove tags from multiple papers at once. Type tags separated by commas.</div>
                        </div>
                        <div class="p-3 bg-stone-50 dark:bg-stone-800/50 rounded-lg">
                            <div class="font-bold text-stone-900 dark:text-white mb-1">🗑️ Delete Papers</div>
                            <div class="text-sm text-stone-600 dark:text-stone-400">Select papers and press <kbd class="px-1.5 py-0.5 bg-stone-200 dark:bg-stone-700 rounded text-xs">Delete</kbd> key. Confirmation required.</div>
                        </div>
                        <div class="p-3 bg-stone-50 dark:bg-stone-800/50 rounded-lg">
                            <div class="font-bold text-stone-900 dark:text-white mb-1">📝 Export Citations</div>
                            <div class="text-sm text-stone-600 dark:text-stone-400">Generate bibliography for selected papers in your preferred citation format (APA, MLA, IEEE, etc.).</div>
                        </div>
                    </div>
                </div>
            </div>
        </section>

        <!-- PDF Management -->
        <section id="pdf-management" class="scroll-mt-20">
            <h2 class="text-2xl font-bold text-stone-900 dark:text-white mb-4 flex items-center gap-2">
                <span class="material-symbols-outlined text-primary">picture_as_pdf</span>
                PDF Management
            </h2>
            <div class="bg-white dark:bg-stone-900 rounded-xl border border-stone-200 dark:border-stone-800 p-6 space-y-6">
                <div>
                    <h3 class="text-lg font-bold text-stone-900 dark:text-white mb-3">Uploading PDFs</h3>
                    <ol class="list-decimal list-inside space-y-2 text-stone-700 dark:text-stone-300 ml-2">
                        <li>When adding or editing a paper, scroll to the "PDF File" section</li>
                        <li>Click "Choose File" or drag and drop a PDF file</li>
                        <li>The PDF is stored locally in your browser (or in cloud storage if you have an account)</li>
                        <li>PDFs are automatically linked to the paper</li>
                    </ol>
                    <div class="mt-3 p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg text-sm text-yellow-800 dark:text-yellow-200">
                        <strong>Note:</strong> PDF uploads require cloud sync (free account). Local-only mode doesn't support PDF storage.
                    </div>
                </div>

                <div>
                    <h3 class="text-lg font-bold text-stone-900 dark:text-white mb-3">Built-in PDF Viewer</h3>
                    <p class="text-stone-700 dark:text-stone-300 mb-3">
                        View PDFs directly in the app with a full-featured viewer:
                    </p>
                    <ul class="space-y-2 text-sm text-stone-700 dark:text-stone-300 ml-4 list-disc">
                        <li><strong>Zoom:</strong> Use mouse wheel, zoom buttons, or pinch gestures</li>
                        <li><strong>Navigation:</strong> Arrow keys, page buttons, or click page numbers</li>
                        <li><strong>Rotation:</strong> Rotate PDF 90° clockwise or counter-clockwise</li>
                        <li><strong>Search:</strong> Press <kbd class="px-1.5 py-0.5 bg-stone-200 dark:bg-stone-700 rounded text-xs">Ctrl+F</kbd> to search within PDF text</li>
                        <li><strong>Download:</strong> Click download button to save PDF to your computer</li>
                        <li><strong>Fullscreen:</strong> Click fullscreen icon for distraction-free reading</li>
                    </ul>
                </div>
            </div>
        </section>

        <!-- Paper Linking & Network -->
        <section id="paper-linking" class="scroll-mt-20">
            <h2 class="text-2xl font-bold text-stone-900 dark:text-white mb-4 flex items-center gap-2">
                <span class="material-symbols-outlined text-primary">hub</span>
                Paper Linking & Network Graph
            </h2>
            <div class="bg-white dark:bg-stone-900 rounded-xl border border-stone-200 dark:border-stone-800 p-6 space-y-6">
                <div>
                    <h3 class="text-lg font-bold text-stone-900 dark:text-white mb-3">Linking Related Papers</h3>
                    <ol class="list-decimal list-inside space-y-2 text-stone-700 dark:text-stone-300 ml-2">
                        <li>Open a paper's detail page</li>
                        <li>Scroll to the "Related Papers" section</li>
                        <li>Click "Link Paper" and start typing a paper title</li>
                        <li>Select from the dropdown to create a link</li>
                        <li>Links are bidirectional - both papers show the relationship</li>
                    </ol>
                    <div class="mt-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg text-sm text-blue-800 dark:text-blue-200">
                        <strong>Use Case:</strong> Link papers that cite each other, papers in the same research area, or papers that build on each other's work.
                    </div>
                </div>

                <div>
                    <h3 class="text-lg font-bold text-stone-900 dark:text-white mb-3">Paper Network Graph</h3>
                    <p class="text-stone-700 dark:text-stone-300 mb-3">
                        Visualize all paper relationships in an interactive network graph:
                    </p>
                    <ul class="space-y-2 text-sm text-stone-700 dark:text-stone-300 ml-4 list-disc">
                        <li><strong>Access:</strong> Click "Paper Network" in the sidebar</li>
                        <li><strong>Nodes:</strong> Each circle represents a paper - size indicates number of connections</li>
                        <li><strong>Edges:</strong> Lines connect related papers</li>
                        <li><strong>Interactions:</strong>
                            <ul class="ml-4 mt-1 space-y-1 list-disc">
                                <li>Click and drag to move nodes</li>
                                <li>Scroll to zoom in/out (or use zoom buttons)</li>
                                <li>Click a node to highlight its connections</li>
                                <li>Double-click a node to open the paper detail page</li>
                            </ul>
                        </li>
                        <li><strong>Filtering:</strong> Use the filter panel to show only papers with specific statuses or tags</li>
                        <li><strong>Layout:</strong> Choose between hierarchical, force-directed, or circular layouts</li>
                    </ul>
                </div>
            </div>
        </section>

        <!-- Citations -->
        <section id="citations" class="scroll-mt-20">
            <h2 class="text-2xl font-bold text-stone-900 dark:text-white mb-4 flex items-center gap-2">
                <span class="material-symbols-outlined text-primary">format_quote</span>
                Citation Export
            </h2>
            <div class="bg-white dark:bg-stone-900 rounded-xl border border-stone-200 dark:border-stone-800 p-6 space-y-6">
                <div>
                    <h3 class="text-lg font-bold text-stone-900 dark:text-white mb-3">Supported Formats</h3>
                    <p class="text-stone-700 dark:text-stone-300 mb-3">
                        citavErs supports 6 major citation styles:
                    </p>
                    <div class="grid md:grid-cols-2 gap-2 text-sm">
                        <div class="p-2 bg-stone-50 dark:bg-stone-800/50 rounded">APA (American Psychological Association)</div>
                        <div class="p-2 bg-stone-50 dark:bg-stone-800/50 rounded">MLA (Modern Language Association)</div>
                        <div class="p-2 bg-stone-50 dark:bg-stone-800/50 rounded">IEEE (Institute of Electrical Engineers)</div>
                        <div class="p-2 bg-stone-50 dark:bg-stone-800/50 rounded">Chicago</div>
                        <div class="p-2 bg-stone-50 dark:bg-stone-800/50 rounded">Harvard</div>
                        <div class="p-2 bg-stone-50 dark:bg-stone-800/50 rounded">Vancouver</div>
                    </div>
                </div>

                <div>
                    <h3 class="text-lg font-bold text-stone-900 dark:text-white mb-3">Exporting Citations</h3>
                    <ol class="list-decimal list-inside space-y-2 text-stone-700 dark:text-stone-300 ml-2">
                        <li>Open a paper's detail page</li>
                        <li>Click the "Cite" button</li>
                        <li>Choose your citation format</li>
                        <li>Select bibliography style (numbered or alphabetical)</li>
                        <li>Click "Copy to Clipboard" or "Download as .txt"</li>
                    </ol>
                    <div class="mt-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg text-sm text-blue-800 dark:text-blue-200">
                        <strong>Batch Export:</strong> Select multiple papers on the dashboard, then use the batch citation export feature to generate a bibliography for all selected papers at once!
                    </div>
                </div>
            </div>
        </section>

        <!-- Keyboard Shortcuts -->
        <section id="keyboard-shortcuts" class="scroll-mt-20">
            <h2 class="text-2xl font-bold text-stone-900 dark:text-white mb-4 flex items-center gap-2">
                <span class="material-symbols-outlined text-primary">keyboard</span>
                Keyboard Shortcuts
            </h2>
            <div class="bg-white dark:bg-stone-900 rounded-xl border border-stone-200 dark:border-stone-800 p-6 space-y-6">
                <p class="text-stone-700 dark:text-stone-300 mb-4">
                    Speed up your workflow with keyboard shortcuts. Press <kbd class="px-1.5 py-0.5 bg-stone-200 dark:bg-stone-700 rounded text-xs">?</kbd> anytime to see this list!
                </p>

                <div>
                    <h3 class="text-lg font-bold text-stone-900 dark:text-white mb-3">Global Shortcuts</h3>
                    <div class="space-y-2">
                        <div class="flex items-center justify-between p-2 bg-stone-50 dark:bg-stone-800/50 rounded">
                            <span class="text-sm text-stone-700 dark:text-stone-300">Open command palette</span>
                            <kbd class="px-2 py-1 text-xs bg-stone-200 dark:bg-stone-700 rounded">Ctrl+K</kbd>
                        </div>
                        <div class="flex items-center justify-between p-2 bg-stone-50 dark:bg-stone-800/50 rounded">
                            <span class="text-sm text-stone-700 dark:text-stone-300">New paper</span>
                            <kbd class="px-2 py-1 text-xs bg-stone-200 dark:bg-stone-700 rounded">N</kbd>
                        </div>
                        <div class="flex items-center justify-between p-2 bg-stone-50 dark:bg-stone-800/50 rounded">
                            <span class="text-sm text-stone-700 dark:text-stone-300">Focus search</span>
                            <kbd class="px-2 py-1 text-xs bg-stone-200 dark:bg-stone-700 rounded">/</kbd>
                        </div>
                        <div class="flex items-center justify-between p-2 bg-stone-50 dark:bg-stone-800/50 rounded">
                            <span class="text-sm text-stone-700 dark:text-stone-300">Go to dashboard</span>
                            <div class="flex gap-1 items-center">
                                <kbd class="px-2 py-1 text-xs bg-stone-200 dark:bg-stone-700 rounded">G</kbd>
                                <span class="text-xs text-stone-500">then</span>
                                <kbd class="px-2 py-1 text-xs bg-stone-200 dark:bg-stone-700 rounded">H</kbd>
                            </div>
                        </div>
                        <div class="flex items-center justify-between p-2 bg-stone-50 dark:bg-stone-800/50 rounded">
                            <span class="text-sm text-stone-700 dark:text-stone-300">Go to settings</span>
                            <div class="flex gap-1 items-center">
                                <kbd class="px-2 py-1 text-xs bg-stone-200 dark:bg-stone-700 rounded">G</kbd>
                                <span class="text-xs text-stone-500">then</span>
                                <kbd class="px-2 py-1 text-xs bg-stone-200 dark:bg-stone-700 rounded">S</kbd>
                            </div>
                        </div>
                        <div class="flex items-center justify-between p-2 bg-stone-50 dark:bg-stone-800/50 rounded">
                            <span class="text-sm text-stone-700 dark:text-stone-300">Show shortcuts help</span>
                            <kbd class="px-2 py-1 text-xs bg-stone-200 dark:bg-stone-700 rounded">?</kbd>
                        </div>
                        <div class="flex items-center justify-between p-2 bg-stone-50 dark:bg-stone-800/50 rounded">
                            <span class="text-sm text-stone-700 dark:text-stone-300">Close / Go back</span>
                            <kbd class="px-2 py-1 text-xs bg-stone-200 dark:bg-stone-700 rounded">Esc</kbd>
                        </div>
                    </div>
                </div>

                <div>
                    <h3 class="text-lg font-bold text-stone-900 dark:text-white mb-3">Dashboard Shortcuts</h3>
                    <div class="space-y-2">
                        <div class="flex items-center justify-between p-2 bg-stone-50 dark:bg-stone-800/50 rounded">
                            <span class="text-sm text-stone-700 dark:text-stone-300">Select all visible papers</span>
                            <kbd class="px-2 py-1 text-xs bg-stone-200 dark:bg-stone-700 rounded">Ctrl+A</kbd>
                        </div>
                        <div class="flex items-center justify-between p-2 bg-stone-50 dark:bg-stone-800/50 rounded">
                            <span class="text-sm text-stone-700 dark:text-stone-300">Clear selection</span>
                            <div class="flex gap-1 items-center">
                                <kbd class="px-2 py-1 text-xs bg-stone-200 dark:bg-stone-700 rounded">Ctrl+D</kbd>
                                <span class="text-xs text-stone-500">or</span>
                                <kbd class="px-2 py-1 text-xs bg-stone-200 dark:bg-stone-700 rounded">Esc</kbd>
                            </div>
                        </div>
                        <div class="flex items-center justify-between p-2 bg-stone-50 dark:bg-stone-800/50 rounded">
                            <span class="text-sm text-stone-700 dark:text-stone-300">Delete selected papers</span>
                            <kbd class="px-2 py-1 text-xs bg-stone-200 dark:bg-stone-700 rounded">Delete</kbd>
                        </div>
                        <div class="flex items-center justify-between p-2 bg-stone-50 dark:bg-stone-800/50 rounded">
                            <span class="text-sm text-stone-700 dark:text-stone-300">Focus Quick Add by DOI</span>
                            <kbd class="px-2 py-1 text-xs bg-stone-200 dark:bg-stone-700 rounded">Ctrl+Shift+D</kbd>
                        </div>
                    </div>
                </div>
            </div>
        </section>

        <!-- Command Palette -->
        <section id="command-palette" class="scroll-mt-20">
            <h2 class="text-2xl font-bold text-stone-900 dark:text-white mb-4 flex items-center gap-2">
                <span class="material-symbols-outlined text-primary">tune</span>
                Command Palette
            </h2>
            <div class="bg-white dark:bg-stone-900 rounded-xl border border-stone-200 dark:border-stone-800 p-6 space-y-6">
                <p class="text-stone-700 dark:text-stone-300">
                    The command palette is your universal search and navigation tool. Press <kbd class="px-1.5 py-0.5 bg-stone-200 dark:bg-stone-700 rounded text-xs">Ctrl+K</kbd> (or <kbd class="px-1.5 py-0.5 bg-stone-200 dark:bg-stone-700 rounded text-xs">Cmd+K</kbd> on Mac) from anywhere to open it.
                </p>

                <div>
                    <h3 class="text-lg font-bold text-stone-900 dark:text-white mb-3">What You Can Do</h3>
                    <ul class="space-y-2 text-sm text-stone-700 dark:text-stone-300 ml-4 list-disc">
                        <li><strong>Search Papers:</strong> Type a paper title to find and open it instantly</li>
                        <li><strong>Navigate:</strong> Jump to dashboard, settings, graph view, or docs</li>
                        <li><strong>Filter by Status:</strong> Type status names (e.g., "reading") to filter papers</li>
                        <li><strong>Filter by Tag:</strong> Type tag names to filter by tags</li>
                        <li><strong>Access Collections:</strong> Type collection names to apply saved filters</li>
                        <li><strong>Quick Actions:</strong> Create new paper, export data, and more</li>
                    </ul>
                </div>

                <div>
                    <h3 class="text-lg font-bold text-stone-900 dark:text-white mb-3">Using the Palette</h3>
                    <ul class="space-y-2 text-sm text-stone-700 dark:text-stone-300 ml-4 list-disc">
                        <li>Start typing to see filtered results</li>
                        <li>Use <kbd class="px-1.5 py-0.5 bg-stone-200 dark:bg-stone-700 rounded text-xs">↑</kbd> and <kbd class="px-1.5 py-0.5 bg-stone-200 dark:bg-stone-700 rounded text-xs">↓</kbd> arrow keys to navigate</li>
                        <li>Press <kbd class="px-1.5 py-0.5 bg-stone-200 dark:bg-stone-700 rounded text-xs">Enter</kbd> to execute the selected action</li>
                        <li>Press <kbd class="px-1.5 py-0.5 bg-stone-200 dark:bg-stone-700 rounded text-xs">Esc</kbd> to close</li>
                        <li>Results are grouped by category for easy navigation</li>
                    </ul>
                </div>
            </div>
        </section>

        <!-- Data Management -->
        <section id="data-management" class="scroll-mt-20">
            <h2 class="text-2xl font-bold text-stone-900 dark:text-white mb-4 flex items-center gap-2">
                <span class="material-symbols-outlined text-primary">storage</span>
                Data Management
            </h2>
            <div class="bg-white dark:bg-stone-900 rounded-xl border border-stone-200 dark:border-stone-800 p-6 space-y-6">
                <div>
                    <h3 class="text-lg font-bold text-stone-900 dark:text-white mb-3">Exporting Your Data</h3>
                    <p class="text-stone-700 dark:text-stone-300 mb-3">
                        Create a complete backup of all your papers, notes, PDFs, and collections:
                    </p>
                    <ol class="list-decimal list-inside space-y-2 text-sm text-stone-700 dark:text-stone-300 ml-2">
                        <li>Go to Settings (gear icon in sidebar)</li>
                        <li>Scroll to "Data Management" section</li>
                        <li>Click "Export Data"</li>
                        <li>A JSON file will download containing all your data</li>
                        <li>Store this file safely - it's your complete backup!</li>
                    </ol>
                    <div class="mt-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg text-sm text-blue-800 dark:text-blue-200">
                        <strong>What's Included:</strong> All paper metadata, notes, tags, statuses, reading progress, paper links, collections, and PDF file references.
                    </div>
                </div>

                <div>
                    <h3 class="text-lg font-bold text-stone-900 dark:text-white mb-3">Importing Data</h3>
                    <p class="text-stone-700 dark:text-stone-300 mb-3">
                        Restore from a backup or import from other tools:
                    </p>
                    <ul class="space-y-2 text-sm text-stone-700 dark:text-stone-300 ml-4 list-disc">
                        <li><strong>From Backup:</strong> Import a previously exported JSON file</li>
                        <li><strong>From Zotero/Mendeley:</strong> Export as RIS (.ris) file, then import in Settings</li>
                        <li><strong>Cloud Restore:</strong> If you have cloud sync enabled, you can clear cloud data before importing to avoid duplicates</li>
                    </ul>
                    <div class="mt-3 p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg text-sm text-yellow-800 dark:text-yellow-200">
                        <strong>⚠️ Warning:</strong> Importing will replace ALL your current data. Always export first to create a backup!
                    </div>
                </div>

                <div>
                    <h3 class="text-lg font-bold text-stone-900 dark:text-white mb-3">Cloud Sync (Optional)</h3>
                    <p class="text-stone-700 dark:text-stone-300 mb-3">
                        Enable cloud sync to access your library from multiple devices:
                    </p>
                    <ol class="list-decimal list-inside space-y-2 text-sm text-stone-700 dark:text-stone-300 ml-2">
                        <li>Create a free account (click "Sign In" in the header)</li>
                        <li>Verify your email address</li>
                        <li>Enable cloud sync in Settings</li>
                        <li>Your data will automatically sync across devices</li>
                    </ol>
                    <div class="mt-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg text-sm text-blue-800 dark:text-blue-200">
                        <strong>Benefits:</strong> Multi-device access, PDF storage, automatic backups, and data recovery.
                    </div>
                </div>
            </div>
        </section>

        <!-- Tips & Tricks -->
        <section id="tips-tricks" class="scroll-mt-20">
            <h2 class="text-2xl font-bold text-stone-900 dark:text-white mb-4 flex items-center gap-2">
                <span class="material-symbols-outlined text-primary">tips_and_updates</span>
                Tips & Tricks
            </h2>
            <div class="bg-white dark:bg-stone-900 rounded-xl border border-stone-200 dark:border-stone-800 p-6 space-y-4">
                <div class="space-y-3">
                    <div class="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                        <div class="font-bold text-blue-900 dark:text-blue-100 mb-1">💡 Organize with Collections</div>
                        <div class="text-sm text-blue-800 dark:text-blue-200">Save frequently used filter combinations as collections. Perfect for organizing papers by project, course, or research area.</div>
                    </div>
                    <div class="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                        <div class="font-bold text-blue-900 dark:text-blue-100 mb-1">💡 Use Tags Strategically</div>
                        <div class="text-sm text-blue-800 dark:text-blue-200">Create a consistent tagging system (e.g., topic tags like "nlp", "cv", "rl" plus project tags like "thesis-2024"). This makes filtering much more powerful.</div>
                    </div>
                    <div class="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                        <div class="font-bold text-blue-900 dark:text-blue-100 mb-1">💡 Link Related Papers</div>
                        <div class="text-sm text-blue-800 dark:text-blue-200">Build a knowledge graph by linking papers. The network view helps you see research connections and find related work.</div>
                    </div>
                    <div class="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                        <div class="font-bold text-blue-900 dark:text-blue-100 mb-1">💡 Search in Notes</div>
                        <div class="text-sm text-blue-800 dark:text-blue-200">Switch to "Notes Only" search mode to find papers by concepts, findings, or ideas you've written about in your notes.</div>
                    </div>
                    <div class="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                        <div class="font-bold text-blue-900 dark:text-blue-100 mb-1">💡 Batch Operations Save Time</div>
                        <div class="text-sm text-blue-800 dark:text-blue-200">When organizing a large library, use batch operations to update status or tags for multiple papers at once.</div>
                    </div>
                    <div class="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                        <div class="font-bold text-blue-900 dark:text-blue-100 mb-1">💡 Regular Backups</div>
                        <div class="text-sm text-blue-800 dark:text-blue-200">Export your data regularly (Settings → Export Data) to keep backups. Your data is stored locally, so backups are essential!</div>
                    </div>
                    <div class="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                        <div class="font-bold text-blue-900 dark:text-blue-100 mb-1">💡 Use Command Palette</div>
                        <div class="text-sm text-blue-800 dark:text-blue-200">Press <kbd class="px-1.5 py-0.5 bg-blue-100 dark:bg-blue-900 rounded text-xs">Ctrl+K</kbd> to quickly find papers, navigate, or apply filters without using the mouse.</div>
                    </div>
                </div>
            </div>
        </section>

        <!-- Troubleshooting -->
        <section id="troubleshooting" class="scroll-mt-20">
            <h2 class="text-2xl font-bold text-stone-900 dark:text-white mb-4 flex items-center gap-2">
                <span class="material-symbols-outlined text-primary">help</span>
                Troubleshooting
            </h2>
            <div class="bg-white dark:bg-stone-900 rounded-xl border border-stone-200 dark:border-stone-800 p-6 space-y-4">
                <div>
                    <h3 class="text-lg font-bold text-stone-900 dark:text-white mb-3">Common Issues</h3>
                    <div class="space-y-4">
                        <div class="p-4 bg-stone-50 dark:bg-stone-800/50 rounded-lg">
                            <div class="font-bold text-stone-900 dark:text-white mb-2">❓ DOI not found</div>
                            <div class="text-sm text-stone-700 dark:text-stone-300">Some DOIs may not be in the database. Try manual entry or check the DOI format. Make sure you're using the correct DOI (e.g., 10.1038/nature12373).</div>
                        </div>
                        <div class="p-4 bg-stone-50 dark:bg-stone-800/50 rounded-lg">
                            <div class="font-bold text-stone-900 dark:text-white mb-2">❓ Data disappeared</div>
                            <div class="text-sm text-stone-700 dark:text-stone-300">If you cleared browser data or are using a different browser, your local data won't be available. Always export backups regularly. If you have cloud sync enabled, your data will be restored automatically.</div>
                        </div>
                        <div class="p-4 bg-stone-50 dark:bg-stone-800/50 rounded-lg">
                            <div class="font-bold text-stone-900 dark:text-white mb-2">❓ PDF won't upload</div>
                            <div class="text-sm text-stone-700 dark:text-stone-300">PDF uploads require cloud sync and an authenticated account. Make sure you're signed in and have verified your email address.</div>
                        </div>
                        <div class="p-4 bg-stone-50 dark:bg-stone-800/50 rounded-lg">
                            <div class="font-bold text-stone-900 dark:text-white mb-2">❓ Search not working</div>
                            <div class="text-sm text-stone-700 dark:text-stone-300">Make sure you're not in an input field. Press <kbd class="px-1.5 py-0.5 bg-stone-200 dark:bg-stone-700 rounded text-xs">Esc</kbd> to exit inputs, then try shortcuts again.</div>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    </div>
</div>
`;
