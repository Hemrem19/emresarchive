import { fetchArxivMetadata } from './api/arxiv.js';

/**
 * Normalizes input to extract DOI from various URL formats.
 * Supports:
 * - Direct DOI: "10.1234/example"
 * - doi.org URLs: "https://doi.org/10.1234/example"
 * - Publisher URLs: "https://publisher.com/article/doi/10.1234/example"
 * - arXiv URLs: "https://arxiv.org/abs/2310.00123" or IDs "2310.00123"
 * 
 * @param {string} input - DOI, URL, or identifier string.
 * @returns {Object} Object with { type: 'doi'|'arxiv'|'unsupported', value: string, original: string }
 */
export const normalizePaperIdentifier = (input) => {
    if (!input || typeof input !== 'string') {
        return { type: 'unsupported', value: null, original: input, error: 'Input must be a non-empty string' };
    }

    const trimmed = input.trim();
    if (!trimmed) {
        return { type: 'unsupported', value: null, original: input, error: 'Input cannot be empty' };
    }

    // Pattern for DOI (10.xxxx/yyyy)
    const doiPattern = /(10\.\d{4,}[\w\-.;()\/:]+)/i;
    
    // Pattern for arXiv ID (e.g., 1234.5678 or 1234.5678v1)
    const arxivPattern = /arxiv\.org\/(?:abs|pdf|html)\/(\d{4}\.\d{4,5}(?:v\d+)?)/i;
    const arxivIdPattern = /^(\d{4}\.\d{4,5}(?:v\d+)?)$/;
    
    // Check for plain arXiv ID first
    if (arxivIdPattern.test(trimmed)) {
        return { type: 'arxiv', value: trimmed, original: trimmed };
    }

    // Check if it's already a plain DOI
    if (doiPattern.test(trimmed) && !trimmed.includes('http') && !trimmed.includes('arxiv')) {
        const match = trimmed.match(doiPattern);
        if (match) {
            return { type: 'doi', value: match[1], original: trimmed };
        }
    }

    // Extract DOI from doi.org URLs
    const doiOrgMatch = trimmed.match(/doi\.org\/(10\.\d{4,}[\w\-.;()\/:]+)/i);
    if (doiOrgMatch) {
        return { type: 'doi', value: doiOrgMatch[1], original: trimmed };
    }

    // Extract DOI from publisher URLs (look for DOI pattern anywhere in URL)
    const doiInUrlMatch = trimmed.match(doiPattern);
    if (doiInUrlMatch && !trimmed.includes('arxiv')) {
        return { type: 'doi', value: doiInUrlMatch[1], original: trimmed };
    }

    // Extract arXiv ID from URL
    const arxivMatch = trimmed.match(arxivPattern);
    if (arxivMatch) {
        return { 
            type: 'arxiv', 
            value: arxivMatch[1], 
            original: trimmed
        };
    }

    // If it looks like a URL but we didn't match anything useful
    if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
        return { 
            type: 'unsupported', 
            value: null, 
            original: trimmed,
            error: 'Unsupported URL format. Please provide a DOI (e.g., 10.1234/example), an arXiv ID, or a supported URL.'
        };
    }

    // Final attempt: treat as plain DOI if it matches DOI pattern
    if (doiPattern.test(trimmed)) {
        const match = trimmed.match(doiPattern);
        if (match) {
            return { type: 'doi', value: match[1], original: trimmed };
        }
    }

    return { 
        type: 'unsupported', 
        value: null, 
        original: trimmed,
        error: 'Could not detect a DOI or supported identifier. Please enter a DOI, arXiv ID, or valid URL.'
    };
};

/**
 * Fetches metadata for a given DOI or arXiv ID.
 * @param {string} identifier - The DOI or arXiv ID to fetch.
 * @param {Object} options - Fetch options.
 * @param {number} options.timeout - Timeout in ms (default: 10000).
 * @returns {Promise<Object>} A promise that resolves with the structured paper data.
 * @throws {Error} Throws descriptive errors for various failure scenarios.
 */
export const fetchDoiMetadata = async (identifier, options = {}) => {
    const { timeout = 10000 } = options;

    // Normalize input (handles URLs, plain DOI, arXiv, etc.)
    const normalized = normalizePaperIdentifier(identifier);
    
    if (normalized.type === 'arxiv') {
        return await fetchArxivMetadata(normalized.value, options);
    }
    
    if (normalized.type === 'unsupported') {
        throw new Error(normalized.error || 'Could not detect a valid identifier.');
    }

    if (normalized.type !== 'doi' || !normalized.value) {
        throw new Error('Invalid identifier: Could not extract a valid DOI or arXiv ID.');
    }

    const cleanDoi = normalized.value;

    // Basic DOI format validation (10.xxxx/yyyy pattern)
    const doiPattern = /^10\.\d{4,}[\w\-.;()\/:]+$/i;
    if (!doiPattern.test(cleanDoi)) {
        throw new Error('Invalid DOI format: Expected format like "10.1234/example"');
    }

    try {
        // Create abort controller for timeout
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeout);

        let response;
        try {
            response = await fetch(`https://doi.org/${cleanDoi}`, {
                headers: { 'Accept': 'application/vnd.citationstyles.csl+json' },
                signal: controller.signal
            });
        } catch (fetchError) {
            clearTimeout(timeoutId);
            
            // Handle specific fetch errors
            if (fetchError.name === 'AbortError') {
                throw new Error('Request timed out: DOI service took too long to respond. Please try again.');
            }
            
            if (!navigator.onLine) {
                throw new Error('No internet connection: Please check your network and try again.');
            }
            
            throw new Error('Network error: Unable to reach DOI service. Please check your connection and try again.');
        }

        clearTimeout(timeoutId);

        // Handle HTTP error responses
        if (!response.ok) {
            switch (response.status) {
                case 404:
                    throw new Error(`DOI not found: "${cleanDoi}" does not exist or is not registered. Please verify the DOI.`);
                case 400:
                    throw new Error('Invalid DOI format: The DOI service rejected this DOI. Please check the format.');
                case 429:
                    throw new Error('Rate limit exceeded: Too many requests. Please wait a moment and try again.');
                case 500:
                case 502:
                case 503:
                    throw new Error('DOI service error: The DOI service is temporarily unavailable. Please try again later.');
                default:
                    throw new Error(`DOI service error (${response.status}): Unable to fetch metadata. Please try again.`);
            }
        }

        // Parse JSON response
        let data;
        try {
            data = await response.json();
        } catch (parseError) {
            throw new Error('Invalid response: DOI service returned invalid data. Please try again.');
        }

        // Validate response data
        if (!data || typeof data !== 'object') {
            throw new Error('Invalid response: DOI service returned unexpected data format.');
        }

        // Extract authors with error handling
        let authors = [];
        try {
            if (data.author && Array.isArray(data.author) && data.author.length > 0) {
                authors = data.author.map(a => {
                    if (typeof a === 'object') {
                        return `${a.given || ''} ${a.family || ''}`.trim();
                    }
                    return String(a).trim();
                }).filter(name => name); // Remove empty names
            }
        } catch (authorError) {
            console.warn('Error parsing authors:', authorError);
            // Continue with empty authors array
        }

        // Extract year with error handling
        let year = null;
        try {
            if (data.issued && data.issued['date-parts'] && Array.isArray(data.issued['date-parts'][0])) {
                const yearValue = data.issued['date-parts'][0][0];
                if (yearValue) {
                    year = parseInt(yearValue, 10);
                    // Validate year is reasonable (between 1000 and current year + 5)
                    const currentYear = new Date().getFullYear();
                    if (isNaN(year) || year < 1000 || year > currentYear + 5) {
                        console.warn(`Invalid year value: ${year}`);
                        year = null;
                    }
                }
            }
        } catch (yearError) {
            console.warn('Error parsing year:', yearError);
            // Continue with null year
        }

        // Return structured data with defaults for missing fields
        return {
            title: data.title || 'Untitled Paper',
            authors: authors.length > 0 ? authors : ['Unknown Author'],
            journal: data['container-title'] || '',
            year: year,
            doi: data.DOI || cleanDoi,
        };

    } catch (error) {
        // Re-throw our custom errors, wrap unexpected errors
        if (error.message.includes('DOI') || 
            error.message.includes('Network') || 
            error.message.includes('Request') ||
            error.message.includes('Rate limit') ||
            error.message.includes('Invalid')) {
            throw error;
        }
        
        // Unexpected error - provide generic message
        console.error('Unexpected error fetching DOI:', error);
        throw new Error(`Unexpected error: ${error.message || 'Failed to fetch DOI metadata'}. Please try again.`);
    }
};