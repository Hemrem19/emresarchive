export const bibliographyExportModalView = `
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
        </div>`;
