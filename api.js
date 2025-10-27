/**
 * Fetches metadata for a given DOI with comprehensive error handling.
 * @param {string} doi - The DOI to fetch.
 * @param {Object} options - Fetch options.
 * @param {number} options.timeout - Timeout in ms (default: 10000).
 * @returns {Promise<Object>} A promise that resolves with the structured paper data.
 * @throws {Error} Throws descriptive errors for various failure scenarios.
 */
export const fetchDoiMetadata = async (doi, options = {}) => {
    const { timeout = 10000 } = options;

    // Validate DOI format
    if (!doi || typeof doi !== 'string') {
        throw new Error('Invalid DOI: DOI must be a non-empty string');
    }

    const cleanDoi = doi.trim();
    if (!cleanDoi) {
        throw new Error('Invalid DOI: DOI cannot be empty');
    }

    // Basic DOI format validation (10.xxxx/yyyy pattern)
    const doiPattern = /^10\.\d{4,}[\w\-.;()\/:]+$/i;
    if (!doiPattern.test(cleanDoi.replace(/^(https?:\/\/)?(dx\.)?doi\.org\//, ''))) {
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