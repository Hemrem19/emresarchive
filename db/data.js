/**
 * Data Management Module
 * Handles export, import, and clear operations for all database data
 */

import { openDB, STORE_NAME_PAPERS, STORE_NAME_COLLECTIONS, STORE_NAME_ANNOTATIONS } from './core.js';
import { getAllPapers } from './papers.js';
import { getAllCollections } from './collections.js';
import { getAnnotationsByPaperId } from './annotations.js';

/**
 * Exports all data from the database into a serializable format with error handling.
 * Converts any Blob data (like PDFs) into Base64 strings.
 * Includes papers, collections, and annotations.
 * @returns {Promise<Object>} A promise that resolves with an object containing papers, collections, and annotations arrays.
 * @throws {Error} Throws descriptive errors if export fails.
 */
async function exportAllData() {
    try {
        const papers = await getAllPapers();
        const collections = await getAllCollections();
        
        // Get all annotations for all papers
        const allAnnotations = [];
        for (const paper of papers) {
            try {
                const paperAnnotations = await getAnnotationsByPaperId(paper.id);
                allAnnotations.push(...paperAnnotations);
            } catch (error) {
                console.warn(`Could not export annotations for paper ${paper.id}:`, error);
            }
        }
        
        if ((!papers || papers.length === 0) && (!collections || collections.length === 0) && allAnnotations.length === 0) {
            console.warn('No data to export');
            return { papers: [], collections: [], annotations: [] };
        }

        const serializablePapers = [];

        for (const paper of papers) {
            try {
                const serializablePaper = { ...paper };
                
                // Convert Blob to Base64 string if present
                if (paper.pdfFile instanceof Blob) {
                    try {
                        serializablePaper.pdfFile = await new Promise((resolve, reject) => {
                            const reader = new FileReader();
                            reader.onloadend = () => resolve(reader.result);
                            reader.onerror = () => reject(new Error('Failed to read PDF file'));
                            reader.readAsDataURL(paper.pdfFile);
                        });
                    } catch (pdfError) {
                        console.error(`Error converting PDF for paper "${paper.title}":`, pdfError);
                        // Skip PDF but include paper metadata
                        serializablePaper.pdfFile = null;
                        serializablePaper._pdfExportError = true;
                    }
                }
                
                // Convert dates to ISO strings for JSON serialization
                if (serializablePaper.createdAt instanceof Date) {
                    serializablePaper.createdAt = serializablePaper.createdAt.toISOString();
                }
                if (serializablePaper.updatedAt instanceof Date) {
                    serializablePaper.updatedAt = serializablePaper.updatedAt.toISOString();
                }
                
                serializablePapers.push(serializablePaper);
            } catch (paperError) {
                console.error(`Error exporting paper "${paper?.title || 'Unknown'}":`, paperError);
                // Continue with other papers
            }
        }

        // Process collections
        const serializableCollections = collections.map(collection => {
            const serializable = { ...collection };
            // Convert dates to ISO strings
            if (serializable.createdAt instanceof Date) {
                serializable.createdAt = serializable.createdAt.toISOString();
            }
            return serializable;
        });

        // Process annotations
        const serializableAnnotations = allAnnotations.map(annotation => {
            const serializable = { ...annotation };
            // Convert dates to ISO strings
            if (serializable.createdAt instanceof Date) {
                serializable.createdAt = serializable.createdAt.toISOString();
            }
            if (serializable.updatedAt instanceof Date) {
                serializable.updatedAt = serializable.updatedAt.toISOString();
            }
            return serializable;
        });

        return {
            papers: serializablePapers,
            collections: serializableCollections,
            annotations: serializableAnnotations
        };
    } catch (error) {
        console.error('Error in exportAllData:', error);
        if (error.message.includes('retrieve')) {
            throw error; // Re-throw database errors
        }
        throw new Error(`Export failed: ${error.message || 'Unknown error occurred.'}`);
    }
}

/**
 * Imports data from a backup file with validation and error handling.
 * Overwrites all existing data. Supports old format (array), medium format (object with papers and collections), and new format (with annotations).
 * @param {Array<Object>|Object} dataToImport - An array of papers (old format) or an object with papers, collections, and annotations.
 * @returns {Promise<void>} A promise that resolves when the import is complete.
 * @throws {Error} Throws descriptive errors if import fails.
 */
async function importData(dataToImport) {
    // Handle multiple formats
    let papersToImport = [];
    let collectionsToImport = [];
    let annotationsToImport = [];
    
    if (Array.isArray(dataToImport)) {
        // Old format: just an array of papers
        papersToImport = dataToImport;
    } else if (dataToImport && typeof dataToImport === 'object') {
        // New format: object with papers, collections, and annotations
        papersToImport = dataToImport.papers || [];
        collectionsToImport = dataToImport.collections || [];
        annotationsToImport = dataToImport.annotations || [];
    } else {
        throw new Error('Invalid import data: Data must be an array of papers or an object with papers, collections, and annotations.');
    }

    if (papersToImport.length === 0 && collectionsToImport.length === 0 && annotationsToImport.length === 0) {
        throw new Error('Invalid import data: No papers, collections, or annotations found in import file.');
    }

    // Validate paper structure
    for (let i = 0; i < papersToImport.length; i++) {
        const paper = papersToImport[i];
        if (!paper || typeof paper !== 'object') {
            throw new Error(`Invalid import data: Paper at index ${i} is not a valid object.`);
        }
        if (!paper.title) {
            throw new Error(`Invalid import data: Paper at index ${i} is missing required title field.`);
        }
    }
    
    // Validate collection structure
    for (let i = 0; i < collectionsToImport.length; i++) {
        const collection = collectionsToImport[i];
        if (!collection || typeof collection !== 'object') {
            throw new Error(`Invalid import data: Collection at index ${i} is not a valid object.`);
        }
        if (!collection.name) {
            throw new Error(`Invalid import data: Collection at index ${i} is missing required name field.`);
        }
    }

    try {
        const database = await openDB();
        return new Promise((resolve, reject) => {
            const transaction = database.transaction([STORE_NAME_PAPERS, STORE_NAME_COLLECTIONS, STORE_NAME_ANNOTATIONS], 'readwrite');
            const papersStore = transaction.objectStore(STORE_NAME_PAPERS);
            const collectionsStore = transaction.objectStore(STORE_NAME_COLLECTIONS);
            const annotationsStore = transaction.objectStore(STORE_NAME_ANNOTATIONS);

            // 1. Clear all existing data
            const clearPapersRequest = papersStore.clear();
            const clearCollectionsRequest = collectionsStore.clear();
            const clearAnnotationsRequest = annotationsStore.clear();
            
            let papersCleared = false;
            let collectionsCleared = false;
            let annotationsCleared = false;
            
            clearPapersRequest.onerror = (event) => {
                console.error('Error clearing papers for import:', event.target.error);
                reject(new Error('Import failed: Unable to clear existing papers. Please try again.'));
            };
            
            clearCollectionsRequest.onerror = (event) => {
                console.error('Error clearing collections for import:', event.target.error);
                reject(new Error('Import failed: Unable to clear existing collections. Please try again.'));
            };
            
            clearAnnotationsRequest.onerror = (event) => {
                console.error('Error clearing annotations for import:', event.target.error);
                reject(new Error('Import failed: Unable to clear existing annotations. Please try again.'));
            };

            clearPapersRequest.onsuccess = () => {
                papersCleared = true;
                checkAndProceed();
            };
            
            clearCollectionsRequest.onsuccess = () => {
                collectionsCleared = true;
                checkAndProceed();
            };
            
            clearAnnotationsRequest.onsuccess = () => {
                annotationsCleared = true;
                checkAndProceed();
            };
            
            const checkAndProceed = async () => {
                if (!papersCleared || !collectionsCleared || !annotationsCleared) return;
                
                // 2. Add all new papers, collections, and annotations
                try {
                    let paperSuccessCount = 0;
                    let paperErrorCount = 0;
                    let collectionSuccessCount = 0;
                    let collectionErrorCount = 0;
                    let annotationSuccessCount = 0;
                    let annotationErrorCount = 0;

                    // Import papers
                    for (const paper of papersToImport) {
                        try {
                            const paperToStore = { ...paper };
                            
                            // Convert Base64 back to Blob if it exists
                            if (paperToStore.pdfFile && typeof paperToStore.pdfFile === 'string' && paperToStore.pdfFile.startsWith('data:')) {
                                try {
                                    const fetchRes = await fetch(paperToStore.pdfFile);
                                    paperToStore.pdfFile = await fetchRes.blob();
                                } catch (pdfError) {
                                    console.warn(`Failed to convert PDF for "${paper.title}":`, pdfError);
                                    paperToStore.pdfFile = null;
                                    paperToStore.hasPdf = false;
                                }
                            }
                            
                            // Convert ISO date strings back to Date objects
                            if (paperToStore.createdAt && typeof paperToStore.createdAt === 'string') {
                                paperToStore.createdAt = new Date(paperToStore.createdAt);
                            }
                            if (paperToStore.updatedAt && typeof paperToStore.updatedAt === 'string') {
                                paperToStore.updatedAt = new Date(paperToStore.updatedAt);
                            }
                            
                            await new Promise((resolveAdd, rejectAdd) => {
                                const addRequest = papersStore.add(paperToStore);
                                addRequest.onsuccess = () => resolveAdd();
                                addRequest.onerror = (event) => rejectAdd(event.target.error);
                            });
                            
                            paperSuccessCount++;
                        } catch (paperError) {
                            console.error(`Error importing paper "${paper.title}":`, paperError);
                            paperErrorCount++;
                            // Continue with next paper
                        }
                    }

                    // Import collections
                    for (const collection of collectionsToImport) {
                        try {
                            const collectionToStore = { ...collection };
                            
                            // Convert ISO date strings back to Date objects
                            if (collectionToStore.createdAt && typeof collectionToStore.createdAt === 'string') {
                                collectionToStore.createdAt = new Date(collectionToStore.createdAt);
                            }
                            
                            await new Promise((resolveAdd, rejectAdd) => {
                                const addRequest = collectionsStore.add(collectionToStore);
                                addRequest.onsuccess = () => resolveAdd();
                                addRequest.onerror = (event) => rejectAdd(event.target.error);
                            });
                            
                            collectionSuccessCount++;
                        } catch (collectionError) {
                            console.error(`Error importing collection "${collection.name}":`, collectionError);
                            collectionErrorCount++;
                            // Continue with next collection
                        }
                    }

                    // Import annotations
                    for (const annotation of annotationsToImport) {
                        try {
                            const annotationToStore = { ...annotation };
                            
                            // Convert ISO date strings back to Date objects
                            if (annotationToStore.createdAt && typeof annotationToStore.createdAt === 'string') {
                                annotationToStore.createdAt = new Date(annotationToStore.createdAt);
                            }
                            if (annotationToStore.updatedAt && typeof annotationToStore.updatedAt === 'string') {
                                annotationToStore.updatedAt = new Date(annotationToStore.updatedAt);
                            }
                            
                            await new Promise((resolveAdd, rejectAdd) => {
                                const addRequest = annotationsStore.add(annotationToStore);
                                addRequest.onsuccess = () => resolveAdd();
                                addRequest.onerror = (event) => rejectAdd(event.target.error);
                            });
                            
                            annotationSuccessCount++;
                        } catch (annotationError) {
                            console.error(`Error importing annotation:`, annotationError);
                            annotationErrorCount++;
                            // Continue with next annotation
                        }
                    }

                    if (paperSuccessCount === 0 && papersToImport.length > 0) {
                        transaction.abort();
                        reject(new Error('Import failed: Unable to import any papers. Please check the file format and try again.'));
                    } else if (paperErrorCount > 0 || collectionErrorCount > 0 || annotationErrorCount > 0) {
                        console.warn(`Import completed with ${paperErrorCount} paper errors, ${collectionErrorCount} collection errors, and ${annotationErrorCount} annotation errors`);
                    }
                } catch (error) {
                    transaction.abort();
                    console.error('Error during import:', error);
                    reject(new Error(`Import failed: ${error.message || 'Unknown error occurred.'}`));
                }
            };

            transaction.oncomplete = () => {
                resolve();
            };

            transaction.onerror = (event) => {
                const error = event.target.error;
                console.error('Import transaction error:', error);
                
                let errorMessage = 'Import failed: ';
                
                if (error.name === 'QuotaExceededError') {
                    errorMessage = 'Storage quota exceeded: The import file is too large for your browser storage. Try importing fewer papers or with smaller PDF files.';
                } else {
                    errorMessage += error.message || 'Database error occurred during import.';
                }
                
                reject(new Error(errorMessage));
            };
        });
    } catch (error) {
        console.error('Error in importData:', error);
        throw error;
    }
}

/**
 * Clears all data from the 'papers', 'collections', and 'annotations' object stores.
 * @returns {Promise<void>} A promise that resolves when all stores are cleared.
 */
async function clearAllData() {
    const database = await openDB();
    return new Promise((resolve, reject) => {
        const transaction = database.transaction([STORE_NAME_PAPERS, STORE_NAME_COLLECTIONS, STORE_NAME_ANNOTATIONS], 'readwrite');
        const papersStore = transaction.objectStore(STORE_NAME_PAPERS);
        const collectionsStore = transaction.objectStore(STORE_NAME_COLLECTIONS);
        const annotationsStore = transaction.objectStore(STORE_NAME_ANNOTATIONS);
        
        const clearPapersRequest = papersStore.clear();
        const clearCollectionsRequest = collectionsStore.clear();
        const clearAnnotationsRequest = annotationsStore.clear();

        let papersCleared = false;
        let collectionsCleared = false;
        let annotationsCleared = false;
        
        clearPapersRequest.onsuccess = () => {
            papersCleared = true;
            if (collectionsCleared && annotationsCleared) resolve();
        };
        
        clearCollectionsRequest.onsuccess = () => {
            collectionsCleared = true;
            if (papersCleared && annotationsCleared) resolve();
        };
        
        clearAnnotationsRequest.onsuccess = () => {
            annotationsCleared = true;
            if (papersCleared && collectionsCleared) resolve();
        };
        
        clearPapersRequest.onerror = clearCollectionsRequest.onerror = clearAnnotationsRequest.onerror = (event) => {
            console.error('Error clearing data:', event.target.error);
            reject(event.target.error);
        };
    });
}

export {
    exportAllData,
    importData,
    clearAllData
};

