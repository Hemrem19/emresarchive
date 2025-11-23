import { parseJsonResponse, withRateLimitCheck } from './utils.js';
import { getAccessToken } from './auth.js';
import { API_CONFIG } from '../config.js';

/**
 * Generate a new paper network automatically
 * @returns {Promise<Object>} The generated network data
 */
export async function generateNetwork() {
    return withRateLimitCheck(async () => {
        const token = getAccessToken();
        if (!token) throw new Error('Authentication required');

        const response = await fetch(`${API_CONFIG.BASE_URL}/api/networks/auto-generate`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        const data = await parseJsonResponse(response);
        if (data.success) {
            return data.data;
        } else {
            throw new Error(data.error?.message || 'Failed to generate network');
        }
    });
}

/**
 * Get a specific network by ID
 * @param {string} id - The network ID
 * @returns {Promise<Object>} The network data (nodes and edges)
 */
export async function getNetwork(id) {
    return withRateLimitCheck(async () => {
        const token = getAccessToken();
        if (!token) throw new Error('Authentication required');

        const response = await fetch(`${API_CONFIG.BASE_URL}/api/networks/${id}`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        const data = await parseJsonResponse(response);
        if (data.success) {
            return data.data;
        } else {
            throw new Error(data.error?.message || 'Failed to fetch network');
        }
    });
}

/**
 * Get all networks for the current user
 * @returns {Promise<Array>} List of networks
 */
export async function getUserNetworks() {
    return withRateLimitCheck(async () => {
        const token = getAccessToken();
        if (!token) throw new Error('Authentication required');

        const response = await fetch(`${API_CONFIG.BASE_URL}/api/networks`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        const data = await parseJsonResponse(response);
        if (data.success) {
            return data.data;
        } else {
            throw new Error(data.error?.message || 'Failed to fetch networks');
        }
    });
}
