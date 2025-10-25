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
 * Generates a citation string for a given paper in a specified format.
 * @param {object} paper - The paper object.
 * @param {string} format - The citation format ('apa' or 'ieee').
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
        default:
            return 'Unsupported citation format.';
    }
};