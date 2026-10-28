/**
 * api/sync.js — Sync API client
 *
 * Data mapping between local and API records, and apiRequest (the
 * authenticated fetch the other api/ modules use). Live sync itself runs over
 * the Yjs WebSocket (core/syncManager.js).
 */

import { libraryHeaders } from '../core/library.js';
import { getAccessToken, refreshToken } from '../api/auth.js';

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
    // A missing s3Key means "not downloaded here", not "no PDF": never send it as null
    if (p.s3Key) p.pdfUrl = p.s3Key;
    delete p.s3Key;

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
    if (p.pdfUrl) {
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
        ...libraryHeaders(),
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
