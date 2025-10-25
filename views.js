export const views = {
    home: `
        <div class="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div class="max-w-7xl mx-auto mb-8">
                <form id="quick-add-form" class="bg-white dark:bg-stone-900/70 p-4 rounded-lg border border-stone-200 dark:border-stone-800 flex items-center gap-4">
                    <label for="quick-add-doi" class="text-sm font-semibold text-stone-700 dark:text-stone-300 whitespace-nowrap">Quick Add by DOI</label>
                    <input type="text" id="quick-add-doi" class="block w-full h-10 rounded-md border-stone-300 shadow-sm focus:border-primary focus:ring-primary dark:bg-stone-800 dark:border-stone-700 dark:text-white sm:text-sm" placeholder="Enter DOI and press Enter...">
                    <button type="submit" class="flex items-center justify-center gap-2 h-10 px-4 bg-primary text-white text-sm font-bold rounded-lg hover:bg-primary/90 transition-colors">
                        <span class="material-symbols-outlined">add</span>
                        <span class="hidden sm:inline">Add</span>
                    </button>
                </form>
            </div>
            <div class="max-w-7xl mx-auto">
                <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6 gap-4">
                    <h2 class="text-2xl font-bold">All Papers</h2>
                    <select id="sort-select" class="w-full sm:w-auto h-10 bg-white dark:bg-stone-900 border border-stone-300 dark:border-stone-700 rounded-lg focus:ring-primary focus:border-primary text-sm text-stone-900 dark:text-stone-100">
                        <option value="date_added">Sort by Date Added</option>
                        <option value="last_updated">Sort by Last Updated</option>
                        <option value="title_asc">Sort by Title (A-Z)</option>
                        <option value="year_desc">Sort by Publication Year</option>
                        <option value="status_asc">Sort by Status</option>
                    </select>
                </div>
                <div class="space-y-4" id="paper-list">
                    <!-- Paper list will be rendered here by JavaScript -->
                    <p class="text-stone-500 dark:text-stone-400">No papers yet. Click "Add Paper" to get started!</p>
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
                                <div id="file-upload-dropzone" class="mt-1 flex justify-center rounded-md border-2 border-dashed border-stone-300 px-6 pt-5 pb-6 dark:border-stone-700">
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
        </div>`
};