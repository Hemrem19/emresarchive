/**
 * Collections API Service
 * Handles all collection CRUD operations with the backend API
 */

import { getApiBaseUrl } from '../config.js';
import { getAccessToken, refreshToken } from './auth.js';
import { parseJsonResponse } from './utils.js';

const API_BASE = `${getApiBaseUrl()}/api/collections`;

/**
 * Helper function to make authenticated API requests with automatic token refresh.
 * @param {string} url - The API endpoint URL.
 * @param {Object} options - Fetch options.
 * @returns {Promise<Response>} The fetch response.
 */
async function apiRequest(url, options = {}) {
    let accessToken = getAccessToken();
    
    if (!accessToken) {
        throw new Error('Not authenticated. Please log in.');
    }

    const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
        ...options.headers
    };

    let response = await fetch(url, {
        ...options,
        headers,
        credentials: 'include'
    });

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
 * Gets all collections.
 * @returns {Promise<Array>} Promise resolving to array of collections.
 */
export async function getAllCollections() {
    try {
        const response = await apiRequest(`${API_BASE}`, {
            method: 'GET'
        });

        const result = await parseJsonResponse(response);

        if (result.success && result.data && Array.isArray(result.data.collections)) {
            return result.data.collections;
        }

        throw new Error('Invalid response from server');
    } catch (error) {
        console.error('Get collections error:', error);
        throw error;
    }
}

/**
 * Gets a single collection by ID.
 * @param {number|string} id - The collection ID.
 * @returns {Promise<Object>} Promise resolving to collection object.
 */
export async function getCollection(id) {
    try {
        const response = await apiRequest(`${API_BASE}/${id}`, {
            method: 'GET'
        });

        const result = await parseJsonResponse(response);

        if (result.success && result.data && result.data.collection) {
            return result.data.collection;
        }

        throw new Error('Invalid response from server');
    } catch (error) {
        console.error('Get collection error:', error);
        throw error;
    }
}

/**
 * Creates a new collection.
 * @param {Object} collectionData - Collection data { name, icon, color, filters }.
 * @returns {Promise<Object>} Promise resolving to created collection object.
 */
export async function createCollection(collectionData) {
    try {
        const response = await apiRequest(`${API_BASE}`, {
            method: 'POST',
            body: JSON.stringify(collectionData)
        });

        const result = await parseJsonResponse(response);

        if (result.success && result.data && result.data.collection) {
            return result.data.collection;
        }

        throw new Error('Invalid response from server');
    } catch (error) {
        console.error('Create collection error:', error);
        throw error;
    }
}

/**
 * Updates an existing collection.
 * @param {number|string} id - The collection ID.
 * @param {Object} updateData - Fields to update.
 * @returns {Promise<Object>} Promise resolving to updated collection object.
 */
export async function updateCollection(id, updateData) {
    try {
        const response = await apiRequest(`${API_BASE}/${id}`, {
            method: 'PUT',
            body: JSON.stringify(updateData)
        });

        const result = await parseJsonResponse(response);

        if (result.success && result.data && result.data.collection) {
            return result.data.collection;
        }

        throw new Error('Invalid response from server');
    } catch (error) {
        console.error('Update collection error:', error);
        throw error;
    }
}

/**
 * Deletes a collection (soft delete).
 * @param {number|string} id - The collection ID.
 * @returns {Promise<void>}
 */
export async function deleteCollection(id) {
    try {
        const response = await apiRequest(`${API_BASE}/${id}`, {
            method: 'DELETE'
        });

        const result = await parseJsonResponse(response);

        if (!result.success) {
            throw new Error('Invalid response from server');
        }
    } catch (error) {
        console.error('Delete collection error:', error);
        throw error;
    }
}

