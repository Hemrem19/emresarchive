export const addView = `
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
                            <a href="#/app" class="text-sm font-semibold leading-6 text-stone-900 dark:text-white">Cancel</a>
                            <button type="submit" class="rounded-md bg-primary px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-primary/90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary">Save</button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    `;
