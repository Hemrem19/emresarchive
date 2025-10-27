import { getAllPapers, exportAllData, importData, clearAllData } from './db.js';
import { showToast } from './ui.js';
import { generateCitation } from './citation.js';
import { getStatusOrder, saveStatusOrder } from './config.js';

export const settingsView = {
    async mount(appState) {
        this.setupAppearance();
        this.setupCitationGeneration();
        this.setupStatistics();
        this.setupStatusReordering();
        this.setupImportExport(appState);
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
                    a.download = `emres-archive-backup-${date}.json`;
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
                        setTimeout(() => {
                            window.location.hash = '#/';
                            window.location.reload();
                        }, 1000);
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