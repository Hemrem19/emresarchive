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
                fields: result.data.fields || null, // Presigned POST fields (if using POST)
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
 * Uploads a PDF file to S3 via backend server (direct upload).
 * This avoids presigned URL signature mismatch issues.
 * @param {File|Blob} file - PDF file to upload.
 * @param {number|null} paperId - Optional paper ID (for new papers, can be null).
 * @returns {Promise<Object>} Promise resolving to { s3Key, pdfSizeBytes, filename }.
 */
export async function uploadPdfViaBackend(file, paperId = null) {
    try {
        const formData = new FormData();
        formData.append('file', file);
        
        const url = `${API_BASE}/upload${paperId ? `?paperId=${paperId}` : ''}`;
        
        const response = await apiRequest(url, {
            method: 'POST',
            body: formData
            // DO NOT set Content-Type header - browser sets it with boundary for multipart/form-data
        });

        const result = await response.json();

        if (!response.ok) {
            throw new Error(result.message || result.error?.message || 'Upload failed');
        }

        if (result.success && result.data) {
            return {
                s3Key: result.data.s3Key,
                pdfSizeBytes: result.data.pdfSizeBytes,
                filename: result.data.filename
            };
        }

        throw new Error('Invalid response from server');
    } catch (error) {
        console.error('Upload PDF via backend error:', error);
        throw error;
    }
}

/**
 * Uploads a PDF file to S3 using presigned URL (supports both POST and PUT).
 * @deprecated Use uploadPdfViaBackend instead to avoid signature mismatch issues.
 * @param {string} uploadUrl - Presigned upload URL.
 * @param {File|Blob} file - PDF file to upload.
 * @param {Object|null} fields - Presigned POST fields (if using POST method).
 * @returns {Promise<void>}
 */
export async function uploadPdf(uploadUrl, file, fields = null) {
    try {
        if (fields && typeof uploadUrl === 'string' && uploadUrl.includes('http')) {
            // Presigned POST: Send FormData with fields + file
            // Note: R2 may not support presigned POST (returns 501), so this might fail
            const formData = new FormData();
            
            // Add all presigned POST fields
            for (const [key, value] of Object.entries(fields)) {
                formData.append(key, value);
            }
            
            // Add the file (must be last field in FormData for presigned POST)
            // The field name doesn't matter for presigned POST - S3 accepts any name
            formData.append('file', file);
            
            const response = await fetch(uploadUrl, {
                method: 'POST',
                body: formData
                // DO NOT set Content-Type header - browser sets it with boundary for multipart/form-data
            });
            
            if (!response.ok) {
                // If POST returns 501 (Not Implemented), R2 doesn't support presigned POST
                // The backend should have fallen back to PUT, but if it didn't, log this
                if (response.status === 501) {
                    console.error('R2 returned 501 Not Implemented - presigned POST not supported');
                }
                const errorText = await response.text().catch(() => '');
                console.error('Upload failed response:', response.status, response.statusText, errorText);
                throw new Error(`Upload failed: ${response.status} ${response.statusText}`);
            }
            return; // Success - exit function
        } else {
            // Presigned PUT: Send file directly
            // Note: Even though CanonicalRequest shows GET, PUT might work with x-id=PutObject
            // The ContentType is included in the signature, so we must match it exactly
            const response = await fetch(uploadUrl, {
                method: 'PUT',
                body: file,
                headers: {
                    // Content-Type must match exactly what was used in PutObjectCommand
                    'Content-Type': 'application/pdf'
                }
                // DO NOT set Content-Length - browser sets it automatically
            });

            if (!response.ok) {
                const errorText = await response.text().catch(() => '');
                console.error('Upload failed response:', response.status, response.statusText, errorText);
                throw new Error(`Upload failed: ${response.status} ${response.statusText}`);
            }
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

