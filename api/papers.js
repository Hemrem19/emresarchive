/**
 * Papers API Service
 * Handles all paper CRUD operations with the backend API
 */

import { libraryHeaders } from '../core/library.js';
import { API_CONFIG, getApiBaseUrl } from '../config.js';
import { getAccessToken, refreshToken } from './auth.js';
import { parseJsonResponse, withRateLimitCheck } from './utils.js';

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
        ...libraryHeaders(),
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
        sortOrder = 'desc',
        since
    } = options;

    const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
        sortBy,
        sortOrder
    });

    if (status) params.append('status', status);
    if (tag) params.append('tag', tag);
    if (since) params.append('since', since);

    try {
        const response = await apiRequest(`${API_BASE}?${params.toString()}`, {
            method: 'GET'
        });

        const result = await parseJsonResponse(response);

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

        const result = await parseJsonResponse(response);

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

        const result = await parseJsonResponse(response);

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

        const result = await parseJsonResponse(response);
        
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

        const result = await parseJsonResponse(response);

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

        const result = await parseJsonResponse(response);

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
 * Uploads a PDF through the backend (the only upload path; the server checks size and quota).
 * @param {File|Blob} file - PDF file to upload.
 * @param {number|null} paperId - Optional paper ID (for new papers, can be null).
 * @returns {Promise<Object>} Promise resolving to { s3Key, pdfSizeBytes, filename }.
 */
export async function uploadPdfViaBackend(file, paperId = null) {
    try {
        const formData = new FormData();
        formData.append('file', file);
        
        const url = `${API_BASE}/upload${paperId ? `?paperId=${paperId}` : ''}`;
        
        // Use fetch directly for file uploads (not apiRequest) to avoid JSON parsing issues
        let accessToken = getAccessToken();
        
        if (!accessToken) {
            throw new Error('Not authenticated. Please log in.');
        }
        
        const headers = {
            'Authorization': `Bearer ${accessToken}`,
            ...libraryHeaders(),
            // DO NOT set Content-Type - browser sets it with boundary for multipart/form-data
        };
        
        let response = await fetch(url, {
            method: 'POST',
            headers,
            body: formData,
            credentials: 'include' // Include cookies for refresh token
        });

        // If token expired, try refreshing
        if (response.status === 401) {
            try {
                accessToken = await refreshToken();
                headers['Authorization'] = `Bearer ${accessToken}`;
                response = await fetch(url, {
                    method: 'POST',
                    headers,
                    body: formData,
                    credentials: 'include'
                });
            } catch (refreshError) {
                throw new Error('Session expired. Please log in again.');
            }
        }

        // Try to parse JSON, but handle non-JSON errors gracefully
        let result;
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
            result = await response.json();
        } else {
            // If not JSON, read as text
            const errorText = await response.text();
            console.error('Non-JSON error response:', errorText);
            throw new Error(`Upload failed: ${response.status} ${response.statusText}. ${errorText.substring(0, 200)}`);
        }

        if (!response.ok) {
            throw new Error(result.message || result.error?.message || `Upload failed: ${response.status} ${response.statusText}`);
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
 * Gets a presigned URL for PDF download or proxy URL.
 * @param {number|string} paperId - The paper ID.
 * @returns {Promise<Object>} Promise resolving to { pdfUrl, downloadUrl, proxyUrl, expiresIn }.
 */
export async function getPdfDownloadUrl(paperId) {
    try {
        const response = await apiRequest(`${API_BASE}/${paperId}/pdf`, {
            method: 'GET'
        });

        const result = await parseJsonResponse(response);

        if (result.success && result.data) {
            // Construct full proxy URL if backend returned relative path
            let proxyUrl = result.data.proxyUrl || `/api/papers/${paperId}/pdf-proxy`;
            console.log('[API] getPdfDownloadUrl - raw proxyUrl from backend:', proxyUrl);
            
            // Always construct full URL for proxy endpoint
            if (proxyUrl && proxyUrl.startsWith('/')) {
                const baseUrl = getApiBaseUrl();
                proxyUrl = `${baseUrl}${proxyUrl}`;
                console.log('[API] getPdfDownloadUrl - constructed full proxyUrl:', proxyUrl);
            } else if (!proxyUrl || !proxyUrl.startsWith('http')) {
                // Fallback: construct from base URL
                const baseUrl = getApiBaseUrl();
                proxyUrl = `${baseUrl}/api/papers/${paperId}/pdf-proxy`;
                console.log('[API] getPdfDownloadUrl - fallback constructed proxyUrl:', proxyUrl);
            }
            
            console.log('[API] getPdfDownloadUrl - final proxyUrl:', proxyUrl);
            
            return {
                pdfUrl: result.data.pdfUrl,
                downloadUrl: result.data.downloadUrl,
                proxyUrl,
                expiresIn: result.data.expiresIn
            };
        }

        throw new Error('Invalid response from server');
    } catch (error) {
        console.error('Get download URL error:', error);
        throw error;
    }
}

/**
 * Gets PDF URL for viewing (prefers proxy to avoid CORS).
 * @param {number|string} paperId - The paper ID.
 * @returns {Promise<string>} Promise resolving to PDF URL (proxy URL preferred).
 */
export async function getPdfViewUrl(paperId) {
    try {
        const { proxyUrl, downloadUrl } = await getPdfDownloadUrl(paperId);
        console.log('[API] getPdfViewUrl - getPdfDownloadUrl returned:', { proxyUrl, downloadUrl });
        
        // Always construct full URL for proxy endpoint
        let finalUrl;
        const baseUrl = getApiBaseUrl();
        console.log('[API] getPdfViewUrl - baseUrl:', baseUrl);
        
        if (proxyUrl) {
            if (proxyUrl.startsWith('http://') || proxyUrl.startsWith('https://')) {
                // Already a full URL
                finalUrl = proxyUrl;
                console.log('[API] getPdfViewUrl - using full proxy URL:', finalUrl);
            } else if (proxyUrl.startsWith('/')) {
                // Relative path - construct full backend URL
                finalUrl = `${baseUrl}${proxyUrl}`;
                console.log('[API] getPdfViewUrl - constructed full proxy URL from relative:', finalUrl);
            } else {
                // Fallback: construct from base URL
                finalUrl = `${baseUrl}/api/papers/${paperId}/pdf-proxy`;
                console.log('[API] getPdfViewUrl - fallback constructed proxy URL:', finalUrl);
            }
        } else {
            // No proxy URL, use download URL
            finalUrl = downloadUrl;
            console.log('[API] getPdfViewUrl - no proxy URL, using download URL:', finalUrl);
        }
        
        // Final validation - ensure URL is absolute
        if (!finalUrl.startsWith('http://') && !finalUrl.startsWith('https://')) {
            console.error('[API] getPdfViewUrl - ERROR: URL is still not absolute!', finalUrl);
            // Force construct from base URL
            finalUrl = `${baseUrl}/api/papers/${paperId}/pdf-proxy`;
            console.log('[API] getPdfViewUrl - forced construction:', finalUrl);
        }
        
        console.log('[API] getPdfViewUrl - returning final URL:', finalUrl);
        return finalUrl;
    } catch (error) {
        console.error('Get PDF view URL error:', error);
        throw error;
    }
}

/**
 * Performs batch operations.
 * @param {Array} operations - Array of operations { type, id, data }.
 * @returns {Promise<Array>} Promise resolving to results array.
 */
export async function batchOperations(operations) {
    try {
        const response = await apiRequest(`${API_BASE}/batch`, {
            method: 'POST',
            body: JSON.stringify({ operations })
        });

        const result = await parseJsonResponse(response);

        if (result.success && result.data) {
            return result.data.results;
        }

        throw new Error('Invalid response from server');
    } catch (error) {
        console.error('Batch operations error:', error);
        throw error;
    }
}

