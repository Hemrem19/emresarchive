/**
 * Folders Handler
 * Handles creating, renaming, deleting, selecting folders and assigning papers to folders
 */

import { getAllFolders, addFolder, updateFolder, deleteFolder, addPaperToFolder, removePaperFromFolder, getAllPaperFolders, removeAllPaperFoldersForFolder } from '../../db.js';
import { renderSidebarFolders, showToast, escapeHtml } from '../../ui.js';

/**
 * Rebuilds the paperFoldersMap in appState from all paper-folder records.
 */
async function refreshPaperFoldersMap(appState) {
    const records = await getAllPaperFolders();
    const map = {};
    for (const r of records) {
        if (!map[r.paperId]) map[r.paperId] = new Set();
        map[r.paperId].add(r.folderId);
    }
    appState.paperFoldersMap = map;
}

/**
 * Refreshes folders cache and re-renders sidebar.
 */
async function refreshFoldersSidebar(appState) {
    appState.foldersCache = await getAllFolders();
    renderSidebarFolders(appState.foldersCache, appState.paperFoldersMap, appState.activeFolderId);
}

/**
 * Shows an inline text input in the sidebar for folder creation.
 */
function handleCreateFolder(appState, applyFiltersAndRender) {
    // Find the input container in both desktop and mobile sidebars
    const containers = document.querySelectorAll('#folder-create-input-container');
    if (containers.length === 0) return;

    // Check if already showing input
    if (containers[0].querySelector('input')) return;

    const inputHtml = `
        <div class="px-3 py-1 flex gap-1">
            <input type="text" class="folder-name-input flex-1 bg-slate-800 border border-blue-500/50 rounded-lg px-3 py-1.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50" placeholder="Folder name...">
            <button class="folder-create-confirm-btn p-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white transition-colors flex-shrink-0" title="Create folder">
                <span class="material-symbols-outlined text-sm">check</span>
            </button>
        </div>
    `;

    containers.forEach(c => { c.innerHTML = inputHtml; });

    let submitted = false;

    const handleSubmit = async (sourceInput) => {
        if (submitted) return;
        submitted = true;

        const name = (sourceInput || document.querySelector('.folder-name-input'))?.value.trim();
        containers.forEach(c => { c.innerHTML = ''; });

        if (!name) return;

        try {
            await addFolder({ name });
            await refreshFoldersSidebar(appState);
            showToast(`Folder "${name}" created`, 'success', { duration: 2000 });
        } catch (error) {
            console.error('Error creating folder:', error);
            showToast(error.message || 'Failed to create folder.', 'error', { duration: 4000 });
        }
    };

    // Attach handlers to all inputs (desktop + mobile sidebars both render one)
    document.querySelectorAll('.folder-name-input').forEach(inp => {
        inp.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                handleSubmit(inp);
            } else if (e.key === 'Escape') {
                containers.forEach(c => { c.innerHTML = ''; });
            }
        });

        inp.addEventListener('blur', () => {
            setTimeout(() => {
                if (!submitted && document.querySelector('.folder-name-input')) {
                    containers.forEach(c => { c.innerHTML = ''; });
                }
            }, 200);
        });
    });

    // Confirm button handler
    document.querySelectorAll('.folder-create-confirm-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const inp = btn.closest('div').querySelector('.folder-name-input');
            handleSubmit(inp);
        });
    });

    // Focus the first visible input
    const firstInput = document.querySelector('.folder-name-input');
    if (firstInput) firstInput.focus();
}

/**
 * Shows an inline text input to rename a folder.
 */
function handleRenameFolder(folderId, appState, applyFiltersAndRender) {
    const folder = appState.foldersCache.find(f => f.id === folderId);
    if (!folder) return;

    // Replace folder name span with input in all sidebar instances
    const folderItems = document.querySelectorAll(`.folder-item[data-folder-id="${folderId}"]`);
    folderItems.forEach(item => {
        const nameSpan = item.querySelector('.folder-name');
        if (!nameSpan) return;

        const input = document.createElement('input');
        input.type = 'text';
        input.value = folder.name;
        input.className = 'folder-rename-input w-full bg-slate-800 border border-blue-500/50 rounded px-2 py-0.5 text-sm text-white focus:outline-none focus:ring-1 focus:ring-blue-500/50';

        nameSpan.replaceWith(input);
        input.focus();
        input.select();

        const handleSubmit = async () => {
            const newName = input.value.trim();
            if (!newName || newName === folder.name) {
                await refreshFoldersSidebar(appState);
                return;
            }

            try {
                await updateFolder(folderId, { name: newName });
                await refreshFoldersSidebar(appState);
                showToast(`Folder renamed to "${newName}"`, 'success', { duration: 2000 });
            } catch (error) {
                console.error('Error renaming folder:', error);
                showToast(error.message || 'Failed to rename folder.', 'error', { duration: 4000 });
                await refreshFoldersSidebar(appState);
            }
        };

        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                handleSubmit();
            } else if (e.key === 'Escape') {
                refreshFoldersSidebar(appState);
            }
        });

        input.addEventListener('blur', () => {
            setTimeout(() => {
                if (document.querySelector('.folder-rename-input')) {
                    handleSubmit();
                }
            }, 100);
        });

        // Prevent the click from navigating to the folder
        input.addEventListener('click', (e) => e.preventDefault());
    });
}

/**
 * Deletes a folder after confirmation.
 */
async function handleDeleteFolder(folderId, appState, applyFiltersAndRender) {
    const folder = appState.foldersCache.find(f => f.id === folderId);
    if (!folder) return;

    const confirmed = confirm(`Delete folder "${folder.name}"?\n\nPapers in this folder will not be deleted.`);
    if (!confirmed) return;

    try {
        await deleteFolder(folderId);

        // If this was the active folder, clear it
        if (appState.activeFolderId === folderId) {
            appState.activeFolderId = null;
            window.location.hash = '#/app';
        }

        await refreshPaperFoldersMap(appState);
        await refreshFoldersSidebar(appState);
        applyFiltersAndRender();
        showToast(`Folder "${folder.name}" deleted`, 'success', { duration: 2000 });
    } catch (error) {
        console.error('Error deleting folder:', error);
        showToast(error.message || 'Failed to delete folder.', 'error', { duration: 4000 });
    }
}

/**
 * Shows a dropdown popover with folder checkboxes for assigning a paper.
 */
function handleAssignFolder(paperId, appState, applyFiltersAndRender) {
    // Remove any existing popover
    document.querySelectorAll('.folder-assign-popover').forEach(el => el.remove());

    const btn = document.querySelector(`.assign-folder-btn[data-paper-id="${paperId}"]`);
    if (!btn) return;

    const currentFolderIds = appState.paperFoldersMap[paperId] || new Set();

    const popoverHtml = `
        <div class="folder-assign-popover absolute z-50 mt-1 w-56 bg-slate-800 border border-slate-700 rounded-lg shadow-xl py-2" style="right: 0;">
            ${appState.foldersCache.length === 0 ? `
                <div class="px-3 py-2 text-xs text-slate-500">No folders yet</div>
            ` : `
                ${appState.foldersCache.map(folder => `
                    <label class="flex items-center gap-2 px-3 py-1.5 hover:bg-slate-700/50 cursor-pointer transition-colors">
                        <input type="checkbox" class="folder-assign-checkbox w-4 h-4 text-blue-500 border-slate-600 rounded focus:ring-blue-500 bg-slate-800/50 cursor-pointer" data-folder-id="${folder.id}" ${currentFolderIds.has(folder.id) ? 'checked' : ''}>
                        <span class="material-symbols-outlined text-sm text-slate-400">folder</span>
                        <span class="text-sm text-slate-300 truncate">${escapeHtml(folder.name)}</span>
                    </label>
                `).join('')}
            `}
            <div class="border-t border-slate-700 mt-1 pt-1">
                <button class="folder-assign-create-btn w-full text-left px-3 py-1.5 text-xs text-blue-400 hover:bg-slate-700/50 transition-colors flex items-center gap-2">
                    <span class="material-symbols-outlined text-sm">add</span>
                    New folder
                </button>
            </div>
        </div>
    `;

    // Position relative to the button
    const wrapper = document.createElement('div');
    wrapper.className = 'relative inline-block';
    wrapper.innerHTML = popoverHtml;

    btn.parentElement.style.position = 'relative';
    btn.parentElement.appendChild(wrapper);

    const popover = wrapper.querySelector('.folder-assign-popover');

    // Handle checkbox changes
    popover.querySelectorAll('.folder-assign-checkbox').forEach(checkbox => {
        checkbox.addEventListener('change', async (e) => {
            const folderId = parseInt(e.target.dataset.folderId, 10);
            try {
                if (e.target.checked) {
                    await addPaperToFolder(paperId, folderId);
                    if (!appState.paperFoldersMap[paperId]) appState.paperFoldersMap[paperId] = new Set();
                    appState.paperFoldersMap[paperId].add(folderId);
                } else {
                    await removePaperFromFolder(paperId, folderId);
                    if (appState.paperFoldersMap[paperId]) {
                        appState.paperFoldersMap[paperId].delete(folderId);
                    }
                }
                renderSidebarFolders(appState.foldersCache, appState.paperFoldersMap, appState.activeFolderId);
                // Re-render if viewing a folder (paper may need to appear/disappear)
                if (appState.activeFolderId) {
                    applyFiltersAndRender();
                }
            } catch (error) {
                console.error('Error toggling paper-folder assignment:', error);
                showToast('Failed to update folder assignment.', 'error');
                e.target.checked = !e.target.checked; // revert
            }
        });
    });

    // Handle "New folder" button
    const createBtn = popover.querySelector('.folder-assign-create-btn');
    if (createBtn) {
        createBtn.addEventListener('click', async () => {
            const name = prompt('Folder name:');
            if (!name || !name.trim()) return;

            try {
                const folderId = await addFolder({ name: name.trim() });
                await addPaperToFolder(paperId, folderId);
                if (!appState.paperFoldersMap[paperId]) appState.paperFoldersMap[paperId] = new Set();
                appState.paperFoldersMap[paperId].add(folderId);
                appState.foldersCache = await getAllFolders();
                renderSidebarFolders(appState.foldersCache, appState.paperFoldersMap, appState.activeFolderId);
                wrapper.remove();
                showToast(`Created folder "${name.trim()}" and added paper`, 'success', { duration: 2000 });
            } catch (error) {
                console.error('Error creating folder from popover:', error);
                showToast(error.message || 'Failed to create folder.', 'error');
            }
        });
    }

    // Close on outside click
    const closePopover = (e) => {
        if (!wrapper.contains(e.target) && e.target !== btn && !btn.contains(e.target)) {
            wrapper.remove();
            document.removeEventListener('click', closePopover);
        }
    };

    // Delay to avoid immediate close from the button click
    setTimeout(() => {
        document.addEventListener('click', closePopover);
    }, 0);
}

/**
 * Registers folder event listeners using event delegation.
 */
export function registerFolderHandlers(appState, applyFiltersAndRender) {
    const handlers = {};

    const handleFolderEvents = async (e) => {
        // Create folder button
        const createBtn = e.target.closest('#create-folder-btn');
        if (createBtn) {
            e.preventDefault();
            handleCreateFolder(appState, applyFiltersAndRender);
            return;
        }

        // Rename folder button
        const renameBtn = e.target.closest('.rename-folder-btn');
        if (renameBtn) {
            e.stopPropagation();
            e.preventDefault();
            const folderId = parseInt(renameBtn.dataset.folderId, 10);
            handleRenameFolder(folderId, appState, applyFiltersAndRender);
            return;
        }

        // Delete folder button
        const deleteBtn = e.target.closest('.delete-folder-btn');
        if (deleteBtn) {
            e.stopPropagation();
            e.preventDefault();
            const folderId = parseInt(deleteBtn.dataset.folderId, 10);
            await handleDeleteFolder(folderId, appState, applyFiltersAndRender);
            return;
        }
    };

    // Handle assign-folder button clicks on paper cards (delegated from paper list)
    const handlePaperListFolderEvents = (e) => {
        const assignBtn = e.target.closest('.assign-folder-btn');
        if (assignBtn) {
            e.stopPropagation();
            e.preventDefault();
            const paperId = parseInt(assignBtn.dataset.paperId, 10);
            handleAssignFolder(paperId, appState, applyFiltersAndRender);
        }
    };

    // Desktop sidebar
    const desktopSidebar = document.getElementById('sidebar-folders-section');
    if (desktopSidebar) {
        handlers.folderDesktopHandler = handleFolderEvents;
        desktopSidebar.addEventListener('click', handlers.folderDesktopHandler);
    }

    // Mobile sidebar
    const mobileSidebar = document.getElementById('mobile-sidebar-folders-section');
    if (mobileSidebar) {
        handlers.folderMobileHandler = handleFolderEvents;
        mobileSidebar.addEventListener('click', handlers.folderMobileHandler);
    }

    // Paper list (for assign-folder buttons)
    const paperList = document.getElementById('paper-list');
    if (paperList) {
        handlers.folderPaperListHandler = handlePaperListFolderEvents;
        paperList.addEventListener('click', handlers.folderPaperListHandler);
    }

    return handlers;
}

/**
 * Unregisters folder event listeners.
 */
export function unregisterFolderHandlers(handlers) {
    const desktopSidebar = document.getElementById('sidebar-folders-section');
    if (desktopSidebar && handlers.folderDesktopHandler) {
        desktopSidebar.removeEventListener('click', handlers.folderDesktopHandler);
    }

    const mobileSidebar = document.getElementById('mobile-sidebar-folders-section');
    if (mobileSidebar && handlers.folderMobileHandler) {
        mobileSidebar.removeEventListener('click', handlers.folderMobileHandler);
    }

    const paperList = document.getElementById('paper-list');
    if (paperList && handlers.folderPaperListHandler) {
        paperList.removeEventListener('click', handlers.folderPaperListHandler);
    }
}
