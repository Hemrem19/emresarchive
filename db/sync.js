/**
 * Sync Orchestrator Service
 * Handles automatic sync between local IndexedDB and cloud API
 * Tracks local changes and applies server changes
 */

import { isCloudSyncEnabled } from '../config.js';
import { isAuthenticated } from '../api/auth.js';
import { fullSync, incrementalSync, getSyncStatus, getClientId } from '../api/sync.js';
import { mapPaperFromApi, mapCollectionFromApi, mapAnnotationFromApi, mapPaperToApi, mapCollectionToApi, mapAnnotationToApi } from '../api/sync.js';
import { getAllPapers, addPaper, updatePaper, deletePaper } from '../db.js';
import { getAllCollections, addCollection, updateCollection, deleteCollection } from '../db.js';
import { getAnnotationsByPaperId, addAnnotation, updateAnnotation, deleteAnnotation } from '../db.js';
import { openDB, STORE_NAME_PAPERS, STORE_NAME_COLLECTIONS, STORE_NAME_ANNOTATIONS } from './core.js';

// Storage keys for change tracking
const CHANGES_KEY = 'citavers_pending_changes';
const SYNC_IN_PROGRESS_KEY = 'citavers_sync_in_progress';

/**
 * Gets pending changes from localStorage.
 * @returns {Object} Pending changes { papers: {created, updated, deleted}, collections: {...}, annotations: {...} }.
 */
export function getPendingChanges() {
    const changesStr = localStorage.getItem(CHANGES_KEY);
    return changesStr ? JSON.parse(changesStr) : {
        papers: { created: [], updated: [], deleted: [] },
        collections: { created: [], updated: [], deleted: [] },
        annotations: { created: [], updated: [], deleted: [] }
    };
}

/**
 * Saves pending changes to localStorage.
 * @param {Object} changes - Changes object.
 */
function savePendingChanges(changes) {
    localStorage.setItem(CHANGES_KEY, JSON.stringify(changes));
}

/**
 * Clears pending changes.
 */
function clearPendingChanges() {
    localStorage.removeItem(CHANGES_KEY);
}

/**
 * Adds a paper creation to pending changes.
 * @param {Object} paper - Paper data (will be sent to API).
 */
export function trackPaperCreated(paper) {
    const changes = getPendingChanges();
    changes.papers.created.push(paper);
    savePendingChanges(changes);
}

/**
 * Adds a paper update to pending changes.
 * @param {number} id - Paper ID.
 * @param {Object} paper - Paper update data.
 */
export function trackPaperUpdated(id, paper) {
    const changes = getPendingChanges();
    // Check if already in created list (local-only paper)
    const createdIndex = changes.papers.created.findIndex(p => p.localId === id || (p.id && p.id === id));
    if (createdIndex !== -1) {
        // Update in created list
        changes.papers.created[createdIndex] = { ...changes.papers.created[createdIndex], ...paper };
    } else {
        // Add to updated list
        changes.papers.updated.push({ id, ...paper });
    }
    savePendingChanges(changes);
}

/**
 * Adds a paper deletion to pending changes.
 * @param {number} id - Paper ID.
 */
export function trackPaperDeleted(id) {
    const changes = getPendingChanges();
    // Remove from created/updated if present
    changes.papers.created = changes.papers.created.filter(p => p.localId !== id && !(p.id && p.id === id));
    changes.papers.updated = changes.papers.updated.filter(p => p.id !== id);
    // Add to deleted
    if (!changes.papers.deleted.includes(id)) {
        changes.papers.deleted.push(id);
    }
    savePendingChanges(changes);
}

/**
 * Adds a collection creation to pending changes.
 * @param {Object} collection - Collection data.
 */
export function trackCollectionCreated(collection) {
    const changes = getPendingChanges();
    changes.collections.created.push(collection);
    savePendingChanges(changes);
}

/**
 * Adds a collection update to pending changes.
 * @param {number} id - Collection ID.
 * @param {Object} collection - Collection update data.
 */
export function trackCollectionUpdated(id, collection) {
    const changes = getPendingChanges();
    const createdIndex = changes.collections.created.findIndex(c => c.localId === id || (c.id && c.id === id));
    if (createdIndex !== -1) {
        changes.collections.created[createdIndex] = { ...changes.collections.created[createdIndex], ...collection };
    } else {
        changes.collections.updated.push({ id, ...collection });
    }
    savePendingChanges(changes);
}

/**
 * Adds a collection deletion to pending changes.
 * @param {number} id - Collection ID.
 */
export function trackCollectionDeleted(id) {
    const changes = getPendingChanges();
    changes.collections.created = changes.collections.created.filter(c => c.localId !== id && !(c.id && c.id === id));
    changes.collections.updated = changes.collections.updated.filter(c => c.id !== id);
    if (!changes.collections.deleted.includes(id)) {
        changes.collections.deleted.push(id);
    }
    savePendingChanges(changes);
}

/**
 * Adds an annotation creation to pending changes.
 * @param {Object} annotation - Annotation data.
 */
export function trackAnnotationCreated(annotation) {
    const changes = getPendingChanges();
    changes.annotations.created.push(annotation);
    savePendingChanges(changes);
}

/**
 * Adds an annotation update to pending changes.
 * @param {number} id - Annotation ID.
 * @param {Object} annotation - Annotation update data.
 */
export function trackAnnotationUpdated(id, annotation) {
    const changes = getPendingChanges();
    const createdIndex = changes.annotations.created.findIndex(a => a.localId === id || (a.id && a.id === id));
    if (createdIndex !== -1) {
        changes.annotations.created[createdIndex] = { ...changes.annotations.created[createdIndex], ...annotation };
    } else {
        changes.annotations.updated.push({ id, ...annotation });
    }
    savePendingChanges(changes);
}

/**
 * Adds an annotation deletion to pending changes.
 * @param {number} id - Annotation ID.
 */
export function trackAnnotationDeleted(id) {
    const changes = getPendingChanges();
    changes.annotations.created = changes.annotations.created.filter(a => a.localId !== id && !(a.id && a.id === id));
    changes.annotations.updated = changes.annotations.updated.filter(a => a.id !== id);
    if (!changes.annotations.deleted.includes(id)) {
        changes.annotations.deleted.push(id);
    }
    savePendingChanges(changes);
}

/**
 * Checks if sync is in progress.
 * @returns {boolean} True if sync is in progress.
 */
export function isSyncInProgress() {
    return localStorage.getItem(SYNC_IN_PROGRESS_KEY) === 'true';
}

/**
 * Sets sync in progress flag.
 * @param {boolean} inProgress - Whether sync is in progress.
 */
function setSyncInProgress(inProgress) {
    if (inProgress) {
        localStorage.setItem(SYNC_IN_PROGRESS_KEY, 'true');
    } else {
        localStorage.removeItem(SYNC_IN_PROGRESS_KEY);
    }
}

/**
 * Applies server changes to local IndexedDB.
 * @param {Object} serverChanges - Server changes { papers, collections, annotations, deleted }.
 */
async function applyServerChanges(serverChanges) {
    const database = await openDB();
    
    return new Promise((resolve, reject) => {
        const transaction = database.transaction([STORE_NAME_PAPERS, STORE_NAME_COLLECTIONS, STORE_NAME_ANNOTATIONS], 'readwrite');
        const papersStore = transaction.objectStore(STORE_NAME_PAPERS);
        const collectionsStore = transaction.objectStore(STORE_NAME_COLLECTIONS);
        const annotationsStore = transaction.objectStore(STORE_NAME_ANNOTATIONS);

        let operationsCompleted = 0;
        const totalOperations = 
            (serverChanges.papers?.length || 0) +
            (serverChanges.collections?.length || 0) +
            (serverChanges.annotations?.length || 0) +
            (serverChanges.deleted?.papers?.length || 0) +
            (serverChanges.deleted?.collections?.length || 0) +
            (serverChanges.deleted?.annotations?.length || 0);

        if (totalOperations === 0) {
            resolve();
            return;
        }

        const checkComplete = () => {
            operationsCompleted++;
            if (operationsCompleted >= totalOperations) {
                resolve();
            }
        };

        // Apply paper changes
        for (const apiPaper of serverChanges.papers || []) {
            const localPaper = mapPaperFromApi(apiPaper);
            const request = papersStore.put(localPaper);
            request.onsuccess = checkComplete;
            request.onerror = () => {
                console.error(`Failed to apply server paper ${localPaper.id}:`, request.error);
                checkComplete(); // Continue with other operations
            };
        }

        // Apply collection changes
        for (const apiCollection of serverChanges.collections || []) {
            const localCollection = mapCollectionFromApi(apiCollection);
            const request = collectionsStore.put(localCollection);
            request.onsuccess = checkComplete;
            request.onerror = () => {
                console.error(`Failed to apply server collection ${localCollection.id}:`, request.error);
                checkComplete();
            };
        }

        // Apply annotation changes
        for (const apiAnnotation of serverChanges.annotations || []) {
            const localAnnotation = mapAnnotationFromApi(apiAnnotation);
            const request = annotationsStore.put(localAnnotation);
            request.onsuccess = checkComplete;
            request.onerror = () => {
                console.error(`Failed to apply server annotation ${localAnnotation.id}:`, request.error);
                checkComplete();
            };
        }

        // Apply deletions
        for (const paperId of serverChanges.deleted?.papers || []) {
            const request = papersStore.delete(paperId);
            request.onsuccess = checkComplete;
            request.onerror = () => {
                console.error(`Failed to delete server paper ${paperId}:`, request.error);
                checkComplete();
            };
        }

        for (const collectionId of serverChanges.deleted?.collections || []) {
            const request = collectionsStore.delete(collectionId);
            request.onsuccess = checkComplete;
            request.onerror = () => {
                console.error(`Failed to delete server collection ${collectionId}:`, request.error);
                checkComplete();
            };
        }

        for (const annotationId of serverChanges.deleted?.annotations || []) {
            const request = annotationsStore.delete(annotationId);
            request.onsuccess = checkComplete;
            request.onerror = () => {
                console.error(`Failed to delete server annotation ${annotationId}:`, request.error);
                checkComplete();
            };
        }

        transaction.onerror = (event) => {
            reject(new Error(`Transaction error: ${event.target.error}`));
        };
    });
}

/**
 * Prepares local changes for sync by converting local format to API format.
 * @param {Object} changes - Local changes.
 * @returns {Object} Changes in API format.
 */
function prepareChangesForSync(changes) {
    return {
        papers: {
            created: (changes.papers?.created || []).map(mapPaperToApi),
            updated: (changes.papers?.updated || []).map(p => {
                const { id, ...rest } = p;
                return { id, ...mapPaperToApi(rest) };
            }),
            deleted: changes.papers?.deleted || []
        },
        collections: {
            created: (changes.collections?.created || []).map(mapCollectionToApi),
            updated: (changes.collections?.updated || []).map(c => {
                const { id, ...rest } = c;
                return { id, ...mapCollectionToApi(rest) };
            }),
            deleted: changes.collections?.deleted || []
        },
        annotations: {
            created: (changes.annotations?.created || []).map(mapAnnotationToApi),
            updated: (changes.annotations?.updated || []).map(a => {
                const { id, ...rest } = a;
                return { id, ...mapAnnotationToApi(rest) };
            }),
            deleted: changes.annotations?.deleted || []
        }
    };
}

/**
 * Performs a full sync - gets all data from server and replaces local data.
 * @returns {Promise<Object>} Sync result with status and data counts.
 */
export async function performFullSync() {
    if (!isCloudSyncEnabled() || !isAuthenticated()) {
        throw new Error('Cloud sync is not enabled or user is not authenticated');
    }

    if (isSyncInProgress()) {
        throw new Error('Sync already in progress');
    }

    try {
        setSyncInProgress(true);

        // Get all data from server
        const result = await fullSync();

        // Clear local data and apply server data
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

            transaction.oncomplete = () => {
                // Apply server data
                applyServerChanges({
                    papers: result.papers,
                    collections: result.collections,
                    annotations: result.annotations,
                    deleted: { papers: [], collections: [], annotations: [] }
                }).then(resolve).catch(reject);
            };

            transaction.onerror = (event) => {
                reject(new Error(`Failed to clear local data: ${event.target.error}`));
            };
        });

        // Clear pending changes after successful full sync
        clearPendingChanges();

        return {
            success: true,
            syncedAt: result.syncedAt,
            counts: {
                papers: result.papers.length,
                collections: result.collections.length,
                annotations: result.annotations.length
            }
        };
    } catch (error) {
        console.error('Full sync error:', error);
        throw error;
    } finally {
        setSyncInProgress(false);
    }
}

/**
 * Performs an incremental sync - sends local changes and receives server changes.
 * @returns {Promise<Object>} Sync result with applied changes and conflicts.
 */
export async function performIncrementalSync() {
    if (!isCloudSyncEnabled() || !isAuthenticated()) {
        throw new Error('Cloud sync is not enabled or user is not authenticated');
    }

    if (isSyncInProgress()) {
        throw new Error('Sync already in progress');
    }

    try {
        setSyncInProgress(true);

        // Get pending local changes
        const localChanges = getPendingChanges();
        
        // Check if there are any changes to send
        const hasLocalChanges = 
            (localChanges.papers?.created?.length || 0) +
            (localChanges.papers?.updated?.length || 0) +
            (localChanges.papers?.deleted?.length || 0) +
            (localChanges.collections?.created?.length || 0) +
            (localChanges.collections?.updated?.length || 0) +
            (localChanges.collections?.deleted?.length || 0) +
            (localChanges.annotations?.created?.length || 0) +
            (localChanges.annotations?.updated?.length || 0) +
            (localChanges.annotations?.deleted?.length || 0) > 0;

        // Prepare changes for API
        const apiChanges = prepareChangesForSync(localChanges);

        // Perform incremental sync
        const result = await incrementalSync(apiChanges);

        // Apply server changes to local IndexedDB
        await applyServerChanges(result.serverChanges);

        // Clear pending changes if sync was successful
        clearPendingChanges();

        return {
            success: true,
            syncedAt: result.syncedAt,
            appliedChanges: result.appliedChanges,
            conflicts: {
                papers: result.appliedChanges.papers?.conflicts || [],
                collections: result.appliedChanges.collections?.conflicts || [],
                annotations: result.appliedChanges.annotations?.conflicts || []
            },
            hasLocalChanges,
            serverChangeCount: {
                papers: result.serverChanges.papers?.length || 0,
                collections: result.serverChanges.collections?.length || 0,
                annotations: result.serverChanges.annotations?.length || 0
            }
        };
    } catch (error) {
        console.error('Incremental sync error:', error);
        throw error;
    } finally {
        setSyncInProgress(false);
    }
}

/**
 * Performs sync (full or incremental based on whether we've synced before).
 * @returns {Promise<Object>} Sync result.
 */
export async function performSync() {
    // Safety check: if sync has been in progress for more than 5 minutes, clear the lock
    const syncStartTime = localStorage.getItem('citavers_sync_start_time');
    if (syncStartTime) {
        const elapsed = Date.now() - parseInt(syncStartTime, 10);
        if (elapsed > 5 * 60 * 1000) { // 5 minutes
            console.warn('[Sync] Clearing stale sync lock (stuck for >5 minutes)');
            setSyncInProgress(false);
            localStorage.removeItem('citavers_sync_start_time');
        }
    }
    
    if (isSyncInProgress()) {
        throw new Error('Sync already in progress');
    }
    
    try {
        // Set sync start time for stale lock detection
        localStorage.setItem('citavers_sync_start_time', Date.now().toString());
        
        const lastSyncedAt = localStorage.getItem('citavers_last_synced_at');
        
        // If never synced, perform full sync
        if (!lastSyncedAt) {
            return await performFullSync();
        }
        
        // Otherwise, perform incremental sync
        return await performIncrementalSync();
    } finally {
        // Clean up sync start time
        localStorage.removeItem('citavers_sync_start_time');
    }
}

/**
 * Gets sync status (local and server).
 * @returns {Promise<Object>} Sync status object.
 */
export async function getSyncStatusInfo() {
    try {
        const serverStatus = await getSyncStatus();
        const pendingChanges = getPendingChanges();
        const hasPendingChanges = 
            (pendingChanges.papers?.created?.length || 0) +
            (pendingChanges.papers?.updated?.length || 0) +
            (pendingChanges.papers?.deleted?.length || 0) +
            (pendingChanges.collections?.created?.length || 0) +
            (pendingChanges.collections?.updated?.length || 0) +
            (pendingChanges.collections?.deleted?.length || 0) +
            (pendingChanges.annotations?.created?.length || 0) +
            (pendingChanges.annotations?.updated?.length || 0) +
            (pendingChanges.annotations?.deleted?.length || 0) > 0;

        return {
            lastSyncedAt: serverStatus.lastSyncedAt,
            hasPendingChanges,
            pendingChangeCounts: {
                papers: {
                    created: pendingChanges.papers?.created?.length || 0,
                    updated: pendingChanges.papers?.updated?.length || 0,
                    deleted: pendingChanges.papers?.deleted?.length || 0
                },
                collections: {
                    created: pendingChanges.collections?.created?.length || 0,
                    updated: pendingChanges.collections?.updated?.length || 0,
                    deleted: pendingChanges.collections?.deleted?.length || 0
                },
                annotations: {
                    created: pendingChanges.annotations?.created?.length || 0,
                    updated: pendingChanges.annotations?.updated?.length || 0,
                    deleted: pendingChanges.annotations?.deleted?.length || 0
                }
            },
            serverCounts: serverStatus.counts || {},
            inProgress: isSyncInProgress(),
            clientId: getClientId()
        };
    } catch (error) {
        console.error('Get sync status error:', error);
        throw error;
    }
}

