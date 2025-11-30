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

// Import auto-sync manager
import { triggerDebouncedSync } from '../core/syncManager.js';

// Import rate limit utilities
import { isRateLimited, getRateLimitRemainingTime } from '../api/utils.js';

/**
 * Checks if cloud sync should be used.
 * @returns {boolean} True if cloud sync is enabled and user is authenticated.
 */
function shouldUseCloudSync() {
    return isCloudSyncEnabled() && isAuthenticated();
}

/**
 * Checks if cloud sync should be attempted (not rate limited).
 * @returns {boolean} True if cloud sync is enabled, authenticated, and not rate limited.
 */
function canAttemptCloudSync() {
    if (!shouldUseCloudSync()) {
        return false;
    }

    if (isRateLimited()) {
        const remainingSeconds = Math.ceil(getRateLimitRemainingTime() / 1000);
        console.log(`[Adapter] Skipping cloud sync - rate limited for ${remainingSeconds}s`);
        return false;
    }

    return true;
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

    // Set hasPdf based on pdfUrl/s3Key existence (derive from actual data, not stored field)
    // This ensures hasPdf is accurate even if backend doesn't have pdfUrl
    localPaper.hasPdf = !!(localPaper.s3Key || localPaper.pdfUrl || localPaper.pdfFile);

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
                // Trigger debounced sync after successful cloud operation (for any local fallback changes)
                triggerDebouncedSync();
                return paper.id;
            } catch (error) {
                console.error('Cloud sync failed, falling back to local:', error);
                // Fall back to local if cloud fails
                const localId = await localPapers.addPaper(paperData);
                // Track change for later sync
                if (shouldUseCloudSync()) {
                    trackPaperCreated({ ...paperData, localId });
                    // Trigger debounced sync after local fallback
                    triggerDebouncedSync();
                }
                return localId;
            }
        }
        // Local-only mode: add and track for potential future sync
        const localId = await localPapers.addPaper(paperData);
        if (isCloudSyncEnabled() && isAuthenticated()) {
            trackPaperCreated({ ...paperData, localId });
            // Trigger debounced sync for local-only changes
            triggerDebouncedSync();
        }
        return localId;
    },

    async getAllPapers() {
        // Always read from local storage first for immediate UI feedback
        // This ensures offline-first experience even when cloud sync is enabled

        // Trigger background sync if needed to keep local data fresh
        if (shouldUseCloudSync() && !isRateLimited()) {
            triggerDebouncedSync();
        }

        return localPapers.getAllPapers();
    },

    async getPaperById(id) {
        // Always read from local storage first
        // The background sync will handle updates
        return localPapers.getPaperById(id);
    },

    async getPaperByDoi(doi) {
        // DOI lookup is typically done locally for speed
        // Could enhance to search cloud if needed
        return localPapers.getPaperByDoi(doi);
    },

    async updatePaper(id, updateData) {
        console.log('[Adapter] updatePaper called:', { id, updateFields: Object.keys(updateData), updateData });
        // Optimistic UI: Always update local storage first for immediate feedback
        const result = await localPapers.updatePaper(id, updateData);
        console.log('[Adapter] Local update completed, result:', result);

        // Check cloud sync status
        const cloudSyncEnabled = isCloudSyncEnabled();
        const authenticated = isAuthenticated();
        const shouldSync = shouldUseCloudSync();
        console.log('[Adapter] Cloud sync check:', { cloudSyncEnabled, authenticated, shouldSync });

        // If cloud sync is enabled, track the change and trigger sync
        if (shouldSync) {
            console.log('[Adapter] Cloud sync enabled, tracking update');
            // Get the updated paper to include version for conflict resolution
            // IMPORTANT: We get the FULL updated paper from IndexedDB to ensure we have all current fields
            // This prevents losing fields when multiple updates happen before sync
            try {
                const updatedPaper = await localPapers.getPaperById(id);
                console.log('[Adapter] Retrieved updated paper:', { id, hasVersion: updatedPaper?.version !== undefined, version: updatedPaper?.version });
                if (updatedPaper && updatedPaper.version !== undefined) {
                    // Merge updateData with the full paper to ensure all fields are included
                    // This way, if multiple fields were updated separately, they're all preserved
                    const mergedUpdate = { ...updatedPaper, ...updateData, version: updatedPaper.version };
                    // Remove fields that shouldn't be sent to backend
                    const { pdfData, pdfFile, hasPdf, createdAt, updatedAt, localId, ...updatePayload } = mergedUpdate;
                    console.log('[Adapter] Merged update payload (includes all current fields):', {
                        id,
                        fields: Object.keys(updatePayload),
                        hasNotes: 'notes' in updatePayload,
                        hasTags: 'tags' in updatePayload,
                        hasSummary: 'summary' in updatePayload,
                        hasRating: 'rating' in updatePayload
                    });
                    trackPaperUpdated(id, updatePayload);
                } else {
                    // Fallback: track without version (will default to 1 on backend)
                    console.log('[Adapter] Paper version not found, tracking without version');
                    console.log('[Adapter] Calling trackPaperUpdated with:', { id, payload: updateData });
                    trackPaperUpdated(id, updateData);
                }
            } catch (error) {
                console.error('[Adapter] Error getting paper for version:', error);
                // Fallback: track without version
                console.log('[Adapter] Calling trackPaperUpdated (fallback) with:', { id, payload: updateData });
                trackPaperUpdated(id, updateData);
            }
            console.log('[Adapter] Triggering debounced sync');
            triggerDebouncedSync();
        } else {
            console.warn('[Adapter] Cloud sync not enabled or not authenticated - update will NOT be synced!', { cloudSyncEnabled, authenticated });
        }

        return result;
    },

    async deletePaper(id) {
        // Optimistic UI: Always delete from local storage first
        await localPapers.deletePaper(id);

        // If cloud sync is enabled, track the change and trigger sync
        if (shouldUseCloudSync()) {
            trackPaperDeleted(id);
            triggerDebouncedSync();
        }
    },

    async batchOperations(operations) {
        if (shouldUseCloudSync()) {
            try {
                // Map operations to API format
                const apiOperations = operations.map(op => {
                    if (op.type === 'update' && op.data) {
                        return { ...op, data: mapPaperDataToApi(op.data) };
                    }
                    return op;
                });

                const apiResults = await apiPapers.batchOperations(apiOperations);

                // Apply changes to local DB based on success
                const localResults = [];
                for (const result of apiResults) {
                    if (result.success) {
                        try {
                            if (result.type === 'delete') {
                                // Only delete if it exists locally
                                try {
                                    await localPapers.deletePaper(result.id);
                                } catch (err) { /* ignore */ }
                            } else if (result.type === 'update') {
                                if (result.data) {
                                    const localPaper = mapPaperDataFromApi(result.data);
                                    await localPapers.updatePaper(result.id, localPaper);
                                } else {
                                    // Fallback
                                    const originalOp = operations.find(o => o.id === result.id);
                                    if (originalOp) {
                                        await localPapers.updatePaper(originalOp.id, originalOp.data);
                                    }
                                }
                            }
                            localResults.push(result);
                        } catch (e) {
                            console.warn('Local update failed after cloud success', e);
                            localResults.push({ ...result, localError: e.message });
                        }
                    } else {
                        localResults.push(result);
                    }
                }

                triggerDebouncedSync();
                return localResults;

            } catch (error) {
                console.error('Cloud batch failed, falling back to local:', error);
                return this._performLocalBatch(operations);
            }
        }

        return this._performLocalBatch(operations);
    },

    async _performLocalBatch(operations) {
        const results = [];
        for (const op of operations) {
            try {
                if (op.type === 'delete') {
                    await localPapers.deletePaper(op.id);
                    if (isCloudSyncEnabled() && isAuthenticated()) trackPaperDeleted(op.id);
                    results.push({ id: op.id, success: true, type: 'delete' });
                } else if (op.type === 'update') {
                    await localPapers.updatePaper(op.id, op.data);
                    if (isCloudSyncEnabled() && isAuthenticated()) trackPaperUpdated(op.id, op.data);
                    results.push({ id: op.id, success: true, type: 'update' });
                } else {
                    results.push({ id: op.id, success: false, error: 'Unknown type' });
                }
            } catch (e) {
                results.push({ id: op.id, success: false, error: e.message });
            }
        }
        if (isCloudSyncEnabled() && isAuthenticated()) triggerDebouncedSync();
        return results;
    },

    // Additional API-only functions
    async searchPapers(query, options) {
        // Always perform local search for instant results
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
                // Trigger debounced sync after successful cloud operation
                triggerDebouncedSync();
                return collection.id;
            } catch (error) {
                console.error('Cloud sync failed, falling back to local:', error);
                const localId = await localCollections.addCollection(collectionData);
                // Track change for later sync
                if (shouldUseCloudSync()) {
                    trackCollectionCreated({ ...collectionData, localId });
                    // Trigger debounced sync after local fallback
                    triggerDebouncedSync();
                }
                return localId;
            }
        }
        // Local-only mode: add and track for potential future sync
        const localId = await localCollections.addCollection(collectionData);
        if (isCloudSyncEnabled() && isAuthenticated()) {
            trackCollectionCreated({ ...collectionData, localId });
            // Trigger debounced sync for local-only changes
            triggerDebouncedSync();
        }
        return localId;
    },

    async getAllCollections() {
        // Always read from local storage first for immediate UI feedback
        if (shouldUseCloudSync() && !isRateLimited()) {
            triggerDebouncedSync();
        }
        return localCollections.getAllCollections();
    },

    async getCollectionById(id) {
        // Always read from local storage first
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
                // Trigger debounced sync after successful cloud operation
                triggerDebouncedSync();
                return collection.id || id;
            } catch (error) {
                console.error('Cloud sync failed, falling back to local:', error);
                const result = await localCollections.updateCollection(id, updateData);
                // Track change for later sync
                if (shouldUseCloudSync()) {
                    trackCollectionUpdated(id, updateData);
                    // Trigger debounced sync after local fallback
                    triggerDebouncedSync();
                }
                return result;
            }
        }
        // Local-only mode: update and track for potential future sync
        const result = await localCollections.updateCollection(id, updateData);
        if (isCloudSyncEnabled() && isAuthenticated()) {
            trackCollectionUpdated(id, updateData);
            // Trigger debounced sync for local-only changes
            triggerDebouncedSync();
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
                // Trigger debounced sync after successful cloud operation
                triggerDebouncedSync();
                return;
            } catch (error) {
                console.error('Cloud sync failed, falling back to local:', error);
                await localCollections.deleteCollection(id);
                // Track deletion for later sync
                if (shouldUseCloudSync()) {
                    trackCollectionDeleted(id);
                    // Trigger debounced sync after local fallback
                    triggerDebouncedSync();
                }
                return;
            }
        }
        // Local-only mode: delete and track for potential future sync
        await localCollections.deleteCollection(id);
        if (isCloudSyncEnabled() && isAuthenticated()) {
            trackCollectionDeleted(id);
            // Trigger debounced sync for local-only changes
            triggerDebouncedSync();
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
                // Trigger debounced sync after successful cloud operation
                triggerDebouncedSync();
                return annotation.id;
            } catch (error) {
                console.error('Cloud sync failed, falling back to local:', error);
                const localId = await localAnnotations.addAnnotation(annotationData);
                // Track change for later sync
                if (shouldUseCloudSync()) {
                    trackAnnotationCreated({ ...annotationData, localId });
                    // Trigger debounced sync after local fallback
                    triggerDebouncedSync();
                }
                return localId;
            }
        }
        // Local-only mode: add and track for potential future sync
        const localId = await localAnnotations.addAnnotation(annotationData);
        if (isCloudSyncEnabled() && isAuthenticated()) {
            trackAnnotationCreated({ ...annotationData, localId });
            // Trigger debounced sync for local-only changes
            triggerDebouncedSync();
        }
        return localId;
    },

    async getAnnotationsByPaperId(paperId) {
        // Always read from local storage first
        return localAnnotations.getAnnotationsByPaperId(paperId);
    },

    async getAnnotationById(id) {
        // Always read from local storage first
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
                // Trigger debounced sync after successful cloud operation
                triggerDebouncedSync();
                return annotation.id || id;
            } catch (error) {
                console.error('Cloud sync failed, falling back to local:', error);
                const result = await localAnnotations.updateAnnotation(id, updateData);
                // Track change for later sync
                if (shouldUseCloudSync()) {
                    trackAnnotationUpdated(id, updateData);
                    // Trigger debounced sync after local fallback
                    triggerDebouncedSync();
                }
                return result;
            }
        }
        // Local-only mode: update and track for potential future sync
        const result = await localAnnotations.updateAnnotation(id, updateData);
        if (isCloudSyncEnabled() && isAuthenticated()) {
            trackAnnotationUpdated(id, updateData);
            // Trigger debounced sync for local-only changes
            triggerDebouncedSync();
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
                // Trigger debounced sync after successful cloud operation
                triggerDebouncedSync();
                return;
            } catch (error) {
                console.error('Cloud sync failed, falling back to local:', error);
                await localAnnotations.deleteAnnotation(id);
                // Track deletion for later sync
                if (shouldUseCloudSync()) {
                    trackAnnotationDeleted(id);
                    // Trigger debounced sync after local fallback
                    triggerDebouncedSync();
                }
                return;
            }
        }
        // Local-only mode: delete and track for potential future sync
        await localAnnotations.deleteAnnotation(id);
        if (isCloudSyncEnabled() && isAuthenticated()) {
            trackAnnotationDeleted(id);
            // Trigger debounced sync for local-only changes
            triggerDebouncedSync();
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

