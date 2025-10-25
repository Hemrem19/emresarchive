// c:/Users/hasan/Python Projects/research/db.js

const DB_NAME = 'EmresArchiveDB';
const DB_VERSION = 2; // Increment this version number if you change the schema
const STORE_NAME_PAPERS = 'papers';

let db = null;

/**
 * Opens the IndexedDB database.
 * If the database doesn't exist or the version is upgraded, it creates/updates the object stores.
 * @returns {Promise<IDBDatabase>} A promise that resolves with the database instance.
 */
async function openDB() {
    if (db) {
        return db; // Return existing instance if already open
    }

    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onupgradeneeded = (event) => {
            const dbInstance = event.target.result;
            let paperStore;
            // Create 'papers' object store
            if (!dbInstance.objectStoreNames.contains(STORE_NAME_PAPERS)) {
                paperStore = dbInstance.createObjectStore(STORE_NAME_PAPERS, { keyPath: 'id', autoIncrement: true });
                // Define indexes for common queries
                paperStore.createIndex('title', 'title', { unique: false });
                paperStore.createIndex('authors', 'authors', { unique: false });
                paperStore.createIndex('year', 'year', { unique: false });
                paperStore.createIndex('tags', 'tags', { unique: false, multiEntry: true }); // multiEntry for array of tags
            } else {
                paperStore = event.target.transaction.objectStore(STORE_NAME_PAPERS);
            }
            // Add new index for related papers in version 2
            if (!paperStore.indexNames.contains('relatedPaperIds')) {
                paperStore.createIndex('relatedPaperIds', 'relatedPaperIds', { unique: false, multiEntry: true });
            }
            // Future object stores for notes, etc., would go here
        };

        request.onsuccess = (event) => {
            db = event.target.result;
            resolve(db);
        };

        request.onerror = (event) => {
            console.error('IndexedDB error:', event.target.errorCode);
            reject(new Error('Failed to open IndexedDB.'));
        };
    });
}

/**
 * Adds a new paper record to the database.
 * @param {Object} paperData - The data for the paper to add.
 * @returns {Promise<number>} A promise that resolves with the ID of the newly added paper.
 */
async function addPaper(paperData) {
    const database = await openDB();
    return new Promise((resolve, reject) => {
        const transaction = database.transaction([STORE_NAME_PAPERS], 'readwrite');
        const store = transaction.objectStore(STORE_NAME_PAPERS);
        const request = store.add(paperData); // paperData can now include pdfFile (Blob)

        // Ensure paperData includes a default readingStatus if not provided
        request.onsuccess = (event) => resolve(event.target.result);
        request.onerror = (event) => {
            console.error('Error adding paper:', event.target.error);
            reject(event.target.error);
        };
    });
}

/**
 * Retrieves all papers from the database, sorted by creation date descending.
 * @returns {Promise<Array<Object>>} A promise that resolves with an array of all paper objects.
 */
async function getAllPapers() {
    const database = await openDB();
    return new Promise((resolve, reject) => {
        const transaction = database.transaction([STORE_NAME_PAPERS], 'readonly');
        const store = transaction.objectStore(STORE_NAME_PAPERS);
        const request = store.getAll();

        request.onsuccess = (event) => {
            // Sort by creation date, newest first
            resolve(event.target.result.sort((a, b) => b.createdAt - a.createdAt));
        };

        request.onerror = (event) => reject(event.target.error);
    });
}

/**
 * Retrieves a single paper by its ID.
 * @param {number} id - The ID of the paper to retrieve.
 * @returns {Promise<Object|undefined>} A promise that resolves with the paper object, or undefined if not found.
 */
async function getPaperById(id) {
    const database = await openDB();
    return new Promise((resolve, reject) => {
        const transaction = database.transaction([STORE_NAME_PAPERS], 'readonly');
        const store = transaction.objectStore(STORE_NAME_PAPERS);
        const request = store.get(id);

        request.onsuccess = (event) => resolve(event.target.result);
        request.onerror = (event) => {
            console.error(`Error fetching paper with ID ${id}:`, event.target.error);
            reject(event.target.error);
        };
    });
}

/**
 * Updates an existing paper record in the database.
 * @param {number} id - The ID of the paper to update.
 * @param {Object} updateData - An object containing the fields to update.
 * @returns {Promise<number>} A promise that resolves with the ID of the updated paper.
 */
async function updatePaper(id, updateData) {
    const database = await openDB();
    return new Promise((resolve, reject) => {
        const transaction = database.transaction([STORE_NAME_PAPERS], 'readwrite');
        const store = transaction.objectStore(STORE_NAME_PAPERS);

        const getRequest = store.get(id);

        getRequest.onerror = (event) => reject(event.target.error);

        getRequest.onsuccess = (event) => {
            const paper = event.target.result;
            if (!paper) {
                return reject(new Error(`Paper with ID ${id} not found.`));
            }

            const updatedPaper = { ...paper, ...updateData, updatedAt: new Date() };
            const putRequest = store.put(updatedPaper);
            putRequest.onsuccess = (event) => resolve(event.target.result);
            putRequest.onerror = (event) => reject(event.target.error);
        };
    });
}

/**
 * Deletes a paper record from the database.
 * @param {number} id - The ID of the paper to delete.
 * @returns {Promise<void>} A promise that resolves when the paper is deleted.
 */
async function deletePaper(id) {
    const database = await openDB();
    return new Promise((resolve, reject) => {
        const transaction = database.transaction([STORE_NAME_PAPERS], 'readwrite');
        const store = transaction.objectStore(STORE_NAME_PAPERS);
        const request = store.delete(id);

        request.onsuccess = () => resolve();
        request.onerror = (event) => {
            console.error(`Error deleting paper with ID ${id}:`, event.target.error);
            reject(event.target.error);
        };
    });
}

/**
 * Exports all data from the database into a serializable format.
 * Converts any Blob data (like PDFs) into Base64 strings.
 * @returns {Promise<Array<Object>>} A promise that resolves with an array of all paper objects, ready for JSON serialization.
 */
async function exportAllData() {
    const papers = await getAllPapers();
    const serializablePapers = [];

    for (const paper of papers) {
        const serializablePaper = { ...paper };
        if (paper.pdfFile instanceof Blob) {
            // Convert Blob to Base64 string to make it JSON-serializable
            serializablePaper.pdfFile = await new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onloadend = () => resolve(reader.result);
                reader.onerror = reject;
                reader.readAsDataURL(paper.pdfFile);
            });
        }
        serializablePapers.push(serializablePaper);
    }
    return serializablePapers;
}

/**
 * Imports data from a backup file, overwriting all existing data.
 * @param {Array<Object>} papersToImport - An array of paper objects to import.
 * @returns {Promise<void>} A promise that resolves when the import is complete.
 */
async function importData(papersToImport) {
    const database = await openDB();
    return new Promise((resolve, reject) => {
        const transaction = database.transaction([STORE_NAME_PAPERS], 'readwrite');
        const store = transaction.objectStore(STORE_NAME_PAPERS);

        // 1. Clear all existing data
        const clearRequest = store.clear();
        clearRequest.onerror = (event) => reject(event.target.error);

        clearRequest.onsuccess = async () => {
            // 2. Add all new papers
            try {
                const paperPromises = papersToImport.map(async (paper) => {
                    const paperToStore = { ...paper };
                    // Convert Base64 back to Blob if it exists
                    if (paperToStore.pdfFile && typeof paperToStore.pdfFile === 'string' && paperToStore.pdfFile.startsWith('data:')) {
                        const fetchRes = await fetch(paperToStore.pdfFile);
                        paperToStore.pdfFile = await fetchRes.blob();
                    }
                    return store.add(paperToStore);
                });
                await Promise.all(paperPromises);
            } catch (error) {
                transaction.abort();
                reject(error);
            }
        };

        transaction.oncomplete = () => {
            resolve();
        };

        transaction.onerror = (event) => {
            reject(event.target.error);
        };
    });
}

// Export functions for use in other modules
export { openDB, addPaper, getAllPapers, getPaperById, updatePaper, deletePaper, exportAllData, importData, STORE_NAME_PAPERS };