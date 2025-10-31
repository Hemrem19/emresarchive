/**
 * RIS Format Parser
 * 
 * Parses RIS (Research Information Systems) format files exported from
 * Zotero, Mendeley, and other reference management tools.
 * 
 * RIS Format Specification:
 * - Each field starts with a 2-letter tag
 * - Fields are on separate lines
 * - Each reference ends with "ER  -"
 * - Line format: "TAG  - Value"
 */

/**
 * Parses a RIS format string and returns an array of paper objects.
 * @param {string} risContent - The RIS file content as a string.
 * @returns {Promise<Array>} Array of paper objects ready for import.
 */
export function parseRIS(risContent) {
    if (!risContent || typeof risContent !== 'string') {
        throw new Error('Invalid RIS content: Content must be a non-empty string.');
    }

    const lines = risContent.split(/\r?\n/);
    const references = [];
    let currentRef = null;

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        
        // Skip empty lines
        if (!line) continue;

        // Check if line matches RIS format (TAG  - value)
        const match = line.match(/^([A-Z0-9]{2})\s{2}-\s(.+)$/);
        
        if (!match) {
            continue;
        }

        const [, tag, value] = match;

        // End of reference marker
        if (tag === 'ER') {
            if (currentRef) {
                references.push(normalizeRISReference(currentRef));
                currentRef = null;
            }
            continue;
        }

        // Start new reference
        if (tag === 'TY') {
            if (currentRef) {
                references.push(normalizeRISReference(currentRef));
            }
            currentRef = { type: value.trim() };
        } else {
            // Process field
            processRISField(tag, value, currentRef);
        }
    }

    // Add last reference if exists
    if (currentRef) {
        references.push(normalizeRISReference(currentRef));
    }

    return references;
}

/**
 * Processes a RIS field and adds it to the current reference object.
 * @param {string} tag - RIS field tag (e.g., "TI", "AU", "PY")
 * @param {string} value - Field value
 * @param {Object} ref - Current reference object being built
 */
function processRISField(tag, value, ref) {
    if (!ref || !tag || !value) return;

    const trimmedValue = value.trim();
    if (!trimmedValue) return;

    // Handle multi-value fields (authors, keywords)
    if (tag === 'AU' || tag === 'A1' || tag === 'A2' || tag === 'A3' || tag === 'A4') {
        // Author field
        if (!ref.authors) ref.authors = [];
        ref.authors.push(trimmedValue);
    } else if (tag === 'KW' || tag === 'K1' || tag === 'K2' || tag === 'K3' || tag === 'K4') {
        // Keyword/Tag field
        if (!ref.keywords) ref.keywords = [];
        // Keywords might be comma-separated
        const keywords = trimmedValue.split(',').map(k => k.trim()).filter(k => k);
        ref.keywords.push(...keywords);
    } else if (tag === 'N1' || tag === 'N2') {
        // Notes field (can appear multiple times)
        if (!ref.notes) ref.notes = [];
        ref.notes.push(trimmedValue);
    } else if (tag === 'UR' || tag === 'L1' || tag === 'L2' || tag === 'L3' || tag === 'L4') {
        // URL field (can appear multiple times - take first)
        if (!ref.url) {
            ref.url = trimmedValue;
        }
    } else {
        // Single-value fields
        const tagLower = tag.toLowerCase();
        if (tag === 'AB') {
            // Abstract can be multiline - append
            if (ref.ab) {
                ref.ab = ref.ab + ' ' + trimmedValue;
            } else {
                ref.ab = trimmedValue;
            }
        } else if (!ref[tagLower]) {
            // Store only if not already set (some fields may repeat)
            ref[tagLower] = trimmedValue;
        }
    }
}

/**
 * Normalizes a RIS reference object into our paper structure.
 * @param {Object} risRef - RIS reference object
 * @returns {Object} Normalized paper object
 */
function normalizeRISReference(risRef) {
    const paper = {
        title: '',
        authors: [],
        year: null,
        journal: '',
        doi: '',
        tags: [],
        notes: '',
        readingStatus: 'To Read' // Default status
    };

    // Title
    paper.title = risRef.ti || risRef.title || 'Untitled';

    // Authors
    if (risRef.authors && Array.isArray(risRef.authors) && risRef.authors.length > 0) {
        paper.authors = risRef.authors;
    } else if (risRef.au) {
        paper.authors = [risRef.au];
    } else {
        paper.authors = [];
    }

    // Year
    if (risRef.py || risRef.y1) {
        const yearStr = (risRef.py || risRef.y1).trim();
        const yearMatch = yearStr.match(/\d{4}/);
        if (yearMatch) {
            paper.year = parseInt(yearMatch[0], 10);
        }
    }

    // Journal/Publication
    paper.journal = risRef.jo || risRef.j1 || risRef.j2 || risRef.t2 || risRef.bt || '';

    // DOI
    if (risRef.do) {
        // Extract DOI (might be in format "10.1234/example" or "https://doi.org/10.1234/example")
        let doi = risRef.do.trim();
        doi = doi.replace(/^(https?:\/\/)?(dx\.)?doi\.org\//i, '');
        paper.doi = doi;
    } else if (risRef.url) {
        // Try to extract DOI from URL
        const doiMatch = risRef.url.match(/doi\.org\/(10\.\d+\/[^\s]+)/i);
        if (doiMatch) {
            paper.doi = doiMatch[1];
        } else {
            // Store URL if no DOI found
            paper.doi = risRef.url;
        }
    }

    // Tags/Keywords
    if (risRef.keywords && Array.isArray(risRef.keywords)) {
        paper.tags = [...new Set(risRef.keywords)]; // Remove duplicates
    } else if (risRef.kw) {
        const keywords = risRef.kw.split(',').map(k => k.trim()).filter(k => k);
        paper.tags = [...new Set(keywords)];
    }

    // Notes
    if (risRef.notes && Array.isArray(risRef.notes)) {
        paper.notes = risRef.notes.join('\n\n');
    } else if (risRef.n1 || risRef.n2) {
        const notesArray = [];
        if (risRef.n1) notesArray.push(risRef.n1);
        if (risRef.n2) notesArray.push(risRef.n2);
        paper.notes = notesArray.join('\n\n');
    } else if (risRef.ab) {
        // Use abstract as notes if no notes field
        paper.notes = risRef.ab.trim();
    }

    // Abstract (if we want to preserve it separately, we can add an abstract field later)
    // For now, if no notes, we store abstract in notes

    return paper;
}

/**
 * Common RIS Field Mappings:
 * 
 * TY  - Type (JOUR, BOOK, etc.)
 * TI  - Title
 * AU  - Author (can repeat)
 * A1  - Primary Author
 * A2  - Secondary Author
 * PY  - Publication Year
 * Y1  - Primary Date
 * JO  - Journal
 * J1  - Journal (alternate)
 * J2  - Journal (alternate)
 * T2  - Secondary Title
 * BT  - Book Title
 * DO  - DOI
 * UR  - URL
 * L1  - File Attachments / URLs
 * L2  - Related URLs
 * KW  - Keywords (can repeat)
 * N1  - Notes
 * N2  - Abstract (often stored here)
 * AB  - Abstract
 * PB  - Publisher
 * VL  - Volume
 * IS  - Issue
 * SP  - Start Page
 * EP  - End Page
 * SN  - ISBN/ISSN
 * ER  - End of Reference
 */

