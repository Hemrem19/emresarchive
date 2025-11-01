/**
 * Database Adapter Module
 * Routes operations between cloud API and local IndexedDB based on sync mode
 */

import { isCloudSyncEnabled } from '../config.js';
import { isAuthenticated } from '../api/auth.js';
import { getApiBaseUrl } from '../config.js';

// Import IndexedDB functions
import * as localPapers from './papers.js';
import * as localCollections from './collections.js';
import * as localAnnotations from './annotations.js';

// Import API functions
import * as apiPapers from '../api/papers.js';
import * as apiCollections from '../api/collections.js';
import * as apiAnnotations from '../api/annotations.js';

// Import sync change tracking
import {
    trackPaperCreated,
    trackPaperUpdated,
    trackPaperDeleted,
    trackCollectionCreated,
    trackCollectionUpdated,
    trackCollectionDeleted,
    trackAnnotationCreated,
    trackAnnotationUpdated,
    trackAnnotationDeleted
} from './sync.js';

/**
 * Checks if cloud sync should be used.
 * @returns {boolean} True if cloud sync is enabled and user is authenticated.
 */
function shouldUseCloudSync() {
    return isCloudSyncEnabled() && isAuthenticated();
}

/**
 * Paper operations adapter
 */
/**
 * Maps local paper data format to API format
 */
function mapPaperDataToApi(paperData) {
    const apiData = { ...paperData };
    
    // Map readingStatus to status (API expects 'status')
    if (apiData.readingStatus) {
        apiData.status = apiData.readingStatus;
        delete apiData.readingStatus;
    }
    
    // Map s3Key to pdfUrl (backend uses pdfUrl field)
    if (apiData.s3Key) {
        apiData.pdfUrl = apiData.s3Key;
        delete apiData.s3Key;
    }
    
    // Remove fields that API doesn't expect
    delete apiData.pdfData; // PDFs are uploaded separately via S3
    delete apiData.hasPdf; // Backend determines this from pdfUrl existence
    delete apiData.pdfFile; // PDF files are not sent to API
    delete apiData.createdAt; // API sets this automatically
    delete apiData.id; // API generates IDs
    
    return apiData;
}

/**
 * Maps API paper format to local format
 */
function mapPaperDataFromApi(apiPaper) {
    const localPaper = { ...apiPaper };
    
    // Map status to readingStatus (local uses 'readingStatus')
    if (localPaper.status) {
        localPaper.readingStatus = localPaper.status;
        // Keep status too for compatibility
    }
    
    // Map pdfUrl to s3Key (local uses s3Key field)
    if (localPaper.pdfUrl) {
        localPaper.s3Key = localPaper.pdfUrl;
        // Keep pdfUrl too for compatibility, but prefer s3Key
    }
    
    // Set hasPdf based on pdfUrl/s3Key existence
    if (localPaper.s3Key || localPaper.pdfUrl) {
        localPaper.hasPdf = true;
    }
    
    return localPaper;
}

export const papers = {
    async addPaper(paperData) {
        if (shouldUseCloudSync()) {
            try {
                // Handle PDF upload if present (should be handled in form, but double-check)
                let processedData = { ...paperData };
                if (processedData.pdfData && processedData.pdfData instanceof File) {
                    // If pdfData is a File, it should have been uploaded to S3 in form.view.js
                    // If it wasn't, handle it here as fallback
                    const { getUploadUrl, uploadPdf } = await import('../api/papers.js');
                    try {
                        const { uploadUrl, s3Key } = await getUploadUrl({
                            filename: processedData.pdfData.name,
                            size: processedData.pdfData.size,
                            contentType: processedData.pdfData.type || 'application/pdf',
                            paperId: null
                        });
                        await uploadPdf(uploadUrl, processedData.pdfData);
                        processedData.s3Key = s3Key;
                        processedData.pdfSizeBytes = processedData.pdfData.size;
                        delete processedData.pdfData; // Remove File object, use s3Key instead
                    } catch (uploadError) {
                        console.error('PDF upload during add failed:', uploadError);
                        // Continue without PDF - user can add it later
                        delete processedData.pdfData;
                        processedData.hasPdf = false;
                    }
                }
                
                // Map local format to API format
                const apiData = mapPaperDataToApi(processedData);
                const paper = await apiPapers.createPaper(apiData);
                // Convert API response to match local format (API returns paper object, local returns ID)
                // Also save to local for offline access
                try {
                    const localPaper = mapPaperDataFromApi(paper);
                    await localPapers.addPaper(localPaper);
                } catch (localError) {
                    // Ignore local save errors (not critical in cloud mode)
                }
                return paper.id;
            } catch (error) {
                console.error('Cloud sync failed, falling back to local:', error);
                // Fall back to local if cloud fails
                const localId = await localPapers.addPaper(paperData);
                // Track change for later sync
                if (shouldUseCloudSync()) {
                    trackPaperCreated({ ...paperData, localId });
                }
                return localId;
            }
        }
        // Local-only mode: add and track for potential future sync
        const localId = await localPapers.addPaper(paperData);
        if (isCloudSyncEnabled() && isAuthenticated()) {
            trackPaperCreated({ ...paperData, localId });
        }
        return localId;
    },

    async getAllPapers() {
        if (shouldUseCloudSync()) {
            try {
                const result = await apiPapers.getAllPapers();
                // Convert API response format to match local format
                const papers = (result.papers || []).map(mapPaperDataFromApi);
                return papers;
            } catch (error) {
                // If error is authentication-related, fall back to local silently
                if (error.message && (error.message.includes('authenticated') || error.message.includes('Session expired') || error.message.includes('401'))) {
                    console.warn('Cloud sync unavailable (not authenticated), using local storage:', error.message);
                    return localPapers.getAllPapers();
                }
                // For other errors, log and fall back to local
                console.error('Cloud sync failed, falling back to local:', error);
                return localPapers.getAllPapers();
            }
        }
        return localPapers.getAllPapers();
    },

    async getPaperById(id) {
        if (shouldUseCloudSync()) {
            try {
                const paper = await apiPapers.getPaper(id);
                // Map API format to local format
                return mapPaperDataFromApi(paper);
            } catch (error) {
                console.error('Cloud sync failed, falling back to local:', error);
                return localPapers.getPaperById(id);
            }
        }
        return localPapers.getPaperById(id);
    },

    async getPaperByDoi(doi) {
        // DOI lookup is typically done locally for speed
        // Could enhance to search cloud if needed
        return localPapers.getPaperByDoi(doi);
    },

    async updatePaper(id, updateData) {
        if (shouldUseCloudSync()) {
            try {
                // Map local format to API format
                const apiData = mapPaperDataToApi(updateData);
                const paper = await apiPapers.updatePaper(id, apiData);
                // Also update local
                try {
                    const localPaper = mapPaperDataFromApi(paper);
                    await localPapers.updatePaper(id, localPaper);
                } catch (localError) {
                    // Ignore local update errors
                }
                return paper.id;
            } catch (error) {
                console.error('Cloud sync failed, falling back to local:', error);
                const result = await localPapers.updatePaper(id, updateData);
                // Track change for later sync
                if (shouldUseCloudSync()) {
                    const paper = await localPapers.getPaperById(id);
                    trackPaperUpdated(id, updateData);
                }
                return result;
            }
        }
        // Local-only mode: update and track for potential future sync
        const result = await localPapers.updatePaper(id, updateData);
        if (isCloudSyncEnabled() && isAuthenticated()) {
            trackPaperUpdated(id, updateData);
        }
        return result;
    },

    async deletePaper(id) {
        if (shouldUseCloudSync()) {
            try {
                await apiPapers.deletePaper(id);
                // Also delete from local (in case it exists there)
                try {
                    await localPapers.deletePaper(id);
                } catch (localError) {
                    // Ignore local delete errors (paper might not exist locally)
                }
                return;
            } catch (error) {
                // If paper not found on cloud (404), it might only exist locally
                // Delete from local and don't treat it as an error
                if (error.message && (error.message.includes('not found') || error.message.includes('404'))) {
                    console.log(`Paper ${id} not found on cloud, deleting from local only`);
                    await localPapers.deletePaper(id);
                    return;
                }
                console.error('Cloud sync failed, falling back to local:', error);
                await localPapers.deletePaper(id);
                // Track deletion for later sync
                if (shouldUseCloudSync()) {
                    trackPaperDeleted(id);
                }
                return;
            }
        }
        // Local-only mode: delete and track for potential future sync
        await localPapers.deletePaper(id);
        if (isCloudSyncEnabled() && isAuthenticated()) {
            trackPaperDeleted(id);
        }
    },

    // Additional API-only functions
    async searchPapers(query, options) {
        if (shouldUseCloudSync()) {
            try {
                const result = await apiPapers.searchPapers(query, options);
                return result.papers || [];
            } catch (error) {
                console.error('Cloud search failed, falling back to local:', error);
                // Fall back to local search if available
                const allPapers = await localPapers.getAllPapers();
                const lowerQuery = query.toLowerCase();
                return allPapers.filter(paper => 
                    paper.title?.toLowerCase().includes(lowerQuery) ||
                    paper.authors?.some(a => a.toLowerCase().includes(lowerQuery)) ||
                    paper.notes?.toLowerCase().includes(lowerQuery)
                );
            }
        }
        // Local search
        const allPapers = await localPapers.getAllPapers();
        const lowerQuery = query.toLowerCase();
        return allPapers.filter(paper => 
            paper.title?.toLowerCase().includes(lowerQuery) ||
            paper.authors?.some(a => a.toLowerCase().includes(lowerQuery)) ||
            paper.notes?.toLowerCase().includes(lowerQuery)
        );
    },

    async getUploadUrl(options) {
        if (shouldUseCloudSync()) {
            try {
                return await apiPapers.getUploadUrl(options);
            } catch (error) {
                throw new Error('Cloud sync required for PDF upload. Please log in.');
            }
        }
        throw new Error('Cloud sync required for PDF upload. Please log in.');
    },

    async uploadPdf(uploadUrl, file) {
        if (shouldUseCloudSync()) {
            try {
                return await apiPapers.uploadPdf(uploadUrl, file);
            } catch (error) {
                throw new Error('Failed to upload PDF to cloud storage.');
            }
        }
        throw new Error('Cloud sync required for PDF upload. Please log in.');
    },

    async getPdfDownloadUrl(paperId) {
        if (shouldUseCloudSync()) {
            try {
                return await apiPapers.getPdfDownloadUrl(paperId);
            } catch (error) {
                throw new Error('Cloud sync required for PDF download. Please log in.');
            }
        }
        throw new Error('Cloud sync required for PDF download. Please log in.');
    }
};

/**
 * Collection operations adapter
 */
export const collections = {
    async addCollection(collectionData) {
        if (shouldUseCloudSync()) {
            try {
                const collection = await apiCollections.createCollection(collectionData);
                // Also save to local
                try {
                    await localCollections.addCollection(collection);
                } catch (localError) {
                    // Ignore local save errors
                }
                return collection.id;
            } catch (error) {
                console.error('Cloud sync failed, falling back to local:', error);
                const localId = await localCollections.addCollection(collectionData);
                // Track change for later sync
                if (shouldUseCloudSync()) {
                    trackCollectionCreated({ ...collectionData, localId });
                }
                return localId;
            }
        }
        // Local-only mode: add and track for potential future sync
        const localId = await localCollections.addCollection(collectionData);
        if (isCloudSyncEnabled() && isAuthenticated()) {
            trackCollectionCreated({ ...collectionData, localId });
        }
        return localId;
    },

    async getAllCollections() {
        if (shouldUseCloudSync()) {
            try {
                return await apiCollections.getAllCollections();
            } catch (error) {
                console.error('Cloud sync failed, falling back to local:', error);
                return localCollections.getAllCollections();
            }
        }
        return localCollections.getAllCollections();
    },

    async getCollectionById(id) {
        if (shouldUseCloudSync()) {
            try {
                return await apiCollections.getCollection(id);
            } catch (error) {
                console.error('Cloud sync failed, falling back to local:', error);
                return localCollections.getCollectionById(id);
            }
        }
        return localCollections.getCollectionById(id);
    },

    async updateCollection(id, updateData) {
        if (shouldUseCloudSync()) {
            try {
                const collection = await apiCollections.updateCollection(id, updateData);
                // Also update local
                try {
                    await localCollections.updateCollection(id, collection);
                } catch (localError) {
                    // Ignore local update errors
                }
                return collection.id || id;
            } catch (error) {
                console.error('Cloud sync failed, falling back to local:', error);
                const result = await localCollections.updateCollection(id, updateData);
                // Track change for later sync
                if (shouldUseCloudSync()) {
                    trackCollectionUpdated(id, updateData);
                }
                return result;
            }
        }
        // Local-only mode: update and track for potential future sync
        const result = await localCollections.updateCollection(id, updateData);
        if (isCloudSyncEnabled() && isAuthenticated()) {
            trackCollectionUpdated(id, updateData);
        }
        return result;
    },

    async deleteCollection(id) {
        if (shouldUseCloudSync()) {
            try {
                await apiCollections.deleteCollection(id);
                // Also delete from local
                try {
                    await localCollections.deleteCollection(id);
                } catch (localError) {
                    // Ignore local delete errors
                }
                return;
            } catch (error) {
                console.error('Cloud sync failed, falling back to local:', error);
                await localCollections.deleteCollection(id);
                // Track deletion for later sync
                if (shouldUseCloudSync()) {
                    trackCollectionDeleted(id);
                }
                return;
            }
        }
        // Local-only mode: delete and track for potential future sync
        await localCollections.deleteCollection(id);
        if (isCloudSyncEnabled() && isAuthenticated()) {
            trackCollectionDeleted(id);
        }
    }
};

/**
 * Annotation operations adapter
 */
export const annotations = {
    async addAnnotation(annotationData) {
        if (shouldUseCloudSync()) {
            try {
                const annotation = await apiAnnotations.createAnnotation(
                    annotationData.paperId,
                    annotationData
                );
                // Also save to local
                try {
                    await localAnnotations.addAnnotation(annotation);
                } catch (localError) {
                    // Ignore local save errors
                }
                return annotation.id;
            } catch (error) {
                console.error('Cloud sync failed, falling back to local:', error);
                const localId = await localAnnotations.addAnnotation(annotationData);
                // Track change for later sync
                if (shouldUseCloudSync()) {
                    trackAnnotationCreated({ ...annotationData, localId });
                }
                return localId;
            }
        }
        // Local-only mode: add and track for potential future sync
        const localId = await localAnnotations.addAnnotation(annotationData);
        if (isCloudSyncEnabled() && isAuthenticated()) {
            trackAnnotationCreated({ ...annotationData, localId });
        }
        return localId;
    },

    async getAnnotationsByPaperId(paperId) {
        if (shouldUseCloudSync()) {
            try {
                return await apiAnnotations.getAnnotations(paperId);
            } catch (error) {
                console.error('Cloud sync failed, falling back to local:', error);
                return localAnnotations.getAnnotationsByPaperId(paperId);
            }
        }
        return localAnnotations.getAnnotationsByPaperId(paperId);
    },

    async getAnnotationById(id) {
        if (shouldUseCloudSync()) {
            try {
                return await apiAnnotations.getAnnotation(id);
            } catch (error) {
                console.error('Cloud sync failed, falling back to local:', error);
                return localAnnotations.getAnnotationById(id);
            }
        }
        return localAnnotations.getAnnotationById(id);
    },

    async updateAnnotation(id, updateData) {
        if (shouldUseCloudSync()) {
            try {
                const annotation = await apiAnnotations.updateAnnotation(id, updateData);
                // Also update local
                try {
                    await localAnnotations.updateAnnotation(id, annotation);
                } catch (localError) {
                    // Ignore local update errors
                }
                return annotation.id || id;
            } catch (error) {
                console.error('Cloud sync failed, falling back to local:', error);
                const result = await localAnnotations.updateAnnotation(id, updateData);
                // Track change for later sync
                if (shouldUseCloudSync()) {
                    trackAnnotationUpdated(id, updateData);
                }
                return result;
            }
        }
        // Local-only mode: update and track for potential future sync
        const result = await localAnnotations.updateAnnotation(id, updateData);
        if (isCloudSyncEnabled() && isAuthenticated()) {
            trackAnnotationUpdated(id, updateData);
        }
        return result;
    },

    async deleteAnnotation(id) {
        if (shouldUseCloudSync()) {
            try {
                await apiAnnotations.deleteAnnotation(id);
                // Also delete from local
                try {
                    await localAnnotations.deleteAnnotation(id);
                } catch (localError) {
                    // Ignore local delete errors
                }
                return;
            } catch (error) {
                console.error('Cloud sync failed, falling back to local:', error);
                await localAnnotations.deleteAnnotation(id);
                // Track deletion for later sync
                if (shouldUseCloudSync()) {
                    trackAnnotationDeleted(id);
                }
                return;
            }
        }
        // Local-only mode: delete and track for potential future sync
        await localAnnotations.deleteAnnotation(id);
        if (isCloudSyncEnabled() && isAuthenticated()) {
            trackAnnotationDeleted(id);
        }
    },

    async deleteAnnotationsByPaperId(paperId) {
        // For now, this is local-only as API doesn't have bulk delete
        // Could be enhanced to fetch all and delete individually
        return localAnnotations.deleteAnnotationsByPaperId(paperId);
    }
};

/**
 * Checks if cloud sync is available.
 * @returns {boolean} True if cloud sync is enabled and user is authenticated.
 */
export function isCloudSyncAvailable() {
    return shouldUseCloudSync();
}

