/**
 * Papers Controllers Barrel Export
 * Exports all paper controllers for easy importing
 */

// CRUD Operations
export {
    getAllPapers,
    getPaper,
    createPaper,
    updatePaper,
    deletePaper
} from './papers-crud.controller.js';

// Search
export { searchPapers } from './papers-search.controller.js';

// PDF Management
export {
    getUploadUrl,
    uploadPdfDirect,
    getPdfDownloadUrl,
    proxyPdfStream
} from './papers-pdf.controller.js';

// Batch Operations
export { batchOperations } from './papers-batch.controller.js';
