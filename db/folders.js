/**
 * Folders Module
 * Handles all CRUD operations for paper folders
 */

import { openDB, STORE_NAME_FOLDERS } from './core.js';

/**
 * Adds a new folder to the database.
 * @param {Object} folderData - The folder data (name, color).
 * @returns {Promise<number>} A promise that resolves with the ID of the newly added folder.
 */
async function addFolder(folderData) {
    if (!folderData || typeof folderData !== 'object') {
        throw new Error('Invalid folder data: Folder data must be a valid object.');
    }

    if (!folderData.name || !folderData.name.trim()) {
        throw new Error('Invalid folder data: Name is required.');
    }

    const folder = {
        color: null,
        position: 0,
        ...folderData,
        name: folderData.name.trim(),
        createdAt: folderData.createdAt || new Date(),
        updatedAt: new Date()
    };

    try {
        const database = await openDB();
        return new Promise((resolve, reject) => {
            const transaction = database.transaction([STORE_NAME_FOLDERS], 'readwrite');
            const store = transaction.objectStore(STORE_NAME_FOLDERS);
            const request = store.add(folder);

            request.onsuccess = (event) => resolve(event.target.result);
            request.onerror = (event) => {
                const error = event.target.error;
                console.error('Error adding folder:', error);
                if (error.name === 'QuotaExceededError') {
                    reject(new Error('Storage quota exceeded: Unable to save folder.'));
                } else {
                    reject(new Error(`Failed to add folder: ${error.message || 'Unknown error occurred.'}`));
                }
            };
        });
    } catch (error) {
        console.error('Error in addFolder:', error);
        throw error;
    }
}

/**
 * Retrieves all folders from the database, sorted by position then creation date.
 * @returns {Promise<Array<Object>>} A promise that resolves with an array of all folder objects.
 */
async function getAllFolders() {
    try {
        const database = await openDB();
        return new Promise((resolve, reject) => {
            const transaction = database.transaction([STORE_NAME_FOLDERS], 'readonly');
            const store = transaction.objectStore(STORE_NAME_FOLDERS);
            const request = store.getAll();

            request.onsuccess = (event) => {
                try {
                    const folders = event.target.result || [];
                    resolve(folders.sort((a, b) => {
                        if (a.position !== b.position) return a.position - b.position;
                        return new Date(a.createdAt) - new Date(b.createdAt);
                    }));
                } catch (sortError) {
                    console.error('Error sorting folders:', sortError);
                    resolve(event.target.result || []);
                }
            };

            request.onerror = (event) => {
                console.error('Error fetching folders:', event.target.error);
                reject(new Error('Failed to retrieve folders: Database read error.'));
            };
        });
    } catch (error) {
        console.error('Error in getAllFolders:', error);
        throw error;
    }
}

/**
 * Retrieves a single folder by its ID.
 * @param {number} id - The ID of the folder to retrieve.
 * @returns {Promise<Object|undefined>} A promise that resolves with the folder object.
 */
async function getFolderById(id) {
    if (!id || (typeof id !== 'number' && typeof id !== 'string')) {
        throw new Error('Invalid folder ID: ID must be a valid number or string.');
    }

    try {
        const database = await openDB();
        return new Promise((resolve, reject) => {
            const transaction = database.transaction([STORE_NAME_FOLDERS], 'readonly');
            const store = transaction.objectStore(STORE_NAME_FOLDERS);
            const request = store.get(Number(id));

            request.onsuccess = (event) => resolve(event.target.result);
            request.onerror = (event) => {
                console.error(`Error fetching folder with ID ${id}:`, event.target.error);
                reject(new Error('Failed to retrieve folder: Database read error.'));
            };
        });
    } catch (error) {
        console.error('Error in getFolderById:', error);
        throw error;
    }
}

/**
 * Updates an existing folder in the database.
 * @param {number} id - The ID of the folder to update.
 * @param {Object} updateData - An object containing the fields to update.
 * @returns {Promise<number>} A promise that resolves with the ID of the updated folder.
 */
async function updateFolder(id, updateData) {
    if (!id || (typeof id !== 'number' && typeof id !== 'string')) {
        throw new Error('Invalid folder ID: ID must be a valid number or string.');
    }

    if (!updateData || typeof updateData !== 'object') {
        throw new Error('Invalid update data: Update data must be a valid object.');
    }

    try {
        const database = await openDB();
        return new Promise((resolve, reject) => {
            const transaction = database.transaction([STORE_NAME_FOLDERS], 'readwrite');
            const store = transaction.objectStore(STORE_NAME_FOLDERS);
            const getRequest = store.get(Number(id));

            getRequest.onerror = (event) => {
                console.error('Error fetching folder for update:', event.target.error);
                reject(new Error('Failed to update: Could not retrieve folder from database.'));
            };

            getRequest.onsuccess = (event) => {
                const folder = event.target.result;
                if (!folder) {
                    return reject(new Error(`Folder not found: No folder exists with ID ${id}.`));
                }

                const updatedFolder = { ...folder, ...updateData, updatedAt: new Date() };
                const putRequest = store.put(updatedFolder);

                putRequest.onsuccess = (event) => resolve(event.target.result);
                putRequest.onerror = (event) => {
                    const error = event.target.error;
                    console.error('Error updating folder:', error);
                    reject(new Error(`Failed to update folder: ${error.message || 'Unknown error occurred.'}`));
                };
            };
        });
    } catch (error) {
        console.error('Error in updateFolder:', error);
        throw error;
    }
}

/**
 * Deletes a folder from the database.
 * @param {number} id - The ID of the folder to delete.
 * @returns {Promise<void>} A promise that resolves when the folder is deleted.
 */
async function deleteFolder(id) {
    if (!id || (typeof id !== 'number' && typeof id !== 'string')) {
        throw new Error('Invalid folder ID: ID must be a valid number or string.');
    }

    try {
        const database = await openDB();
        return new Promise((resolve, reject) => {
            const transaction = database.transaction([STORE_NAME_FOLDERS], 'readwrite');
            const store = transaction.objectStore(STORE_NAME_FOLDERS);
            const request = store.delete(Number(id));

            request.onsuccess = () => resolve();
            request.onerror = (event) => {
                const error = event.target.error;
                console.error(`Error deleting folder with ID ${id}:`, error);
                reject(new Error(`Failed to delete folder: ${error.message || 'Database error occurred.'}`));
            };
        });
    } catch (error) {
        console.error('Error in deleteFolder:', error);
        throw error;
    }
}

export {
    addFolder,
    getAllFolders,
    getFolderById,
    updateFolder,
    deleteFolder
};
