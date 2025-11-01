/**
 * Annotations API Service
 * Handles all annotation CRUD operations with the backend API
 */

import { getApiBaseUrl } from '../config.js';
import { getAccessToken, refreshToken } from './auth.js';

const PAPERS_API_BASE = `${getApiBaseUrl()}/api/papers`;
const ANNOTATIONS_API_BASE = `${getApiBaseUrl()}/api/annotations`;

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
 * Gets all annotations for a paper.
 * @param {number|string} paperId - The paper ID.
 * @returns {Promise<Array>} Promise resolving to array of annotations.
 */
export async function getAnnotations(paperId) {
    try {
        const response = await apiRequest(`${PAPERS_API_BASE}/${paperId}/annotations`, {
            method: 'GET'
        });

        const result = await response.json();

        if (!response.ok) {
            if (response.status === 404) {
                throw new Error('Paper not found');
            }
            throw new Error(result.message || result.error?.message || 'Failed to fetch annotations');
        }

        if (result.success && result.data && Array.isArray(result.data.annotations)) {
            return result.data.annotations;
        }

        throw new Error('Invalid response from server');
    } catch (error) {
        console.error('Get annotations error:', error);
        throw error;
    }
}

/**
 * Gets a single annotation by ID.
 * @param {number|string} id - The annotation ID.
 * @returns {Promise<Object>} Promise resolving to annotation object.
 */
export async function getAnnotation(id) {
    try {
        const response = await apiRequest(`${ANNOTATIONS_API_BASE}/${id}`, {
            method: 'GET'
        });

        const result = await response.json();

        if (!response.ok) {
            if (response.status === 404) {
                throw new Error('Annotation not found');
            }
            throw new Error(result.message || result.error?.message || 'Failed to fetch annotation');
        }

        if (result.success && result.data && result.data.annotation) {
            return result.data.annotation;
        }

        throw new Error('Invalid response from server');
    } catch (error) {
        console.error('Get annotation error:', error);
        throw error;
    }
}

/**
 * Creates a new annotation for a paper.
 * @param {number|string} paperId - The paper ID.
 * @param {Object} annotationData - Annotation data { type, pageNumber, position, content, color }.
 * @returns {Promise<Object>} Promise resolving to created annotation object.
 */
export async function createAnnotation(paperId, annotationData) {
    try {
        const response = await apiRequest(`${PAPERS_API_BASE}/${paperId}/annotations`, {
            method: 'POST',
            body: JSON.stringify(annotationData)
        });

        const result = await response.json();

        if (!response.ok) {
            if (response.status === 404) {
                throw new Error('Paper not found');
            }
            throw new Error(result.message || result.error?.message || 'Failed to create annotation');
        }

        if (result.success && result.data && result.data.annotation) {
            return result.data.annotation;
        }

        throw new Error('Invalid response from server');
    } catch (error) {
        console.error('Create annotation error:', error);
        throw error;
    }
}

/**
 * Updates an existing annotation.
 * @param {number|string} id - The annotation ID.
 * @param {Object} updateData - Fields to update.
 * @returns {Promise<Object>} Promise resolving to updated annotation object.
 */
export async function updateAnnotation(id, updateData) {
    try {
        const response = await apiRequest(`${ANNOTATIONS_API_BASE}/${id}`, {
            method: 'PUT',
            body: JSON.stringify(updateData)
        });

        const result = await response.json();

        if (!response.ok) {
            if (response.status === 404) {
                throw new Error('Annotation not found');
            }
            throw new Error(result.message || result.error?.message || 'Failed to update annotation');
        }

        if (result.success && result.data && result.data.annotation) {
            return result.data.annotation;
        }

        throw new Error('Invalid response from server');
    } catch (error) {
        console.error('Update annotation error:', error);
        throw error;
    }
}

/**
 * Deletes an annotation (soft delete).
 * @param {number|string} id - The annotation ID.
 * @returns {Promise<void>}
 */
export async function deleteAnnotation(id) {
    try {
        const response = await apiRequest(`${ANNOTATIONS_API_BASE}/${id}`, {
            method: 'DELETE'
        });

        const result = await response.json();

        if (!response.ok) {
            if (response.status === 404) {
                throw new Error('Annotation not found');
            }
            throw new Error(result.message || result.error?.message || 'Failed to delete annotation');
        }

        if (!result.success) {
            throw new Error('Invalid response from server');
        }
    } catch (error) {
        console.error('Delete annotation error:', error);
        throw error;
    }
}

