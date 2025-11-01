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
    
    // Remove fields that API doesn't expect
    delete apiData.pdfData; // PDFs are uploaded separately via S3
    delete apiData.hasPdf; // API doesn't track this field
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
    
    return localPaper;
}

export const papers = {
    async addPaper(paperData) {
        if (shouldUseCloudSync()) {
            try {
                // Map local format to API format
                const apiData = mapPaperDataToApi(paperData);
                const paper = await apiPapers.createPaper(apiData);
                // Convert API response to match local format (API returns paper object, local returns ID)
                return paper.id;
            } catch (error) {
                console.error('Cloud sync failed, falling back to local:', error);
                // Fall back to local if cloud fails
                return localPapers.addPaper(paperData);
            }
        }
        return localPapers.addPaper(paperData);
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
                // Map API format to local format
                return mapPaperDataFromApi(paper);
            } catch (error) {
                console.error('Cloud sync failed, falling back to local:', error);
                return localPapers.updatePaper(id, updateData);
            }
        }
        return localPapers.updatePaper(id, updateData);
    },

    async deletePaper(id) {
        if (shouldUseCloudSync()) {
            try {
                await apiPapers.deletePaper(id);
                return;
            } catch (error) {
                console.error('Cloud sync failed, falling back to local:', error);
                return localPapers.deletePaper(id);
            }
        }
        return localPapers.deletePaper(id);
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
                return collection.id;
            } catch (error) {
                console.error('Cloud sync failed, falling back to local:', error);
                return localCollections.addCollection(collectionData);
            }
        }
        return localCollections.addCollection(collectionData);
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
                return collection.id || id;
            } catch (error) {
                console.error('Cloud sync failed, falling back to local:', error);
                return localCollections.updateCollection(id, updateData);
            }
        }
        return localCollections.updateCollection(id, updateData);
    },

    async deleteCollection(id) {
        if (shouldUseCloudSync()) {
            try {
                await apiCollections.deleteCollection(id);
                return;
            } catch (error) {
                console.error('Cloud sync failed, falling back to local:', error);
                return localCollections.deleteCollection(id);
            }
        }
        return localCollections.deleteCollection(id);
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
                return annotation.id;
            } catch (error) {
                console.error('Cloud sync failed, falling back to local:', error);
                return localAnnotations.addAnnotation(annotationData);
            }
        }
        return localAnnotations.addAnnotation(annotationData);
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
                return annotation.id || id;
            } catch (error) {
                console.error('Cloud sync failed, falling back to local:', error);
                return localAnnotations.updateAnnotation(id, updateData);
            }
        }
        return localAnnotations.updateAnnotation(id, updateData);
    },

    async deleteAnnotation(id) {
        if (shouldUseCloudSync()) {
            try {
                await apiAnnotations.deleteAnnotation(id);
                return;
            } catch (error) {
                console.error('Cloud sync failed, falling back to local:', error);
                return localAnnotations.deleteAnnotation(id);
            }
        }
        return localAnnotations.deleteAnnotation(id);
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

