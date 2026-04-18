/**
 * Paper-Folders API Service
 * Handles paper-folder association operations with the backend API
 */

import { getApiBaseUrl } from '../config.js';
import { getAccessToken, refreshToken } from './auth.js';
import { parseJsonResponse } from './utils.js';

const API_BASE = `${getApiBaseUrl()}/api/folders`;

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

export async function addPaperToFolder(folderId, paperId) {
    try {
        const response = await apiRequest(`${API_BASE}/${folderId}/papers`, {
            method: 'POST',
            body: JSON.stringify({ paperId })
        });
        const result = await parseJsonResponse(response);

        if (!result.success) {
            throw new Error('Invalid response from server');
        }
        return result.data;
    } catch (error) {
        console.error('Add paper to folder error:', error);
        throw error;
    }
}

export async function removePaperFromFolder(folderId, paperId) {
    try {
        const response = await apiRequest(`${API_BASE}/${folderId}/papers/${paperId}`, {
            method: 'DELETE'
        });
        const result = await parseJsonResponse(response);

        if (!result.success) {
            throw new Error('Invalid response from server');
        }
    } catch (error) {
        console.error('Remove paper from folder error:', error);
        throw error;
    }
}

export async function getPapersInFolder(folderId) {
    try {
        const response = await apiRequest(`${API_BASE}/${folderId}/papers`, {
            method: 'GET'
        });
        const result = await parseJsonResponse(response);

        if (result.success && result.data && Array.isArray(result.data.paperIds)) {
            return result.data.paperIds;
        }

        throw new Error('Invalid response from server');
    } catch (error) {
        console.error('Get papers in folder error:', error);
        throw error;
    }
}
