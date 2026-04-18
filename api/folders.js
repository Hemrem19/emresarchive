/**
 * Folders API Service
 * Handles all folder CRUD operations with the backend API
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

export async function getAllFolders() {
    try {
        const response = await apiRequest(`${API_BASE}`, { method: 'GET' });
        const result = await parseJsonResponse(response);

        if (result.success && result.data && Array.isArray(result.data.folders)) {
            return result.data.folders;
        }

        throw new Error('Invalid response from server');
    } catch (error) {
        console.error('Get folders error:', error);
        throw error;
    }
}

export async function getFolder(id) {
    try {
        const response = await apiRequest(`${API_BASE}/${id}`, { method: 'GET' });
        const result = await parseJsonResponse(response);

        if (result.success && result.data && result.data.folder) {
            return result.data.folder;
        }

        throw new Error('Invalid response from server');
    } catch (error) {
        console.error('Get folder error:', error);
        throw error;
    }
}

export async function createFolder(folderData) {
    try {
        const response = await apiRequest(`${API_BASE}`, {
            method: 'POST',
            body: JSON.stringify(folderData)
        });
        const result = await parseJsonResponse(response);

        if (result.success && result.data && result.data.folder) {
            return result.data.folder;
        }

        throw new Error('Invalid response from server');
    } catch (error) {
        console.error('Create folder error:', error);
        throw error;
    }
}

export async function updateFolder(id, updateData) {
    try {
        const response = await apiRequest(`${API_BASE}/${id}`, {
            method: 'PUT',
            body: JSON.stringify(updateData)
        });
        const result = await parseJsonResponse(response);

        if (result.success && result.data && result.data.folder) {
            return result.data.folder;
        }

        throw new Error('Invalid response from server');
    } catch (error) {
        console.error('Update folder error:', error);
        throw error;
    }
}

export async function deleteFolder(id) {
    try {
        const response = await apiRequest(`${API_BASE}/${id}`, { method: 'DELETE' });
        const result = await parseJsonResponse(response);

        if (!result.success) {
            throw new Error('Invalid response from server');
        }
    } catch (error) {
        console.error('Delete folder error:', error);
        throw error;
    }
}
