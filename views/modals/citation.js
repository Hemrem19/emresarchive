export const citationModalView = `
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
        </div>`;
