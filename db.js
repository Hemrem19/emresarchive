/**
 * Database Module - Dual-Mode Adapter
 * 
 * This file serves as the main entry point for all database operations.
 * It routes operations between cloud API and local IndexedDB based on sync mode.
 * 
 * Architecture:
 * - db/adapter.js - Dual-mode routing (cloud API vs local IndexedDB)
 * - db/core.js - Database initialization, migrations, schema
 * - db/papers.js - Local paper CRUD operations
 * - db/collections.js - Local collections CRUD operations
 * - db/annotations.js - Local annotations CRUD operations
 * - db/data.js - Export/Import/Clear operations
 * - api/papers.js - Cloud paper API operations
 * - api/collections.js - Cloud collections API operations
 * - api/annotations.js - Cloud annotations API operations
 * 
 * Usage:
 * - If cloud sync is enabled AND user is authenticated: Uses cloud API
 * - Otherwise: Uses local IndexedDB (backward compatible)
 * - Automatic fallback to local if cloud operations fail
 */

// Core database functions (always local)
export { openDB } from './db/core.js';

// Dual-mode operations (routed via adapter)
import { papers as papersAdapter, folders as foldersAdapter, paperFoldersAdapter, annotations as annotationsAdapter } from './db/adapter.js';

// Paper operations (with cloud sync support)
export const addPaper = papersAdapter.addPaper.bind(papersAdapter);
export const getAllPapers = papersAdapter.getAllPapers.bind(papersAdapter);
export const getPaperById = papersAdapter.getPaperById.bind(papersAdapter);
export const getPaperByDoi = papersAdapter.getPaperByDoi.bind(papersAdapter);
export const updatePaper = papersAdapter.updatePaper.bind(papersAdapter);
export const deletePaper = papersAdapter.deletePaper.bind(papersAdapter);
export const batchOperations = papersAdapter.batchOperations.bind(papersAdapter);

// Additional paper operations (cloud-only or enhanced)
export const searchPapers = papersAdapter.searchPapers.bind(papersAdapter);
export const getUploadUrl = papersAdapter.getUploadUrl.bind(papersAdapter);
export const uploadPdf = papersAdapter.uploadPdf.bind(papersAdapter);
export const getPdfDownloadUrl = papersAdapter.getPdfDownloadUrl.bind(papersAdapter);

// Folder operations (with cloud sync support)
export const addFolder = foldersAdapter.addFolder.bind(foldersAdapter);
export const getAllFolders = foldersAdapter.getAllFolders.bind(foldersAdapter);
export const getFolderById = foldersAdapter.getFolderById.bind(foldersAdapter);
export const updateFolder = foldersAdapter.updateFolder.bind(foldersAdapter);
export const deleteFolder = foldersAdapter.deleteFolder.bind(foldersAdapter);

// Paper-folder association operations
export const addPaperToFolder = paperFoldersAdapter.addPaperToFolder.bind(paperFoldersAdapter);
export const removePaperFromFolder = paperFoldersAdapter.removePaperFromFolder.bind(paperFoldersAdapter);
export const getFolderIdsByPaperId = paperFoldersAdapter.getFolderIdsByPaperId.bind(paperFoldersAdapter);
export const getPaperIdsByFolderId = paperFoldersAdapter.getPaperIdsByFolderId.bind(paperFoldersAdapter);
export const getAllPaperFolders = paperFoldersAdapter.getAllPaperFolders.bind(paperFoldersAdapter);
export const removeAllPaperFoldersForFolder = paperFoldersAdapter.removeAllForFolder.bind(paperFoldersAdapter);
export const removeAllPaperFoldersForPaper = paperFoldersAdapter.removeAllForPaper.bind(paperFoldersAdapter);

// Annotation operations (with cloud sync support)
export const addAnnotation = annotationsAdapter.addAnnotation.bind(annotationsAdapter);
export const getAnnotationsByPaperId = annotationsAdapter.getAnnotationsByPaperId.bind(annotationsAdapter);
export const getAnnotationById = annotationsAdapter.getAnnotationById.bind(annotationsAdapter);
export const updateAnnotation = annotationsAdapter.updateAnnotation.bind(annotationsAdapter);
export const deleteAnnotation = annotationsAdapter.deleteAnnotation.bind(annotationsAdapter);
export const deleteAnnotationsByPaperId = annotationsAdapter.deleteAnnotationsByPaperId.bind(annotationsAdapter);

// Data management operations (always local - export/import handled separately)
export {
    exportAllData,
    importData,
    clearAllData
} from './db/data.js';

// Legacy sync operations removed in favor of Yjs CRDT automatic syncing

// Cloud sync utility
export { isCloudSyncAvailable } from './db/adapter.js';

