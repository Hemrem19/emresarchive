export const views = {
    home: `
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
    `,
    add: `
        <div class="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div class="max-w-3xl mx-auto" id="add-edit-paper-view">
                <div class="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-lg p-4 sm:p-6 lg:p-8">
                    <h2 class="text-2xl font-bold mb-6">Add New Paper</h2>
                    <form id="add-paper-form">
                        <div class="grid grid-cols-1 gap-6">
                            <div>
                                <label for="title" class="block text-sm font-medium text-stone-700 dark:text-stone-300">Title</label>
                                <input type="text" name="title" id="title" class="mt-1 block w-full rounded-md border-stone-300 shadow-sm focus:border-primary focus:ring-primary dark:bg-stone-800 dark:border-stone-700 dark:text-white sm:text-sm">
                            </div>
                            <div>
                                <label for="authors" class="block text-sm font-medium text-stone-700 dark:text-stone-300">Authors</label>
                                <input type="text" name="authors" id="authors" class="mt-1 block w-full rounded-md border-stone-300 shadow-sm focus:border-primary focus:ring-primary dark:bg-stone-800 dark:border-stone-700 dark:text-white sm:text-sm">
                                <p class="mt-2 text-sm text-stone-500">Comma-separated list of authors.</p>
                            </div>
                            <details id="advanced-details" class="group">
                                <summary class="list-none flex items-center gap-2 cursor-pointer text-sm font-medium text-stone-600 dark:text-stone-400 hover:text-primary">
                                    <span class="material-symbols-outlined transition-transform group-open:rotate-90">chevron_right</span>
                                    Advanced
                                </summary>
                                <div class="mt-4 grid grid-cols-1 gap-6 border-t border-stone-200 dark:border-stone-800 pt-6">
                                    <div>
                                        <label for="journal" class="block text-sm font-medium text-stone-700 dark:text-stone-300">Journal / Conference</label>
                                        <input type="text" name="journal" id="journal" class="mt-1 block w-full rounded-md border-stone-300 shadow-sm focus:border-primary focus:ring-primary dark:bg-stone-800 dark:border-stone-700 dark:text-white sm:text-sm">
                                    </div>
                                    <div class="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                        <div>
                                            <label for="year" class="block text-sm font-medium text-stone-700 dark:text-stone-300">Publication Year</label>
                                            <input type="number" name="year" id="year" class="mt-1 block w-full rounded-md border-stone-300 shadow-sm focus:border-primary focus:ring-primary dark:bg-stone-800 dark:border-stone-700 dark:text-white sm:text-sm">
                                        </div>
                                        <div>
                                            <label for="doi" class="block text-sm font-medium text-stone-700 dark:text-stone-300">URL or DOI</label>
                                            <div class="mt-1 flex rounded-md shadow-sm">
                                                <input type="text" name="doi" id="doi" class="block w-full flex-1 rounded-none rounded-l-md border-stone-300 focus:border-primary focus:ring-primary dark:bg-stone-800 dark:border-stone-700 dark:text-white sm:text-sm" placeholder="10.1109/...">
                                                <button type="button" id="fetch-doi-btn" class="inline-flex items-center rounded-r-md border border-l-0 border-stone-300 bg-stone-50 px-3 text-sm text-stone-500 hover:bg-stone-100 dark:border-stone-700 dark:bg-stone-700/50 dark:text-stone-300 dark:hover:bg-stone-700">Fetch</button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </details>
                            <div>
                                <label for="tags" class="block text-sm font-medium text-stone-700 dark:text-stone-300">Tags</label>
                                <input type="text" name="tags" id="tags" class="mt-1 block w-full rounded-md border-stone-300 shadow-sm focus:border-primary focus:ring-primary dark:bg-stone-800 dark:border-stone-700 dark:text-white sm:text-sm">
                                <p class="mt-2 text-sm text-stone-500">Comma-separated list of tags.</p>
                                <div id="tag-suggestions" class="mt-2 flex flex-wrap gap-2"></div>
                            </div>
                            <div>
                                <label class="block text-sm font-medium text-stone-700 dark:text-stone-300">PDF File</label>
                                <div id="file-upload-dropzone" class="mt-1 flex justify-center rounded-md border-2 border-dashed border-stone-300 px-6 pt-5 pb-6 dark:border-stone-700 cursor-pointer hover:border-primary hover:bg-primary/5 transition-colors">
                                    <div class="space-y-1 text-center">
                                        <svg class="mx-auto h-12 w-12 text-stone-400" stroke="currentColor" fill="none" viewBox="0 0 48 48" aria-hidden="true">
                                            <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"></path>
                                        </svg>
                                        <div class="flex text-sm text-stone-600 dark:text-stone-400">
                                            <label for="file-upload" class="relative cursor-pointer rounded-md bg-white font-medium text-primary focus-within:outline-none focus-within:ring-2 focus-within:ring-primary focus-within:ring-offset-2 hover:text-primary-dark dark:bg-stone-900">
                                                <span>Upload a file</span>
                                                <input id="file-upload" name="file-upload" type="file" class="sr-only" accept="application/pdf">
                                            </label>
                                            <p class="pl-1">or drag and drop</p>
                                        </div>
                                        <p class="text-xs text-stone-500">PDF up to 10MB</p>
                                    </div>
                                </div>
                                <div id="file-preview" class="hidden mt-2 flex items-center justify-between p-3 bg-stone-100 dark:bg-stone-800/50 rounded-lg">
                                    <div class="flex items-center gap-3">
                                        <span class="material-symbols-outlined text-red-500">picture_as_pdf</span>
                                        <p id="file-name" class="text-sm font-medium text-stone-800 dark:text-stone-200 truncate"></p>
                                    </div>
                                    <button type="button" id="remove-file-btn" class="p-1.5 text-red-500 hover:text-red-700 dark:hover:text-red-400 rounded-full hover:bg-red-100 dark:hover:bg-red-900/50">
                                        <span class="material-symbols-outlined text-xl">delete</span>
                                    </button>
                                </div>
                            </div>
                        </div>
                        <div class="mt-6 flex items-center justify-end gap-x-4">
                            <a href="#/" class="text-sm font-semibold leading-6 text-stone-900 dark:text-white">Cancel</a>
                            <button type="submit" class="rounded-md bg-primary px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-primary/90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary">Save</button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    `,
    details: `
        <div class="flex-grow container mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div id="paper-details-container">
                <!-- Details will be rendered here -->
                <p>Loading paper details...</p>
            </div>
        </div>
    `,
    settings: `
        <div class="flex flex-1 items-start justify-center py-12">
            <div class="w-full max-w-2xl rounded-lg bg-white p-4 sm:p-6 lg:p-8 shadow-sm dark:bg-stone-900/70 dark:ring-1 dark:ring-stone-800">
                <div class="mb-8">
                    <h2 class="text-3xl font-bold text-gray-900 dark:text-white">Settings</h2>
                </div>
                <div class="space-y-10">
                    <section>
                        <div class="grid grid-cols-1 gap-4 md:grid-cols-3 md:gap-8">
                            <div class="md:col-span-1">
                                <h3 class="text-lg font-semibold text-gray-900 dark:text-white">Library Statistics</h3>
                                <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">An overview of your collection.</p>
                            </div>
                            <div class="md:col-span-2" id="stats-container">
                                <dl id="stats-list" class="grid grid-cols-2 gap-4 sm:grid-cols-4">
                                    <!-- Stats will be dynamically rendered here by JavaScript -->
                                </dl>
                            </div>
                        </div>
                    </section>
                    <div class="border-t border-gray-200 dark:border-stone-700/50"></div>
                    <section>
                        <div class="grid grid-cols-1 gap-4 md:grid-cols-3 md:gap-8">
                            <div class="md:col-span-1">
                                <h3 class="text-lg font-semibold text-gray-900 dark:text-white">Documentation</h3>
                                <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">Learn how to use all features of citavErs.</p>
                            </div>
                            <div class="flex items-start md:col-span-2">
                                <a href="#/docs" class="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-primary/90">
                                    <span class="material-symbols-outlined text-base">menu_book</span>
                                    <span>View Documentation</span>
                                </a>
                            </div>
                        </div>
                    </section>
                    <div class="border-t border-gray-200 dark:border-stone-700/50"></div>
                    <section>
                        <div class="grid grid-cols-1 gap-4 md:grid-cols-3 md:gap-8">
                            <div class="md:col-span-1">
                                <h3 class="text-lg font-semibold text-gray-900 dark:text-white">Appearance</h3>
                                <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">Choose between light and dark theme.</p>
                            </div>
                            <div class="flex items-center md:col-span-2">
                                <label for="dark-mode-toggle" class="flex items-center cursor-pointer">
                                    <div class="relative">
                                        <input type="checkbox" id="dark-mode-toggle" class="sr-only peer">
                                        <div class="w-14 h-8 bg-stone-200 rounded-full dark:bg-stone-700 peer-checked:bg-primary"></div>
                                        <div class="absolute top-1 left-1 w-6 h-6 bg-white rounded-full transition-transform transform peer-checked:translate-x-6"></div>
                                    </div>
                                    <span class="ml-3 text-sm font-medium text-stone-700 dark:text-stone-300">Dark Mode</span>
                                </label>
                            </div>
                        </div>
                    </section>
                    <div class="border-t border-gray-200 dark:border-stone-700/50"></div>
                    <section>
                        <div class="grid grid-cols-1 gap-4 md:grid-cols-3 md:gap-8">
                            <div class="md:col-span-1">
                                <h3 class="text-lg font-semibold text-gray-900 dark:text-white">Export Library</h3>
                                <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">Download a single .json backup file of all your paper data, notes, and attached PDFs.</p>
                            </div>
                            <div class="flex items-start md:col-span-2">
                                <button id="export-btn" class="rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-primary/90">Export Data</button>
                            </div>
                        </div>
                    </section>
                    <div class="border-t border-gray-200 dark:border-stone-700/50"></div>
                    <section>
                        <div class="grid grid-cols-1 gap-4 md:grid-cols-3 md:gap-8">
                            <div class="md:col-span-1">
                                <h3 class="text-lg font-semibold text-gray-900 dark:text-white">Reading Statuses</h3>
                                <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">Drag and drop to reorder the reading statuses. This will affect sorting and dropdown lists.</p>
                            </div>
                            <div class="md:col-span-2">
                                <ul id="status-order-list" class="space-y-2">
                                    <!-- Draggable status items will be rendered here -->
                                </ul>
                            </div>
                        </div>
                    </section>
                    <div class="border-t border-gray-200 dark:border-stone-700/50"></div>
                    <section>
                        <div class="grid grid-cols-1 gap-4 md:grid-cols-3 md:gap-8">
                            <div class="md:col-span-1">
                                <h3 class="text-lg font-semibold text-gray-900 dark:text-white">Import Library</h3>
                                <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">Restore your library from a backup file. <strong class="font-semibold text-yellow-600 dark:text-yellow-500">Warning: This will replace all current data.</strong></p>
                            </div>
                            <div class="flex items-start md:col-span-2">
                                <button id="import-btn" class="rounded-lg border border-gray-300 bg-white px-5 py-2.5 text-sm font-semibold text-gray-900 shadow-sm hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-white dark:hover:bg-gray-700">Import from File</button>
                                <input type="file" id="import-file-input" class="hidden" accept=".json">
                            </div>
                        </div>
                    </section>
                    <div class="border-t border-gray-200 dark:border-stone-700/50"></div>
                    <section>
                        <div class="bg-primary/5 dark:bg-primary/10 p-6 rounded-lg border border-primary/20">
                            <div class="grid grid-cols-1 gap-4 md:grid-cols-3 md:gap-8">
                                <div class="md:col-span-1">
                                    <h3 class="text-lg font-semibold text-gray-900 dark:text-white">Migrate Your Library</h3>
                                    <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">Coming from Zotero or Mendeley? Import your library in minutes by uploading a RIS file. This will add new papers without replacing your existing data.</p>
                                </div>
                                <div class="flex items-center justify-center md:col-span-2">
                                    <button id="import-zotero-btn" class="w-full md:w-auto rounded-lg bg-primary px-6 py-3 text-base font-semibold text-white shadow-sm transition-all hover:bg-primary/90 flex items-center justify-center gap-2">
                                        <span class="material-symbols-outlined text-xl">move_up</span>
                                        <span>Import from Zotero/Mendeley</span>
                                    </button>
                                    <input type="file" id="import-ris-file-input" class="hidden" accept=".ris,.txt">
                                </div>
                            </div>
                        </div>
                    </section>
                    <div class="border-t border-gray-200 dark:border-stone-700/50"></div>
                    <section>
                        <div class="grid grid-cols-1 gap-4 md:grid-cols-3 md:gap-8">
                            <div class="md:col-span-1">
                                <h3 class="text-lg font-semibold text-gray-900 dark:text-white">Import Settings</h3>
                                <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">Manage preferences for importing data from other sources.</p>
                            </div>
                            <div class="flex items-start md:col-span-2">
                                <button id="reset-import-preference-btn" class="rounded-lg border border-gray-300 bg-white px-5 py-2.5 text-sm font-semibold text-gray-900 shadow-sm hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-white dark:hover:bg-gray-700">
                                    Reset Duplicate Handling Preference
                                </button>
                            </div>
                        </div>
                    </section>
                    <div class="border-t border-gray-200 dark:border-stone-700/50"></div>
                    <section id="email-verification-section" class="hidden">
                        <div class="grid grid-cols-1 gap-4 md:grid-cols-3 md:gap-8">
                            <div class="md:col-span-1">
                                <h3 class="text-lg font-semibold text-yellow-600 dark:text-yellow-500">Email Verification</h3>
                                <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">Please verify your email address to complete your account setup.</p>
                            </div>
                            <div class="flex items-start md:col-span-2">
                                <button id="resend-verification-settings-btn" class="rounded-lg bg-yellow-500 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-yellow-600 flex items-center gap-2">
                                    <span class="material-symbols-outlined text-base">mail</span>
                                    <span>Resend Verification Email</span>
                                </button>
                            </div>
                        </div>
                    </section>
                    <div class="border-t border-gray-200 dark:border-stone-700/50"></div>
                    <section>
                        <div class="grid grid-cols-1 gap-4 md:grid-cols-3 md:gap-8">
                            <div class="md:col-span-1">
                                <h3 class="text-lg font-semibold text-gray-900 dark:text-white">Cloud Sync</h3>
                                <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">Enable cloud sync to access your papers from any device. Data is stored securely in the cloud.</p>
                            </div>
                            <div class="flex flex-col gap-4 md:col-span-2">
                                <div id="cloud-sync-container" class="flex flex-col gap-2">
                                    <label for="cloud-sync-toggle" class="flex items-center cursor-pointer">
                                        <div class="relative">
                                            <input type="checkbox" id="cloud-sync-toggle" class="sr-only peer">
                                            <div class="w-14 h-8 bg-stone-200 rounded-full dark:bg-stone-700 peer-checked:bg-primary"></div>
                                            <div class="absolute top-1 left-1 w-6 h-6 bg-white rounded-full transition-transform transform peer-checked:translate-x-6"></div>
                                        </div>
                                        <span class="ml-3 text-sm font-medium text-stone-700 dark:text-stone-300">Enable Cloud Sync</span>
                                    </label>
                                    <p id="cloud-sync-status" class="text-xs text-gray-500 dark:text-gray-400 ml-20"></p>
                                </div>
                                <div id="sync-controls-container" class="hidden flex flex-col gap-2">
                                    <div class="flex items-center gap-3">
                                        <button id="sync-now-btn" class="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white shadow-sm transition-all hover:bg-primary/90 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed">
                                            <span class="material-symbols-outlined text-base">sync</span>
                                            <span>Sync Now</span>
                                        </button>
                                        <div id="sync-status-display" class="text-xs text-gray-600 dark:text-gray-400"></div>
                                    </div>
                                    <div id="pending-changes-display" class="text-xs text-gray-500 dark:text-gray-400"></div>
                                </div>
                            </div>
                        </div>
                    </section>
                    <div class="border-t border-red-500/30 dark:border-red-500/20"></div>
                    <section>
                        <div class="grid grid-cols-1 gap-4 md:grid-cols-3 md:gap-8">
                            <div class="md:col-span-1">
                                <h3 class="text-lg font-semibold text-red-500">Danger Zone</h3>
                                <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">This action is permanent and cannot be undone. Please export your data first if you want to keep a backup.</p>
                            </div>
                            <div class="flex items-start md:col-span-2">
                                <button id="clear-data-btn" class="rounded-lg border border-red-500 bg-red-500/10 px-5 py-2.5 text-sm font-semibold text-red-600 shadow-sm hover:bg-red-500/20 dark:border-red-500/50 dark:bg-red-500/10 dark:text-red-400 dark:hover:bg-red-500/20">
                                    Clear All Data
                                </button>
                            </div>
                        </div>
                    </section>
                </div>
            </div>
        </div>
    `,
    linkModal: `
        <div id="link-modal" class="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 hidden">
            <div class="bg-white dark:bg-stone-900 rounded-lg shadow-xl w-full max-w-2xl max-h-[80vh] flex flex-col">
                <div class="p-4 border-b dark:border-stone-800">
                    <h3 class="text-lg font-bold">Link to Another Paper</h3>
                </div>
                <div class="p-4">
                    <input type="text" id="link-search-input" class="w-full h-10 pl-4 pr-4 bg-white dark:bg-stone-800 border border-stone-300 dark:border-stone-700 rounded-lg focus:ring-primary focus:border-primary" placeholder="Search for a paper to link...">
                </div>
                <div id="link-modal-list" class="p-4 pt-0 overflow-y-auto space-y-2 flex-grow">
                    <!-- Paper list will be rendered here -->
                </div>
                <div class="p-4 bg-stone-50 dark:bg-stone-900/50 border-t dark:border-stone-800 flex justify-end gap-2 flex-shrink-0">
                    <button id="close-link-modal-btn" class="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-900 shadow-sm hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-white dark:hover:bg-gray-700">Cancel</button>
                </div>
            </div>
        </div>`
    ,
    citationModal: `
        <div id="citation-modal" class="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 hidden">
            <div class="bg-white dark:bg-stone-900 rounded-lg shadow-xl w-full max-w-2xl max-h-[80vh] flex flex-col">
                <div class="p-4 border-b dark:border-stone-800 flex justify-between items-center">
                    <h3 class="text-lg font-bold">Generate Citation</h3>
                    <button id="close-citation-modal-btn" class="p-1.5 rounded-full hover:bg-stone-100 dark:hover:bg-stone-800">
                        <span class="material-symbols-outlined">close</span>
                    </button>
                </div>
                <div id="citation-modal-content" class="p-6 overflow-y-auto space-y-6 flex-grow">
                    <!-- Citations will be rendered here -->
                </div>
                <div class="p-4 bg-stone-50 dark:bg-stone-900/50 border-t dark:border-stone-800 flex justify-end gap-2 flex-shrink-0">
                    <button id="citation-modal-done-btn" class="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-primary/90">Done</button>
                </div>
            </div>
        </div>`,
    bibliographyExportModal: `
        <div id="bibliography-export-modal" class="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 hidden">
            <div class="bg-white dark:bg-stone-900 rounded-lg shadow-xl w-full max-w-3xl max-h-[85vh] flex flex-col">
                <div class="p-4 border-b dark:border-stone-800 flex justify-between items-center">
                    <h3 class="text-lg font-bold">Export Bibliography</h3>
                    <button id="close-bibliography-modal-btn" class="p-1.5 rounded-full hover:bg-stone-100 dark:hover:bg-stone-800">
                        <span class="material-symbols-outlined">close</span>
                    </button>
                </div>
                <div class="p-6 overflow-y-auto flex-grow space-y-4">
                    <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label for="bibliography-format-select" class="block text-sm font-medium text-stone-700 dark:text-stone-300 mb-2">Citation Format:</label>
                            <select id="bibliography-format-select" class="w-full h-10 bg-white dark:bg-stone-800 border border-stone-300 dark:border-stone-700 rounded-md focus:ring-primary focus:border-primary text-sm text-stone-900 dark:text-stone-100">
                                <option value="apa">APA</option>
                                <option value="ieee">IEEE</option>
                                <option value="mla">MLA</option>
                                <option value="chicago">Chicago</option>
                                <option value="harvard">Harvard</option>
                                <option value="vancouver">Vancouver</option>
                            </select>
                        </div>
                        <div>
                            <label for="bibliography-style-select" class="block text-sm font-medium text-stone-700 dark:text-stone-300 mb-2">Bibliography Style:</label>
                            <select id="bibliography-style-select" class="w-full h-10 bg-white dark:bg-stone-800 border border-stone-300 dark:border-stone-700 rounded-md focus:ring-primary focus:border-primary text-sm text-stone-900 dark:text-stone-100">
                                <option value="numbered">Numbered (1, 2, 3...)</option>
                                <option value="alphabetical">Alphabetical (A, B, C...)</option>
                            </select>
                        </div>
                    </div>
                    <div id="bibliography-preview-container" class="mt-4">
                        <label class="block text-sm font-medium text-stone-700 dark:text-stone-300 mb-2">Preview:</label>
                        <div id="bibliography-preview" class="p-4 bg-stone-50 dark:bg-stone-800/50 border border-stone-200 dark:border-stone-700 rounded-md max-h-[300px] overflow-y-auto font-mono text-sm text-stone-700 dark:text-stone-300 whitespace-pre-wrap">
                            <!-- Preview will be rendered here -->
                        </div>
                    </div>
                </div>
                <div class="p-4 bg-stone-50 dark:bg-stone-900/50 border-t dark:border-stone-800 flex justify-end gap-2 flex-shrink-0">
                    <button id="bibliography-copy-btn" class="rounded-lg bg-stone-200 dark:bg-stone-700 px-4 py-2 text-sm font-semibold text-stone-900 dark:text-stone-100 shadow-sm hover:bg-stone-300 dark:hover:bg-stone-600 transition-colors flex items-center gap-2">
                        <span class="material-symbols-outlined text-sm">content_copy</span>
                        Copy to Clipboard
                    </button>
                    <button id="bibliography-download-btn" class="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-primary/90 transition-colors flex items-center gap-2">
                        <span class="material-symbols-outlined text-sm">download</span>
                        Download File
                    </button>
                </div>
            </div>
        </div>`,

    // Command Palette Modal (Global - shown via Ctrl+K / Cmd+K)
    commandPalette: `
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
        </div>`,
    
    graph: `
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
                            <option value="Reading">Reading</option>
                            <option value="To Read">To Read</option>
                            <option value="Finished">Finished</option>
                        </select>
                        
                        <!-- Tag Filter -->
                        <select id="graph-tag-filter" class="h-10 pl-3 pr-8 bg-white dark:bg-stone-800 border border-stone-300 dark:border-stone-700 rounded-lg focus:ring-primary focus:border-primary text-sm">
                            <option value="">All Tags</option>
                            <!-- Tags will be populated dynamically -->
                        </select>
                        
                        <!-- Reset Button -->
                        <button id="graph-reset-btn" class="h-10 px-4 bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 text-stone-700 dark:text-stone-300 rounded-lg transition-colors flex items-center gap-2 text-sm font-medium">
                            <span class="material-symbols-outlined text-lg">refresh</span>
                            <span class="hidden sm:inline">Reset View</span>
                        </button>
                    </div>
                </div>
                
                <!-- Stats Bar -->
                <div class="mt-4 flex flex-wrap items-center gap-4 text-sm text-stone-600 dark:text-stone-400">
                    <div class="flex items-center gap-2">
                        <span class="material-symbols-outlined text-primary">article</span>
                        <span><span id="graph-node-count" class="font-semibold text-stone-900 dark:text-white">0</span> papers</span>
                    </div>
                    <div class="flex items-center gap-2">
                        <span class="material-symbols-outlined text-primary">link</span>
                        <span><span id="graph-edge-count" class="font-semibold text-stone-900 dark:text-white">0</span> connections</span>
                    </div>
                    <div class="flex items-center gap-2">
                        <span class="material-symbols-outlined text-primary">visibility</span>
                        <span><span id="graph-visible-count" class="font-semibold text-stone-900 dark:text-white">0</span> visible</span>
                    </div>
                </div>
            </div>
            
            <!-- Graph Container -->
            <div class="flex-grow relative bg-stone-50 dark:bg-stone-900/50">
                <!-- Graph Canvas -->
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
    `,
    
    // Authentication Modal
    authModal: `
        <div id="auth-modal" class="fixed inset-0 z-50 hidden flex items-center justify-center p-4">
            <!-- Overlay -->
            <div id="auth-modal-overlay" class="fixed inset-0 bg-black/50 backdrop-blur-sm"></div>
            
            <!-- Modal -->
            <div class="relative bg-white dark:bg-stone-900 rounded-xl shadow-2xl border border-stone-200 dark:border-stone-800 w-full max-w-md p-6 z-10">
                <!-- Header -->
                <div class="flex items-center justify-between mb-6">
                    <h2 id="auth-modal-title" class="text-2xl font-bold text-stone-900 dark:text-white">Login</h2>
                    <button id="auth-modal-close" class="p-2 hover:bg-stone-100 dark:hover:bg-stone-800 rounded-lg transition-colors">
                        <span class="material-symbols-outlined text-stone-500 dark:text-stone-400">close</span>
                    </button>
                </div>
                
                <!-- Tabs (Login / Register) -->
                <div class="flex gap-2 mb-6 border-b border-stone-200 dark:border-stone-800">
                    <button id="auth-tab-login" class="px-4 py-2 text-sm font-medium text-primary border-b-2 border-primary transition-colors">
                        Login
                    </button>
                    <button id="auth-tab-register" class="px-4 py-2 text-sm font-medium text-stone-500 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-100 border-b-2 border-transparent transition-colors">
                        Register
                    </button>
                </div>
                
                <!-- Error Message -->
                <div id="auth-error" class="hidden mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                    <p id="auth-error-message" class="text-sm text-red-700 dark:text-red-400"></p>
                </div>
                
                <!-- Success Message -->
                <div id="auth-success" class="hidden mb-4 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                    <p id="auth-success-message" class="text-sm text-green-700 dark:text-green-400"></p>
                </div>
                
                <!-- Login Form -->
                <form id="auth-login-form" class="space-y-4">
                    <div>
                        <label for="auth-login-email" class="block text-sm font-medium text-stone-700 dark:text-stone-300 mb-1">Email</label>
                        <input type="email" id="auth-login-email" required 
                            class="w-full px-3 py-2 border border-stone-300 dark:border-stone-700 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary dark:bg-stone-800 dark:text-white">
                    </div>
                    <div>
                        <label for="auth-login-password" class="block text-sm font-medium text-stone-700 dark:text-stone-300 mb-1">Password</label>
                        <input type="password" id="auth-login-password" required 
                            class="w-full px-3 py-2 border border-stone-300 dark:border-stone-700 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary dark:bg-stone-800 dark:text-white">
                    </div>
                    <button type="submit" 
                        class="w-full bg-primary text-white py-2 rounded-lg font-semibold hover:bg-primary/90 transition-colors flex items-center justify-center gap-2">
                        <span id="auth-login-loading" class="hidden material-symbols-outlined animate-spin">refresh</span>
                        <span>Login</span>
                    </button>
                </form>
                
                <!-- Register Form -->
                <form id="auth-register-form" class="space-y-4 hidden">
                    <div>
                        <label for="auth-register-name" class="block text-sm font-medium text-stone-700 dark:text-stone-300 mb-1">Name</label>
                        <input type="text" id="auth-register-name" required 
                            class="w-full px-3 py-2 border border-stone-300 dark:border-stone-700 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary dark:bg-stone-800 dark:text-white">
                    </div>
                    <div>
                        <label for="auth-register-email" class="block text-sm font-medium text-stone-700 dark:text-stone-300 mb-1">Email</label>
                        <input type="email" id="auth-register-email" required 
                            class="w-full px-3 py-2 border border-stone-300 dark:border-stone-700 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary dark:bg-stone-800 dark:text-white">
                    </div>
                    <div>
                        <label for="auth-register-password" class="block text-sm font-medium text-stone-700 dark:text-stone-300 mb-1">Password</label>
                        <input type="password" id="auth-register-password" required minlength="8"
                            class="w-full px-3 py-2 border border-stone-300 dark:border-stone-700 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary dark:bg-stone-800 dark:text-white">
                        <p class="mt-1 text-xs text-stone-500 dark:text-stone-400">Minimum 8 characters</p>
                    </div>
                    <button type="submit" 
                        class="w-full bg-primary text-white py-2 rounded-lg font-semibold hover:bg-primary/90 transition-colors flex items-center justify-center gap-2">
                        <span id="auth-register-loading" class="hidden material-symbols-outlined animate-spin">refresh</span>
                        <span>Register</span>
                    </button>
                </form>
            </div>
        </div>
    `,
    docs: `
        <div class="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div class="max-w-4xl mx-auto">
                <!-- Header -->
                <div class="text-center mb-12">
                    <h1 class="text-4xl font-bold text-stone-900 dark:text-white mb-4">Welcome to citavErs</h1>
                    <p class="text-lg text-stone-600 dark:text-stone-400">Your comprehensive guide to managing research papers</p>
                </div>

                <!-- Quick Start -->
                <section id="section-quick-start" class="mb-12">
                    <div class="bg-gradient-to-r from-primary/10 to-primary/5 dark:from-primary/20 dark:to-primary/10 rounded-lg p-6 mb-8 border border-primary/20">
                        <h2 class="text-2xl font-bold text-stone-900 dark:text-white mb-4 flex items-center gap-2">
                            <span class="material-symbols-outlined text-primary">rocket_launch</span>
                            Quick Start
                        </h2>
                        <ol class="space-y-3 text-stone-700 dark:text-stone-300">
                            <li class="flex items-start gap-3">
                                <span class="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-white flex items-center justify-center text-sm font-bold">1</span>
                                <span>Add your first paper using the <strong>"Add Paper"</strong> button or use <strong>"Quick Add by DOI"</strong> on the dashboard</span>
                            </li>
                            <li class="flex items-start gap-3">
                                <span class="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-white flex items-center justify-center text-sm font-bold">2</span>
                                <span>Organize papers with <strong>tags</strong> and set their <strong>reading status</strong></span>
                            </li>
                            <li class="flex items-start gap-3">
                                <span class="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-white flex items-center justify-center text-sm font-bold">3</span>
                                <span>Click on any paper to view details, read PDFs, and take notes</span>
                            </li>
                            <li class="flex items-start gap-3">
                                <span class="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-white flex items-center justify-center text-sm font-bold">4</span>
                                <span>Use <strong>collections</strong> to save your favorite filter combinations</span>
                            </li>
                        </ol>
                    </div>
                </section>

                <!-- Core Features -->
                <section id="section-core-features" class="mb-12">
                    <h2 class="text-3xl font-bold text-stone-900 dark:text-white mb-6 flex items-center gap-2">
                        <span class="material-symbols-outlined text-primary">star</span>
                        Core Features
                    </h2>
                    <div class="space-y-8">
                        <div class="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-lg p-6">
                            <h3 class="text-xl font-semibold text-stone-900 dark:text-white mb-3 flex items-center gap-2">
                                <span class="material-symbols-outlined text-primary">library_books</span>
                                Paper Management
                            </h3>
                            <p class="text-stone-600 dark:text-stone-400 mb-4">Add, organize, and manage your research papers with ease.</p>
                            <ul class="space-y-2 text-stone-700 dark:text-stone-300 ml-6 list-disc">
                                <li><strong>Add Papers:</strong> Manually enter details or use Quick Add by DOI to fetch metadata automatically</li>
                                <li><strong>Edit Papers:</strong> Update any paper's information at any time</li>
                                <li><strong>Upload PDFs:</strong> Attach PDF files to papers for easy access</li>
                                <li><strong>Link Papers:</strong> Connect related papers together to track research relationships</li>
                                <li><strong>Reading Status:</strong> Track progress with statuses like "To Read", "Reading", "Finished", "Archived"</li>
                            </ul>
                        </div>

                        <div class="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-lg p-6">
                            <h3 class="text-xl font-semibold text-stone-900 dark:text-white mb-3 flex items-center gap-2">
                                <span class="material-symbols-outlined text-primary">search</span>
                                Powerful Search & Filtering
                            </h3>
                            <p class="text-stone-600 dark:text-stone-400 mb-4">Find papers quickly with advanced search and filtering options.</p>
                            <ul class="space-y-2 text-stone-700 dark:text-stone-300 ml-6 list-disc">
                                <li><strong>Full-Text Search:</strong> Search across titles, authors, and notes</li>
                                <li><strong>Notes-Only Search:</strong> Switch to "Notes Only" mode to search only in paper notes</li>
                                <li><strong>Exact Phrase Search:</strong> Use double quotes (e.g., "machine learning") for exact matches</li>
                                <li><strong>Status Filters:</strong> Filter papers by reading status</li>
                                <li><strong>Tag Filters:</strong> Select multiple tags to find papers matching all selected tags</li>
                                <li><strong>Advanced Filtering:</strong> Combine status and tag filters for precise results</li>
                            </ul>
                        </div>

                        <div class="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-lg p-6">
                            <h3 class="text-xl font-semibold text-stone-900 dark:text-white mb-3 flex items-center gap-2">
                                <span class="material-symbols-outlined text-primary">label</span>
                                Tags & Organization
                            </h3>
                            <p class="text-stone-600 dark:text-stone-400 mb-4">Organize your papers with custom tags and collections.</p>
                            <ul class="space-y-2 text-stone-700 dark:text-stone-300 ml-6 list-disc">
                                <li><strong>Custom Tags:</strong> Add any number of tags to categorize papers (e.g., "machine-learning", "neuroscience", "2024")</li>
                                <li><strong>Smart Tag Suggestions:</strong> Get automatic tag suggestions based on paper titles</li>
                                <li><strong>Tag Filtering:</strong> Click tags in the sidebar to filter papers by that tag</li>
                                <li><strong>Collections:</strong> Save filter combinations as collections for quick access</li>
                                <li><strong>Sidebar Tags:</strong> Quickly see all your tags and filter counts</li>
                            </ul>
                        </div>

                        <div class="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-lg p-6">
                            <h3 class="text-xl font-semibold text-stone-900 dark:text-white mb-3 flex items-center gap-2">
                                <span class="material-symbols-outlined text-primary">description</span>
                                Rich Notes & Annotations
                            </h3>
                            <p class="text-stone-600 dark:text-stone-400 mb-4">Take detailed notes with rich text formatting support.</p>
                            <ul class="space-y-2 text-stone-700 dark:text-stone-300 ml-6 list-disc">
                                <li><strong>Rich Text Editor:</strong> Format notes with bold, italic, lists, and more</li>
                                <li><strong>Auto-Save:</strong> Notes are automatically saved as you type</li>
                                <li><strong>Note Search:</strong> Search specifically within notes using "Notes Only" mode</li>
                                <li><strong>Note Snippets:</strong> See note previews in search results when matches are found</li>
                            </ul>
                        </div>

                        <div class="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-lg p-6">
                            <h3 class="text-xl font-semibold text-stone-900 dark:text-white mb-3 flex items-center gap-2">
                                <span class="material-symbols-outlined text-primary">picture_as_pdf</span>
                                PDF Viewer
                            </h3>
                            <p class="text-stone-600 dark:text-stone-400 mb-4">View PDFs directly in the browser with professional tools.</p>
                            <ul class="space-y-2 text-stone-700 dark:text-stone-300 ml-6 list-disc">
                                <li><strong>Built-in Viewer:</strong> View PDFs without leaving the app</li>
                                <li><strong>Search in PDF:</strong> Search for text within PDF documents with highlighting</li>
                                <li><strong>Zoom Controls:</strong> Zoom from 25% to 300% with crisp rendering</li>
                                <li><strong>Page Navigation:</strong> Jump to any page or navigate page by page</li>
                                <li><strong>Rotation:</strong> Rotate PDF pages in 90° increments</li>
                                <li><strong>Fullscreen Mode:</strong> Full-screen PDF viewing for focused reading</li>
                            </ul>
                        </div>

                        <div class="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-lg p-6">
                            <h3 class="text-xl font-semibold text-stone-900 dark:text-white mb-3 flex items-center gap-2">
                                <span class="material-symbols-outlined text-primary">device_hub</span>
                                Paper Network Graph
                            </h3>
                            <p class="text-stone-600 dark:text-stone-400 mb-4">Visualize relationships between your papers with an interactive network graph.</p>
                            <ul class="space-y-2 text-stone-700 dark:text-stone-300 ml-6 list-disc">
                                <li><strong>Interactive Graph:</strong> See all papers and their connections visually</li>
                                <li><strong>Color Coding:</strong> Papers are color-coded by reading status</li>
                                <li><strong>Filters:</strong> Filter the graph by status, tags, or search terms</li>
                                <li><strong>Navigation:</strong> Click any node to view that paper's details</li>
                                <li><strong>Hover Tooltips:</strong> See paper information on hover</li>
                            </ul>
                        </div>

                        <div class="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-lg p-6">
                            <h3 class="text-xl font-semibold text-stone-900 dark:text-white mb-3 flex items-center gap-2">
                                <span class="material-symbols-outlined text-primary">format_list_bulleted</span>
                                Batch Operations
                            </h3>
                            <p class="text-stone-600 dark:text-stone-400 mb-4">Manage multiple papers at once with batch operations.</p>
                            <ul class="space-y-2 text-stone-700 dark:text-stone-300 ml-6 list-disc">
                                <li><strong>Select Papers:</strong> Use checkboxes to select multiple papers</li>
                                <li><strong>Select All:</strong> Quickly select all visible papers</li>
                                <li><strong>Batch Status Change:</strong> Change reading status for multiple papers at once</li>
                                <li><strong>Batch Tag Management:</strong> Add or remove tags from multiple papers</li>
                                <li><strong>Batch Delete:</strong> Delete multiple papers with confirmation</li>
                                <li><strong>Batch Export Bibliography:</strong> Export citations for selected papers in various formats</li>
                            </ul>
                        </div>

                        <div class="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-lg p-6">
                            <h3 class="text-xl font-semibold text-stone-900 dark:text-white mb-3 flex items-center gap-2">
                                <span class="material-symbols-outlined text-primary">sort</span>
                                Sorting & Pagination
                            </h3>
                            <p class="text-stone-600 dark:text-stone-400 mb-4">Organize and navigate large paper collections efficiently.</p>
                            <ul class="space-y-2 text-stone-700 dark:text-stone-300 ml-6 list-disc">
                                <li><strong>Multiple Sort Options:</strong> Sort by date added, last updated, title, year, status, or reading progress</li>
                                <li><strong>Pagination:</strong> View papers in pages (10, 25, 50, or 100 per page)</li>
                                <li><strong>Smart Pagination:</strong> Automatically resets to page 1 when filters change</li>
                                <li><strong>Reading Progress Sorting:</strong> Sort papers by how much you've read</li>
                            </ul>
                        </div>
                    </div>
                </section>

                <!-- Advanced Features -->
                <section id="section-advanced-features" class="mb-12">
                    <h2 class="text-3xl font-bold text-stone-900 dark:text-white mb-6 flex items-center gap-2">
                        <span class="material-symbols-outlined text-primary">auto_awesome</span>
                        Advanced Features
                    </h2>
                    <div class="space-y-8">
                        <div class="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-lg p-6">
                            <h3 class="text-xl font-semibold text-stone-900 dark:text-white mb-3 flex items-center gap-2">
                                <span class="material-symbols-outlined text-primary">keyboard</span>
                                Keyboard Shortcuts
                            </h3>
                            <p class="text-stone-600 dark:text-stone-400 mb-4">Speed up your workflow with keyboard shortcuts.</p>
                            <div class="grid grid-cols-1 md:grid-cols-2 gap-4 text-stone-700 dark:text-stone-300">
                                <div>
                                    <p class="font-semibold mb-2">Global Shortcuts</p>
                                    <ul class="space-y-1 ml-4 list-disc text-sm">
                                        <li><kbd class="px-2 py-1 bg-stone-100 dark:bg-stone-800 rounded">n</kbd> - New Paper</li>
                                        <li><kbd class="px-2 py-1 bg-stone-100 dark:bg-stone-800 rounded">/</kbd> - Focus Search</li>
                                        <li><kbd class="px-2 py-1 bg-stone-100 dark:bg-stone-800 rounded">?</kbd> - Show Shortcuts</li>
                                        <li><kbd class="px-2 py-1 bg-stone-100 dark:bg-stone-800 rounded">g</kbd> <kbd class="px-2 py-1 bg-stone-100 dark:bg-stone-800 rounded">h</kbd> - Go Home</li>
                                        <li><kbd class="px-2 py-1 bg-stone-100 dark:bg-stone-800 rounded">g</kbd> <kbd class="px-2 py-1 bg-stone-100 dark:bg-stone-800 rounded">s</kbd> - Go Settings</li>
                                    </ul>
                                </div>
                                <div>
                                    <p class="font-semibold mb-2">Dashboard Shortcuts</p>
                                    <ul class="space-y-1 ml-4 list-disc text-sm">
                                        <li><kbd class="px-2 py-1 bg-stone-100 dark:bg-stone-800 rounded">Ctrl</kbd> + <kbd class="px-2 py-1 bg-stone-100 dark:bg-stone-800 rounded">A</kbd> - Select All</li>
                                        <li><kbd class="px-2 py-1 bg-stone-100 dark:bg-stone-800 rounded">Ctrl</kbd> + <kbd class="px-2 py-1 bg-stone-100 dark:bg-stone-800 rounded">D</kbd> - Clear Selection</li>
                                        <li><kbd class="px-2 py-1 bg-stone-100 dark:bg-stone-800 rounded">Delete</kbd> - Delete Selected</li>
                                        <li><kbd class="px-2 py-1 bg-stone-100 dark:bg-stone-800 rounded">Esc</kbd> - Clear Selection</li>
                                    </ul>
                                </div>
                            </div>
                        </div>

                        <div class="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-lg p-6">
                            <h3 class="text-xl font-semibold text-stone-900 dark:text-white mb-3 flex items-center gap-2">
                                <span class="material-symbols-outlined text-primary">flash_on</span>
                                Command Palette
                            </h3>
                            <p class="text-stone-600 dark:text-stone-400 mb-4">Quickly navigate and perform actions using the command palette.</p>
                            <ul class="space-y-2 text-stone-700 dark:text-stone-300 ml-6 list-disc">
                                <li>Press <kbd class="px-2 py-1 bg-stone-100 dark:bg-stone-800 rounded">Ctrl+K</kbd> (or <kbd class="px-2 py-1 bg-stone-100 dark:bg-stone-800 rounded">Cmd+K</kbd> on Mac) to open</li>
                                <li>Search for papers, tags, collections, or actions</li>
                                <li>Use arrow keys to navigate, Enter to execute</li>
                                <li>Works from anywhere in the app</li>
                            </ul>
                        </div>

                        <div class="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-lg p-6">
                            <h3 class="text-xl font-semibold text-stone-900 dark:text-white mb-3 flex items-center gap-2">
                                <span class="material-symbols-outlined text-primary">bookmark</span>
                                Collections
                            </h3>
                            <p class="text-stone-600 dark:text-stone-400 mb-4">Save and restore filter combinations for quick access.</p>
                            <ul class="space-y-2 text-stone-700 dark:text-stone-300 ml-6 list-disc">
                                <li><strong>Save Collections:</strong> Apply filters (status, tags, search), then click "Save Collection"</li>
                                <li><strong>Quick Access:</strong> Click any collection in the sidebar to instantly apply those filters</li>
                                <li><strong>Edit Collections:</strong> Rename or delete collections from the sidebar</li>
                                <li><strong>Custom Icons:</strong> Each collection can have a custom icon and color</li>
                            </ul>
                        </div>

                        <div class="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-lg p-6">
                            <h3 class="text-xl font-semibold text-stone-900 dark:text-white mb-3 flex items-center gap-2">
                                <span class="material-symbols-outlined text-primary">track_changes</span>
                                Reading Progress
                            </h3>
                            <p class="text-stone-600 dark:text-stone-400 mb-4">Track your progress through long papers.</p>
                            <ul class="space-y-2 text-stone-700 dark:text-stone-300 ml-6 list-disc">
                                <li>Set current page and total pages for papers with "Reading" status</li>
                                <li>See progress bars on paper cards and details view</li>
                                <li>Sort papers by reading progress to find nearly-finished papers</li>
                                <li>Progress automatically calculates percentage</li>
                            </ul>
                        </div>

                        <div class="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-lg p-6">
                            <h3 class="text-xl font-semibold text-stone-900 dark:text-white mb-3 flex items-center gap-2">
                                <span class="material-symbols-outlined text-primary">description</span>
                                Citation Export
                            </h3>
                            <p class="text-stone-600 dark:text-stone-400 mb-4">Export bibliographies in multiple citation formats.</p>
                            <ul class="space-y-2 text-stone-700 dark:text-stone-300 ml-6 list-disc">
                                <li><strong>6 Citation Formats:</strong> APA, IEEE, MLA, Chicago, Harvard, Vancouver</li>
                                <li><strong>Bibliography Styles:</strong> Numbered or alphabetical ordering</li>
                                <li><strong>Batch Export:</strong> Select multiple papers and export their citations</li>
                                <li><strong>Export Options:</strong> Download as text file or copy to clipboard</li>
                            </ul>
                        </div>

                        <div class="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-lg p-6">
                            <h3 class="text-xl font-semibold text-stone-900 dark:text-white mb-3 flex items-center gap-2">
                                <span class="material-symbols-outlined text-primary">sync</span>
                                Cloud Sync (Optional)
                            </h3>
                            <p class="text-stone-600 dark:text-stone-400 mb-4">Access your papers from any device with optional cloud sync.</p>
                            <ul class="space-y-2 text-stone-700 dark:text-stone-300 ml-6 list-disc">
                                <li><strong>Account Required:</strong> Create a free account to enable cloud sync</li>
                                <li><strong>Email Verification:</strong> Verify your email to activate cloud sync</li>
                                <li><strong>Automatic Sync:</strong> Changes sync automatically when enabled</li>
                                <li><strong>Manual Sync:</strong> Trigger sync manually from settings</li>
                                <li><strong>Multi-Device Access:</strong> Access your papers from any device</li>
                                <li><strong>Local-First:</strong> All data works offline - cloud sync is optional</li>
                            </ul>
                        </div>
                    </div>
                </section>

                <!-- Data Management -->
                <section id="section-data-management" class="mb-12">
                    <h2 class="text-3xl font-bold text-stone-900 dark:text-white mb-6 flex items-center gap-2">
                        <span class="material-symbols-outlined text-primary">storage</span>
                        Data Management
                    </h2>
                    <div class="space-y-8">
                        <div class="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-lg p-6">
                            <h3 class="text-xl font-semibold text-stone-900 dark:text-white mb-3 flex items-center gap-2">
                                <span class="material-symbols-outlined text-primary">download</span>
                                Export Library
                            </h3>
                            <p class="text-stone-600 dark:text-stone-400 mb-4">Back up your entire library to a single JSON file.</p>
                            <ul class="space-y-2 text-stone-700 dark:text-stone-300 ml-6 list-disc">
                                <li>Export all papers, notes, PDFs, collections, and metadata</li>
                                <li>Single JSON file contains everything</li>
                                <li>Perfect for backups and migration</li>
                                <li>Access from Settings → Export Library</li>
                            </ul>
                        </div>

                        <div class="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-lg p-6">
                            <h3 class="text-xl font-semibold text-stone-900 dark:text-white mb-3 flex items-center gap-2">
                                <span class="material-symbols-outlined text-primary">upload</span>
                                Import Library
                            </h3>
                            <p class="text-stone-600 dark:text-stone-400 mb-4">Restore your library from a backup file.</p>
                            <ul class="space-y-2 text-stone-700 dark:text-stone-300 ml-6 list-disc">
                                <li>Import from exported JSON backup files</li>
                                <li>Import from Zotero/Mendeley RIS files</li>
                                <li><strong>Warning:</strong> Import replaces all current data - export first!</li>
                                <li>Access from Settings → Import Library</li>
                            </ul>
                        </div>

                        <div class="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-lg p-6">
                            <h3 class="text-xl font-semibold text-stone-900 dark:text-white mb-3 flex items-center gap-2">
                                <span class="material-symbols-outlined text-primary">shield</span>
                                Privacy & Data Ownership
                            </h3>
                            <p class="text-stone-600 dark:text-stone-400 mb-4">Your data, your control.</p>
                            <ul class="space-y-2 text-stone-700 dark:text-stone-300 ml-6 list-disc">
                                <li><strong>Local-First:</strong> All data stored locally in your browser (IndexedDB)</li>
                                <li><strong>Offline Capable:</strong> Full functionality without internet connection</li>
                                <li><strong>No Tracking:</strong> No analytics, no user tracking</li>
                                <li><strong>Cloud Optional:</strong> Cloud sync is completely optional</li>
                                <li><strong>Full Export:</strong> Export all data including PDFs anytime</li>
                                <li><strong>Data Ownership:</strong> You own and control all your data</li>
                            </ul>
                        </div>
                    </div>
                </section>

                <!-- Tips & Tricks -->
                <section id="section-tips" class="mb-12">
                    <h2 class="text-3xl font-bold text-stone-900 dark:text-white mb-6 flex items-center gap-2">
                        <span class="material-symbols-outlined text-primary">lightbulb</span>
                        Tips & Tricks
                    </h2>
                    <div class="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-6">
                        <ul class="space-y-3 text-stone-700 dark:text-stone-300">
                            <li class="flex items-start gap-3">
                                <span class="material-symbols-outlined text-blue-600 dark:text-blue-400 flex-shrink-0">tips_and_updates</span>
                                <span><strong>Use Quick Add:</strong> Save time by pasting DOI URLs directly into the Quick Add field - metadata will be fetched automatically</span>
                            </li>
                            <li class="flex items-start gap-3">
                                <span class="material-symbols-outlined text-blue-600 dark:text-blue-400 flex-shrink-0">tips_and_updates</span>
                                <span><strong>Create Collections:</strong> Save common filter combinations as collections for one-click access to specific paper sets</span>
                            </li>
                            <li class="flex items-start gap-3">
                                <span class="material-symbols-outlined text-blue-600 dark:text-blue-400 flex-shrink-0">tips_and_updates</span>
                                <span><strong>Batch Operations:</strong> Use checkboxes to select multiple papers for quick status changes or tag updates</span>
                            </li>
                            <li class="flex items-start gap-3">
                                <span class="material-symbols-outlined text-blue-600 dark:text-blue-400 flex-shrink-0">tips_and_updates</span>
                                <span><strong>Command Palette:</strong> Press <kbd class="px-2 py-1 bg-white dark:bg-stone-800 rounded">Ctrl+K</kbd> to quickly navigate to any paper or tag</span>
                            </li>
                            <li class="flex items-start gap-3">
                                <span class="material-symbols-outlined text-blue-600 dark:text-blue-400 flex-shrink-0">tips_and_updates</span>
                                <span><strong>Exact Search:</strong> Use double quotes for exact phrase matching (e.g., "neural networks")</span>
                            </li>
                            <li class="flex items-start gap-3">
                                <span class="material-symbols-outlined text-blue-600 dark:text-blue-400 flex-shrink-0">tips_and_updates</span>
                                <span><strong>Reading Progress:</strong> Track progress on long papers to quickly find what you haven't finished</span>
                            </li>
                            <li class="flex items-start gap-3">
                                <span class="material-symbols-outlined text-blue-600 dark:text-blue-400 flex-shrink-0">tips_and_updates</span>
                                <span><strong>Regular Backups:</strong> Export your library regularly to ensure your research is safe</span>
                            </li>
                        </ul>
                    </div>
                </section>

                <!-- Navigation -->
                <div class="text-center mt-12 pt-8 border-t border-stone-200 dark:border-stone-800">
                    <a href="#/" class="inline-flex items-center gap-2 px-6 py-3 bg-primary text-white rounded-lg font-semibold hover:bg-primary/90 transition-colors">
                        <span class="material-symbols-outlined">home</span>
                        <span>Go to Dashboard</span>
                    </a>
                </div>
            </div>
        </div>
    `
};