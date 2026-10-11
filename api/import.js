/**
 * Import API Module
 * Handles batch import operations
 */

import { getApiBaseUrl } from '../config.js';
import { getAccessToken, refreshToken } from './auth.js';

/**
 * Batch import papers, collections, and annotations
 * @param {Object} data - { papers: [], collections: [], annotations: [] }
 * @returns {Promise<Object>} Import results
 */
export async function batchImport(data) {
    const url = `${getApiBaseUrl()}/api/import/batch-import`;

    let accessToken = getAccessToken();
    if (!accessToken) {
        throw new Error('Not authenticated. Please log in.');
    }

    const makeRequest = async (token, retried = false) => {
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(data)
        });

        if (response.status === 401) {
            // Token expired: refresh once and retry (refreshToken throws if the session is gone)
            if (retried) throw new Error('Session expired. Please log in again.');
            let newToken;
            try {
                newToken = await refreshToken();
            } catch {
                throw new Error('Session expired. Please log in again.');
            }
            if (!newToken) throw new Error('Session expired. Please log in again.');
            return makeRequest(newToken, true);
        }

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.error?.message || `Batch import failed: ${response.status}`);
        }

        return response.json();
    };

    return makeRequest(accessToken);
}

