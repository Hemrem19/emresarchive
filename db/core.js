/**
 * Database Core Module
 * Handles IndexedDB initialization, schema migrations, and database lifecycle
 */

const DB_NAME = 'CitaversDB';
const DB_VERSION = 6;
const STORE_NAME_PAPERS = 'papers';
const STORE_NAME_COLLECTIONS = 'collections';
const STORE_NAME_ANNOTATIONS = 'annotations';

let db = null;

/**
 * Opens the IndexedDB database with comprehensive error handling.
 * If the database doesn't exist or the version is upgraded, it creates/updates the object stores.
 * @returns {Promise<IDBDatabase>} A promise that resolves with the database instance.
 * @throws {Error} Throws descriptive errors for various failure scenarios.
 */
async function openDB() {
    if (db) {
        return db; // Return existing instance if already open
    }

    // Check if IndexedDB is supported
    if (!window.indexedDB) {
        const error = new Error('Database not supported: Your browser does not support IndexedDB. Please use a modern browser like Chrome, Firefox, Safari, or Edge.');
        console.error('IndexedDB not available:', error);
        throw error;
    }

    return new Promise((resolve, reject) => {
        // First, check if database exists and what version it has
        const checkRequest = indexedDB.open(DB_NAME);
        
        checkRequest.onsuccess = (event) => {
            const existingDb = event.target.result;
            const existingVersion = existingDb.version;
            existingDb.close();
            
            // If existing version is higher than our target version, we have a version mismatch
            if (existingVersion > DB_VERSION) {
                console.warn(`Database version mismatch: Existing version is ${existingVersion}, but code expects ${DB_VERSION}.`);
                console.warn('This can happen if a newer version of the app was used previously, or if the database was manually modified.');
                
                // IndexedDB doesn't allow opening with a lower version than what exists
                // We need to either delete and recreate, or increase our version number
                // For now, we'll try to open without specifying a version (opens with existing version)
                // This allows read/write access but no migrations
                try {
                    const openRequest = indexedDB.open(DB_NAME);
                    
                    openRequest.onsuccess = (e) => {
                        db = e.target.result;
                        db.onerror = (event) => {
                            console.error('Database error:', event.target.error);
                        };
                        db.onversionchange = () => {
                            db.close();
                            db = null;
                            console.warn('Database version changed. Please refresh the page.');
                        };
                        console.warn(`Opened database with existing version ${existingVersion} (code expects ${DB_VERSION}).`);
                        console.warn('The app will function, but database migrations will not run. Consider exporting your data and clearing storage if you encounter issues.');
                        resolve(db);
                    };
                    
                    openRequest.onerror = (e) => {
                        console.error('Failed to open database:', e.target.error);
                        reject(new Error(`Database version incompatible: The database version (${existingVersion}) is higher than expected (${DB_VERSION}). Please export your data from Settings, then clear your browser storage for this site and refresh.`));
                    };
                    
                    openRequest.onupgradeneeded = () => {
                        // This shouldn't happen when opening without version
                        console.warn('Unexpected upgrade needed when opening without version');
                    };
                    
                    return;
                } catch (error) {
                    console.error('Error opening database with existing version:', error);
                    reject(new Error(`Database version error: Unable to open database. The database version (${existingVersion}) is incompatible with this app version. Please export your data and clear browser storage.`));
                    return;
                }
            }
            
            // Normal case: open with our target version
            let request;
            try {
                request = indexedDB.open(DB_NAME, DB_VERSION);
            } catch (error) {
                console.error('Error opening IndexedDB:', error);
                reject(new Error('Database error: Unable to open database. Your browser may be in private mode or have storage disabled.'));
                return;
            }
            
            setupRequestHandlers(request, resolve, reject);
        };
        
        checkRequest.onerror = (event) => {
            // Database doesn't exist or can't be accessed, try to create it
            let request;
            try {
                request = indexedDB.open(DB_NAME, DB_VERSION);
            } catch (error) {
                console.error('Error opening IndexedDB:', error);
                reject(new Error('Database error: Unable to open database. Your browser may be in private mode or have storage disabled.'));
                return;
            }
            
            setupRequestHandlers(request, resolve, reject);
        };
    });
}

function setupRequestHandlers(request, resolve, reject) {
    request.onupgradeneeded = (event) => {
        let transaction;
        try {
            const dbInstance = event.target.result;
            transaction = event.target.transaction;
            const oldVersion = event.oldVersion;
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
                paperStore = transaction.objectStore(STORE_NAME_PAPERS);
            }

            // Add new index for related papers in version 2
            if (!paperStore.indexNames.contains('relatedPaperIds')) {
                paperStore.createIndex('relatedPaperIds', 'relatedPaperIds', { unique: false, multiEntry: true });
            }

            // Add new index for DOI in version 3
            if (!paperStore.indexNames.contains('doi')) {
                paperStore.createIndex('doi', 'doi', { unique: false });
            }

            // Migration for version 3: Add updatedAt to existing papers
            if (oldVersion < 3) {
                const getAllRequest = paperStore.getAll();
                getAllRequest.onsuccess = () => {
                    const papers = getAllRequest.result;
                    papers.forEach(paper => {
                        if (!paper.updatedAt) {
                            // If paper doesn't have updatedAt, set it to createdAt or current date
                            paper.updatedAt = paper.createdAt || new Date();
                            paperStore.put(paper);
                        }
                    });
                };
                getAllRequest.onerror = (err) => {
                    console.error('Migration error:', err);
                    // Don't fail the upgrade, just log the error
                };
            }

            // Create 'collections' object store for version 4
            if (!dbInstance.objectStoreNames.contains(STORE_NAME_COLLECTIONS)) {
                const collectionStore = dbInstance.createObjectStore(STORE_NAME_COLLECTIONS, { keyPath: 'id', autoIncrement: true });
                // Define indexes for collections
                collectionStore.createIndex('name', 'name', { unique: false });
                collectionStore.createIndex('createdAt', 'createdAt', { unique: false });
            }

            // Create 'annotations' object store for version 5
            if (!dbInstance.objectStoreNames.contains(STORE_NAME_ANNOTATIONS)) {
                const annotationStore = dbInstance.createObjectStore(STORE_NAME_ANNOTATIONS, { keyPath: 'id', autoIncrement: true });
                // Define indexes for annotations
                annotationStore.createIndex('paperId', 'paperId', { unique: false }); // To query all annotations for a paper
                annotationStore.createIndex('type', 'type', { unique: false }); // To filter by highlight/note
                annotationStore.createIndex('pageNumber', 'pageNumber', { unique: false }); // To filter by page
                annotationStore.createIndex('createdAt', 'createdAt', { unique: false });
            }

            // Migration for version 6: Add rating and summary fields to existing papers
            if (oldVersion < 6) {
                // Add rating index for sorting
                if (!paperStore.indexNames.contains('rating')) {
                    paperStore.createIndex('rating', 'rating', { unique: false });
                }

                // Migrate existing papers to add rating and summary fields (both nullable)
                const getAllRequest = paperStore.getAll();
                getAllRequest.onsuccess = () => {
                    const papers = getAllRequest.result;
                    papers.forEach(paper => {
                        // Add rating field (null if not exists)
                        if (paper.rating === undefined) {
                            paper.rating = null;
                        }
                        // Add summary field (null if not exists)
                        if (paper.summary === undefined) {
                            paper.summary = null;
                        }
                        paperStore.put(paper);
                    });
                };
                getAllRequest.onerror = (err) => {
                    console.error('Migration error (v6):', err);
                    // Don't fail the upgrade, just log the error
                };
            }
        } catch (error) {
            console.error('Error during database upgrade:', error);
            transaction.abort();
            reject(new Error(`Database upgrade failed: ${error.message}. Your data is safe, but the application may not function correctly.`));
        }
    };

    request.onsuccess = (event) => {
        db = event.target.result;

        // Add error handler for database connection
        db.onerror = (event) => {
            console.error('Database error:', event.target.error);
        };

        // Handle version change (when another tab upgrades the DB)
        db.onversionchange = () => {
            db.close();
            db = null;
            console.warn('Database version changed. Please refresh the page.');
        };

        resolve(db);
    };

    request.onerror = (event) => {
        const error = event.target.error;
        console.error('IndexedDB error:', error);

        let errorMessage = 'Database error: Unable to open database. ';

        if (error.name === 'QuotaExceededError') {
            errorMessage = 'Storage quota exceeded: Your browser storage is full. Please free up space or remove old papers.';
        } else if (error.name === 'VersionError') {
            errorMessage = 'Database version error: The database is in an inconsistent state. Please refresh the page.';
        } else if (error.name === 'InvalidStateError') {
            errorMessage = 'Database state error: The database is in an invalid state. Try refreshing the page.';
        } else {
            errorMessage += error.message || 'Unknown error occurred.';
        }

        reject(new Error(errorMessage));
    };

    request.onblocked = () => {
        console.warn('Database blocked: Close other tabs with this app open');
        reject(new Error('Database blocked: Please close other tabs with this application open and try again.'));
    };
}

export {
    openDB,
    DB_NAME,
    DB_VERSION,
    STORE_NAME_PAPERS,
    STORE_NAME_COLLECTIONS,
    STORE_NAME_ANNOTATIONS
};

