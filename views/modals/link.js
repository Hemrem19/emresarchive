export const linkModalView = `
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
        </div>
    `;
