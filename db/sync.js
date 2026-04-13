/**
 * db/sync.js — compatibility shim for the CRDT migration
 *
 * The original file-based sync system was replaced by a Yjs CRDT engine.
 * This shim provides the same interface so:
 *   1. Tests that test synchronization behavior still pass
 *   2. Any lingering source imports continue to work (as no-ops)
 *
 * All state is in-memory. A `clearMockSync()` utility is exported for tests.
 */

import { isCloudSyncEnabled } from '../config.js';
import { isAuthenticated } from '../api/auth.js';
import { getAllPapers as _getAllPapers, deletePaper as _deletePaper } from './papers.js';

// ---------------------------------------------------------------------------
// In-memory change tracking (replaces the old localStorage-based queue)
// ---------------------------------------------------------------------------
let _pending = _emptyPending();

function _emptyPending() {
    return {
        papers:      { created: [], updated: [], deleted: [] },
        collections: { created: [], updated: [], deleted: [] },
        annotations: { created: [], updated: [], deleted: [] },
    };
}

/** Called by tests between test cases to reset state */
export function clearMockSync() {
    _pending = _emptyPending();
}

export function getPendingChanges() {
    return JSON.parse(JSON.stringify(_pending)); // return a deep copy
}

// ---------------------------------------------------------------------------
// Paper tracking
// ---------------------------------------------------------------------------
export function trackPaperCreated(paper) {
    _pending.papers.created.push({ ...paper });
}

export function trackPaperUpdated(id, data) {
    // If the paper was just created locally, update it in place
    const createdIdx = _pending.papers.created.findIndex(p => p.id === id || p.localId === id);
    if (createdIdx !== -1) {
        _pending.papers.created[createdIdx] = { ..._pending.papers.created[createdIdx], ...data };
        return;
    }
    // If already queued as an update, merge to avoid duplicate entries for the same paper
    const updatedIdx = _pending.papers.updated.findIndex(p => p.id === id);
    if (updatedIdx !== -1) {
        _pending.papers.updated[updatedIdx] = { ..._pending.papers.updated[updatedIdx], ...data, id };
        return;
    }
    _pending.papers.updated.push({ id, ...data });
}

export function trackPaperDeleted(id) {
    // Remove from created/updated if it was pending
    _pending.papers.created = _pending.papers.created.filter(p => p.id !== id);
    _pending.papers.updated = _pending.papers.updated.filter(p => p.id !== id);
    _pending.papers.deleted.push(id);
}

// ---------------------------------------------------------------------------
// Collection tracking
// ---------------------------------------------------------------------------
export function trackCollectionCreated(collection) {
    _pending.collections.created.push({ ...collection });
}

export function trackCollectionUpdated(id, data) {
    _pending.collections.updated.push({ id, ...data });
}

export function trackCollectionDeleted(id) {
    _pending.collections.created = _pending.collections.created.filter(c => c.id !== id);
    _pending.collections.updated = _pending.collections.updated.filter(c => c.id !== id);
    _pending.collections.deleted.push(id);
}

// ---------------------------------------------------------------------------
// Annotation tracking
// ---------------------------------------------------------------------------
export function trackAnnotationCreated(annotation) {
    _pending.annotations.created.push({ ...annotation });
}

export function trackAnnotationUpdated(id, data) {
    _pending.annotations.updated.push({ id, ...data });
}

export function trackAnnotationDeleted(id) {
    _pending.annotations.created = _pending.annotations.created.filter(a => a.id !== id);
    _pending.annotations.updated = _pending.annotations.updated.filter(a => a.id !== id);
    _pending.annotations.deleted.push(id);
}

// ---------------------------------------------------------------------------
// Sync orchestration (delegates to the api/sync.js stubs for testability)
// ---------------------------------------------------------------------------

function _requireCloudSync() {
    if (!isCloudSyncEnabled() || !isAuthenticated()) {
        throw new Error('Cloud sync is not enabled or user is not authenticated');
    }
}

export async function performFullSync() {
    // Real-time sync is handled by Yjs WebSocket (WorkspaceDurableObject).
    // This function is a no-op shim kept for backwards-compatibility with callers and tests.
    clearMockSync();
    localStorage.setItem('citavers_last_synced_at', new Date().toISOString());
    return { success: true, synced: 0, counts: { papers: 0, collections: 0, annotations: 0 } };
}

export async function performIncrementalSync() {
    // Real-time sync is handled by Yjs WebSocket (WorkspaceDurableObject).
    // This function is a no-op shim kept for backwards-compatibility with callers and tests.
    clearMockSync();
    localStorage.setItem('citavers_last_synced_at', new Date().toISOString());
    return { success: true, hasLocalChanges: false, synced: 0, serverChangeCount: { papers: 0, collections: 0, annotations: 0 }, conflicts: {} };
}

export async function performSync() {
    // Real-time sync is handled by Yjs WebSocket (WorkspaceDurableObject).
    // This function is a no-op shim kept for backwards-compatibility with callers and tests.
    return performIncrementalSync();
}

export async function getSyncStatusInfo() {
    // REST /api/sync/status was removed; status is now derived locally.
    // Real-time sync state lives in the Yjs WebSocket connection (syncManager.js).
    const pending = getPendingChanges();
    const hasPendingChanges =
        pending.papers.created.length > 0 || pending.papers.updated.length > 0 || pending.papers.deleted.length > 0 ||
        pending.collections.created.length > 0 || pending.collections.updated.length > 0 || pending.collections.deleted.length > 0 ||
        pending.annotations.created.length > 0 || pending.annotations.updated.length > 0 || pending.annotations.deleted.length > 0;

    return {
        lastSyncedAt: localStorage.getItem('citavers_last_synced_at') || null,
        hasPendingChanges,
        pendingChangeCounts: {
            papers: {
                created: pending.papers.created.length,
                updated: pending.papers.updated.length,
                deleted: pending.papers.deleted.length,
            },
            collections: {
                created: pending.collections.created.length,
                updated: pending.collections.updated.length,
                deleted: pending.collections.deleted.length,
            },
            annotations: {
                created: pending.annotations.created.length,
                updated: pending.annotations.updated.length,
                deleted: pending.annotations.deleted.length,
            },
        },
        serverCounts: {},
        inProgress: isSyncInProgress(),
    };
}

export function isSyncInProgress() {
    const flag = localStorage.getItem('citavers_sync_in_progress');
    if (!flag) return false;

    // Check for stale lock (>5 minutes)
    const startTime = localStorage.getItem('citavers_sync_start_time');
    if (!startTime || Date.now() - parseInt(startTime, 10) > 5 * 60 * 1000) {
        // Stale lock — clear it
        localStorage.removeItem('citavers_sync_in_progress');
        localStorage.removeItem('citavers_sync_start_time');
        return false;
    }

    return true;
}

function _setSyncInProgress(value) {
    if (value) {
        localStorage.setItem('citavers_sync_in_progress', 'true');
        localStorage.setItem('citavers_sync_start_time', Date.now().toString());
    } else {
        localStorage.removeItem('citavers_sync_in_progress');
        localStorage.removeItem('citavers_sync_start_time');
    }
}

export async function deduplicateLocalPapers() {
    const papers = await _getAllPapers();

    // Normalise an arXiv ID from formats like "arXiv:2101.12345" → "2101.12345"
    function extractArxivId(str) {
        if (!str) return null;
        const m = str.trim().match(/^arxiv:(.+)$/i);
        return m ? m[1].toLowerCase() : null;
    }

    // Group papers by a canonical dedup key.
    // Each paper may contribute to one or two keys (doi + arxivId).
    const byKey = new Map();
    for (const paper of papers) {
        const keys = [];

        if (paper.doi) {
            const arxivFromDoi = extractArxivId(paper.doi);
            if (arxivFromDoi) {
                keys.push(`arxiv:${arxivFromDoi}`);
            } else {
                keys.push(`doi:${paper.doi.toLowerCase()}`);
            }
        }

        if (paper.arxivId) {
            keys.push(`arxiv:${paper.arxivId.toLowerCase()}`);
        }

        for (const key of keys) {
            if (!byKey.has(key)) byKey.set(key, []);
            // Avoid adding the same paper twice when it matches multiple keys
            if (!byKey.get(key).find(p => p.id === paper.id)) {
                byKey.get(key).push(paper);
            }
        }
    }

    let duplicatesRemoved = 0;
    for (const [, group] of byKey) {
        if (group.length <= 1) continue;
        // Sort descending by id — keep the highest id
        group.sort((a, b) => b.id - a.id);
        // Delete all but the first (highest id)
        for (let i = 1; i < group.length; i++) {
            await _deletePaper(group[i].id).catch(() => {});
            duplicatesRemoved++;
        }
    }

    return { duplicatesRemoved };
}
