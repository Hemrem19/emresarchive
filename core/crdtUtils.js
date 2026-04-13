/**
 * CRDT Utilities
 * Provides helper functions for Yjs synchronization operations, 
 * including deterministic hashing for collision-free identifiers.
 */

/**
 * Generates a deterministic string identifier for a paper based on its DOI or metadata.
 * This ensures that if the same paper is added offline on two different devices,
 * they map to the exact same Y.Map key in the CRDT layer, preventing duplication.
 * 
 * @param {Object} paperData 
 * @returns {Promise<string>} Deterministic Hex String
 */
export async function generateDeterministicPaperId(paperData) {
    let sourceString = '';

    if (paperData.doi) {
        // Strip out protocols/prefixes just in case
        sourceString = paperData.doi.replace(/^(https?:\/\/)?(dx\.)?doi\.org\//i, '').trim().toLowerCase();
    } else {
        // Fallback to title and authors
        const title = (paperData.title || '').toLowerCase().trim().replace(/[^a-z0-9]/g, '');
        
        let authors = '';
        if (Array.isArray(paperData.authors)) {
            authors = paperData.authors.map(a => 
                (typeof a === 'string' ? a : (a.name || ''))
                    .toLowerCase()
                    .trim()
                    .replace(/[^a-z0-9]/g, '')
            ).join('');
        } else if (typeof paperData.authors === 'string') {
            authors = paperData.authors.toLowerCase().trim().replace(/[^a-z0-9]/g, '');
        }

        const year = paperData.year || '';
        
        sourceString = `${title}-${authors}-${year}`;
    }

    if (!sourceString || sourceString === '--') {
        // Random fallback if missing literally everything
        return crypto.randomUUID();
    }

    // Hash using SHA-256 via Web Crypto API natively
    const encoder = new TextEncoder();
    const data = encoder.encode(sourceString);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    
    // Convert to hex
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    
    // Prefix to identify it specifically as a paper key
    return `paper_${hashHex.substring(0, 32)}`;
}
