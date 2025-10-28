/**
 * Database Module - Barrel Export
 * 
 * This file serves as the main entry point for all database operations.
 * It re-exports functions from domain-specific modules for backward compatibility.
 * 
 * Architecture:
 * - db/core.js - Database initialization, migrations, schema
 * - db/papers.js - Paper CRUD operations
 * - db/collections.js - Collections CRUD operations
 * - db/annotations.js - Annotations CRUD operations
 * - db/data.js - Export/Import/Clear operations
 */

// Core database functions
export { openDB } from './db/core.js';

// Paper operations
export {
    addPaper,
    getAllPapers,
    getPaperById,
    getPaperByDoi,
    updatePaper,
    deletePaper
} from './db/papers.js';

// Collection operations
export {
    addCollection,
    getAllCollections,
    getCollectionById,
    updateCollection,
    deleteCollection
} from './db/collections.js';

// Annotation operations
export {
    addAnnotation,
    getAnnotationsByPaperId,
    getAnnotationById,
    updateAnnotation,
    deleteAnnotation,
    deleteAnnotationsByPaperId
} from './db/annotations.js';

// Data management operations
export {
    exportAllData,
    importData,
    clearAllData
} from './db/data.js';

