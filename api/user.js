/**
 * User API Module
 * Handles user profile and data management API calls
 */

import { API_CONFIG } from '../config.js';
import { parseJsonResponse } from './utils.js';
import { getAccessToken, refreshToken } from './auth.js';

const API_BASE = `${API_CONFIG.BASE_URL}/api/user`;

/**
 * Clear all user data (papers, collections, annotations)
 * @returns {Promise<Object>} Response with deletion counts
 */
export async function clearAllUserData() {
    try {
        let accessToken = getAccessToken();
        if (!accessToken) throw new Error('Not authenticated. Please log in.');

        const headers = {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${accessToken}`
        };

        let response = await fetch(`${API_BASE}/data`, {
            method: 'DELETE',
            headers,
            credentials: 'include'
        });

        if (response.status === 401) {
            accessToken = await refreshToken();
            headers['Authorization'] = `Bearer ${accessToken}`;
            response = await fetch(`${API_BASE}/data`, {
                method: 'DELETE',
                headers,
                credentials: 'include'
            });
        }

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

