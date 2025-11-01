/**
 * Formats author names for APA style.
 * Example: ["John Doe", "Jane A. Smith"] -> "Doe, J., & Smith, J. A."
 * This is a simplified implementation.
 * @param {string[]} authors - Array of author full names.
 * @returns {string} Formatted author string.
 */
const formatAuthorsAPA = (authors) => {
    if (!authors || authors.length === 0) return '';

    const formatted = authors.map(name => {
        const parts = name.trim().split(' ');
        const lastName = parts.pop();
        const initials = parts.map(part => `${part.charAt(0)}.`).join('');
        return `${lastName}, ${initials}`;
    });

    if (formatted.length === 1) return formatted[0];
    if (formatted.length === 2) return `${formatted[0]} & ${formatted[1]}`;
    // For more than 2 authors, APA 7th ed. lists all up to 20.
    // This simplified version will join with commas and an ampersand at the end.
    return `${formatted.slice(0, -1).join(', ')}, & ${formatted.slice(-1)}`;
};

/**
 * Formats author names for IEEE style.
 * Example: ["John Doe", "Jane A. Smith"] -> "J. Doe and J. A. Smith"
 * @param {string[]} authors - Array of author full names.
 * @returns {string} Formatted author string.
 */
const formatAuthorsIEEE = (authors) => {
    if (!authors || authors.length === 0) return '';

    const formatted = authors.map(name => {
        const parts = name.trim().split(' ');
        const lastName = parts.pop();
        const initials = parts.map(part => `${part.charAt(0)}.`).join(' ');
        return `${initials} ${lastName}`;
    });

    if (formatted.length === 1) return formatted[0];
    if (formatted.length === 2) return formatted.join(' and ');
    
    // For 3 or more authors, use a comma before 'and'
    return `${formatted.slice(0, -1).join(', ')}, and ${formatted.slice(-1)}`;
};

/**
 * Formats author names for MLA style.
 * Example: ["John Doe", "Jane A. Smith"] -> "Doe, John, and Jane A. Smith"
 * @param {string[]} authors - Array of author full names.
 * @returns {string} Formatted author string.
 */
const formatAuthorsMLA = (authors) => {
    if (!authors || authors.length === 0) return '';

    const formatted = authors.map(name => {
        const parts = name.trim().split(' ');
        const lastName = parts.pop();
        const firstName = parts.join(' ');
        return `${lastName}, ${firstName || ''}`;
    });

    if (formatted.length === 1) return formatted[0];
    if (formatted.length === 2) return `${formatted[0]}, and ${formatted[1]}`;
    
    // For 3+ authors, MLA: "First, Second, and Last"
    return `${formatted.slice(0, -1).join(', ')}, and ${formatted.slice(-1)}`;
};

/**
 * Formats author names for Chicago style.
 * Example: ["John Doe", "Jane A. Smith"] -> "Doe, John, and Jane A. Smith"
 * @param {string[]} authors - Array of author full names.
 * @returns {string} Formatted author string.
 */
const formatAuthorsChicago = (authors) => {
    if (!authors || authors.length === 0) return '';

    const formatted = authors.map(name => {
        const parts = name.trim().split(' ');
        const lastName = parts.pop();
        const firstName = parts.join(' ');
        return `${lastName}, ${firstName || ''}`;
    });

    if (formatted.length === 1) return formatted[0];
    if (formatted.length === 2) return `${formatted[0]} and ${formatted[1]}`;
    
    // For 3+ authors, Chicago: "First, Second, and Last"
    return `${formatted.slice(0, -1).join(', ')}, and ${formatted.slice(-1)}`;
};

/**
 * Formats author names for Harvard style.
 * Example: ["John Doe", "Jane A. Smith"] -> "Doe, J. and Smith, J.A."
 * @param {string[]} authors - Array of author full names.
 * @returns {string} Formatted author string.
 */
const formatAuthorsHarvard = (authors) => {
    if (!authors || authors.length === 0) return '';

    const formatted = authors.map(name => {
        const parts = name.trim().split(' ');
        const lastName = parts.pop();
        const initials = parts.map(part => `${part.charAt(0)}.`).join('');
        return `${lastName}, ${initials}`;
    });

    if (formatted.length === 1) return formatted[0];
    if (formatted.length === 2) return `${formatted[0]} & ${formatted[1]}`;
    
    // For 3+ authors, Harvard: "First, Second & Last"
    return `${formatted.slice(0, -1).join(', ')}, & ${formatted.slice(-1)}`;
};

/**
 * Formats author names for Vancouver style.
 * Example: ["John Doe", "Jane A. Smith"] -> "Doe J, Smith JA"
 * @param {string[]} authors - Array of author full names.
 * @returns {string} Formatted author string.
 */
const formatAuthorsVancouver = (authors) => {
    if (!authors || authors.length === 0) return '';

    const formatted = authors.map(name => {
        const parts = name.trim().split(' ');
        const lastName = parts.pop();
        const initials = parts.map(part => part.charAt(0).toUpperCase()).join('');
        return `${lastName} ${initials}`;
    });

    // Vancouver separates with comma and space
    return formatted.join(', ');
};

/**
 * Generates a citation string for a given paper in a specified format.
 * @param {object} paper - The paper object.
 * @param {string} format - The citation format ('apa', 'ieee', 'mla', 'chicago', 'harvard', 'vancouver').
 * @returns {string} The formatted citation string.
 */
export const generateCitation = (paper, format) => {
    if (!paper) return '';

    switch (format) {
        case 'apa': {
            const authorStr = formatAuthorsAPA(paper.authors);
            const yearStr = paper.year ? `(${paper.year})` : '(n.d.).';
            const titleStr = paper.title ? `${paper.title}.` : '';
            const journalStr = paper.journal ? `<em>${paper.journal}</em>,` : '';
            const doiStr = paper.doi ? ` https://doi.org/${paper.doi}` : '';
            return `${authorStr} ${yearStr} ${titleStr} ${journalStr}${doiStr}`.replace(/\s+/g, ' ').trim();
        }
        case 'ieee': {
            const authorStr = formatAuthorsIEEE(paper.authors);
            const titleStr = paper.title ? `"${paper.title},"` : '';
            const journalStr = paper.journal ? `<em>${paper.journal}</em>,` : '';
            const yearStr = paper.year ? ` ${paper.year},` : '';
            const doiStr = paper.doi ? ` doi: ${paper.doi}.` : '';
            return `${authorStr}, ${titleStr} ${journalStr}${yearStr}${doiStr}`.replace(/\s+/g, ' ').trim();
        }
        case 'mla': {
            const authorStr = formatAuthorsMLA(paper.authors);
            const titleStr = paper.title ? `"${paper.title}."` : '';
            const journalStr = paper.journal ? `<em>${paper.journal}</em>,` : '';
            const yearStr = paper.year ? ` ${paper.year},` : '';
            const doiStr = paper.doi ? ` https://doi.org/${paper.doi}.` : '';
            return `${authorStr} ${titleStr} ${journalStr}${yearStr}${doiStr}`.replace(/\s+/g, ' ').trim();
        }
        case 'chicago': {
            const authorStr = formatAuthorsChicago(paper.authors);
            const titleStr = paper.title ? `"${paper.title}."` : '';
            const journalStr = paper.journal ? `<em>${paper.journal}</em>` : '';
            const yearStr = paper.year ? ` (${paper.year}):` : '';
            const doiStr = paper.doi ? ` https://doi.org/${paper.doi}.` : '';
            return `${authorStr} ${titleStr} ${journalStr}${yearStr}${doiStr}`.replace(/\s+/g, ' ').trim();
        }
        case 'harvard': {
            const authorStr = formatAuthorsHarvard(paper.authors);
            const yearStr = paper.year ? `${paper.year},` : 'n.d.,';
            const titleStr = paper.title ? `'${paper.title}',` : '';
            const journalStr = paper.journal ? `<em>${paper.journal}</em>` : '';
            const doiStr = paper.doi ? ` doi: ${paper.doi}.` : '';
            return `${authorStr} ${yearStr} ${titleStr} ${journalStr}${doiStr}`.replace(/\s+/g, ' ').trim();
        }
        case 'vancouver': {
            const authorStr = formatAuthorsVancouver(paper.authors);
            const titleStr = paper.title ? `${paper.title}.` : '';
            const journalStr = paper.journal ? `${paper.journal}.` : '';
            const yearStr = paper.year ? ` ${paper.year};` : '';
            const doiStr = paper.doi ? ` doi: ${paper.doi}.` : '';
            return `${authorStr}. ${titleStr} ${journalStr}${yearStr}${doiStr}`.replace(/\s+/g, ' ').trim();
        }
        default:
            return 'Unsupported citation format.';
    }
};

/**
 * Generates a bibliography (references list) from multiple papers.
 * @param {object[]} papers - Array of paper objects.
 * @param {string} format - The citation format ('apa', 'ieee', 'mla', 'chicago', 'harvard', 'vancouver').
 * @param {string} style - Bibliography style: 'numbered' (1., 2., 3.) or 'alphabetical' (A, B, C).
 * @returns {string} The formatted bibliography string.
 */
export const generateBibliography = (papers, format, style = 'numbered') => {
    if (!papers || papers.length === 0) return '';

    // Always sort papers alphabetically by first author's last name
    let sortedPapers = [...papers];
    sortedPapers.sort((a, b) => {
        // Get first author's last name for sorting
        const getFirstAuthorLastName = (paper) => {
            if (!paper.authors || paper.authors.length === 0) {
                // Fall back to title if no authors
                return paper.title ? paper.title.toLowerCase() : '';
            }
            const firstAuthor = paper.authors[0].trim();
            const parts = firstAuthor.split(' ');
            return parts.length > 0 ? parts[parts.length - 1].toLowerCase() : firstAuthor.toLowerCase();
        };
        const lastNameA = getFirstAuthorLastName(a);
        const lastNameB = getFirstAuthorLastName(b);
        // Compare by last name, then by title if last names are equal
        const lastNameCompare = lastNameA.localeCompare(lastNameB);
        if (lastNameCompare !== 0) return lastNameCompare;
        // If last names are the same, sort by title
        const titleA = (a.title || '').toLowerCase();
        const titleB = (b.title || '').toLowerCase();
        return titleA.localeCompare(titleB);
    });

    // Generate citations for all papers (already sorted alphabetically)
    const citations = sortedPapers.map(paper => generateCitation(paper, format));

    // Format with numbers or alphabetical markers
    if (style === 'numbered') {
        return citations.map((citation, index) => {
            // Remove HTML tags for plain text numbering
            const plainText = citation.replace(/<[^>]*>/g, '');
            return `${index + 1}. ${plainText}`;
        }).join('\n\n');
    } else {
        // Alphabetical: A, B, C...
        return citations.map((citation, index) => {
            const letter = String.fromCharCode(65 + (index % 26)); // A-Z, then AA-ZZ
            const plainText = citation.replace(/<[^>]*>/g, '');
            return `${letter}. ${plainText}`;
        }).join('\n\n');
    }
};

/**
 * Exports bibliography to a text file.
 * @param {string} bibliography - The formatted bibliography text.
 * @param {string} format - The citation format used (for filename).
 */
export const exportBibliographyToFile = (bibliography, format) => {
    const blob = new Blob([bibliography], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `bibliography-${format}-${new Date().toISOString().split('T')[0]}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
};

/**
 * Copies bibliography to clipboard.
 * @param {string} bibliography - The formatted bibliography text.
 * @returns {Promise<boolean>} True if successful, false otherwise.
 */
export const copyBibliographyToClipboard = async (bibliography) => {
    try {
        // Remove HTML tags for clipboard (plain text)
        const plainText = bibliography.replace(/<[^>]*>/g, '');
        await navigator.clipboard.writeText(plainText);
        return true;
    } catch (error) {
        console.error('Failed to copy to clipboard:', error);
        return false;
    }
};