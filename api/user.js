/**
 * User API Module
 * Handles user profile and data management API calls
 */

import { API_CONFIG } from '../config.js';
import { parseJsonResponse } from './utils.js';
import { apiRequest } from './sync.js';

const API_BASE = `${API_CONFIG.BASE_URL}/api/user`;

/**
 * Clear all user data (papers, collections, annotations)
 * @returns {Promise<Object>} Response with deletion counts
 */
export async function clearAllUserData() {
    try {
        const response = await apiRequest(`${API_BASE}/data`, {
            method: 'DELETE',
            credentials: 'include'
        });

        const result = await parseJsonResponse(response);

        if (!result.success) {
            throw new Error(result.error?.message || 'Failed to clear user data');
        }

        return result.data;
    } catch (error) {
        console.error('Clear all user data error:', error);
        throw new Error(`Failed to clear user data: ${error.message}`);
    }
}

/**
 * Cloud storage usage of the signed-in user's library.
 * @returns {Promise<{usedBytes: number, limitBytes: number}>}
 */
export async function getStorageUsage() {
    const response = await apiRequest(`${API_BASE}/stats`, { method: 'GET', credentials: 'include' });
    const result = await parseJsonResponse(response);
    if (!result.success) {
        throw new Error(result.error?.message || 'Failed to load storage usage');
    }
    const { storageUsedBytes, storageLimitBytes } = result.data.stats;
    return { usedBytes: Number(storageUsedBytes), limitBytes: Number(storageLimitBytes) };
}
