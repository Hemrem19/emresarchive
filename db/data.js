/**
 * Data Management Module
 * Handles export, import, and clear operations for all database data
 */

import { openDB, STORE_NAME_PAPERS, STORE_NAME_COLLECTIONS, STORE_NAME_ANNOTATIONS } from './core.js';
import { getAllPapers } from './papers.js';
import { getAllCollections } from './collections.js';
import { getAnnotationsByPaperId } from './annotations.js';
import { isCloudSyncEnabled } from '../config.js';
import { isAuthenticated } from '../api/auth.js';
import { addPaper as addPaperViaAdapter } from '../db.js';
import { addCollection as addCollectionViaAdapter } from '../db.js';
import { addAnnotation as addAnnotationViaAdapter } from '../db.js';

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
                // Note: Database stores PDFs as 'pdfData', but export uses 'pdfFile' for naming consistency
                if (paper.pdfData instanceof Blob) {
                    try {
                        serializablePaper.pdfFile = await new Promise((resolve, reject) => {
                            const reader = new FileReader();
                            reader.onloadend = () => resolve(reader.result);
                            reader.onerror = () => reject(new Error('Failed to read PDF file'));
                            reader.readAsDataURL(paper.pdfData);
                        });
                        // Remove the blob from export (we've converted it to base64)
                        delete serializablePaper.pdfData;
                    } catch (pdfError) {
                        console.error(`Error converting PDF for paper "${paper.title}":`, pdfError);
                        // Skip PDF but include paper metadata
                        delete serializablePaper.pdfData;
                        serializablePaper.pdfFile = null;
                        serializablePaper._pdfExportError = true;
                    }
                } else if (paper.pdfData) {
                    // If pdfData exists but is not a Blob, remove it
                    delete serializablePaper.pdfData;
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
                    // If cloud sync is enabled, use adapter to sync to cloud API
                    const useCloudSync = isCloudSyncEnabled() && isAuthenticated();
                    
                    // Helper function to add delay between requests to avoid overwhelming the network
                    const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));
                    
                    for (let i = 0; i < papersToImport.length; i++) {
                        const paper = papersToImport[i];
                        try {
                            const paperToStore = { ...paper };
                            
                            // Convert Base64 back to Blob if it exists
                            // Note: Import format uses 'pdfFile', but database stores as 'pdfData'
                            if (paperToStore.pdfFile && typeof paperToStore.pdfFile === 'string' && paperToStore.pdfFile.startsWith('data:')) {
                                try {
                                    const fetchRes = await fetch(paperToStore.pdfFile);
                                    paperToStore.pdfData = await fetchRes.blob();
                                    delete paperToStore.pdfFile;
                                } catch (pdfError) {
                                    console.warn(`Failed to convert PDF for "${paper.title}":`, pdfError);
                                    delete paperToStore.pdfFile;
                                    paperToStore.pdfData = null;
                                }
                            } else if (paperToStore.pdfFile) {
                                // If pdfFile exists but is not base64, remove it
                                delete paperToStore.pdfFile;
                            }
                            
                            // Convert ISO date strings back to Date objects
                            if (paperToStore.createdAt && typeof paperToStore.createdAt === 'string') {
                                paperToStore.createdAt = new Date(paperToStore.createdAt);
                            }
                            if (paperToStore.updatedAt && typeof paperToStore.updatedAt === 'string') {
                                paperToStore.updatedAt = new Date(paperToStore.updatedAt);
                            }
                            
                            // If cloud sync is enabled, use adapter which routes to cloud API
                            // Otherwise, save directly to IndexedDB
                            if (useCloudSync) {
                                try {
                                    // Add delay between API requests to avoid network congestion
                                    // 200ms delay for all but the first request
                                    if (i > 0) {
                                        await delay(200);
                                    }
                                    
                                    // Remove fields that shouldn't be sent to API
                                    // The adapter's mapPaperDataToApi will handle the mapping
                                    const paperForApi = { ...paperToStore };
                                    
                                    // Remove fields that API doesn't expect at all
                                    delete paperForApi.pdfData; // PDF data is stored locally only
                                    delete paperForApi.id; // API will generate new ID
                                    delete paperForApi.pdfFile; // Already handled above
                                    delete paperForApi.updatedAt; // API sets this automatically
                                    delete paperForApi.createdAt; // API sets this automatically (but adapter also removes it)
                                    
                                    // Ensure authors is an array (API expects array)
                                    if (!Array.isArray(paperForApi.authors)) {
                                        paperForApi.authors = paperForApi.authors ? [paperForApi.authors] : [];
                                    }
                                    
                                    // Ensure tags is an array (API expects array)
                                    if (!Array.isArray(paperForApi.tags)) {
                                        paperForApi.tags = paperForApi.tags ? [paperForApi.tags] : [];
                                    }
                                    
                                    // If paper has s3Key/pdfUrl from import, keep it (but don't upload PDF)
                                    // The adapter will handle mapping s3Key to pdfUrl and readingStatus to status
                                    await addPaperViaAdapter(paperForApi);
                                    paperSuccessCount++;
                                } catch (cloudError) {
                                    console.error(`Failed to sync paper "${paper.title}" to cloud:`, cloudError);
                                    // Always save to local storage as fallback
                                    try {
                                        await new Promise((resolveAdd, rejectAdd) => {
                                            const addRequest = papersStore.add(paperToStore);
                                            addRequest.onsuccess = () => resolveAdd();
                                            addRequest.onerror = (event) => rejectAdd(event.target.error);
                                        });
                                        paperSuccessCount++;
                                        paperErrorCount++; // Count as partial error (local only, not cloud)
                                    } catch (localError) {
                                        console.error(`Failed to save paper "${paper.title}" locally:`, localError);
                                        paperErrorCount++;
                                    }
                                }
                            } else {
                                // Local-only: save directly to IndexedDB
                                await new Promise((resolveAdd, rejectAdd) => {
                                    const addRequest = papersStore.add(paperToStore);
                                    addRequest.onsuccess = () => resolveAdd();
                                    addRequest.onerror = (event) => rejectAdd(event.target.error);
                                });
                                paperSuccessCount++;
                            }
                        } catch (paperError) {
                            console.error(`Error importing paper "${paper.title}":`, paperError);
                            paperErrorCount++;
                            // Continue with next paper
                        }
                    }

                    // Import collections
                    for (let i = 0; i < collectionsToImport.length; i++) {
                        const collection = collectionsToImport[i];
                        try {
                            const collectionToStore = { ...collection };
                            
                            // Convert ISO date strings back to Date objects
                            if (collectionToStore.createdAt && typeof collectionToStore.createdAt === 'string') {
                                collectionToStore.createdAt = new Date(collectionToStore.createdAt);
                            }
                            
                            // If cloud sync is enabled, use adapter which routes to cloud API
                            if (useCloudSync) {
                                try {
                                    // Add delay between API requests
                                    if (i > 0) {
                                        await delay(200);
                                    }
                                    
                                    const collectionForApi = { ...collectionToStore };
                                    delete collectionForApi.id; // API will generate new ID
                                    await addCollectionViaAdapter(collectionForApi);
                                    collectionSuccessCount++;
                                } catch (cloudError) {
                                    console.error(`Failed to sync collection "${collection.name}" to cloud:`, cloudError);
                                    // Always save to local storage as fallback
                                    try {
                                        await new Promise((resolveAdd, rejectAdd) => {
                                            const addRequest = collectionsStore.add(collectionToStore);
                                            addRequest.onsuccess = () => resolveAdd();
                                            addRequest.onerror = (event) => rejectAdd(event.target.error);
                                        });
                                        collectionSuccessCount++;
                                        collectionErrorCount++; // Count as partial error
                                    } catch (localError) {
                                        console.error(`Failed to save collection "${collection.name}" locally:`, localError);
                                        collectionErrorCount++;
                                    }
                                }
                            } else {
                                // Local-only: save directly to IndexedDB
                                await new Promise((resolveAdd, rejectAdd) => {
                                    const addRequest = collectionsStore.add(collectionToStore);
                                    addRequest.onsuccess = () => resolveAdd();
                                    addRequest.onerror = (event) => rejectAdd(event.target.error);
                                });
                                collectionSuccessCount++;
                            }
                        } catch (collectionError) {
                            console.error(`Error importing collection "${collection.name}":`, collectionError);
                            collectionErrorCount++;
                            // Continue with next collection
                        }
                    }

                    // Import annotations
                    for (let i = 0; i < annotationsToImport.length; i++) {
                        const annotation = annotationsToImport[i];
                        try {
                            const annotationToStore = { ...annotation };
                            
                            // Convert ISO date strings back to Date objects
                            if (annotationToStore.createdAt && typeof annotationToStore.createdAt === 'string') {
                                annotationToStore.createdAt = new Date(annotationToStore.createdAt);
                            }
                            if (annotationToStore.updatedAt && typeof annotationToStore.updatedAt === 'string') {
                                annotationToStore.updatedAt = new Date(annotationToStore.updatedAt);
                            }
                            
                            // If cloud sync is enabled, use adapter which routes to cloud API
                            if (useCloudSync) {
                                try {
                                    // Add delay between API requests
                                    if (i > 0) {
                                        await delay(200);
                                    }
                                    
                                    const annotationForApi = { ...annotationToStore };
                                    delete annotationForApi.id; // API will generate new ID
                                    await addAnnotationViaAdapter(annotationForApi);
                                    annotationSuccessCount++;
                                } catch (cloudError) {
                                    console.error(`Failed to sync annotation to cloud:`, cloudError);
                                    // Always save to local storage as fallback
                                    try {
                                        await new Promise((resolveAdd, rejectAdd) => {
                                            const addRequest = annotationsStore.add(annotationToStore);
                                            addRequest.onsuccess = () => resolveAdd();
                                            addRequest.onerror = (event) => rejectAdd(event.target.error);
                                        });
                                        annotationSuccessCount++;
                                        annotationErrorCount++; // Count as partial error
                                    } catch (localError) {
                                        console.error(`Failed to save annotation locally:`, localError);
                                        annotationErrorCount++;
                                    }
                                }
                            } else {
                                // Local-only: save directly to IndexedDB
                                await new Promise((resolveAdd, rejectAdd) => {
                                    const addRequest = annotationsStore.add(annotationToStore);
                                    addRequest.onsuccess = () => resolveAdd();
                                    addRequest.onerror = (event) => rejectAdd(event.target.error);
                                });
                                annotationSuccessCount++;
                            }
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

