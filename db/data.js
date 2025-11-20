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
// Removed adapter imports - using local-first approach for imports
// Import function now saves directly to local storage and tracks changes for later sync
import { deletePaper as deletePaperViaAdapter } from '../db.js';
import { deleteCollection as deleteCollectionViaAdapter } from '../db.js';
import { deleteAnnotation as deleteAnnotationViaAdapter } from '../db.js';
import { getAllPapers as getAllPapersViaAdapter } from '../db.js';
import { getAllCollections as getAllCollectionsViaAdapter } from '../db.js';
import * as apiPapers from '../api/papers.js';
import * as apiCollections from '../api/collections.js';
import * as apiAnnotations from '../api/annotations.js';
import { clearAllUserData } from '../api/user.js';

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
        // Phase 1: Clear all existing data
        const database = await openDB();
        await new Promise((resolve, reject) => {
            const transaction = database.transaction([STORE_NAME_PAPERS, STORE_NAME_COLLECTIONS, STORE_NAME_ANNOTATIONS], 'readwrite');
            const papersStore = transaction.objectStore(STORE_NAME_PAPERS);
            const collectionsStore = transaction.objectStore(STORE_NAME_COLLECTIONS);
            const annotationsStore = transaction.objectStore(STORE_NAME_ANNOTATIONS);

            // Clear all stores
            papersStore.clear();
            collectionsStore.clear();
            annotationsStore.clear();
            
            transaction.oncomplete = () => resolve();
            transaction.onerror = (event) => {
                const error = event.target.error;
                console.error('Error clearing stores for import:', error);
                reject(new Error('Import failed: Unable to clear existing data. Please try again.'));
            };
        });
        
        // Phase 2: Import all data using async add functions
        // This ensures all items are properly added with their own transactions
        let paperSuccessCount = 0;
        let paperErrorCount = 0;
        let collectionSuccessCount = 0;
        let collectionErrorCount = 0;
        let annotationSuccessCount = 0;
        let annotationErrorCount = 0;
        
        const useCloudSync = isCloudSyncEnabled() && isAuthenticated();
        const { addPaper: addPaperLocal } = await import('./papers.js');
        
        // Prepare data for batch cloud import
        const papersForCloudImport = [];
        
        // Import papers locally first
        for (let i = 0; i < papersToImport.length; i++) {
            const paper = papersToImport[i];
            try {
                const paperToStore = { ...paper };
                
                // Convert Base64 back to Blob if it exists
                // Note: Import format uses 'pdfFile', but database stores as 'pdfData'
                if (paperToStore.pdfFile && typeof paperToStore.pdfFile === 'string' && paperToStore.pdfFile.startsWith('data:')) {
                    try {
                        // Extract the base64 data and convert to Blob
                        const base64Data = paperToStore.pdfFile.split(',')[1];
                        const mimeMatch = paperToStore.pdfFile.match(/data:([^;]+);/);
                        const mimeType = mimeMatch ? mimeMatch[1] : 'application/pdf';
                        
                        // Convert base64 to binary
                        const binaryString = atob(base64Data);
                        const bytes = new Uint8Array(binaryString.length);
                        for (let i = 0; i < binaryString.length; i++) {
                            bytes[i] = binaryString.charCodeAt(i);
                        }
                        
                        // Create Blob with proper type
                        paperToStore.pdfData = new Blob([bytes], { type: mimeType });
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
                
                // Local-first: Save directly to IndexedDB (guaranteed to work)
                await addPaperLocal(paperToStore);
                paperSuccessCount++;
                
                // Prepare for batch cloud import if cloud sync is enabled
                if (useCloudSync) {
                    const paperForSync = { ...paperToStore };
                    delete paperForSync.pdfData; // PDF data stays local
                    delete paperForSync.id; // API will generate new ID
                    delete paperForSync.localId;
                    
                    // Ensure arrays are arrays
                    if (!Array.isArray(paperForSync.authors)) {
                        paperForSync.authors = paperForSync.authors ? [paperForSync.authors] : [];
                    }
                    if (!Array.isArray(paperForSync.tags)) {
                        paperForSync.tags = paperForSync.tags ? [paperForSync.tags] : [];
                    }
                    
                    // Clean up readingProgress
                    if (paperForSync.readingProgress) {
                        if (!paperForSync.readingProgress.totalPages || 
                            paperForSync.readingProgress.totalPages < 1) {
                            delete paperForSync.readingProgress;
                        } else {
                            if (paperForSync.readingProgress.currentPage === undefined || 
                                paperForSync.readingProgress.currentPage < 0) {
                                paperForSync.readingProgress.currentPage = 0;
                            }
                        }
                    }
                    
                    papersForCloudImport.push(paperForSync);
                }
            } catch (paperError) {
                console.error(`Error importing paper "${paper.title}":`, paperError);
                paperErrorCount++;
            }
        }

        // Import collections
        const { addCollection: addCollectionLocal } = await import('./collections.js');
        const collectionsForCloudImport = [];
        
        for (let i = 0; i < collectionsToImport.length; i++) {
            const collection = collectionsToImport[i];
            try {
                const collectionToStore = { ...collection };
                
                // Convert ISO date strings back to Date objects
                if (collectionToStore.createdAt && typeof collectionToStore.createdAt === 'string') {
                    collectionToStore.createdAt = new Date(collectionToStore.createdAt);
                }
                
                // Local-first: Save directly to IndexedDB
                await addCollectionLocal(collectionToStore);
                collectionSuccessCount++;
                
                // Prepare for batch cloud import
                if (useCloudSync) {
                    const collectionForSync = { ...collectionToStore };
                    delete collectionForSync.id;
                    delete collectionForSync.localId;
                    collectionsForCloudImport.push(collectionForSync);
                }
            } catch (collectionError) {
                console.error(`Error importing collection "${collection.name}":`, collectionError);
                collectionErrorCount++;
            }
        }

        // Import annotations
        const { addAnnotation: addAnnotationLocal } = await import('./annotations.js');
        const annotationsForCloudImport = [];
        
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
                
                // Local-first: Save directly to IndexedDB
                await addAnnotationLocal(annotationToStore);
                annotationSuccessCount++;
                
                // Prepare for batch cloud import
                if (useCloudSync) {
                    const annotationForSync = { ...annotationToStore };
                    delete annotationForSync.id;
                    delete annotationForSync.localId;
                    annotationsForCloudImport.push(annotationForSync);
                }
            } catch (annotationError) {
                console.error(`Error importing annotation:`, annotationError);
                annotationErrorCount++;
            }
        }

        // Send batch import to cloud if enabled
        if (useCloudSync && (papersForCloudImport.length > 0 || collectionsForCloudImport.length > 0 || annotationsForCloudImport.length > 0)) {
            try {
                const { batchImport } = await import('../api/import.js');
                console.log(`Sending batch import to cloud: ${papersForCloudImport.length} papers, ${collectionsForCloudImport.length} collections, ${annotationsForCloudImport.length} annotations`);
                
                const result = await batchImport({
                    papers: papersForCloudImport,
                    collections: collectionsForCloudImport,
                    annotations: annotationsForCloudImport
                });
                
                console.log('Batch import to cloud completed:', result.data.summary);
            } catch (cloudError) {
                console.error('Cloud batch import failed:', cloudError);
                // Don't throw - local import succeeded, cloud sync can be retried later
                console.warn('Data imported locally but cloud sync failed. You can sync manually from settings.');
            }
        }

        // Check results
        if (paperSuccessCount === 0 && papersToImport.length > 0) {
            throw new Error('Import failed: Unable to import any papers. Please check the file format and try again.');
        } else if (paperErrorCount > 0 || collectionErrorCount > 0 || annotationErrorCount > 0) {
            console.warn(`Import completed with ${paperErrorCount} paper errors, ${collectionErrorCount} collection errors, and ${annotationErrorCount} annotation errors`);
        }
    } catch (error) {
        console.error('Error in importData:', error);
        throw error;
    }
}

/**
 * Clears all data from the 'papers', 'collections', and 'annotations' object stores.
 * If cloud sync is enabled, also deletes all data from the cloud API using a single atomic operation.
 * @returns {Promise<void>} A promise that resolves when all stores are cleared.
 */
async function clearAllData() {
    const useCloudSync = isCloudSyncEnabled() && isAuthenticated();
    
    // If cloud sync is enabled, delete all data from cloud first using atomic endpoint
    if (useCloudSync) {
        console.log('Clearing cloud data...');
        
        try {
            // Use new atomic clear endpoint - much more reliable than one-by-one deletion
            const result = await clearAllUserData();
            console.log(`Cloud data cleared successfully:`, result);
            console.log(`  - ${result.deleted.papers} papers deleted`);
            console.log(`  - ${result.deleted.collections} collections deleted`);
            console.log(`  - ${result.deleted.annotations} annotations deleted`);
        } catch (error) {
            // Log error but continue with local clear
            console.error('Error clearing cloud data:', error);
            throw new Error(`Failed to clear cloud data: ${error.message}. Please try again or contact support.`);
        }
    }
    
    // Clear local IndexedDB
    console.log('Clearing local data...');
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
            if (collectionsCleared && annotationsCleared) {
                console.log('Local data cleared successfully');
                resolve();
            }
        };
        
        clearCollectionsRequest.onsuccess = () => {
            collectionsCleared = true;
            if (papersCleared && annotationsCleared) {
                console.log('Local data cleared successfully');
                resolve();
            }
        };
        
        clearAnnotationsRequest.onsuccess = () => {
            annotationsCleared = true;
            if (papersCleared && collectionsCleared) {
                console.log('Local data cleared successfully');
                resolve();
            }
        };
        
        clearPapersRequest.onerror = clearCollectionsRequest.onerror = clearAnnotationsRequest.onerror = (event) => {
            console.error('Error clearing local data:', event.target.error);
            reject(event.target.error);
        };
    });
}

export {
    exportAllData,
    importData,
    clearAllData
};

