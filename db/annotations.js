/**
 * Annotations Module
 * Handles all CRUD operations for PDF annotations (highlights and sticky notes)
 */

import { openDB, STORE_NAME_ANNOTATIONS } from './core.js';

/**
 * Adds a new annotation to the database.
 * @param {Object} annotationData - The annotation data.
 * @param {number} annotationData.paperId - The ID of the paper this annotation belongs to.
 * @param {string} annotationData.type - The type of annotation ('highlight' or 'note').
 * @param {number} annotationData.pageNumber - The PDF page number.
 * @param {string} [annotationData.color] - Color for highlights (e.g., 'yellow', 'orange', 'green', 'blue').
 * @param {string} [annotationData.textContent] - The highlighted text content.
 * @param {Array} [annotationData.rects] - Array of bounding box rectangles for highlights.
 * @param {Object} [annotationData.position] - Position for sticky notes {x, y}.
 * @param {string} [annotationData.content] - Text content for sticky notes.
 * @returns {Promise<number>} A promise that resolves with the ID of the newly added annotation.
 * @throws {Error} Throws descriptive errors for validation or storage failures.
 */
async function addAnnotation(annotationData) {
    // Validate required fields
    if (!annotationData || typeof annotationData !== 'object') {
        throw new Error('Invalid annotation data: Annotation data must be a valid object.');
    }
    
    if (!annotationData.paperId || typeof annotationData.paperId !== 'number') {
        throw new Error('Invalid paper ID: Paper ID is required and must be a number.');
    }
    
    if (!annotationData.type || !['highlight', 'note'].includes(annotationData.type)) {
        throw new Error('Invalid annotation type: Type must be either "highlight" or "note".');
    }
    
    if (!annotationData.pageNumber || typeof annotationData.pageNumber !== 'number') {
        throw new Error('Invalid page number: Page number is required and must be a number.');
    }

    try {
        const database = await openDB();
        return new Promise((resolve, reject) => {
            const transaction = database.transaction([STORE_NAME_ANNOTATIONS], 'readwrite');
            const store = transaction.objectStore(STORE_NAME_ANNOTATIONS);
            
            const annotation = {
                ...annotationData,
                createdAt: new Date(),
                updatedAt: new Date()
            };

            const request = store.add(annotation);

            request.onsuccess = (event) => {
                console.log('Annotation added successfully with ID:', event.target.result);
                resolve(event.target.result);
            };

            request.onerror = (event) => {
                const error = event.target.error;
                console.error('Error adding annotation:', error);
                
                let errorMessage = 'Failed to save annotation: ';
                if (error.name === 'QuotaExceededError') {
                    errorMessage = 'Storage quota exceeded: Your browser storage is full. Please free up space.';
                } else {
                    errorMessage += error.message || 'Unknown error occurred.';
                }
                
                reject(new Error(errorMessage));
            };
        });
    } catch (error) {
        console.error('Error in addAnnotation:', error);
        throw error;
    }
}

/**
 * Retrieves all annotations for a specific paper.
 * @param {number} paperId - The ID of the paper.
 * @returns {Promise<Array>} A promise that resolves with an array of annotations.
 * @throws {Error} Throws descriptive errors if retrieval fails.
 */
async function getAnnotationsByPaperId(paperId) {
    if (!paperId || typeof paperId !== 'number') {
        throw new Error('Invalid paper ID: Paper ID must be a valid number.');
    }

    try {
        const database = await openDB();
        return new Promise((resolve, reject) => {
            const transaction = database.transaction([STORE_NAME_ANNOTATIONS], 'readonly');
            const store = transaction.objectStore(STORE_NAME_ANNOTATIONS);
            const index = store.index('paperId');
            const request = index.getAll(paperId);

            request.onsuccess = (event) => {
                const annotations = event.target.result || [];
                console.log(`Retrieved ${annotations.length} annotations for paper ID ${paperId}`);
                resolve(annotations);
            };

            request.onerror = (event) => {
                const error = event.target.error;
                console.error('Error retrieving annotations:', error);
                reject(new Error(`Failed to retrieve annotations: ${error.message || 'Database error occurred.'}`));
            };
        });
    } catch (error) {
        console.error('Error in getAnnotationsByPaperId:', error);
        throw error;
    }
}

/**
 * Retrieves a single annotation by its ID.
 * @param {number} id - The annotation ID.
 * @returns {Promise<Object|null>} A promise that resolves with the annotation object or null if not found.
 * @throws {Error} Throws descriptive errors if retrieval fails.
 */
async function getAnnotationById(id) {
    if (!id || (typeof id !== 'number' && typeof id !== 'string')) {
        throw new Error('Invalid annotation ID: ID must be a valid number or string.');
    }

    try {
        const database = await openDB();
        return new Promise((resolve, reject) => {
            const transaction = database.transaction([STORE_NAME_ANNOTATIONS], 'readonly');
            const store = transaction.objectStore(STORE_NAME_ANNOTATIONS);
            const request = store.get(Number(id));

            request.onsuccess = (event) => resolve(event.target.result || null);
            
            request.onerror = (event) => {
                const error = event.target.error;
                console.error('Error retrieving annotation:', error);
                reject(new Error(`Failed to retrieve annotation: ${error.message || 'Database error occurred.'}`));
            };
        });
    } catch (error) {
        console.error('Error in getAnnotationById:', error);
        throw error;
    }
}

/**
 * Updates an existing annotation in the database.
 * @param {number} id - The ID of the annotation to update.
 * @param {Object} updateData - An object containing the fields to update.
 * @returns {Promise<number>} A promise that resolves with the ID of the updated annotation.
 * @throws {Error} Throws descriptive errors for validation or update failures.
 */
async function updateAnnotation(id, updateData) {
    if (!id || (typeof id !== 'number' && typeof id !== 'string')) {
        throw new Error('Invalid annotation ID: ID must be a valid number or string.');
    }
    
    if (!updateData || typeof updateData !== 'object') {
        throw new Error('Invalid update data: Update data must be a valid object.');
    }

    try {
        const database = await openDB();
        return new Promise((resolve, reject) => {
            const transaction = database.transaction([STORE_NAME_ANNOTATIONS], 'readwrite');
            const store = transaction.objectStore(STORE_NAME_ANNOTATIONS);
            const getRequest = store.get(Number(id));

            getRequest.onerror = (event) => {
                console.error('Error fetching annotation for update:', event.target.error);
                reject(new Error('Failed to update: Could not retrieve annotation from database.'));
            };

            getRequest.onsuccess = (event) => {
                const annotation = event.target.result;
                if (!annotation) {
                    return reject(new Error(`Annotation not found: No annotation exists with ID ${id}.`));
                }

                const updatedAnnotation = { 
                    ...annotation, 
                    ...updateData,
                    updatedAt: new Date()
                };
                
                const putRequest = store.put(updatedAnnotation);
                
                putRequest.onsuccess = (event) => {
                    console.log('Annotation updated successfully:', event.target.result);
                    resolve(event.target.result);
                };
                
                putRequest.onerror = (event) => {
                    const error = event.target.error;
                    console.error('Error updating annotation:', error);
                    reject(new Error(`Failed to update annotation: ${error.message || 'Unknown error occurred.'}`));
                };
            };
        });
    } catch (error) {
        console.error('Error in updateAnnotation:', error);
        throw error;
    }
}

/**
 * Deletes an annotation from the database.
 * @param {number} id - The ID of the annotation to delete.
 * @returns {Promise<void>} A promise that resolves when the annotation is deleted.
 * @throws {Error} Throws descriptive errors if deletion fails.
 */
async function deleteAnnotation(id) {
    if (!id || (typeof id !== 'number' && typeof id !== 'string')) {
        throw new Error('Invalid annotation ID: ID must be a valid number or string.');
    }

    try {
        const database = await openDB();
        return new Promise((resolve, reject) => {
            const transaction = database.transaction([STORE_NAME_ANNOTATIONS], 'readwrite');
            const store = transaction.objectStore(STORE_NAME_ANNOTATIONS);
            const request = store.delete(Number(id));

            request.onsuccess = () => {
                console.log(`Annotation with ID ${id} deleted successfully`);
                resolve();
            };
            
            request.onerror = (event) => {
                const error = event.target.error;
                console.error(`Error deleting annotation with ID ${id}:`, error);
                reject(new Error(`Failed to delete annotation: ${error.message || 'Database error occurred.'}`));
            };
        });
    } catch (error) {
        console.error('Error in deleteAnnotation:', error);
        throw error;
    }
}

/**
 * Deletes all annotations for a specific paper (used when deleting a paper).
 * @param {number} paperId - The ID of the paper whose annotations should be deleted.
 * @returns {Promise<number>} A promise that resolves with the number of annotations deleted.
 * @throws {Error} Throws descriptive errors if deletion fails.
 */
async function deleteAnnotationsByPaperId(paperId) {
    if (!paperId || typeof paperId !== 'number') {
        throw new Error('Invalid paper ID: Paper ID must be a valid number.');
    }

    try {
        const database = await openDB();
        return new Promise((resolve, reject) => {
            const transaction = database.transaction([STORE_NAME_ANNOTATIONS], 'readwrite');
            const store = transaction.objectStore(STORE_NAME_ANNOTATIONS);
            const index = store.index('paperId');
            const request = index.openCursor(IDBKeyRange.only(paperId));
            
            let deleteCount = 0;

            request.onsuccess = (event) => {
                const cursor = event.target.result;
                if (cursor) {
                    cursor.delete();
                    deleteCount++;
                    cursor.continue();
                } else {
                    console.log(`Deleted ${deleteCount} annotations for paper ID ${paperId}`);
                    resolve(deleteCount);
                }
            };
            
            request.onerror = (event) => {
                const error = event.target.error;
                console.error(`Error deleting annotations for paper ${paperId}:`, error);
                reject(new Error(`Failed to delete annotations: ${error.message || 'Database error occurred.'}`));
            };
        });
    } catch (error) {
        console.error('Error in deleteAnnotationsByPaperId:', error);
        throw error;
    }
}

export {
    addAnnotation,
    getAnnotationsByPaperId,
    getAnnotationById,
    updateAnnotation,
    deleteAnnotation,
    deleteAnnotationsByPaperId
};

