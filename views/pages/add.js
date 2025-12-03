export const addView = `
        <div class="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div class="max-w-3xl mx-auto" id="add-edit-paper-view">
                <div class="glass-panel border border-white/5 rounded-2xl shadow-2xl shadow-black/40 p-6 sm:p-8 lg:p-10">
                    <div class="flex items-center justify-between mb-8">
                        <h2 class="text-2xl font-bold text-white">Add New Paper</h2>
                        <a href="#/app" class="text-sm font-medium text-slate-400 hover:text-white transition-colors">Cancel</a>
                    </div>
                    <form id="add-paper-form">
                        <div class="grid grid-cols-1 gap-6">
                            <div>
                                <label for="title" class="block text-xs font-semibold uppercase tracking-wide text-slate-400 mb-2">Title</label>
                                <input type="text" name="title" id="title" 
                                    class="w-full h-11 px-4 rounded-xl border border-white/10 bg-slate-800/50 text-white placeholder-slate-500 focus:border-blue-500 focus:ring-blue-500/40 focus:bg-slate-800/80 transition-all shadow-inner" 
                                    placeholder="Enter paper title">
                            </div>
                            <div>
                                <label for="authors" class="block text-xs font-semibold uppercase tracking-wide text-slate-400 mb-2">Authors</label>
                                <input type="text" name="authors" id="authors" 
                                    class="w-full h-11 px-4 rounded-xl border border-white/10 bg-slate-800/50 text-white placeholder-slate-500 focus:border-blue-500 focus:ring-blue-500/40 focus:bg-slate-800/80 transition-all shadow-inner" 
                                    placeholder="Author 1, Author 2, ...">
                                <p class="mt-2 text-xs text-slate-500">Comma-separated list of authors</p>
                            </div>
                            <details id="advanced-details" class="group">
                                <summary class="list-none flex items-center gap-2 cursor-pointer text-xs font-semibold uppercase tracking-wide text-slate-400 hover:text-white transition-colors py-2">
                                    <span class="material-symbols-outlined text-base transition-transform group-open:rotate-90">chevron_right</span>
                                    Advanced Details
                                </summary>
                                <div class="mt-4 grid grid-cols-1 gap-6 border-t border-white/5 pt-6">
                                    <div>
                                        <label for="journal" class="block text-xs font-semibold uppercase tracking-wide text-slate-400 mb-2">Journal / Conference</label>
                                        <input type="text" name="journal" id="journal" 
                                            class="w-full h-11 px-4 rounded-xl border border-white/10 bg-slate-800/50 text-white placeholder-slate-500 focus:border-blue-500 focus:ring-blue-500/40 focus:bg-slate-800/80 transition-all shadow-inner" 
                                            placeholder="Journal or conference name">
                                    </div>
                                    <div class="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                        <div>
                                            <label for="year" class="block text-xs font-semibold uppercase tracking-wide text-slate-400 mb-2">Publication Year</label>
                                            <input type="number" name="year" id="year" 
                                                class="w-full h-11 px-4 rounded-xl border border-white/10 bg-slate-800/50 text-white placeholder-slate-500 focus:border-blue-500 focus:ring-blue-500/40 focus:bg-slate-800/80 transition-all shadow-inner" 
                                                placeholder="2024">
                                        </div>
                                        <div>
                                            <label for="doi" class="block text-xs font-semibold uppercase tracking-wide text-slate-400 mb-2">URL or DOI</label>
                                            <div class="flex rounded-xl shadow-inner overflow-hidden border border-white/10 focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-500/40 transition-all">
                                                <input type="text" name="doi" id="doi" 
                                                    class="flex-1 h-11 px-4 bg-slate-800/50 text-white placeholder-slate-500 focus:outline-none" 
                                                    placeholder="10.1109/... or https://...">
                                                <button type="button" id="fetch-doi-btn" 
                                                    class="px-4 border-l border-white/10 bg-slate-700/50 text-sm font-semibold text-slate-300 hover:bg-slate-700 hover:text-white transition-colors">
                                                    Fetch
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </details>
                            <div>
                                <label for="tags" class="block text-xs font-semibold uppercase tracking-wide text-slate-400 mb-2">Tags</label>
                                <input type="text" name="tags" id="tags" 
                                    class="w-full h-11 px-4 rounded-xl border border-white/10 bg-slate-800/50 text-white placeholder-slate-500 focus:border-blue-500 focus:ring-blue-500/40 focus:bg-slate-800/80 transition-all shadow-inner" 
                                    placeholder="tag1, tag2, ...">
                                <p class="mt-2 text-xs text-slate-500">Comma-separated list of tags</p>
                                <div id="tag-suggestions" class="mt-3 flex flex-wrap gap-2"></div>
                            </div>
                            <div>
                                <label class="block text-xs font-semibold uppercase tracking-wide text-slate-400 mb-2">PDF File</label>
                                <div id="file-upload-dropzone" 
                                    class="mt-1 flex justify-center rounded-xl border-2 border-dashed border-white/10 bg-slate-800/30 px-6 pt-8 pb-8 cursor-pointer hover:border-blue-500/50 hover:bg-blue-500/5 transition-all group">
                                    <div class="space-y-3 text-center">
                                        <span class="material-symbols-outlined text-5xl text-slate-600 group-hover:text-blue-400 transition-colors">cloud_upload</span>
                                        <div class="flex text-sm text-slate-400">
                                            <label for="file-upload" class="relative cursor-pointer rounded-md font-semibold text-blue-400 hover:text-blue-300 focus-within:outline-none">
                                                <span>Upload a file</span>
                                                <input id="file-upload" name="file-upload" type="file" class="sr-only" accept="application/pdf">
                                            </label>
                                            <p class="pl-1">or drag and drop</p>
                                        </div>
                                        <p class="text-xs text-slate-500">PDF up to 10MB</p>
                                    </div>
                                </div>
                                <div id="file-preview" class="hidden mt-3 flex items-center justify-between p-4 rounded-xl border border-white/10 bg-slate-800/50">
                                    <div class="flex items-center gap-3">
                                        <span class="material-symbols-outlined text-2xl text-red-400">picture_as_pdf</span>
                                        <p id="file-name" class="text-sm font-medium text-slate-200 truncate"></p>
                                    </div>
                                    <button type="button" id="remove-file-btn" 
                                        class="p-2 text-red-400 hover:text-red-300 rounded-lg hover:bg-red-500/20 transition-colors">
                                        <span class="material-symbols-outlined text-xl">delete</span>
                                    </button>
                                </div>
                            </div>
                        </div>
                        <div class="mt-8 flex items-center justify-end gap-4 pt-6 border-t border-white/5">
                            <a href="#/app" class="px-4 py-2.5 text-sm font-semibold text-slate-400 hover:text-white transition-colors">Cancel</a>
                            <button type="submit" 
                                class="px-6 py-2.5 bg-primary hover:bg-blue-600 text-white text-sm font-semibold rounded-xl shadow-lg shadow-blue-500/20 hover:shadow-blue-500/30 transition-all active:scale-95 border border-blue-400/20">
                                Save Paper
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    `;
