/**
 * arXiv API Service
 * Handles fetching metadata from arXiv API
 */

/**
 * Fetches metadata for a given arXiv ID.
 * @param {string} arxivId - The arXiv ID to fetch (e.g., "2310.00123").
 * @param {Object} options - Fetch options.
 * @param {number} options.timeout - Timeout in ms (default: 10000).
 * @returns {Promise<Object>} A promise that resolves with the structured paper data.
 */
export const fetchArxivMetadata = async (arxivId, options = {}) => {
    const { timeout = 10000 } = options;

    // Validate arXiv ID format
    // Pattern for arXiv ID (e.g., 1234.5678 or 1234.5678v1)
    const arxivPattern = /^\d{4}\.\d{4,5}(?:v\d+)?$/;
    if (!arxivPattern.test(arxivId)) {
        throw new Error(`Invalid arXiv ID format: "${arxivId}". Expected format like "2310.00123"`);
    }

    try {
        // Create abort controller for timeout
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeout);

        let response;
        try {
            // Use HTTPS for arXiv API
            response = await fetch(`https://export.arxiv.org/api/query?id_list=${arxivId}`, {
                signal: controller.signal
            });
        } catch (fetchError) {
            clearTimeout(timeoutId);
            
            if (fetchError.name === 'AbortError') {
                throw new Error('Request timed out: arXiv service took too long to respond.');
            }
            
            if (!navigator.onLine) {
                throw new Error('No internet connection: Please check your network.');
            }
            
            throw new Error('Network error: Unable to reach arXiv service.');
        }

        clearTimeout(timeoutId);

        if (!response.ok) {
            throw new Error(`arXiv service error (${response.status}): Unable to fetch metadata.`);
        }

        const xmlText = await response.text();
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(xmlText, "text/xml");

        // Check for entry
        const entry = xmlDoc.querySelector('entry');
        if (!entry) {
            // API returns a feed even if ID is not found, but empty entries or error?
            // Usually it returns a feed with no entries if ID is invalid/not found
            throw new Error(`arXiv ID not found: "${arxivId}"`);
        }

        // Extract fields
        const title = entry.querySelector('title')?.textContent?.trim() || 'Untitled Paper';
        const summary = entry.querySelector('summary')?.textContent?.trim() || '';
        const published = entry.querySelector('published')?.textContent?.trim();
        
        // Extract authors
        const authorElements = entry.querySelectorAll('author name');
        const authors = Array.from(authorElements).map(el => el.textContent.trim());

        // Extract PDF link
        const pdfLink = entry.querySelector('link[title="pdf"]')?.getAttribute('href');
        
        // Extract DOI if available (sometimes arXiv records have DOI)
        const doiLink = entry.querySelector('link[title="doi"]')?.getAttribute('href');
        let doi = null;
        if (doiLink) {
            // Extract just the DOI part if it's a URL
            const doiMatch = doiLink.match(/10\.\d{4,}[\w\-.;()\/:]+/);
            if (doiMatch) {
                doi = doiMatch[0];
            }
        }
        
        // If no DOI found in metadata, use a pseudo-DOI or just null?
        // The plan says: Map arXiv metadata to our schema (Journal -> "arXiv", DOI -> null or "10.48550/arXiv.{id}")
        // 10.48550 is the arXiv DOI prefix
        if (!doi) {
            doi = `10.48550/arXiv.${arxivId}`;
        }

        // Parse year
        let year = null;
        if (published) {
            const date = new Date(published);
            if (!isNaN(date.getFullYear())) {
                year = date.getFullYear();
            }
        }

        return {
            title: title.replace(/\s+/g, ' '), // Normalize whitespace
            authors: authors.length > 0 ? authors : ['Unknown Author'],
            journal: 'arXiv',
            year: year,
            doi: doi,
            url: `https://arxiv.org/abs/${arxivId}`,
            pdfUrl: pdfLink || `https://arxiv.org/pdf/${arxivId}.pdf`,
            notes: summary ? `<h3>Abstract</h3><p>${summary}</p>` : ''
        };

    } catch (error) {
        console.error('Error fetching arXiv metadata:', error);
        throw error;
    }
};

