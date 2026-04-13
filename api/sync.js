/**
 * api/sync.js — Sync API client
 *
 * Provides the REST-based sync client interface used by db/sync.js and tests.
 * In production CRDT mode Yjs WebSockets handle real-time sync; this module
 * serves as a fallback/batch sync endpoint client.
 */

import { getApiBaseUrl } from '../config.js';
import { getAccessToken, refreshToken } from '../api/auth.js';

// ---------------------------------------------------------------------------
// Client ID (persistent browser identifier for conflict resolution)
// ---------------------------------------------------------------------------

export function getClientId() {
    let id = localStorage.getItem('citavers_client_id');
    if (!id) {
        id = `client_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
        localStorage.setItem('citavers_client_id', id);
    }
    return id;
}

// ---------------------------------------------------------------------------
// Last sync timestamp
// ---------------------------------------------------------------------------

export function getLastSyncedAt() {
    return localStorage.getItem('citavers_last_synced_at') || null;
}

export function setLastSyncedAt(timestamp) {
    localStorage.setItem('citavers_last_synced_at', timestamp);
}

// ---------------------------------------------------------------------------
// Authenticated fetch helper
// ---------------------------------------------------------------------------

async function authFetch(url, options = {}) {
    let token = getAccessToken();
    if (!token) throw new Error('Not authenticated');

    const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        ...options.headers,
    };

    let response = await fetch(url, { ...options, headers });

    if (response.status === 401) {
        token = await refreshToken();
        headers['Authorization'] = `Bearer ${token}`;
        response = await fetch(url, { ...options, headers });
    }

    const json = await response.json().catch(() => ({}));
    if (!response.ok || json.success === false) {
        throw new Error(json.message || json.error?.message || `HTTP ${response.status}`);
    }
    return json.data || json;
}

// ---------------------------------------------------------------------------
// API calls
// ---------------------------------------------------------------------------

export async function fullSync() {
    const base = getApiBaseUrl();
    const data = await authFetch(`${base}/api/sync/full`, { method: 'GET' });
    if (data.syncedAt) setLastSyncedAt(data.syncedAt);
    return data;
}

export async function incrementalSync(changes) {
    const base = getApiBaseUrl();
    const body = JSON.stringify({
        lastSyncedAt: getLastSyncedAt(),
        changes,
        clientId: getClientId(),
    });
    const data = await authFetch(`${base}/api/sync/incremental`, { method: 'POST', body });
    if (data.syncedAt) setLastSyncedAt(data.syncedAt);
    return data;
}

export async function getSyncStatus() {
    const base = getApiBaseUrl();
    return authFetch(`${base}/api/sync/status`, { method: 'GET' });
}

// ---------------------------------------------------------------------------
// Data mapping helpers (local ↔ API format)
// ---------------------------------------------------------------------------

export function mapPaperToApi(localPaper) {
    const p = { ...localPaper };

    // Map readingStatus → status
    if (p.readingStatus !== undefined) {
        p.status = p.readingStatus;
        delete p.readingStatus;
    }

    // Map s3Key → pdfUrl
    if (p.s3Key !== undefined) {
        p.pdfUrl = p.s3Key;
        delete p.s3Key;
    }

    // Remove local-only fields
    delete p.pdfData;
    delete p.pdfFile;
    delete p.hasPdf;
    delete p.id;
    delete p.createdAt;
    delete p.updatedAt;

    // Ensure arrays
    if (!Array.isArray(p.authors)) {
        p.authors = p.authors ? [p.authors] : [];
    }
    if (!Array.isArray(p.tags)) {
        p.tags = p.tags ? [p.tags] : [];
    }

    // Remove invalid readingProgress
    if (p.readingProgress && (!p.readingProgress.totalPages || p.readingProgress.totalPages === 0)) {
        delete p.readingProgress;
    }

    return p;
}

export function mapPaperFromApi(apiPaper) {
    const p = { ...apiPaper };

    // Map status → readingStatus
    if (p.status !== undefined) {
        p.readingStatus = p.status;
    }

    // Map pdfUrl → s3Key
    if (p.pdfUrl !== undefined) {
        p.s3Key = p.pdfUrl;
        p.hasPdf = true;
    } else {
        p.hasPdf = !!(p.s3Key);
    }

    return p;
}

export function mapCollectionToApi(localCollection) {
    const c = { ...localCollection };
    delete c.id;
    delete c.createdAt;
    delete c.updatedAt;
    return c;
}

export function mapCollectionFromApi(apiCollection) {
    return { ...apiCollection };
}

export function mapAnnotationToApi(localAnnotation) {
    const a = { ...localAnnotation };
    delete a.id;
    delete a.createdAt;
    delete a.updatedAt;
    return a;
}

export function mapAnnotationFromApi(apiAnnotation) {
    return { ...apiAnnotation };
}

// Authenticated fetch that returns the raw Response (for callers that use parseJsonResponse)
export async function apiRequest(url, options = {}) {
    let token = getAccessToken();
    if (!token) throw new Error('Not authenticated');

    const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        ...options.headers,
    };

    let response = await fetch(url, { ...options, headers });

    if (response.status === 401) {
        token = await refreshToken();
        headers['Authorization'] = `Bearer ${token}`;
        response = await fetch(url, { ...options, headers });
    }

    return response;
}
