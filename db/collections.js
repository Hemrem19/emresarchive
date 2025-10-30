/**
 * Collections Module
 * Handles all CRUD operations for saved filter collections
 */

import { openDB, STORE_NAME_COLLECTIONS } from './core.js';

/**
 * Adds a new collection to the database.
 * @param {Object} collectionData - The collection data (name, icon, color, filters).
 * @returns {Promise<number>} A promise that resolves with the ID of the newly added collection.
 * @throws {Error} Throws descriptive errors for validation or storage failures.
 */
async function addCollection(collectionData) {
    // Validate collection data
    if (!collectionData || typeof collectionData !== 'object') {
        throw new Error('Invalid collection data: Collection data must be a valid object.');
    }
    
    if (!collectionData.name || !collectionData.name.trim()) {
        throw new Error('Invalid collection data: Name is required.');
    }

    // Set default values for required fields
    const collection = {
        icon: 'folder',
        color: '#3B82F6',
        ...collectionData,
        createdAt: collectionData.createdAt || new Date()
    };

    try {
        const database = await openDB();
        return new Promise((resolve, reject) => {
            const transaction = database.transaction([STORE_NAME_COLLECTIONS], 'readwrite');
            const store = transaction.objectStore(STORE_NAME_COLLECTIONS);
            
            const request = store.add(collection);

            request.onsuccess = (event) => resolve(event.target.result);
            
            request.onerror = (event) => {
                const error = event.target.error;
                console.error('Error adding collection:', error);
                
                let errorMessage = 'Failed to add collection: ';
                
                if (error.name === 'QuotaExceededError') {
                    errorMessage = 'Storage quota exceeded: Unable to save collection.';
                } else {
                    errorMessage += error.message || 'Unknown error occurred while saving.';
                }
                
                reject(new Error(errorMessage));
            };
        });
    } catch (error) {
        console.error('Error in addCollection:', error);
        throw error;
    }
}

/**
 * Retrieves all collections from the database, sorted by creation date.
 * @returns {Promise<Array<Object>>} A promise that resolves with an array of all collection objects.
 * @throws {Error} Throws descriptive errors if retrieval fails.
 */
async function getAllCollections() {
    try {
        const database = await openDB();
        return new Promise((resolve, reject) => {
            const transaction = database.transaction([STORE_NAME_COLLECTIONS], 'readonly');
            const store = transaction.objectStore(STORE_NAME_COLLECTIONS);
            const request = store.getAll();

            request.onsuccess = (event) => {
                try {
                    const collections = event.target.result || [];
                    // Sort by creation date, newest first
                    resolve(collections.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)));
                } catch (sortError) {
                    console.error('Error sorting collections:', sortError);
                    // Return unsorted if sorting fails
                    resolve(event.target.result || []);
                }
            };

            request.onerror = (event) => {
                console.error('Error fetching collections:', event.target.error);
                reject(new Error('Failed to retrieve collections: Database read error. Please refresh and try again.'));
            };
        });
    } catch (error) {
        console.error('Error in getAllCollections:', error);
        throw error;
    }
}

/**
 * Retrieves a single collection by its ID.
 * @param {number} id - The ID of the collection to retrieve.
 * @returns {Promise<Object|undefined>} A promise that resolves with the collection object, or undefined if not found.
 */
async function getCollectionById(id) {
    if (!id || (typeof id !== 'number' && typeof id !== 'string')) {
        throw new Error('Invalid collection ID: ID must be a valid number or string.');
    }

    try {
        const database = await openDB();
        return new Promise((resolve, reject) => {
            const transaction = database.transaction([STORE_NAME_COLLECTIONS], 'readonly');
            const store = transaction.objectStore(STORE_NAME_COLLECTIONS);
            const request = store.get(Number(id));

            request.onsuccess = (event) => resolve(event.target.result);
            request.onerror = (event) => {
                console.error(`Error fetching collection with ID ${id}:`, event.target.error);
                reject(new Error(`Failed to retrieve collection: Database read error.`));
            };
        });
    } catch (error) {
        console.error('Error in getCollectionById:', error);
        throw error;
    }
}

/**
 * Updates an existing collection in the database.
 * @param {number} id - The ID of the collection to update.
 * @param {Object} updateData - An object containing the fields to update.
 * @returns {Promise<number>} A promise that resolves with the ID of the updated collection.
 * @throws {Error} Throws descriptive errors for validation or update failures.
 */
async function updateCollection(id, updateData) {
    // Validate inputs
    if (!id || (typeof id !== 'number' && typeof id !== 'string')) {
        throw new Error('Invalid collection ID: ID must be a valid number or string.');
    }
    
    if (!updateData || typeof updateData !== 'object') {
        throw new Error('Invalid update data: Update data must be a valid object.');
    }

    try {
        const database = await openDB();
        return new Promise((resolve, reject) => {
            const transaction = database.transaction([STORE_NAME_COLLECTIONS], 'readwrite');
            const store = transaction.objectStore(STORE_NAME_COLLECTIONS);

            const getRequest = store.get(Number(id));

            getRequest.onerror = (event) => {
                console.error('Error fetching collection for update:', event.target.error);
                reject(new Error('Failed to update: Could not retrieve collection from database.'));
            };

            getRequest.onsuccess = (event) => {
                const collection = event.target.result;
                if (!collection) {
                    return reject(new Error(`Collection not found: No collection exists with ID ${id}.`));
                }

                const updatedCollection = { ...collection, ...updateData };
                const putRequest = store.put(updatedCollection);
                
                putRequest.onsuccess = (event) => resolve(event.target.result);
                
                putRequest.onerror = (event) => {
                    const error = event.target.error;
                    console.error('Error updating collection:', error);
                    reject(new Error(`Failed to update collection: ${error.message || 'Unknown error occurred.'}`));
                };
            };
        });
    } catch (error) {
        console.error('Error in updateCollection:', error);
        throw error;
    }
}

/**
 * Deletes a collection from the database.
 * @param {number} id - The ID of the collection to delete.
 * @returns {Promise<void>} A promise that resolves when the collection is deleted.
 * @throws {Error} Throws descriptive errors if deletion fails.
 */
async function deleteCollection(id) {
    if (!id || (typeof id !== 'number' && typeof id !== 'string')) {
        throw new Error('Invalid collection ID: ID must be a valid number or string.');
    }

    try {
        const database = await openDB();
        return new Promise((resolve, reject) => {
            const transaction = database.transaction([STORE_NAME_COLLECTIONS], 'readwrite');
            const store = transaction.objectStore(STORE_NAME_COLLECTIONS);
            const request = store.delete(Number(id));

            request.onsuccess = () => resolve();
            
            request.onerror = (event) => {
                const error = event.target.error;
                console.error(`Error deleting collection with ID ${id}:`, error);
                reject(new Error(`Failed to delete collection: ${error.message || 'Database error occurred.'}`));
            };
        });
    } catch (error) {
        console.error('Error in deleteCollection:', error);
        throw error;
    }
}

export {
    addCollection,
    getAllCollections,
    getCollectionById,
    updateCollection,
    deleteCollection
};

