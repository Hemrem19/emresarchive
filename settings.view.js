import { getAllPapers, exportAllData, importData, clearAllData, addPaper, getPaperByDoi, performSync, performFullSync, performIncrementalSync, getSyncStatusInfo } from './db.js';
import { showToast } from './ui.js';
import { generateCitation } from './citation.js';
import { getStatusOrder, saveStatusOrder, isCloudSyncEnabled, setCloudSyncEnabled, getApiBaseUrl } from './config.js';
import { isAuthenticated, getUser, resendVerificationEmail } from './api/auth.js';
import { parseRIS } from './import/ris-parser.js';
import { restartAutoSync, stopAutoSync, performManualSync } from './core/syncManager.js';

export const settingsView = {
    async mount(appState) {
        this.setupAppearance();
        this.setupCitationGeneration();
        this.setupStatistics();
        this.setupStatusReordering();
        this.setupImportExport(appState);
        this.setupCloudSync();
        this.setupDangerZone(appState);
    },

    unmount() {
        // No complex listeners to remove for settings view yet
        console.log('Settings view unmounted.');
    },

    setupCitationGeneration() {
        // This function is a placeholder. The import is needed because other parts of the app might dynamically use it, but it's not directly used in the settings view itself.
    },

    setupAppearance() {
        const darkModeToggle = document.getElementById('dark-mode-toggle');
        if (darkModeToggle) {
            if (localStorage.getItem('theme') === 'dark') {
                darkModeToggle.checked = true;
            }
            darkModeToggle.addEventListener('change', (e) => {
                if (e.target.checked) {
                    document.documentElement.classList.add('dark');
                    localStorage.setItem('theme', 'dark');
                } else {
                    document.documentElement.classList.remove('dark');
                    localStorage.setItem('theme', 'light');
                }
            });
        }
    },

    async setupStatistics() {
        const statsList = document.getElementById('stats-list');
        if (statsList) {
            try {
                const papers = await getAllPapers();
                const totalPapers = papers.length;
                const statusCounts = papers.reduce((acc, paper) => {
                    const status = paper.readingStatus || 'Unknown';
                    acc[status] = (acc[status] || 0) + 1;
                    return acc;
                }, {});

                let fullStatsHtml = `
                <div class="flex flex-col rounded-lg bg-stone-100 dark:bg-stone-800/50 p-4">
                    <dt class="text-sm font-medium text-stone-500 dark:text-stone-400 truncate">Total Papers</dt>
                    <dd class="mt-1 text-3xl font-semibold text-primary">${totalPapers}</dd>
                </div>
                `;

                const statusOrder = [...getStatusOrder(), 'Unknown'];
                const statusColors = {
                    'Reading': 'text-blue-500',
                    'To Read': 'text-yellow-500',
                    'Finished': 'text-green-500',
                    'Archived': 'text-stone-500',
                    'Unknown': 'text-red-500',
                };

                fullStatsHtml += statusOrder
                    .filter(status => statusCounts[status] > 0 || status === 'Unknown' && !Object.keys(statusCounts).length) // Only show existing or default
                    .map(status => `
                    <div class="flex flex-col rounded-lg bg-stone-100 dark:bg-stone-800/50 p-4">
                        <dt class="text-sm font-medium text-stone-500 dark:text-stone-400 truncate">${status}</dt>
                        <dd class="mt-1 text-3xl font-semibold ${statusColors[status] || 'text-stone-900 dark:text-white'}">${statusCounts[status] || 0}</dd>
                    </div>
                `).join('');

                statsList.innerHTML = fullStatsHtml;
            } catch (error) {
                console.error('Error fetching or rendering statistics:', error);
                statsList.innerHTML = `<p class="text-red-500">Failed to load statistics.</p>`;
            }
        }
    },

    setupCloudSync() {
        const toggle = document.getElementById('cloud-sync-toggle');
        const statusText = document.getElementById('cloud-sync-status');
        const syncControlsContainer = document.getElementById('sync-controls-container');
        const syncNowBtn = document.getElementById('sync-now-btn');
        const syncStatusDisplay = document.getElementById('sync-status-display');
        const pendingChangesDisplay = document.getElementById('pending-changes-display');
        
        if (!toggle || !statusText) return;

        const updateSyncStatus = async () => {
            if (!syncControlsContainer || syncControlsContainer.classList.contains('hidden')) return;
            
            try {
                const status = await getSyncStatusInfo();
                
                // Update last sync time
                if (status.lastSyncedAt) {
                    const lastSyncedDate = new Date(status.lastSyncedAt);
                    const now = new Date();
                    const diffMs = now - lastSyncedDate;
                    const diffMins = Math.floor(diffMs / 60000);
                    const diffHours = Math.floor(diffMs / 3600000);
                    const diffDays = Math.floor(diffMs / 86400000);
                    
                    let lastSyncedText;
                    if (diffMins < 1) {
                        lastSyncedText = 'Just now';
                    } else if (diffMins < 60) {
                        lastSyncedText = `${diffMins} minute${diffMins !== 1 ? 's' : ''} ago`;
                    } else if (diffHours < 24) {
                        lastSyncedText = `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
                    } else {
                        lastSyncedText = `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`;
                    }
                    
                    if (syncStatusDisplay) {
                        syncStatusDisplay.textContent = `Last synced: ${lastSyncedText}`;
                    }
                } else {
                    if (syncStatusDisplay) {
                        syncStatusDisplay.textContent = 'Never synced';
                    }
                }
                
                // Update pending changes
                if (status.hasPendingChanges) {
                    const counts = status.pendingChangeCounts;
                    const total = 
                        (counts.papers?.created || 0) + (counts.papers?.updated || 0) + (counts.papers?.deleted || 0) +
                        (counts.collections?.created || 0) + (counts.collections?.updated || 0) + (counts.collections?.deleted || 0) +
                        (counts.annotations?.created || 0) + (counts.annotations?.updated || 0) + (counts.annotations?.deleted || 0);
                    
                    if (pendingChangesDisplay && total > 0) {
                        pendingChangesDisplay.textContent = `${total} pending change${total !== 1 ? 's' : ''} waiting to sync`;
                        pendingChangesDisplay.className = 'text-xs text-yellow-600 dark:text-yellow-400';
                    } else if (pendingChangesDisplay) {
                        pendingChangesDisplay.textContent = 'All changes synced';
                        pendingChangesDisplay.className = 'text-xs text-green-600 dark:text-green-400';
                    }
                } else {
                    if (pendingChangesDisplay) {
                        pendingChangesDisplay.textContent = 'All changes synced';
                        pendingChangesDisplay.className = 'text-xs text-green-600 dark:text-green-400';
                    }
                }
                
                // Update sync button state
                if (syncNowBtn) {
                    syncNowBtn.disabled = status.inProgress || false;
                    if (status.inProgress) {
                        syncNowBtn.innerHTML = '<span class="material-symbols-outlined text-base animate-spin">sync</span><span>Syncing...</span>';
                    } else {
                        syncNowBtn.innerHTML = '<span class="material-symbols-outlined text-base">sync</span><span>Sync Now</span>';
                    }
                }
            } catch (error) {
                console.error('Failed to get sync status:', error);
                if (syncStatusDisplay) {
                    syncStatusDisplay.textContent = 'Unable to load sync status';
                }
            }
        };

        // Update UI based on current state
        const updateUI = async () => {
            const syncEnabled = isCloudSyncEnabled();
            const authenticated = isAuthenticated();
            
            toggle.checked = syncEnabled && authenticated;
            toggle.disabled = !authenticated;
            
            if (!authenticated) {
                statusText.textContent = 'Please log in to enable cloud sync.';
                statusText.className = 'text-xs text-yellow-600 dark:text-yellow-400 ml-20';
                if (syncControlsContainer) syncControlsContainer.classList.add('hidden');
            } else if (syncEnabled && authenticated) {
                const user = getUser();
                let statusMsg = `Cloud sync enabled for ${user?.name || user?.email || 'your account'}.`;
                if (user && !user.emailVerified) {
                    statusMsg += ' Email not verified.';
                }
                statusText.textContent = statusMsg;
                statusText.className = 'text-xs text-green-600 dark:text-green-400 ml-20';
                if (syncControlsContainer) {
                    syncControlsContainer.classList.remove('hidden');
                    await updateSyncStatus();
                }
            } else {
                statusText.textContent = 'Cloud sync disabled. Using local storage only.';
                statusText.className = 'text-xs text-gray-500 dark:text-gray-400 ml-20';
                if (syncControlsContainer) syncControlsContainer.classList.add('hidden');
            }
        };

        // Initial UI update
        updateUI();
        
        // Show email verification section if user is authenticated but not verified
        const emailVerificationSection = document.getElementById('email-verification-section');
        if (emailVerificationSection) {
            const checkEmailVerification = () => {
                const authenticated = isAuthenticated();
                const user = getUser();
                
                if (authenticated && user && !user.emailVerified) {
                    emailVerificationSection.classList.remove('hidden');
                    const resendBtn = document.getElementById('resend-verification-settings-btn');
                    if (resendBtn && !resendBtn.dataset.listenerAdded) {
                        resendBtn.dataset.listenerAdded = 'true';
                        resendBtn.addEventListener('click', async () => {
                            try {
                                resendBtn.disabled = true;
                                const originalText = resendBtn.textContent;
                                resendBtn.textContent = 'Sending...';
                                await resendVerificationEmail();
                                showToast('Verification email sent! Please check your inbox.', 'success');
                                resendBtn.textContent = originalText;
                            } catch (error) {
                                showToast(error.message || 'Failed to resend verification email', 'error');
                                resendBtn.textContent = originalText;
                            } finally {
                                resendBtn.disabled = false;
                            }
                        });
                    }
                } else {
                    emailVerificationSection.classList.add('hidden');
                }
            };
            
            checkEmailVerification();
            // Re-check when toggle changes (user might log in/out)
            toggle.addEventListener('change', checkEmailVerification);
        }

        // Handle toggle change
        toggle.addEventListener('change', (e) => {
            const enabled = e.target.checked;
            
            if (enabled && !isAuthenticated()) {
                // Show login prompt
                showToast('Please log in to enable cloud sync.', 'warning');
                toggle.checked = false;
                updateUI();
                return;
            }

            setCloudSyncEnabled(enabled);
            updateUI();
            
            // Start/stop automatic sync based on toggle
            if (enabled && isAuthenticated()) {
                restartAutoSync();
                console.log('✅ Cloud sync ON - Data will be synced to:', getApiBaseUrl?.() || 'API endpoint');
                showToast('Cloud sync enabled! Your data will now be synced to the cloud.', 'success');
            } else {
                stopAutoSync();
                console.log('📦 Cloud sync OFF - Using local storage only');
                showToast('Cloud sync disabled. Using local storage only.', 'info');
            }
        });

        // Setup sync now button
        if (syncNowBtn) {
            syncNowBtn.addEventListener('click', async () => {
                if (syncNowBtn.disabled) return;
                
                try {
                    syncNowBtn.disabled = true;
                    syncNowBtn.innerHTML = '<span class="material-symbols-outlined text-base animate-spin">sync</span><span>Syncing...</span>';
                    
                    showToast('Syncing data...', 'info', { duration: 5000 });
                    
                    // Use sync manager's manual sync function
                    await performManualSync();
                    
                    // Update status display
                    await updateSyncStatus();
                } catch (error) {
                    console.error('Sync error:', error);
                    showToast(error.message || 'Sync failed. Please try again.', 'error', {
                        duration: 5000,
                        actions: [{
                            label: 'Retry',
                            onClick: () => syncNowBtn.click()
                        }]
                    });
                } finally {
                    syncNowBtn.disabled = false;
                    await updateSyncStatus();
                }
            });
        }

        // Update sync status periodically (every 30 seconds) when cloud sync is enabled
        let statusInterval = null;
        if (isCloudSyncEnabled() && isAuthenticated()) {
            statusInterval = setInterval(updateSyncStatus, 30000);
        }
    },

    setupStatusReordering() {
        const container = document.getElementById('status-order-list');
        if (!container) return;

        let draggedItem = null;

        const render = () => {
            const statuses = getStatusOrder();
            container.innerHTML = statuses.map(status => `
                <li draggable="true" class="status-item flex items-center justify-between p-3 bg-stone-100 dark:bg-stone-800/50 rounded-lg cursor-grab active:cursor-grabbing">
                    <span class="font-medium">${status}</span>
                    <span class="material-symbols-outlined text-stone-400 dark:text-stone-500">drag_indicator</span>
                </li>
            `).join('');
        };

        container.addEventListener('dragstart', (e) => {
            draggedItem = e.target;
            setTimeout(() => {
                e.target.classList.add('opacity-50');
            }, 0);
        });

        container.addEventListener('dragend', (e) => {
            e.target.classList.remove('opacity-50');
            draggedItem = null;
        });

        container.addEventListener('dragover', (e) => {
            e.preventDefault();
            const afterElement = getDragAfterElement(container, e.clientY);
            const currentItems = [...container.querySelectorAll('.status-item:not(.opacity-50)')];
            
            if (afterElement == null) {
                container.appendChild(draggedItem);
            } else {
                container.insertBefore(draggedItem, afterElement);
            }
        });

        container.addEventListener('drop', (e) => {
            e.preventDefault();
            const newOrder = [...container.querySelectorAll('.status-item')].map(item => item.querySelector('span').textContent);
            saveStatusOrder(newOrder);
            showToast('Status order saved!');
            // Re-render to ensure clean state
            render();
        });

        function getDragAfterElement(container, y) {
            const draggableElements = [...container.querySelectorAll('.status-item:not(.opacity-50)')];

            return draggableElements.reduce((closest, child) => {
                const box = child.getBoundingClientRect();
                const offset = y - box.top - box.height / 2;
                if (offset < 0 && offset > closest.offset) {
                    return { offset: offset, element: child };
                } else {
                    return closest;
                }
            }, { offset: Number.NEGATIVE_INFINITY }).element;
        }

        render();
    },

    setupImportExport(appState) {
        const exportBtn = document.getElementById('export-btn');
        const importBtn = document.getElementById('import-btn');
        const importFileInput = document.getElementById('import-file-input');

        if (exportBtn && importBtn && importFileInput) {
            const exportHandler = async () => {
                try {
                    showToast('Exporting data... Please wait.', 'info', { duration: 10000 });
                    const data = await exportAllData();
                    
                    // data is now an object with papers and collections arrays
                    const paperCount = (data.papers || []).length;
                    const collectionCount = (data.collections || []).length;
                    
                    if (paperCount === 0 && collectionCount === 0) {
                        showToast('No data to export. Your library is empty.', 'warning');
                        return;
                    }
                    
                    const jsonString = JSON.stringify(data, null, 2);
                    const blob = new Blob([jsonString], { type: 'application/json' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    const date = new Date().toISOString().slice(0, 10);
                    a.download = `citaversa-backup-${date}.json`;
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                    URL.revokeObjectURL(url);
                    
                    let message = 'Export complete! ';
                    if (paperCount > 0) message += `${paperCount} paper(s)`;
                    if (paperCount > 0 && collectionCount > 0) message += ' and ';
                    if (collectionCount > 0) message += `${collectionCount} collection(s)`;
                    message += ' exported.';
                    
                    showToast(message, 'success');
                } catch (error) {
                    console.error('Export failed:', error);
                    showToast(error.message || 'Export failed. Please try again.', 'error', {
                        duration: 5000,
                        actions: [{
                            label: 'Retry',
                            onClick: () => exportHandler()
                        }]
                    });
                }
            };
            exportBtn.addEventListener('click', exportHandler);

            const importHandler = () => {
                importFileInput.click();
            };
            importBtn.addEventListener('click', importHandler);

            const fileChangeHandler = (event) => {
                const file = event.target.files[0];
                if (!file) return;

                if (!confirm('Are you sure you want to import this file? All existing data will be permanently replaced.')) {
                    importFileInput.value = '';
                    return;
                }

                const reader = new FileReader();
                reader.onload = async (e) => {
                    try {
                        showToast('Importing data... Please wait.', 'info', { duration: 10000 });
                        
                        let papersToImport;
                        try {
                            papersToImport = JSON.parse(e.target.result);
                        } catch (parseError) {
                            throw new Error('Invalid file format: Unable to parse JSON. Please use a valid backup file.');
                        }
                        
                        await importData(papersToImport);
                        showToast('Import successful! Library has been restored.', 'success');
                        appState.allPapersCache = []; // Clear cache in app state
                        
                        // Reload page to ensure clean state
                        // Delay reload to allow user to see any error messages
                        setTimeout(() => {
                            window.location.hash = '#/';
                            window.location.reload();
                        }, 3000); // Increased from 1000ms to 3000ms to see validation errors
                    } catch (error) {
                        console.error('Import failed:', error);
                        showToast(error.message || 'Import failed. The file may be corrupt or in the wrong format.', 'error', {
                            duration: 7000
                        });
                        importFileInput.value = ''; // Clear file input
                    }
                };
                
                reader.onerror = () => {
                    showToast('Failed to read file. Please try again.', 'error');
                    importFileInput.value = '';
                };
                
                reader.readAsText(file);
            };
            importFileInput.addEventListener('change', fileChangeHandler);
        }

        // Setup Zotero/Mendeley RIS import
        this.setupRISImport(appState);
    },

    setupRISImport(appState) {
        const importZoteroBtn = document.getElementById('import-zotero-btn');
        const importRISFileInput = document.getElementById('import-ris-file-input');

        if (importZoteroBtn && importRISFileInput) {
            const risImportHandler = () => {
                importRISFileInput.click();
            };
            importZoteroBtn.addEventListener('click', risImportHandler);

            const risFileChangeHandler = async (event) => {
                const file = event.target.files[0];
                if (!file) return;

                // Check file extension
                const fileName = file.name.toLowerCase();
                if (!fileName.endsWith('.ris') && !fileName.endsWith('.txt')) {
                    showToast('Invalid file type. Please upload a .ris file exported from Zotero or Mendeley.', 'error');
                    importRISFileInput.value = '';
                    return;
                }

                const reader = new FileReader();
                reader.onload = async (e) => {
                    try {
                        showToast('Parsing RIS file... Please wait.', 'info', { duration: 10000 });
                        
                        const risContent = e.target.result;
                        const papers = parseRIS(risContent);

                        if (!papers || papers.length === 0) {
                            showToast('No papers found in RIS file. Please check the file format.', 'warning');
                            importRISFileInput.value = '';
                            return;
                        }

                        // Show preview modal before importing
                        this.showRISImportPreview(papers, appState);

                    } catch (error) {
                        console.error('RIS import error:', error);
                        showToast(error.message || 'Failed to parse RIS file. Please check the file format.', 'error', {
                            duration: 7000
                        });
                        importRISFileInput.value = '';
                    }
                };

                reader.onerror = () => {
                    showToast('Failed to read file. Please try again.', 'error');
                    importRISFileInput.value = '';
                };

                reader.readAsText(file);
            };

            importRISFileInput.addEventListener('change', risFileChangeHandler);
        }
    },

    showRISImportPreview(papers, appState) {
        // Remove existing modal if present
        const existingModal = document.getElementById('ris-import-modal');
        if (existingModal) {
            existingModal.remove();
        }

        // Create preview modal
        const modalHtml = `
            <div id="ris-import-modal" class="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
                <div class="bg-white dark:bg-stone-900 rounded-lg shadow-xl w-full max-w-3xl max-h-[85vh] flex flex-col">
                    <div class="p-4 border-b dark:border-stone-800 flex justify-between items-center">
                        <h3 class="text-lg font-bold">Import Preview</h3>
                        <button id="close-ris-import-modal-btn" class="p-1.5 rounded-full hover:bg-stone-100 dark:hover:bg-stone-800">
                            <span class="material-symbols-outlined">close</span>
                        </button>
                    </div>
                    <div class="p-6 overflow-y-auto flex-grow">
                        <p class="text-sm text-stone-600 dark:text-stone-400 mb-4">
                            Found <strong>${papers.length}</strong> paper(s) in RIS file. Review the list below and click "Import All" to add them to your library.
                        </p>
                        <div class="space-y-3 max-h-[400px] overflow-y-auto">
                            ${papers.map((paper, index) => `
                                <div class="p-3 bg-stone-50 dark:bg-stone-800/50 border border-stone-200 dark:border-stone-700 rounded-md">
                                    <div class="flex items-start gap-3">
                                        <span class="text-sm font-semibold text-stone-500 dark:text-stone-400 flex-shrink-0">${index + 1}.</span>
                                        <div class="flex-1 min-w-0">
                                            <p class="font-semibold text-stone-900 dark:text-stone-100">${paper.title || 'Untitled'}</p>
                                            ${paper.authors && paper.authors.length > 0 ? `
                                                <p class="text-sm text-stone-600 dark:text-stone-400 mt-1">${paper.authors.join(', ')}</p>
                                            ` : ''}
                                            ${paper.year ? `
                                                <p class="text-xs text-stone-500 dark:text-stone-500 mt-1">${paper.year}</p>
                                            ` : ''}
                                            ${paper.journal ? `
                                                <p class="text-xs text-stone-500 dark:text-stone-500 mt-1">${paper.journal}</p>
                                            ` : ''}
                                        </div>
                                    </div>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                    <div class="p-4 bg-stone-50 dark:bg-stone-900/50 border-t dark:border-stone-800 flex justify-end gap-2 flex-shrink-0">
                        <button id="cancel-ris-import-btn" class="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-900 shadow-sm hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-white dark:hover:bg-gray-700">
                            Cancel
                        </button>
                        <button id="confirm-ris-import-btn" class="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-primary/90">
                            Import All (${papers.length})
                        </button>
                    </div>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', modalHtml);

        const modal = document.getElementById('ris-import-modal');
        const closeBtn = document.getElementById('close-ris-import-modal-btn');
        const cancelBtn = document.getElementById('cancel-ris-import-btn');
        const confirmBtn = document.getElementById('confirm-ris-import-btn');

        const closeModal = () => {
            modal.classList.add('hidden');
            setTimeout(() => modal.remove(), 300);
            // Clear file input
            const risInput = document.getElementById('import-ris-file-input');
            if (risInput) risInput.value = '';
        };

        closeBtn.addEventListener('click', closeModal);
        cancelBtn.addEventListener('click', closeModal);
        modal.addEventListener('click', (e) => {
            if (e.target === modal) closeModal();
        });

        confirmBtn.addEventListener('click', async () => {
            await this.importRISPapers(papers, appState);
            closeModal();
        });
    },

    async importRISPapers(papers, appState) {
        try {
            showToast(`Importing ${papers.length} paper(s)...`, 'info', { duration: 15000 });

            let successCount = 0;
            let errorCount = 0;
            const errors = [];

            for (const paperData of papers) {
                try {
                    // Skip papers without titles (required field)
                    if (!paperData.title || !paperData.title.trim()) {
                        errorCount++;
                        errors.push(`Skipped paper: Missing title`);
                        continue;
                    }

                    // Check for duplicate DOI (optional - only if DOI exists)
                    if (paperData.doi && paperData.doi.trim()) {
                        try {
                            const existingPaper = await getPaperByDoi(paperData.doi.trim());
                            if (existingPaper) {
                                errorCount++;
                                errors.push(`Skipped "${paperData.title}": Already exists (DOI: ${paperData.doi})`);
                                continue;
                            }
                        } catch (e) {
                            // getPaperByDoi throws "Paper not found" if not found, which is expected
                            // This means the DOI doesn't exist yet, so we can proceed
                        }
                    }

                    // Add paper to database
                    await addPaper(paperData);
                    successCount++;

                } catch (error) {
                    errorCount++;
                    const title = paperData.title || 'Untitled';
                    errors.push(`Failed to import "${title}": ${error.message}`);
                    console.error(`Error importing paper:`, paperData, error);
                }
            }

            // Update cache
            appState.allPapersCache = await getAllPapers();

            // Show results
            let message = `Import complete! `;
            if (successCount > 0) {
                message += `${successCount} paper(s) imported successfully.`;
            }
            if (errorCount > 0) {
                message += ` ${errorCount} paper(s) failed or were skipped.`;
            }

            showToast(message, successCount > 0 ? 'success' : 'warning', {
                duration: 7000,
                ...(errors.length > 0 && errors.length <= 5 ? {
                    actions: [{
                        label: 'Show Errors',
                        onClick: () => {
                            alert('Import Errors:\n\n' + errors.join('\n'));
                        }
                    }]
                } : {})
            });

            // Refresh dashboard if on home page
            if (window.location.hash === '#/' || window.location.hash === '') {
                window.location.reload();
            }

        } catch (error) {
            console.error('RIS import error:', error);
            showToast(error.message || 'Failed to import papers. Please try again.', 'error', {
                duration: 7000
            });
        }
    },

    setupDangerZone(appState) {
        const clearDataBtn = document.getElementById('clear-data-btn');
        if (clearDataBtn) {
            clearDataBtn.addEventListener('click', async () => {
                const confirmation = prompt('This action is irreversible. You will lose all your papers, notes, and files.\n\nTo confirm, please type "DELETE" in the box below.');
                if (confirmation === 'DELETE') {
                    try {
                        showToast('Clearing all data...', 'warning', { duration: 5000 });
                        await clearAllData();
                        appState.allPapersCache = []; // Clear the global cache
                        showToast('All data has been permanently deleted.', 'success');
                        
                        // Redirect to home page to reflect the empty state
                        setTimeout(() => {
                            window.location.hash = '#/';
                            window.location.reload();
                        }, 1000);
                    } catch (error) {
                        console.error('Error clearing data:', error);
                        showToast(error.message || 'Failed to clear data. Please try again.', 'error', {
                            duration: 5000,
                            actions: [{
                                label: 'Retry',
                                onClick: () => clearDataBtn.click()
                            }]
                        });
                    }
                } else if (confirmation !== null && confirmation !== '') {
                    showToast('Deletion cancelled. You must type "DELETE" to confirm.', 'info');
                } else {
                    showToast('Action cancelled.', 'info');
                }
            });
        }
    }
};