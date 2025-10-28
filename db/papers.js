/**
 * Papers Module
 * Handles all CRUD operations for research papers
 */

import { openDB, STORE_NAME_PAPERS } from './core.js';

/**
 * Adds a new paper record to the database with validation and error handling.
 * @param {Object} paperData - The data for the paper to add.
 * @returns {Promise<number>} A promise that resolves with the ID of the newly added paper.
 * @throws {Error} Throws descriptive errors for validation or storage failures.
 */
async function addPaper(paperData) {
    // Validate paper data
    if (!paperData || typeof paperData !== 'object') {
        throw new Error('Invalid paper data: Paper data must be a valid object.');
    }
    
    if (!paperData.title || !paperData.title.trim()) {
        throw new Error('Invalid paper data: Title is required.');
    }

    try {
        const database = await openDB();
        return new Promise((resolve, reject) => {
            const transaction = database.transaction([STORE_NAME_PAPERS], 'readwrite');
            const store = transaction.objectStore(STORE_NAME_PAPERS);
            const request = store.add(paperData);

            request.onsuccess = (event) => resolve(event.target.result);
            
            request.onerror = (event) => {
                const error = event.target.error;
                console.error('Error adding paper:', error);
                
                let errorMessage = 'Failed to add paper: ';
                
                if (error.name === 'QuotaExceededError') {
                    errorMessage = 'Storage quota exceeded: Your browser storage is full. Please delete old papers or reduce PDF file sizes.';
                } else if (error.name === 'ConstraintError') {
                    errorMessage = 'Duplicate paper: This paper already exists in your library.';
                } else if (error.name === 'DataError') {
                    errorMessage = 'Invalid paper data: The paper data contains invalid values.';
                } else {
                    errorMessage += error.message || 'Unknown error occurred while saving.';
                }
                
                reject(new Error(errorMessage));
            };
        });
    } catch (error) {
        console.error('Error in addPaper:', error);
        throw error;
    }
}

/**
 * Retrieves all papers from the database, sorted by creation date descending.
 * @returns {Promise<Array<Object>>} A promise that resolves with an array of all paper objects.
 * @throws {Error} Throws descriptive errors if retrieval fails.
 */
async function getAllPapers() {
    try {
        const database = await openDB();
        return new Promise((resolve, reject) => {
            const transaction = database.transaction([STORE_NAME_PAPERS], 'readonly');
            const store = transaction.objectStore(STORE_NAME_PAPERS);
            const request = store.getAll();

            request.onsuccess = (event) => {
                try {
                    const papers = event.target.result || [];
                    // Sort by creation date, newest first
                    resolve(papers.sort((a, b) => b.createdAt - a.createdAt));
                } catch (sortError) {
                    console.error('Error sorting papers:', sortError);
                    // Return unsorted if sorting fails
                    resolve(event.target.result || []);
                }
            };

            request.onerror = (event) => {
                console.error('Error fetching papers:', event.target.error);
                reject(new Error('Failed to retrieve papers: Database read error. Please refresh and try again.'));
            };
        });
    } catch (error) {
        console.error('Error in getAllPapers:', error);
        throw error;
    }
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
 * Retrieves a single paper by its DOI.
 * @param {string} doi - The DOI of the paper to retrieve.
 * @returns {Promise<Object|undefined>} A promise that resolves with the paper object, or undefined if not found.
 */
async function getPaperByDoi(doi) {
    // An empty or null DOI can't be a duplicate.
    if (!doi) return Promise.resolve(undefined);

    const database = await openDB();
    return new Promise((resolve, reject) => {
        const transaction = database.transaction([STORE_NAME_PAPERS], 'readonly');
        const store = transaction.objectStore(STORE_NAME_PAPERS);
        const index = store.index('doi');
        const request = index.get(doi);

        request.onsuccess = (event) => resolve(event.target.result);
        request.onerror = (event) => {
            console.error(`Error fetching paper with DOI ${doi}:`, event.target.error);
            reject(event.target.error);
        };
    });
}

/**
 * Updates an existing paper record in the database with validation and error handling.
 * @param {number} id - The ID of the paper to update.
 * @param {Object} updateData - An object containing the fields to update.
 * @returns {Promise<number>} A promise that resolves with the ID of the updated paper.
 * @throws {Error} Throws descriptive errors for validation or update failures.
 */
async function updatePaper(id, updateData) {
    // Validate inputs
    if (!id || (typeof id !== 'number' && typeof id !== 'string')) {
        throw new Error('Invalid paper ID: ID must be a valid number or string.');
    }
    
    if (!updateData || typeof updateData !== 'object') {
        throw new Error('Invalid update data: Update data must be a valid object.');
    }

    try {
        const database = await openDB();
        return new Promise((resolve, reject) => {
            const transaction = database.transaction([STORE_NAME_PAPERS], 'readwrite');
            const store = transaction.objectStore(STORE_NAME_PAPERS);

            const getRequest = store.get(Number(id));

            getRequest.onerror = (event) => {
                console.error('Error fetching paper for update:', event.target.error);
                reject(new Error('Failed to update: Could not retrieve paper from database.'));
            };

            getRequest.onsuccess = (event) => {
                const paper = event.target.result;
                if (!paper) {
                    return reject(new Error(`Paper not found: No paper exists with ID ${id}.`));
                }

                const updatedPaper = { ...paper, ...updateData, updatedAt: new Date() };
                const putRequest = store.put(updatedPaper);
                
                putRequest.onsuccess = (event) => resolve(event.target.result);
                
                putRequest.onerror = (event) => {
                    const error = event.target.error;
                    console.error('Error updating paper:', error);
                    
                    let errorMessage = 'Failed to update paper: ';
                    
                    if (error.name === 'QuotaExceededError') {
                        errorMessage = 'Storage quota exceeded: Unable to save changes. Please delete old papers or reduce file sizes.';
                    } else if (error.name === 'DataError') {
                        errorMessage = 'Invalid data: The update contains invalid values.';
                    } else {
                        errorMessage += error.message || 'Unknown error occurred.';
                    }
                    
                    reject(new Error(errorMessage));
                };
            };
        });
    } catch (error) {
        console.error('Error in updatePaper:', error);
        throw error;
    }
}

/**
 * Deletes a paper record from the database with error handling.
 * Note: Also deletes all associated annotations via deleteAnnotationsByPaperId.
 * @param {number} id - The ID of the paper to delete.
 * @returns {Promise<void>} A promise that resolves when the paper is deleted.
 * @throws {Error} Throws descriptive errors if deletion fails.
 */
async function deletePaper(id) {
    if (!id || (typeof id !== 'number' && typeof id !== 'string')) {
        throw new Error('Invalid paper ID: ID must be a valid number or string.');
    }

    try {
        // First, delete all annotations associated with this paper
        // Import dynamically to avoid circular dependency
        try {
            const { deleteAnnotationsByPaperId } = await import('./annotations.js');
            await deleteAnnotationsByPaperId(Number(id));
        } catch (annotationError) {
            console.warn('Error deleting annotations for paper:', annotationError);
            // Continue with paper deletion even if annotation deletion fails
        }

        // Then delete the paper itself
        const database = await openDB();
        return new Promise((resolve, reject) => {
            const transaction = database.transaction([STORE_NAME_PAPERS], 'readwrite');
            const store = transaction.objectStore(STORE_NAME_PAPERS);
            const request = store.delete(Number(id));

            request.onsuccess = () => resolve();
            
            request.onerror = (event) => {
                const error = event.target.error;
                console.error(`Error deleting paper with ID ${id}:`, error);
                reject(new Error(`Failed to delete paper: ${error.message || 'Database error occurred.'}`));
            };
        });
    } catch (error) {
        console.error('Error in deletePaper:', error);
        throw error;
    }
}

export {
    addPaper,
    getAllPapers,
    getPaperById,
    getPaperByDoi,
    updatePaper,
    deletePaper
};

