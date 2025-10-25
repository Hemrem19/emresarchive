import { getAllPapers, exportAllData, importData } from './db.js';
import { showToast } from './ui.js';
import { generateCitation } from './citation.js';

export const settingsView = {
    async mount(appState) {
        this.setupAppearance();
        this.setupCitationGeneration();
        this.setupStatistics();
        this.setupImportExport(appState);
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

                const statusOrder = ['Reading', 'To Read', 'Finished', 'Archived', 'Unknown'];
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

    setupImportExport(appState) {
        const exportBtn = document.getElementById('export-btn');
        const importBtn = document.getElementById('import-btn');
        const importFileInput = document.getElementById('import-file-input');

        if (exportBtn && importBtn && importFileInput) {
            const exportHandler = async () => {
                try {
                    showToast('Exporting data... Please wait.');
                    const data = await exportAllData();
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
                    showToast('Export complete!');
                } catch (error) {
                    showToast('Export failed.', 'error');
                    console.error('Export failed:', error);
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
                        const papersToImport = JSON.parse(e.target.result);
                        await importData(papersToImport);
                        showToast('Import successful! Library has been restored.');
                        appState.allPapersCache = []; // Clear cache in app state
                        window.location.hash = '#/';
                    } catch (error) {
                        showToast('Import failed. The file may be corrupt or in the wrong format.', 'error');
                        console.error('Import failed:', error);
                    }
                };
                reader.readAsText(file);
            };
            importFileInput.addEventListener('change', fileChangeHandler);
        }
    }
};