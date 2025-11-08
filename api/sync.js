/**
 * Sync API Service
 * Handles sync operations with the backend API (full sync, incremental sync, sync status)
 */

import { getApiBaseUrl } from '../config.js';
import { getAccessToken, refreshToken } from './auth.js';

const API_BASE = `${getApiBaseUrl()}/api/sync`;

// Storage keys for sync state
const LAST_SYNCED_KEY = 'citavers_last_synced_at';
const CLIENT_ID_KEY = 'citavers_client_id';

/**
 * Gets or generates a unique client ID for this browser/device.
 * @returns {string} The client ID.
 */
export function getClientId() {
    let clientId = localStorage.getItem(CLIENT_ID_KEY);
    if (!clientId) {
        // Generate a unique client ID using timestamp and random string
        clientId = `client_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
        localStorage.setItem(CLIENT_ID_KEY, clientId);
    }
    return clientId;
}

/**
 * Gets the last sync timestamp.
 * @returns {string|null} The last sync timestamp or null if never synced.
 */
export function getLastSyncedAt() {
    return localStorage.getItem(LAST_SYNCED_KEY);
}

/**
 * Sets the last sync timestamp.
 * @param {string} timestamp - ISO timestamp string.
 */
export function setLastSyncedAt(timestamp) {
    localStorage.setItem(LAST_SYNCED_KEY, timestamp);
}

/**
 * Helper function to make authenticated API requests with automatic token refresh.
 * @param {string} url - The API endpoint URL.
 * @param {Object} options - Fetch options.
 * @returns {Promise<Response>} The fetch response.
 */
export async function apiRequest(url, options = {}) {
    let accessToken = getAccessToken();
    
    if (!accessToken) {
        throw new Error('Not authenticated. Please log in.');
    }

    const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
        ...options.headers
    };

    let response;
    try {
        response = await fetch(url, {
            ...options,
            headers,
            credentials: 'include' // Include cookies for refresh token
        });
    } catch (fetchError) {
        console.error('Network fetch error:', fetchError);
        throw new Error(`Network error: ${fetchError.message || 'Unable to connect to server'}`);
    }

    // If token expired, try refreshing
    if (response.status === 401) {
        try {
            accessToken = await refreshToken();
            headers['Authorization'] = `Bearer ${accessToken}`;
            response = await fetch(url, {
                ...options,
                headers,
                credentials: 'include'
            });
        } catch (refreshError) {
            throw new Error('Session expired. Please log in again.');
        }
    }

    return response;
}

/**
 * Performs a full sync - gets all data from the server.
 * @returns {Promise<Object>} Promise resolving to { papers, collections, annotations, syncedAt }.
 */
export async function fullSync() {
    try {
        const response = await apiRequest(`${API_BASE}/full`, {
            method: 'GET'
        });

        const result = await response.json();

        if (!response.ok) {
            throw new Error(result.message || result.error?.message || 'Failed to perform full sync');
        }

        if (result.success && result.data) {
            // Update last synced timestamp
            if (result.data.syncedAt) {
                setLastSyncedAt(result.data.syncedAt);
            }
            
            return {
                papers: result.data.papers || [],
                collections: result.data.collections || [],
                annotations: result.data.annotations || [],
                syncedAt: result.data.syncedAt
            };
        }

        throw new Error('Invalid response from server');
    } catch (error) {
        console.error('Full sync error:', error);
        throw error;
    }
}

/**
 * Performs an incremental sync - sends local changes and receives server changes.
 * @param {Object} localChanges - Local changes to send { papers: {created, updated, deleted}, collections: {...}, annotations: {...} }.
 * @returns {Promise<Object>} Promise resolving to sync result with appliedChanges and serverChanges.
 */
export async function incrementalSync(localChanges) {
    try {
        const lastSyncedAt = getLastSyncedAt();
        const clientId = getClientId();

        const response = await apiRequest(`${API_BASE}/incremental`, {
            method: 'POST',
            body: JSON.stringify({
                lastSyncedAt,
                changes: localChanges,
                clientId
            })
        });

        const result = await response.json();

        if (!response.ok) {
            throw new Error(result.message || result.error?.message || 'Failed to perform incremental sync');
        }

        if (result.success && result.data) {
            // Update last synced timestamp
            if (result.data.syncedAt) {
                setLastSyncedAt(result.data.syncedAt);
            }
            
            return {
                appliedChanges: result.data.appliedChanges || {},
                serverChanges: result.data.serverChanges || {},
                syncedAt: result.data.syncedAt
            };
        }

        throw new Error('Invalid response from server');
    } catch (error) {
        console.error('Incremental sync error:', error);
        throw error;
    }
}

/**
 * Gets sync status from the server.
 * @returns {Promise<Object>} Promise resolving to { lastSyncedAt, counts, lastSyncAction }.
 */
export async function getSyncStatus() {
    try {
        const response = await apiRequest(`${API_BASE}/status`, {
            method: 'GET'
        });

        const result = await response.json();

        if (!response.ok) {
            throw new Error(result.message || result.error?.message || 'Failed to get sync status');
        }

        if (result.success && result.data) {
            return {
                lastSyncedAt: result.data.lastSyncedAt,
                lastSyncAction: result.data.lastSyncAction,
                lastClientId: result.data.lastClientId,
                counts: result.data.counts || {}
            };
        }

        throw new Error('Invalid response from server');
    } catch (error) {
        console.error('Get sync status error:', error);
        throw error;
    }
}

/**
 * Maps local paper format to API format for sync.
 * @param {Object} localPaper - Local paper object.
 * @returns {Object} API paper format.
 */
function mapPaperToApi(localPaper) {
    const apiPaper = { ...localPaper };
    
    // Map readingStatus to status
    if (apiPaper.readingStatus) {
        apiPaper.status = apiPaper.readingStatus;
        delete apiPaper.readingStatus;
    }
    
    // Map s3Key to pdfUrl
    if (apiPaper.s3Key) {
        apiPaper.pdfUrl = apiPaper.s3Key;
        delete apiPaper.s3Key;
    }
    
    // Remove fields API doesn't expect
    delete apiPaper.pdfData;
    delete apiPaper.pdfFile;
    delete apiPaper.hasPdf;
    delete apiPaper.id; // API will assign ID
    delete apiPaper.createdAt; // API sets this
    delete apiPaper.updatedAt; // API sets this
    
    // Ensure arrays
    if (!Array.isArray(apiPaper.authors)) {
        apiPaper.authors = apiPaper.authors ? [apiPaper.authors] : [];
    }
    if (!Array.isArray(apiPaper.tags)) {
        apiPaper.tags = apiPaper.tags ? [apiPaper.tags] : [];
    }
    
    // Ensure readingProgress is valid
    if (apiPaper.readingProgress) {
        if (!apiPaper.readingProgress.totalPages || apiPaper.readingProgress.totalPages < 1) {
            delete apiPaper.readingProgress;
        }
    }
    
    return apiPaper;
}

/**
 * Maps API paper format to local format.
 * @param {Object} apiPaper - API paper object.
 * @returns {Object} Local paper format.
 */
function mapPaperFromApi(apiPaper) {
    const localPaper = { ...apiPaper };
    
    // Map status to readingStatus
    if (localPaper.status) {
        localPaper.readingStatus = localPaper.status;
    }
    
    // Map pdfUrl to s3Key
    if (localPaper.pdfUrl) {
        localPaper.s3Key = localPaper.pdfUrl;
        localPaper.hasPdf = true;
    }
    
    return localPaper;
}

/**
 * Maps local collection format to API format for sync.
 * @param {Object} localCollection - Local collection object.
 * @returns {Object} API collection format.
 */
function mapCollectionToApi(localCollection) {
    const apiCollection = { ...localCollection };
    
    // Remove fields API doesn't expect
    delete apiCollection.id;
    delete apiCollection.createdAt;
    delete apiCollection.updatedAt;
    
    return apiCollection;
}

/**
 * Maps API collection format to local format.
 * @param {Object} apiCollection - API collection object.
 * @returns {Object} Local collection format.
 */
function mapCollectionFromApi(apiCollection) {
    // Collections don't need mapping, return as-is
    return { ...apiCollection };
}

/**
 * Maps local annotation format to API format for sync.
 * @param {Object} localAnnotation - Local annotation object.
 * @returns {Object} API annotation format.
 */
function mapAnnotationToApi(localAnnotation) {
    const apiAnnotation = { ...localAnnotation };
    
    // Remove fields API doesn't expect
    delete apiAnnotation.id;
    delete apiAnnotation.createdAt;
    delete apiAnnotation.updatedAt;
    
    return apiAnnotation;
}

/**
 * Maps API annotation format to local format.
 * @param {Object} apiAnnotation - API annotation object.
 * @returns {Object} Local annotation format.
 */
function mapAnnotationFromApi(apiAnnotation) {
    // Annotations don't need mapping, return as-is
    return { ...apiAnnotation };
}

// Export mapping functions for use by sync service
export {
    mapPaperToApi,
    mapPaperFromApi,
    mapCollectionToApi,
    mapCollectionFromApi,
    mapAnnotationToApi,
    mapAnnotationFromApi
};

