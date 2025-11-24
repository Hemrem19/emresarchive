export const settingsView = `
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
                                <div class="flex items-center gap-3 mt-2">
                                    <button id="dedup-papers-btn" class="rounded-lg border border-primary bg-white px-4 py-2 text-sm font-semibold text-primary shadow-sm transition-all hover:bg-primary/5 dark:border-primary dark:bg-stone-800 dark:text-primary dark:hover:bg-primary/10 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed" title="Remove duplicate papers from local storage based on DOI">
                                        <span class="material-symbols-outlined text-base">cleaning_services</span>
                                        <span>Clean Up Duplicates</span>
                                    </button>
                                    <p class="text-xs text-gray-500 dark:text-gray-400">Remove duplicate papers with the same DOI from your local library.</p>
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
    `;
