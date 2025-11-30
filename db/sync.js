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
    const changes = changesStr ? JSON.parse(changesStr) : {
        papers: { created: [], updated: [], deleted: [] },
        collections: { created: [], updated: [], deleted: [] },
        annotations: { created: [], updated: [], deleted: [] }
    };
    // Log pending changes for debugging (only if there are changes to avoid spam)
    const hasChanges = 
        (changes.papers?.created?.length || 0) +
        (changes.papers?.updated?.length || 0) +
        (changes.papers?.deleted?.length || 0) +
        (changes.collections?.created?.length || 0) +
        (changes.collections?.updated?.length || 0) +
        (changes.collections?.deleted?.length || 0) +
        (changes.annotations?.created?.length || 0) +
        (changes.annotations?.updated?.length || 0) +
        (changes.annotations?.deleted?.length || 0) > 0;
    if (hasChanges) {
        console.log('[Sync] getPendingChanges - Found pending changes:', {
            papers: {
                created: changes.papers?.created?.length || 0,
                updated: changes.papers?.updated?.length || 0,
                deleted: changes.papers?.deleted?.length || 0
            },
            collections: {
                created: changes.collections?.created?.length || 0,
                updated: changes.collections?.updated?.length || 0,
                deleted: changes.collections?.deleted?.length || 0
            },
            annotations: {
                created: changes.annotations?.created?.length || 0,
                updated: changes.annotations?.updated?.length || 0,
                deleted: changes.annotations?.deleted?.length || 0
            }
        });
    }
    return changes;
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
    console.log('[Sync] trackPaperUpdated called:', { id, updateFields: Object.keys(paper), paperData: paper });
    const changes = getPendingChanges();
    // Check if already in created list (local-only paper)
    const createdIndex = changes.papers.created.findIndex(p => p.localId === id || (p.id && p.id === id));
    if (createdIndex !== -1) {
        // Update in created list
        console.log('[Sync] Paper found in created list, updating:', createdIndex);
        changes.papers.created[createdIndex] = { ...changes.papers.created[createdIndex], ...paper };
    } else {
        // Check if already in updated list - merge updates instead of duplicating
        const updatedIndex = changes.papers.updated.findIndex(p => p.id === id);
        if (updatedIndex !== -1) {
            // Merge with existing update - preserve ALL fields from both updates
            console.log('[Sync] Paper already in updated list, merging updates:', {
                index: updatedIndex,
                existingFields: Object.keys(changes.papers.updated[updatedIndex]),
                newFields: Object.keys(paper),
                existingHasNotes: 'notes' in changes.papers.updated[updatedIndex],
                existingHasTags: 'tags' in changes.papers.updated[updatedIndex],
                existingHasSummary: 'summary' in changes.papers.updated[updatedIndex],
                existingHasRating: 'rating' in changes.papers.updated[updatedIndex],
                newHasNotes: 'notes' in paper,
                newHasTags: 'tags' in paper,
                newHasSummary: 'summary' in paper,
                newHasRating: 'rating' in paper
            });
            // Merge: spread existing first, then new data (new data overwrites existing)
            // This ensures all fields from both updates are preserved
            changes.papers.updated[updatedIndex] = { ...changes.papers.updated[updatedIndex], ...paper };
            console.log('[Sync] After merge:', {
                mergedFields: Object.keys(changes.papers.updated[updatedIndex]),
                hasNotes: 'notes' in changes.papers.updated[updatedIndex],
                hasTags: 'tags' in changes.papers.updated[updatedIndex],
                hasSummary: 'summary' in changes.papers.updated[updatedIndex],
                hasRating: 'rating' in changes.papers.updated[updatedIndex]
            });
        } else {
            // Add to updated list
            console.log('[Sync] Adding paper to updated list:', { id, fields: Object.keys(paper) });
            changes.papers.updated.push({ id, ...paper });
        }
    }
    savePendingChanges(changes);
    console.log('[Sync] Pending changes after tracking:', {
        created: changes.papers.created.length,
        updated: changes.papers.updated.length,
        deleted: changes.papers.deleted.length,
        updatedPapers: changes.papers.updated.map(p => ({ id: p.id, fields: Object.keys(p).filter(k => k !== 'id') }))
    });
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
 * Automatically clears stale locks (> 5 minutes).
 * @returns {boolean} True if sync is in progress.
 */
export function isSyncInProgress() {
    const inProgress = localStorage.getItem(SYNC_IN_PROGRESS_KEY) === 'true';

    if (inProgress) {
        // Check for stale lock
        const syncStartTime = localStorage.getItem('citavers_sync_start_time');
        if (syncStartTime) {
            const elapsed = Date.now() - parseInt(syncStartTime, 10);
            if (elapsed > 5 * 60 * 1000) { // 5 minutes
                console.warn('[Sync] Clearing stale sync lock (stuck for >5 minutes)');
                setSyncInProgress(false);
                return false;
            }
        } else {
            // If in progress but no start time, assume it's very old or broken
            console.warn('[Sync] Found lock without start time, clearing');
            setSyncInProgress(false);
            return false;
        }
    }

    return inProgress;
}

/**
 * Sets sync in progress flag.
 * @param {boolean} inProgress - Whether sync is in progress.
 */
function setSyncInProgress(inProgress) {
    if (inProgress) {
        localStorage.setItem(SYNC_IN_PROGRESS_KEY, 'true');
        localStorage.setItem('citavers_sync_start_time', Date.now().toString());
    } else {
        localStorage.removeItem(SYNC_IN_PROGRESS_KEY);
        localStorage.removeItem('citavers_sync_start_time');
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

        // Apply paper changes with de-duplication
        // First, collect all existing papers to check for DOI duplicates
        const getAllRequest = papersStore.getAll();
        getAllRequest.onsuccess = () => {
            const existingPapers = getAllRequest.result || [];
            const papersByDoi = new Map();
            const papersByArxivId = new Map();
            const papersById = new Map();

            // Index existing papers by DOI, arXiv ID, and ID
            for (const paper of existingPapers) {
                papersById.set(paper.id, paper);
                if (paper.doi) {
                    const normalizedDoi = paper.doi.trim().toLowerCase();
                    papersByDoi.set(normalizedDoi, paper);
                }
                // Check for arXiv ID
                const arxivId = paper.arxivId || (paper.doi && paper.doi.includes('arXiv') ? paper.doi.match(/arXiv[.\/]?(\d{4}\.\d{4,5}(?:v\d+)?)/i)?.[1] : null);
                if (arxivId) {
                    const normalizedArxiv = arxivId.trim().toLowerCase();
                    papersByArxivId.set(normalizedArxiv, paper);
                }
            }

            // Process incoming papers
            console.log('[Sync] applyServerChanges - Processing papers:', {
                count: serverChanges.papers?.length || 0,
                paperIds: serverChanges.papers?.map(p => p.id) || []
            });
            for (const apiPaper of serverChanges.papers || []) {
                console.log('[Sync] applyServerChanges - Processing paper:', {
                    id: apiPaper.id,
                    title: apiPaper.title?.substring(0, 50),
                    hasNotes: !!apiPaper.notes,
                    hasTags: !!apiPaper.tags,
                    hasSummary: !!apiPaper.summary,
                    hasRating: apiPaper.rating !== undefined && apiPaper.rating !== null,
                    notesLength: apiPaper.notes?.length || 0,
                    tagsCount: apiPaper.tags?.length || 0,
                    summaryLength: apiPaper.summary?.length || 0,
                    rating: apiPaper.rating
                });
                const localPaper = mapPaperFromApi(apiPaper);
                console.log('[Sync] applyServerChanges - Mapped paper:', {
                    id: localPaper.id,
                    hasNotes: !!localPaper.notes,
                    hasTags: !!localPaper.tags,
                    hasSummary: !!localPaper.summary,
                    hasRating: localPaper.rating !== undefined && localPaper.rating !== null,
                    notesLength: localPaper.notes?.length || 0,
                    tagsCount: localPaper.tags?.length || 0,
                    summaryLength: localPaper.summary?.length || 0,
                    rating: localPaper.rating
                });
                let foundDuplicate = false;
                let existingPaper = null;

                // Check for DOI duplicate
                if (localPaper.doi) {
                    const normalizedDoi = localPaper.doi.trim().toLowerCase();
                    if (papersByDoi.has(normalizedDoi)) {
                        existingPaper = papersByDoi.get(normalizedDoi);
                        if (existingPaper.id !== localPaper.id) {
                            foundDuplicate = true;
                        }
                    }
                }

                // Check for arXiv ID duplicate if not found by DOI
                if (!foundDuplicate) {
                    const arxivId = localPaper.arxivId || (localPaper.doi && localPaper.doi.includes('arXiv') ? localPaper.doi.match(/arXiv[.\/]?(\d{4}\.\d{4,5}(?:v\d+)?)/i)?.[1] : null);
                    if (arxivId) {
                        const normalizedArxiv = arxivId.trim().toLowerCase();
                        if (papersByArxivId.has(normalizedArxiv)) {
                            existingPaper = papersByArxivId.get(normalizedArxiv);
                            if (existingPaper.id !== localPaper.id) {
                                foundDuplicate = true;
                            }
                        }
                    }
                }

                // If duplicate found, delete old and add new
                if (foundDuplicate && existingPaper) {
                    // Delete the old duplicate
                    const deleteRequest = papersStore.delete(existingPaper.id);
                    deleteRequest.onsuccess = () => {
                        // Now add the new one
                        const addRequest = papersStore.put(localPaper);
                        addRequest.onsuccess = checkComplete;
                        addRequest.onerror = () => {
                            console.error(`Failed to apply server paper ${localPaper.id}:`, addRequest.error);
                            checkComplete();
                        };
                    };
                    deleteRequest.onerror = () => {
                        console.error(`Failed to delete duplicate paper ${existingPaper.id}:`, deleteRequest.error);
                        // Still try to add the new one
                        const addRequest = papersStore.put(localPaper);
                        addRequest.onsuccess = checkComplete;
                        addRequest.onerror = () => {
                            console.error(`Failed to apply server paper ${localPaper.id}:`, addRequest.error);
                            checkComplete();
                        };
                    };

                    // Update our tracking maps
                    if (localPaper.doi) {
                        papersByDoi.set(localPaper.doi.trim().toLowerCase(), localPaper);
                    }
                    const arxivId = localPaper.arxivId || (localPaper.doi && localPaper.doi.includes('arXiv') ? localPaper.doi.match(/arXiv[.\/]?(\d{4}\.\d{4,5}(?:v\d+)?)/i)?.[1] : null);
                    if (arxivId) {
                        papersByArxivId.set(arxivId.trim().toLowerCase(), localPaper);
                    }
                    papersById.delete(existingPaper.id);
                    papersById.set(localPaper.id, localPaper);
                    continue;
                }

                // No duplicate detected, just add/update the paper
                console.log('[Sync] applyServerChanges - Adding/updating paper:', {
                    id: localPaper.id,
                    exists: papersById.has(localPaper.id),
                    hasNotes: !!localPaper.notes,
                    hasTags: !!localPaper.tags,
                    hasSummary: !!localPaper.summary,
                    hasRating: localPaper.rating !== undefined && localPaper.rating !== null
                });
                const request = papersStore.put(localPaper);
                request.onsuccess = () => {
                    console.log('[Sync] applyServerChanges - Paper saved successfully:', localPaper.id);
                    checkComplete();
                };
                request.onerror = () => {
                    console.error(`[Sync] applyServerChanges - Failed to apply server paper ${localPaper.id}:`, request.error);
                    checkComplete(); // Continue with other operations
                };

                // Update our tracking maps
                if (localPaper.doi) {
                    papersByDoi.set(localPaper.doi.trim().toLowerCase(), localPaper);
                }
                const arxivId = localPaper.arxivId || (localPaper.doi && localPaper.doi.includes('arXiv') ? localPaper.doi.match(/arXiv[.\/]?(\d{4}\.\d{4,5}(?:v\d+)?)/i)?.[1] : null);
                if (arxivId) {
                    papersByArxivId.set(arxivId.trim().toLowerCase(), localPaper);
                }
                papersById.set(localPaper.id, localPaper);
            }
        };
        getAllRequest.onerror = () => {
            console.error('Failed to get existing papers for de-duplication:', getAllRequest.error);
            // Fallback to simple put without de-dup
            for (const apiPaper of serverChanges.papers || []) {
                const localPaper = mapPaperFromApi(apiPaper);
                const request = papersStore.put(localPaper);
                request.onsuccess = checkComplete;
                request.onerror = () => {
                    console.error(`Failed to apply server paper ${localPaper.id}:`, request.error);
                    checkComplete();
                };
            }
        };

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
    console.log('[Sync] prepareChangesForSync input:', {
        papers: {
            created: changes.papers?.created?.length || 0,
            updated: changes.papers?.updated?.length || 0,
            deleted: changes.papers?.deleted?.length || 0
        }
    });
    
    // Log actual update objects
    if (changes.papers?.updated?.length > 0) {
        console.log('[Sync] Raw paper updates before mapping:', changes.papers.updated);
    }
    
    const result = {
        papers: {
            created: (changes.papers?.created || []).map(mapPaperToApi),
            updated: (changes.papers?.updated || []).map(p => {
                const { id, version, ...rest } = p;
                const mapped = mapPaperToApi(rest);
                console.log('[Sync] Preparing paper update for API:', {
                    id,
                    version: p.version,
                    originalFields: Object.keys(rest),
                    mappedFields: Object.keys(mapped),
                    hasNotes: 'notes' in mapped,
                    hasTags: 'tags' in mapped,
                    hasSummary: 'summary' in mapped,
                    hasRating: 'rating' in mapped
                });
                return { id, version: p.version || 1, ...mapped };
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
    
    console.log('[Sync] prepareChangesForSync output:', {
        papers: {
            created: result.papers.created.length,
            updated: result.papers.updated.length,
            deleted: result.papers.deleted.length
        }
    });
    
    return result;
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
    console.log('[Sync] Starting incremental sync...');
    
    if (!isCloudSyncEnabled()) {
        console.error('[Sync] Cloud sync is not enabled');
        throw new Error('Cloud sync is not enabled or user is not authenticated');
    }
    
    if (!isAuthenticated()) {
        console.error('[Sync] User is not authenticated');
        throw new Error('Cloud sync is not enabled or user is not authenticated');
    }

    if (isSyncInProgress()) {
        console.warn('[Sync] Sync already in progress, skipping');
        throw new Error('Sync already in progress');
    }

    try {
        setSyncInProgress(true);
        console.log('[Sync] Sync lock acquired');

        // Get pending local changes
        const localChanges = getPendingChanges();
        console.log('[Sync] Pending changes:', {
            papers: {
                created: localChanges.papers?.created?.length || 0,
                updated: localChanges.papers?.updated?.length || 0,
                deleted: localChanges.papers?.deleted?.length || 0
            },
            collections: {
                created: localChanges.collections?.created?.length || 0,
                updated: localChanges.collections?.updated?.length || 0,
                deleted: localChanges.collections?.deleted?.length || 0
            },
            annotations: {
                created: localChanges.annotations?.created?.length || 0,
                updated: localChanges.annotations?.updated?.length || 0,
                deleted: localChanges.annotations?.deleted?.length || 0
            }
        });

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
        console.log('[Sync] Local changes before preparation:', JSON.stringify(localChanges, null, 2));
        const apiChanges = prepareChangesForSync(localChanges);
        console.log('[Sync] Prepared changes for API:', {
            papers: {
                created: apiChanges.papers?.created?.length || 0,
                updated: apiChanges.papers?.updated?.length || 0,
                deleted: apiChanges.papers?.deleted?.length || 0
            },
            collections: {
                created: apiChanges.collections?.created?.length || 0,
                updated: apiChanges.collections?.updated?.length || 0,
                deleted: apiChanges.collections?.deleted?.length || 0
            },
            annotations: {
                created: apiChanges.annotations?.created?.length || 0,
                updated: apiChanges.annotations?.updated?.length || 0,
                deleted: apiChanges.annotations?.deleted?.length || 0
            }
        });
        
        // Log actual update data if present
        if (apiChanges.papers?.updated?.length > 0) {
            console.log('[Sync] Paper updates being sent:', apiChanges.papers.updated.map(u => ({
                id: u.id,
                version: u.version,
                fields: Object.keys(u).filter(k => !['id', 'version'].includes(k))
            })));
        }

        // Perform incremental sync
        console.log('[Sync] Sending sync request to backend...');
        const result = await incrementalSync(apiChanges);
        console.log('[Sync] Backend response received:', {
            appliedChanges: result.appliedChanges,
            serverChanges: {
                papers: result.serverChanges?.papers?.length || 0,
                collections: result.serverChanges?.collections?.length || 0,
                annotations: result.serverChanges?.annotations?.length || 0
            }
        });

        // Apply server changes to local IndexedDB
        console.log('[Sync] Applying server changes to local database...');
        await applyServerChanges(result.serverChanges);
        console.log('[Sync] Server changes applied successfully');

        // Clear pending changes if sync was successful
        const changesBeforeClear = getPendingChanges();
        console.log('[Sync] Clearing pending changes. Before clear:', {
            papers: {
                created: changesBeforeClear.papers?.created?.length || 0,
                updated: changesBeforeClear.papers?.updated?.length || 0,
                deleted: changesBeforeClear.papers?.deleted?.length || 0
            }
        });
        clearPendingChanges();
        console.log('[Sync] Pending changes cleared');

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
    if (isSyncInProgress()) {
        throw new Error('Sync already in progress');
    }

    try {
        const lastSyncedAt = localStorage.getItem('citavers_last_synced_at');

        // If never synced, perform full sync
        if (!lastSyncedAt) {
            return await performFullSync();
        }

        // Otherwise, perform incremental sync
        return await performIncrementalSync();
    } finally {
        // Lock is cleared by performFullSync/performIncrementalSync finally blocks
    }
}

/**
 * Cleans up duplicate papers in local IndexedDB based on DOI.
 * Keeps the paper with the highest ID (most recent) and removes older duplicates.
 * @returns {Promise<Object>} Cleanup result with counts of duplicates removed.
 */
export async function deduplicateLocalPapers() {
    const database = await openDB();

    return new Promise((resolve, reject) => {
        const transaction = database.transaction([STORE_NAME_PAPERS], 'readwrite');
        const papersStore = transaction.objectStore(STORE_NAME_PAPERS);

        const getAllRequest = papersStore.getAll();

        getAllRequest.onsuccess = () => {
            const allPapers = getAllRequest.result || [];

            const papersByDoi = new Map();
            const papersByArxivId = new Map();
            const duplicatesToDelete = new Set(); // Use Set to avoid duplicate IDs

            // Helper function to normalize DOI (remove URL prefixes, lowercase, trim)
            const normalizeDoi = (doi) => {
                if (!doi) return null;
                return doi
                    .replace(/^https?:\/\/(dx\.)?doi\.org\//i, '') // Remove doi.org URL prefix
                    .replace(/^doi:/i, '') // Remove "doi:" prefix
                    .trim()
                    .toLowerCase();
            };

            // Helper function to extract arXiv ID
            const extractArxivId = (paper) => {
                if (paper.arxivId) {
                    return paper.arxivId.trim().toLowerCase();
                }
                if (paper.doi) {
                    const match = paper.doi.match(/arxiv[.\/]?(\d{4}\.\d{4,5}(?:v\d+)?)/i);
                    if (match) return match[1].trim().toLowerCase();
                }
                return null;
            };

            // Group papers by DOI and arXiv ID
            for (const paper of allPapers) {
                const normalizedDoi = normalizeDoi(paper.doi);
                if (normalizedDoi) {
                    if (!papersByDoi.has(normalizedDoi)) {
                        papersByDoi.set(normalizedDoi, []);
                    }
                    papersByDoi.get(normalizedDoi).push(paper);
                }

                // Also check for arXiv ID
                const arxivId = extractArxivId(paper);
                if (arxivId) {
                    if (!papersByArxivId.has(arxivId)) {
                        papersByArxivId.set(arxivId, []);
                    }
                    papersByArxivId.get(arxivId).push(paper);
                }
            }

            // Find duplicates by DOI
            for (const [normalizedDoi, papers] of papersByDoi.entries()) {
                if (papers.length > 1) {
                    // Sort by ID (highest first - most recent)
                    papers.sort((a, b) => b.id - a.id);

                    // Keep the first (highest ID), mark the rest for deletion
                    const toKeep = papers[0];
                    const toDelete = papers.slice(1);


                    toDelete.forEach(p => duplicatesToDelete.add(p.id));
                }
            }

            // Find duplicates by arXiv ID
            for (const [arxivId, papers] of papersByArxivId.entries()) {
                if (papers.length > 1) {
                    // Sort by ID (highest first - most recent)
                    papers.sort((a, b) => b.id - a.id);

                    // Keep the first (highest ID), mark the rest for deletion
                    const toKeep = papers[0];
                    const toDelete = papers.slice(1);


                    toDelete.forEach(p => duplicatesToDelete.add(p.id));
                }
            }

            const duplicatesArray = Array.from(duplicatesToDelete);

            if (duplicatesArray.length === 0) {
                resolve({ duplicatesRemoved: 0 });
                return;
            }

            // Delete duplicates
            let deletedCount = 0;
            const deleteNext = () => {
                if (deletedCount >= duplicatesArray.length) {
                    resolve({ duplicatesRemoved: deletedCount });
                    return;
                }

                const idToDelete = duplicatesArray[deletedCount];
                const deleteRequest = papersStore.delete(idToDelete);

                deleteRequest.onsuccess = () => {
                    deletedCount++;
                    deleteNext();
                };

                deleteRequest.onerror = () => {
                    console.error(`[De-dup] Failed to delete paper ${idToDelete}:`, deleteRequest.error);
                    deletedCount++; // Continue despite error
                    deleteNext();
                };
            };

            deleteNext();
        };

        getAllRequest.onerror = () => {
            console.error('[De-dup] Failed to get papers:', getAllRequest.error);
            reject(new Error('Failed to retrieve papers for de-duplication'));
        };

        transaction.onerror = (event) => {
            reject(new Error(`De-duplication transaction error: ${event.target.error}`));
        };
    });
}

/**
 * Gets sync status (local and server).
 * @returns {Promise<Object>} Sync status object.
 */
export async function getSyncStatusInfo() {
    try {
        // Import rate limit check dynamically to avoid circular dependency
        const { isRateLimited } = await import('../api/utils.js');

        // If rate limited, return cached local status without making API call
        if (isRateLimited()) {
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
                lastSyncedAt: getLastSyncedAt(),
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
                }
            };
        }

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

