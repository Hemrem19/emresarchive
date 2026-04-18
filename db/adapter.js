/**
 * Database Adapter Module
 * Routes operations between cloud API and local IndexedDB based on sync mode
 */

import { isCloudSyncEnabled } from '../config.js';
import { isAuthenticated } from '../api/auth.js';
import { getApiBaseUrl } from '../config.js';

// Import IndexedDB functions
import * as localPapers from './papers.js';
import * as localFolders from './folders.js';
import * as localPaperFolders from './paperFolders.js';
import * as localAnnotations from './annotations.js';

// Import API functions
import * as apiPapers from '../api/papers.js';
import * as apiFolders from '../api/folders.js';
import * as apiPaperFoldersApi from '../api/paperFolders.js';
import * as apiAnnotations from '../api/annotations.js';

// Sync tracking (delegates to db/sync.js in-memory change queue for offline-first support)
import {
    trackPaperCreated,
    trackPaperUpdated,
    trackPaperDeleted,
    trackFolderCreated,
    trackFolderUpdated,
    trackFolderDeleted,
    trackPaperFolderCreated,
    trackPaperFolderDeleted,
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

// Flag to prevent duplicate seeding within a single page load
let _localSeededFromCloud = false;

/**
 * Fetches all papers and collections from the REST API and upserts them into
 * local IndexedDB. Called once per page load when cloud sync is enabled so
 * the dashboard always shows up-to-date data even on a fresh device.
 */
async function seedLocalFromCloud() {
    // Fetch all papers (use a high limit to avoid pagination for typical libraries)
    const { papers: apiPaperList } = await apiPapers.getAllPapers({ limit: 1000 });
    const serverPaperIds = new Set(apiPaperList.map(p => p.id));

    // Upsert all papers from server
    for (const paper of apiPaperList) {
        const local = mapPaperDataFromApi(paper);
        try { await localPapers.updatePaper(paper.id, local); }
        catch { await localPapers.addPaper(local); }
    }

    // Delete local papers that no longer exist on the server (deleted from another device)
    const allLocal = await localPapers.getAllPapers();
    for (const local of allLocal) {
        if (!serverPaperIds.has(local.id)) {
            await localPapers.deletePaper(local.id).catch(() => {});
        }
    }

    // Fetch all folders
    const apiFolderList = await apiFolders.getAllFolders();
    const serverFolderIds = new Set(apiFolderList.map(f => f.id));

    for (const folder of apiFolderList) {
        try { await localFolders.updateFolder(folder.id, folder); }
        catch { await localFolders.addFolder(folder); }
    }

    // Delete local folders that no longer exist on the server
    const allLocalFoldersList = await localFolders.getAllFolders();
    for (const local of allLocalFoldersList) {
        if (!serverFolderIds.has(local.id)) {
            await localFolders.deleteFolder(local.id).catch(() => {});
            await localPaperFolders.removeAllForFolder(local.id).catch(() => {});
        }
    }

    // Seed paper-folder associations for each folder
    for (const folder of apiFolderList) {
        try {
            const paperIds = await apiPaperFoldersApi.getPapersInFolder(folder.id);
            for (const paperId of paperIds) {
                await localPaperFolders.addPaperToFolder(paperId, folder.id);
            }
        } catch (e) {
            console.warn(`[Adapter] Failed to seed paper-folder associations for folder ${folder.id}:`, e.message);
        }
    }
}

/**
 * Re-fetches all data from the cloud REST API, upserts into local IndexedDB,
 * and dispatches 'citavers:cloud-synced' so the UI can refresh.
 * Called by syncManager on polling/reconnect/focus.
 */
export async function syncFromCloud() {
    if (!shouldUseCloudSync()) return;
    await seedLocalFromCloud();
    _localSeededFromCloud = true; // Mark seeded — prevents re-seeding when getAllPapers is called from the cloud-synced handler
    window.dispatchEvent(new CustomEvent('citavers:cloud-synced'));
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
        if (shouldUseCloudSync() && !isRateLimited()) {
            if (!_localSeededFromCloud) {
                _localSeededFromCloud = true;
                try {
                    await seedLocalFromCloud();
                } catch (e) {
                    _localSeededFromCloud = false; // Allow retry on next call
                    console.warn('[Adapter] Initial cloud seed failed:', e.message);
                }
            }
            // No triggerDebouncedSync() here — reads should not trigger sync.
            // Background sync is handled by the 30s poller in syncManager.
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
        // Optimistic UI: update local first for immediate feedback
        const result = await localPapers.updatePaper(id, updateData);

        if (shouldUseCloudSync()) {
            try {
                const { pdfData, pdfFile, hasPdf, createdAt, updatedAt, localId, ...apiPayload } = updateData;
                await apiPapers.updatePaper(id, mapPaperDataToApi(apiPayload));
            } catch (error) {
                console.error('[Adapter] Cloud update failed, change is local-only:', error);
            }
        }

        return result;
    },

    async deletePaper(id) {
        // Optimistic UI: delete locally first
        await localPapers.deletePaper(id);

        if (shouldUseCloudSync()) {
            try {
                await apiPapers.deletePaper(id);
            } catch (error) {
                console.error('[Adapter] Cloud delete failed, deletion is local-only:', error);
            }
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
 * Folder operations adapter
 */
export const folders = {
    async addFolder(folderData) {
        if (shouldUseCloudSync()) {
            try {
                const folder = await apiFolders.createFolder(folderData);
                try {
                    await localFolders.addFolder(folder);
                } catch (localError) {
                    // Ignore local save errors
                }
                triggerDebouncedSync();
                return folder.id;
            } catch (error) {
                console.error('Cloud sync failed, falling back to local:', error);
                const localId = await localFolders.addFolder(folderData);
                if (shouldUseCloudSync()) {
                    trackFolderCreated({ ...folderData, localId });
                    triggerDebouncedSync();
                }
                return localId;
            }
        }
        const localId = await localFolders.addFolder(folderData);
        if (isCloudSyncEnabled() && isAuthenticated()) {
            trackFolderCreated({ ...folderData, localId });
            triggerDebouncedSync();
        }
        return localId;
    },

    async getAllFolders() {
        if (shouldUseCloudSync() && !isRateLimited()) {
            triggerDebouncedSync();
        }
        return localFolders.getAllFolders();
    },

    async getFolderById(id) {
        return localFolders.getFolderById(id);
    },

    async updateFolder(id, updateData) {
        if (shouldUseCloudSync()) {
            try {
                const folder = await apiFolders.updateFolder(id, updateData);
                try {
                    await localFolders.updateFolder(id, folder);
                } catch (localError) {
                    // Ignore local update errors
                }
                triggerDebouncedSync();
                return folder.id || id;
            } catch (error) {
                console.error('Cloud sync failed, falling back to local:', error);
                const result = await localFolders.updateFolder(id, updateData);
                if (shouldUseCloudSync()) {
                    trackFolderUpdated(id, updateData);
                    triggerDebouncedSync();
                }
                return result;
            }
        }
        const result = await localFolders.updateFolder(id, updateData);
        if (isCloudSyncEnabled() && isAuthenticated()) {
            trackFolderUpdated(id, updateData);
            triggerDebouncedSync();
        }
        return result;
    },

    async deleteFolder(id) {
        if (shouldUseCloudSync()) {
            try {
                await apiFolders.deleteFolder(id);
                try {
                    await localPaperFolders.removeAllForFolder(id);
                    await localFolders.deleteFolder(id);
                } catch (localError) {
                    // Ignore local delete errors
                }
                triggerDebouncedSync();
                return;
            } catch (error) {
                console.error('Cloud sync failed, falling back to local:', error);
                await localPaperFolders.removeAllForFolder(id);
                await localFolders.deleteFolder(id);
                if (shouldUseCloudSync()) {
                    trackFolderDeleted(id);
                    triggerDebouncedSync();
                }
                return;
            }
        }
        await localPaperFolders.removeAllForFolder(id);
        await localFolders.deleteFolder(id);
        if (isCloudSyncEnabled() && isAuthenticated()) {
            trackFolderDeleted(id);
            triggerDebouncedSync();
        }
    }
};

/**
 * Paper-folder association operations adapter
 */
export const paperFoldersAdapter = {
    async addPaperToFolder(paperId, folderId) {
        const result = await localPaperFolders.addPaperToFolder(paperId, folderId);
        if (shouldUseCloudSync()) {
            try {
                await apiPaperFoldersApi.addPaperToFolder(folderId, paperId);
            } catch (error) {
                console.error('[Adapter] Cloud paper-folder add failed:', error);
                trackPaperFolderCreated(paperId, folderId);
            }
            triggerDebouncedSync();
        } else if (isCloudSyncEnabled() && isAuthenticated()) {
            trackPaperFolderCreated(paperId, folderId);
            triggerDebouncedSync();
        }
        return result;
    },

    async removePaperFromFolder(paperId, folderId) {
        await localPaperFolders.removePaperFromFolder(paperId, folderId);
        if (shouldUseCloudSync()) {
            try {
                await apiPaperFoldersApi.removePaperFromFolder(folderId, paperId);
            } catch (error) {
                console.error('[Adapter] Cloud paper-folder remove failed:', error);
                trackPaperFolderDeleted(paperId, folderId);
            }
            triggerDebouncedSync();
        } else if (isCloudSyncEnabled() && isAuthenticated()) {
            trackPaperFolderDeleted(paperId, folderId);
            triggerDebouncedSync();
        }
    },

    async getFolderIdsByPaperId(paperId) {
        return localPaperFolders.getFolderIdsByPaperId(paperId);
    },

    async getPaperIdsByFolderId(folderId) {
        return localPaperFolders.getPaperIdsByFolderId(folderId);
    },

    async getAllPaperFolders() {
        return localPaperFolders.getAllPaperFolders();
    },

    async removeAllForFolder(folderId) {
        return localPaperFolders.removeAllForFolder(folderId);
    },

    async removeAllForPaper(paperId) {
        return localPaperFolders.removeAllForPaper(paperId);
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

