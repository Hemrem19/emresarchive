export const settingsView = `
        <div class="flex flex-1 items-start justify-center py-8 sm:py-12 px-4 sm:px-6">
            <div class="w-full max-w-3xl rounded-2xl border border-white/5 bg-slate-900/60 backdrop-blur-xl shadow-2xl shadow-black/30 p-6 sm:p-8 lg:p-10">
                <div class="mb-8">
                    <h2 class="text-3xl sm:text-4xl font-bold text-slate-100">Settings</h2>
                    <p class="mt-2 text-sm text-slate-400">Manage your library, preferences, and data</p>
                </div>
                <div class="space-y-8">
                    <section>
                        <div class="grid grid-cols-1 gap-6 md:grid-cols-3 md:gap-8">
                            <div class="md:col-span-1">
                                <h3 class="text-lg font-semibold text-slate-100 flex items-center gap-2">
                                    <span class="material-symbols-outlined text-xl text-primary">analytics</span>
                                    Library Statistics
                                </h3>
                                <p class="mt-2 text-sm text-slate-400">An overview of your collection.</p>
                            </div>
                            <div class="md:col-span-2" id="stats-container">
                                <dl id="stats-list" class="grid grid-cols-2 gap-3 sm:grid-cols-4">
                                    <!-- Stats will be dynamically rendered here by JavaScript -->
                                </dl>
                            </div>
                        </div>
                    </section>
                    <div class="border-t border-white/5"></div>
                    <section>
                        <div class="grid grid-cols-1 gap-6 md:grid-cols-3 md:gap-8">
                            <div class="md:col-span-1">
                                <h3 class="text-lg font-semibold text-slate-100 flex items-center gap-2">
                                    <span class="material-symbols-outlined text-xl text-primary">menu_book</span>
                                    Documentation
                                </h3>
                                <p class="mt-2 text-sm text-slate-400">Learn how to use all features of citavErs.</p>
                            </div>
                            <div class="flex items-start md:col-span-2">
                                <a href="#/docs" class="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-blue-500/20 transition-all hover:bg-primary/90 hover:shadow-blue-500/30">
                                    <span class="material-symbols-outlined text-base">menu_book</span>
                                    <span>View Documentation</span>
                                </a>
                            </div>
                        </div>
                    </section>
                    <div class="border-t border-white/5"></div>
                    <section>
                        <div class="grid grid-cols-1 gap-6 md:grid-cols-3 md:gap-8">
                            <div class="md:col-span-1">
                                <h3 class="text-lg font-semibold text-slate-100 flex items-center gap-2">
                                    <span class="material-symbols-outlined text-xl text-primary">download</span>
                                    Export Library
                                </h3>
                                <p class="mt-2 text-sm text-slate-400">Download a single .json backup file of all your paper data, notes, and attached PDFs.</p>
                            </div>
                            <div class="flex items-start md:col-span-2">
                                <button id="export-btn" class="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-blue-500/20 transition-all hover:bg-primary/90 hover:shadow-blue-500/30 mr-3">
                                    <span class="material-symbols-outlined text-base">download</span>
                                    <span>Export Data (JSON)</span>
                                </button>
                                <button id="export-excel-btn" class="inline-flex items-center gap-2 rounded-xl bg-green-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-green-500/20 transition-all hover:bg-green-700 hover:shadow-green-500/30">
                                    <span class="material-symbols-outlined text-base">table_view</span>
                                    <span>Export to Excel</span>
                                </button>
                            </div>
                        </div>
                    </section>
                    <div class="border-t border-white/5"></div>
                    <section>
                        <div class="grid grid-cols-1 gap-6 md:grid-cols-3 md:gap-8">
                            <div class="md:col-span-1">
                                <h3 class="text-lg font-semibold text-slate-100 flex items-center gap-2">
                                    <span class="material-symbols-outlined text-xl text-primary">sort</span>
                                    Reading Statuses
                                </h3>
                                <p class="mt-2 text-sm text-slate-400">Drag and drop to reorder the reading statuses. This will affect sorting and dropdown lists.</p>
                            </div>
                            <div class="md:col-span-2">
                                <ul id="status-order-list" class="space-y-2">
                                    <!-- Draggable status items will be rendered here -->
                                </ul>
                            </div>
                        </div>
                    </section>
                    <div class="border-t border-white/5"></div>
                    <section>
                        <div class="grid grid-cols-1 gap-6 md:grid-cols-3 md:gap-8">
                            <div class="md:col-span-1">
                                <h3 class="text-lg font-semibold text-slate-100 flex items-center gap-2">
                                    <span class="material-symbols-outlined text-xl text-primary">upload</span>
                                    Import Library
                                </h3>
                                <p class="mt-2 text-sm text-slate-400">Restore your library from a backup file. <strong class="font-semibold text-yellow-400">Warning: This will replace all current data.</strong></p>
                            </div>
                            <div class="flex items-start md:col-span-2">
                                <button id="import-btn" class="inline-flex items-center gap-2 rounded-xl border border-slate-600 bg-slate-800/50 px-5 py-2.5 text-sm font-semibold text-slate-100 shadow-sm transition-all hover:bg-slate-700/50 hover:border-slate-500">
                                    <span class="material-symbols-outlined text-base">upload</span>
                                    <span>Import from File</span>
                                </button>
                                <input type="file" id="import-file-input" class="hidden" accept=".json">
                            </div>
                        </div>
                    </section>
                    <div class="border-t border-white/5"></div>
                    <section>
                        <div class="bg-primary/10 p-6 rounded-xl border border-primary/20 shadow-lg shadow-blue-500/10">
                            <div class="grid grid-cols-1 gap-6 md:grid-cols-3 md:gap-8">
                                <div class="md:col-span-1">
                                    <h3 class="text-lg font-semibold text-slate-100 flex items-center gap-2">
                                        <span class="material-symbols-outlined text-xl text-primary">move_up</span>
                                        Migrate Your Library
                                    </h3>
                                    <p class="mt-2 text-sm text-slate-400">Coming from Zotero or Mendeley? Import your library in minutes by uploading a RIS file. This will add new papers without replacing your existing data.</p>
                                </div>
                                <div class="flex items-center justify-center md:col-span-2">
                                    <button id="import-zotero-btn" class="w-full md:w-auto rounded-xl bg-primary px-6 py-3 text-base font-semibold text-white shadow-lg shadow-blue-500/20 transition-all hover:bg-primary/90 hover:shadow-blue-500/30 flex items-center justify-center gap-2">
                                        <span class="material-symbols-outlined text-xl">move_up</span>
                                        <span>Import from Zotero/Mendeley</span>
                                    </button>
                                    <input type="file" id="import-ris-file-input" class="hidden" accept=".ris,.txt">
                                </div>
                            </div>
                        </div>
                    </section>
                    <div class="border-t border-white/5"></div>
                    <section>
                        <div class="grid grid-cols-1 gap-6 md:grid-cols-3 md:gap-8">
                            <div class="md:col-span-1">
                                <h3 class="text-lg font-semibold text-slate-100 flex items-center gap-2">
                                    <span class="material-symbols-outlined text-xl text-primary">tune</span>
                                    Import Settings
                                </h3>
                                <p class="mt-2 text-sm text-slate-400">Manage preferences for importing data from other sources.</p>
                            </div>
                            <div class="flex items-start md:col-span-2">
                                <button id="reset-import-preference-btn" class="inline-flex items-center gap-2 rounded-xl border border-slate-600 bg-slate-800/50 px-5 py-2.5 text-sm font-semibold text-slate-100 shadow-sm transition-all hover:bg-slate-700/50 hover:border-slate-500">
                                    <span class="material-symbols-outlined text-base">refresh</span>
                                    <span>Reset Duplicate Handling Preference</span>
                                </button>
                            </div>
                        </div>
                    </section>
                    <div class="border-t border-white/5"></div>
                    <section id="email-verification-section" class="hidden">
                        <div class="grid grid-cols-1 gap-6 md:grid-cols-3 md:gap-8">
                            <div class="md:col-span-1">
                                <h3 class="text-lg font-semibold text-yellow-400 flex items-center gap-2">
                                    <span class="material-symbols-outlined text-xl">mail</span>
                                    Email Verification
                                </h3>
                                <p class="mt-2 text-sm text-slate-400">Please verify your email address to complete your account setup.</p>
                            </div>
                            <div class="flex items-start md:col-span-2">
                                <button id="resend-verification-settings-btn" class="inline-flex items-center gap-2 rounded-xl bg-yellow-500 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-yellow-500/20 transition-all hover:bg-yellow-600 hover:shadow-yellow-500/30">
                                    <span class="material-symbols-outlined text-base">mail</span>
                                    <span>Resend Verification Email</span>
                                </button>
                            </div>
                        </div>
                    </section>
                    <div class="border-t border-white/5"></div>
                    <section>
                        <div class="grid grid-cols-1 gap-6 md:grid-cols-3 md:gap-8">
                            <div class="md:col-span-1">
                                <h3 class="text-lg font-semibold text-slate-100 flex items-center gap-2">
                                    <span class="material-symbols-outlined text-xl text-primary">cloud_sync</span>
                                    Cloud Sync
                                </h3>
                                <p class="mt-2 text-sm text-slate-400">Enable cloud sync to access your papers from any device. Data is stored securely in the cloud.</p>
                            </div>
                            <div class="flex flex-col gap-4 md:col-span-2">
                                <div id="cloud-sync-container" class="flex flex-col gap-2">
                                    <label for="cloud-sync-toggle" class="flex items-center cursor-pointer">
                                        <div class="relative">
                                            <input type="checkbox" id="cloud-sync-toggle" class="sr-only peer">
                                            <div class="w-14 h-8 bg-slate-700 rounded-full peer-checked:bg-primary transition-colors"></div>
                                            <div class="absolute top-1 left-1 w-6 h-6 bg-white rounded-full transition-transform transform peer-checked:translate-x-6 shadow-md"></div>
                                        </div>
                                        <span class="ml-3 text-sm font-medium text-slate-300">Enable Cloud Sync</span>
                                    </label>
                                    <p id="cloud-sync-status" class="text-xs text-slate-400 ml-20"></p>
                                </div>
                                <div id="sync-controls-container" class="hidden flex flex-col gap-2">
                                    <div class="flex items-center gap-3">
                                        <button id="sync-now-btn" class="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-blue-500/20 transition-all hover:bg-primary/90 hover:shadow-blue-500/30 disabled:opacity-50 disabled:cursor-not-allowed">
                                            <span class="material-symbols-outlined text-base">sync</span>
                                            <span>Sync Now</span>
                                        </button>
                                        <div id="sync-status-display" class="text-xs text-slate-400"></div>
                                    </div>
                                    <div id="pending-changes-display" class="text-xs text-slate-400"></div>
                                </div>
                            </div>
                        </div>
                    </section>
                    <div class="border-t border-white/5"></div>
                    <section>
                        <div class="grid grid-cols-1 gap-6 md:grid-cols-3 md:gap-8">
                            <div class="md:col-span-1">
                                <h3 class="text-lg font-semibold text-slate-100 flex items-center gap-2">
                                    <span class="material-symbols-outlined text-xl text-primary">cleaning_services</span>
                                    Database Maintenance
                                </h3>
                                <p class="mt-2 text-sm text-slate-400">Clean up duplicate papers from your local library.</p>
                            </div>
                            <div class="flex flex-col gap-2 md:col-span-2">
                                <button id="dedup-papers-btn" class="w-full md:w-auto inline-flex items-center justify-center gap-2 rounded-xl border-2 border-primary bg-slate-800/50 px-5 py-3 text-sm font-semibold text-primary shadow-sm transition-all hover:bg-primary/10 hover:border-primary/80 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed" title="Remove duplicate papers with the same DOI or arXiv ID from your local library">
                                    <span class="material-symbols-outlined text-lg">cleaning_services</span>
                                    <span>Clean Up Duplicates</span>
                                </button>
                                <p class="text-xs text-slate-400">Scans your library and removes duplicate papers that share the same DOI or arXiv ID. Keeps the most recent version of each paper.</p>
                            </div>
                        </div>
                    </section>
                    <div class="border-t border-red-500/20"></div>
                    <section>
                        <div class="grid grid-cols-1 gap-6 md:grid-cols-3 md:gap-8">
                            <div class="md:col-span-1">
                                <h3 class="text-lg font-semibold text-red-400 flex items-center gap-2">
                                    <span class="material-symbols-outlined text-xl">warning</span>
                                    Danger Zone
                                </h3>
                                <p class="mt-2 text-sm text-slate-400">This action is permanent and cannot be undone. Please export your data first if you want to keep a backup.</p>
                            </div>
                            <div class="flex items-start md:col-span-2">
                                <button id="clear-data-btn" class="inline-flex items-center gap-2 rounded-xl border border-red-500/50 bg-red-500/10 px-5 py-2.5 text-sm font-semibold text-red-400 shadow-sm transition-all hover:bg-red-500/20 hover:border-red-500/70">
                                    <span class="material-symbols-outlined text-base">delete_forever</span>
                                    <span>Clear All Data</span>
                                </button>
                            </div>
                        </div>
                    </section>
                </div>
            </div>
        </div>
    `;
