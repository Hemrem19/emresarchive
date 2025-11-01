/**
 * Papers API Service
 * Handles all paper CRUD operations with the backend API
 */

import { API_CONFIG, getApiBaseUrl } from '../config.js';
import { getAccessToken, refreshToken } from './auth.js';

const API_BASE = `${getApiBaseUrl()}/api/papers`;

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

    let response;
    try {
        response = await fetch(url, {
            ...options,
            headers,
            credentials: 'include' // Include cookies for refresh token
        });
    } catch (fetchError) {
        // Network errors (CORS, connection refused, etc.)
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
 * Gets all papers with optional filtering and pagination.
 * @param {Object} options - Query options.
 * @param {number} options.page - Page number (default: 1).
 * @param {number} options.limit - Items per page (default: 25).
 * @param {string} options.status - Filter by status.
 * @param {string} options.tag - Filter by tag.
 * @param {string} options.sortBy - Sort field (default: 'updatedAt').
 * @param {string} options.sortOrder - Sort order: 'asc' or 'desc' (default: 'desc').
 * @returns {Promise<Object>} Promise resolving to { papers, pagination }.
 */
export async function getAllPapers(options = {}) {
    const {
        page = 1,
        limit = 25,
        status,
        tag,
        sortBy = 'updatedAt',
        sortOrder = 'desc'
    } = options;

    const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
        sortBy,
        sortOrder
    });

    if (status) params.append('status', status);
    if (tag) params.append('tag', tag);

    try {
        const response = await apiRequest(`${API_BASE}?${params.toString()}`, {
            method: 'GET'
        });

        const result = await response.json();

        if (!response.ok) {
            throw new Error(result.message || result.error?.message || 'Failed to fetch papers');
        }

        if (result.success && result.data) {
            return {
                papers: result.data.papers || [],
                pagination: result.data.pagination || {
                    page: 1,
                    limit: 25,
                    total: 0,
                    totalPages: 0
                }
            };
        }

        throw new Error('Invalid response from server');
    } catch (error) {
        console.error('Get papers error:', error);
        throw error;
    }
}

/**
 * Gets a single paper by ID.
 * @param {number|string} id - The paper ID.
 * @returns {Promise<Object>} Promise resolving to paper object.
 */
export async function getPaper(id) {
    try {
        const response = await apiRequest(`${API_BASE}/${id}`, {
            method: 'GET'
        });

        const result = await response.json();

        if (!response.ok) {
            if (response.status === 404) {
                throw new Error('Paper not found');
            }
            throw new Error(result.message || result.error?.message || 'Failed to fetch paper');
        }

        if (result.success && result.data && result.data.paper) {
            return result.data.paper;
        }

        throw new Error('Invalid response from server');
    } catch (error) {
        console.error('Get paper error:', error);
        throw error;
    }
}

/**
 * Creates a new paper.
 * @param {Object} paperData - Paper data { title, authors, journal, year, doi, abstract, tags, status, notes, readingProgress, relatedPaperIds }.
 * @returns {Promise<Object>} Promise resolving to created paper object.
 */
export async function createPaper(paperData) {
    try {
        const response = await apiRequest(`${API_BASE}`, {
            method: 'POST',
            body: JSON.stringify(paperData)
        });

        const result = await response.json();

        if (!response.ok) {
            throw new Error(result.message || result.error?.message || 'Failed to create paper');
        }

        if (result.success && result.data && result.data.paper) {
            return result.data.paper;
        }

        throw new Error('Invalid response from server');
    } catch (error) {
        console.error('Create paper error:', error);
        throw error;
    }
}

/**
 * Updates an existing paper.
 * @param {number|string} id - The paper ID.
 * @param {Object} updateData - Fields to update.
 * @returns {Promise<Object>} Promise resolving to updated paper object.
 */
export async function updatePaper(id, updateData) {
    try {
        const response = await apiRequest(`${API_BASE}/${id}`, {
            method: 'PUT',
            body: JSON.stringify(updateData)
        });

        const result = await response.json();

        if (!response.ok) {
            if (response.status === 404) {
                throw new Error('Paper not found');
            }
            throw new Error(result.message || result.error?.message || 'Failed to update paper');
        }

        if (result.success && result.data && result.data.paper) {
            return result.data.paper;
        }

        throw new Error('Invalid response from server');
    } catch (error) {
        console.error('Update paper error:', error);
        throw error;
    }
}

/**
 * Deletes a paper (soft delete).
 * @param {number|string} id - The paper ID.
 * @returns {Promise<void>}
 */
export async function deletePaper(id) {
    try {
        const response = await apiRequest(`${API_BASE}/${id}`, {
            method: 'DELETE'
        });

        const result = await response.json();

        if (!response.ok) {
            if (response.status === 404) {
                throw new Error('Paper not found');
            }
            throw new Error(result.message || result.error?.message || 'Failed to delete paper');
        }

        if (!result.success) {
            throw new Error('Invalid response from server');
        }
    } catch (error) {
        console.error('Delete paper error:', error);
        throw error;
    }
}

/**
 * Searches papers by title, authors, or notes.
 * @param {string} query - Search query.
 * @param {Object} options - Search options.
 * @param {number} options.page - Page number (default: 1).
 * @param {number} options.limit - Items per page (default: 25).
 * @returns {Promise<Object>} Promise resolving to { papers, pagination }.
 */
export async function searchPapers(query, options = {}) {
    const {
        page = 1,
        limit = 25
    } = options;

    const params = new URLSearchParams({
        q: query,
        page: page.toString(),
        limit: limit.toString()
    });

    try {
        const response = await apiRequest(`${API_BASE}/search?${params.toString()}`, {
            method: 'GET'
        });

        const result = await response.json();

        if (!response.ok) {
            throw new Error(result.message || result.error?.message || 'Search failed');
        }

        if (result.success && result.data) {
            return {
                papers: result.data.papers || [],
                pagination: result.data.pagination || {
                    page: 1,
                    limit: 25,
                    total: 0,
                    totalPages: 0
                }
            };
        }

        throw new Error('Invalid response from server');
    } catch (error) {
        console.error('Search papers error:', error);
        throw error;
    }
}

/**
 * Gets a presigned URL for PDF upload.
 * @param {Object} options - Upload options.
 * @param {string} options.filename - PDF filename.
 * @param {number} options.size - File size in bytes.
 * @param {string} options.contentType - MIME type (default: 'application/pdf').
 * @param {number|null} options.paperId - Optional paper ID (for new papers, can be null).
 * @returns {Promise<Object>} Promise resolving to { uploadUrl, s3Key, expiresIn }.
 */
export async function getUploadUrl(options) {
    const {
        filename,
        size,
        contentType = 'application/pdf',
        paperId = null
    } = options;

    try {
        const response = await apiRequest(`${API_BASE}/upload-url`, {
            method: 'POST',
            body: JSON.stringify({
                filename,
                size,
                contentType,
                paperId
            })
        });

        const result = await response.json();

        if (!response.ok) {
            throw new Error(result.message || result.error?.message || 'Failed to get upload URL');
        }

        if (result.success && result.data) {
            return {
                uploadUrl: result.data.uploadUrl,
                s3Key: result.data.s3Key,
                expiresIn: result.data.expiresIn
            };
        }

        throw new Error('Invalid response from server');
    } catch (error) {
        console.error('Get upload URL error:', error);
        throw error;
    }
}

/**
 * Uploads a PDF file to S3 using presigned URL.
 * @param {string} uploadUrl - Presigned upload URL.
 * @param {File|Blob} file - PDF file to upload.
 * @returns {Promise<void>}
 */
export async function uploadPdf(uploadUrl, file) {
    try {
        // For presigned URLs with ContentType and ContentLength in signature:
        // - Content-Type MUST match exactly what was used to generate the presigned URL
        // - Content-Length is automatically set by browser from file.size
        // - Both must match the PutObjectCommand parameters used to generate the URL
        // 
        // Use exact value 'application/pdf' to ensure match
        // (presigned URL was generated with contentType: 'application/pdf')
        const response = await fetch(uploadUrl, {
            method: 'PUT',
            body: file,
            headers: {
                // Must match exactly what was used in PutObjectCommand when generating presigned URL
                // Use 'application/pdf' exactly (not file.type which might have case/whitespace issues)
                'Content-Type': 'application/pdf'
            }
            // DO NOT set Content-Length - browser sets it automatically from file.size
            // This must match the ContentLength used in PutObjectCommand
        });

        if (!response.ok) {
            const errorText = await response.text().catch(() => '');
            console.error('Upload failed response:', response.status, response.statusText, errorText);
            throw new Error(`Upload failed: ${response.status} ${response.statusText}`);
        }
    } catch (error) {
        console.error('Upload PDF error:', error);
        throw error;
    }
}

/**
 * Gets a presigned URL for PDF download.
 * @param {number|string} paperId - The paper ID.
 * @returns {Promise<Object>} Promise resolving to { pdfUrl, downloadUrl, expiresIn }.
 */
export async function getPdfDownloadUrl(paperId) {
    try {
        const response = await apiRequest(`${API_BASE}/${paperId}/pdf`, {
            method: 'GET'
        });

        const result = await response.json();

        if (!response.ok) {
            if (response.status === 404) {
                throw new Error('Paper or PDF not found');
            }
            throw new Error(result.message || result.error?.message || 'Failed to get download URL');
        }

        if (result.success && result.data) {
            return {
                pdfUrl: result.data.pdfUrl,
                downloadUrl: result.data.downloadUrl,
                expiresIn: result.data.expiresIn
            };
        }

        throw new Error('Invalid response from server');
    } catch (error) {
        console.error('Get download URL error:', error);
        throw error;
    }
}

