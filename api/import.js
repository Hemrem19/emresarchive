/**
 * Import API Module
 * Handles batch import operations
 */

import { getApiUrl } from './utils.js';
import { getAccessToken, refreshAccessToken } from './auth.js';

/**
 * Batch import papers, collections, and annotations
 * @param {Object} data - { papers: [], collections: [], annotations: [] }
 * @returns {Promise<Object>} Import results
 */
export async function batchImport(data) {
    const url = `${getApiUrl()}/import/batch-import`;
    
    let accessToken = getAccessToken();
    if (!accessToken) {
        throw new Error('Not authenticated. Please log in.');
    }

    const makeRequest = async (token) => {
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(data)
        });

        if (response.status === 401) {
            // Token expired, try to refresh
            const newToken = await refreshAccessToken();
            if (newToken) {
                // Retry with new token
                return makeRequest(newToken);
            }
            throw new Error('Session expired. Please log in again.');
        }

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ error: { message: 'Unknown error' } }));
            throw new Error(errorData.error?.message || `Batch import failed: ${response.status}`);
        }

        return response.json();
    };

    return makeRequest(accessToken);
}

