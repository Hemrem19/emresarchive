/**
 * Paper-Folders Junction Module
 * Handles associations between papers and folders
 */

import { openDB, STORE_NAME_PAPER_FOLDERS } from './core.js';

/**
 * Adds a paper to a folder. No-op if the association already exists.
 * @param {number} paperId - The paper ID.
 * @param {number} folderId - The folder ID.
 * @returns {Promise<number>} The ID of the junction record.
 */
async function addPaperToFolder(paperId, folderId) {
    if (!paperId || !folderId) {
        throw new Error('Invalid arguments: Both paperId and folderId are required.');
    }

    try {
        const database = await openDB();
        return new Promise((resolve, reject) => {
            const transaction = database.transaction([STORE_NAME_PAPER_FOLDERS], 'readwrite');
            const store = transaction.objectStore(STORE_NAME_PAPER_FOLDERS);
            const index = store.index('paperFolder');

            // Check for existing association
            const checkRequest = index.get([Number(paperId), Number(folderId)]);

            checkRequest.onsuccess = (event) => {
                if (event.target.result) {
                    // Already exists, return existing ID
                    resolve(event.target.result.id);
                    return;
                }

                const record = {
                    paperId: Number(paperId),
                    folderId: Number(folderId),
                    addedAt: new Date()
                };

                const addRequest = store.add(record);
                addRequest.onsuccess = (event) => resolve(event.target.result);
                addRequest.onerror = (event) => {
                    console.error('Error adding paper to folder:', event.target.error);
                    reject(new Error('Failed to add paper to folder.'));
                };
            };

            checkRequest.onerror = (event) => {
                console.error('Error checking paper-folder association:', event.target.error);
                reject(new Error('Failed to check existing association.'));
            };
        });
    } catch (error) {
        console.error('Error in addPaperToFolder:', error);
        throw error;
    }
}

/**
 * Removes a paper from a folder.
 * @param {number} paperId - The paper ID.
 * @param {number} folderId - The folder ID.
 * @returns {Promise<void>}
 */
async function removePaperFromFolder(paperId, folderId) {
    if (!paperId || !folderId) {
        throw new Error('Invalid arguments: Both paperId and folderId are required.');
    }

    try {
        const database = await openDB();
        return new Promise((resolve, reject) => {
            const transaction = database.transaction([STORE_NAME_PAPER_FOLDERS], 'readwrite');
            const store = transaction.objectStore(STORE_NAME_PAPER_FOLDERS);
            const index = store.index('paperFolder');

            const request = index.openCursor(IDBKeyRange.only([Number(paperId), Number(folderId)]));

            request.onsuccess = (event) => {
                const cursor = event.target.result;
                if (cursor) {
                    cursor.delete();
                }
                resolve();
            };

            request.onerror = (event) => {
                console.error('Error removing paper from folder:', event.target.error);
                reject(new Error('Failed to remove paper from folder.'));
            };
        });
    } catch (error) {
        console.error('Error in removePaperFromFolder:', error);
        throw error;
    }
}

/**
 * Gets all folder IDs for a given paper.
 * @param {number} paperId - The paper ID.
 * @returns {Promise<number[]>} Array of folder IDs.
 */
async function getFolderIdsByPaperId(paperId) {
    if (!paperId) {
        throw new Error('Invalid paper ID.');
    }

    try {
        const database = await openDB();
        return new Promise((resolve, reject) => {
            const transaction = database.transaction([STORE_NAME_PAPER_FOLDERS], 'readonly');
            const store = transaction.objectStore(STORE_NAME_PAPER_FOLDERS);
            const index = store.index('paperId');
            const request = index.getAll(Number(paperId));

            request.onsuccess = (event) => {
                const records = event.target.result || [];
                resolve(records.map(r => r.folderId));
            };

            request.onerror = (event) => {
                console.error('Error getting folders for paper:', event.target.error);
                reject(new Error('Failed to get folders for paper.'));
            };
        });
    } catch (error) {
        console.error('Error in getFolderIdsByPaperId:', error);
        throw error;
    }
}

/**
 * Gets all paper IDs in a given folder.
 * @param {number} folderId - The folder ID.
 * @returns {Promise<number[]>} Array of paper IDs.
 */
async function getPaperIdsByFolderId(folderId) {
    if (!folderId) {
        throw new Error('Invalid folder ID.');
    }

    try {
        const database = await openDB();
        return new Promise((resolve, reject) => {
            const transaction = database.transaction([STORE_NAME_PAPER_FOLDERS], 'readonly');
            const store = transaction.objectStore(STORE_NAME_PAPER_FOLDERS);
            const index = store.index('folderId');
            const request = index.getAll(Number(folderId));

            request.onsuccess = (event) => {
                const records = event.target.result || [];
                resolve(records.map(r => r.paperId));
            };

            request.onerror = (event) => {
                console.error('Error getting papers in folder:', event.target.error);
                reject(new Error('Failed to get papers in folder.'));
            };
        });
    } catch (error) {
        console.error('Error in getPaperIdsByFolderId:', error);
        throw error;
    }
}

/**
 * Removes all paper associations for a folder (used when deleting a folder).
 * @param {number} folderId - The folder ID.
 * @returns {Promise<void>}
 */
async function removeAllForFolder(folderId) {
    if (!folderId) {
        throw new Error('Invalid folder ID.');
    }

    try {
        const database = await openDB();
        return new Promise((resolve, reject) => {
            const transaction = database.transaction([STORE_NAME_PAPER_FOLDERS], 'readwrite');
            const store = transaction.objectStore(STORE_NAME_PAPER_FOLDERS);
            const index = store.index('folderId');
            const request = index.openCursor(Number(folderId));

            request.onsuccess = (event) => {
                const cursor = event.target.result;
                if (cursor) {
                    cursor.delete();
                    cursor.continue();
                } else {
                    resolve();
                }
            };

            request.onerror = (event) => {
                console.error('Error removing all papers from folder:', event.target.error);
                reject(new Error('Failed to remove all papers from folder.'));
            };
        });
    } catch (error) {
        console.error('Error in removeAllForFolder:', error);
        throw error;
    }
}

/**
 * Removes all folder associations for a paper (used when deleting a paper).
 * @param {number} paperId - The paper ID.
 * @returns {Promise<void>}
 */
async function removeAllForPaper(paperId) {
    if (!paperId) {
        throw new Error('Invalid paper ID.');
    }

    try {
        const database = await openDB();
        return new Promise((resolve, reject) => {
            const transaction = database.transaction([STORE_NAME_PAPER_FOLDERS], 'readwrite');
            const store = transaction.objectStore(STORE_NAME_PAPER_FOLDERS);
            const index = store.index('paperId');
            const request = index.openCursor(Number(paperId));

            request.onsuccess = (event) => {
                const cursor = event.target.result;
                if (cursor) {
                    cursor.delete();
                    cursor.continue();
                } else {
                    resolve();
                }
            };

            request.onerror = (event) => {
                console.error('Error removing all folders from paper:', event.target.error);
                reject(new Error('Failed to remove all folders from paper.'));
            };
        });
    } catch (error) {
        console.error('Error in removeAllForPaper:', error);
        throw error;
    }
}

/**
 * Gets the count of papers in a folder.
 * @param {number} folderId - The folder ID.
 * @returns {Promise<number>} The count of papers.
 */
async function getPaperCountByFolderId(folderId) {
    if (!folderId) {
        throw new Error('Invalid folder ID.');
    }

    try {
        const database = await openDB();
        return new Promise((resolve, reject) => {
            const transaction = database.transaction([STORE_NAME_PAPER_FOLDERS], 'readonly');
            const store = transaction.objectStore(STORE_NAME_PAPER_FOLDERS);
            const index = store.index('folderId');
            const request = index.count(Number(folderId));

            request.onsuccess = (event) => resolve(event.target.result);
            request.onerror = (event) => {
                console.error('Error counting papers in folder:', event.target.error);
                reject(new Error('Failed to count papers in folder.'));
            };
        });
    } catch (error) {
        console.error('Error in getPaperCountByFolderId:', error);
        throw error;
    }
}

/**
 * Gets all paper-folder records (used for building the full map on mount).
 * @returns {Promise<Array<{paperId: number, folderId: number}>>}
 */
async function getAllPaperFolders() {
    try {
        const database = await openDB();
        return new Promise((resolve, reject) => {
            const transaction = database.transaction([STORE_NAME_PAPER_FOLDERS], 'readonly');
            const store = transaction.objectStore(STORE_NAME_PAPER_FOLDERS);
            const request = store.getAll();

            request.onsuccess = (event) => resolve(event.target.result || []);
            request.onerror = (event) => {
                console.error('Error fetching all paper-folder records:', event.target.error);
                reject(new Error('Failed to retrieve paper-folder records.'));
            };
        });
    } catch (error) {
        console.error('Error in getAllPaperFolders:', error);
        throw error;
    }
}

export {
    addPaperToFolder,
    removePaperFromFolder,
    getFolderIdsByPaperId,
    getPaperIdsByFolderId,
    removeAllForFolder,
    removeAllForPaper,
    getPaperCountByFolderId,
    getAllPaperFolders
};
