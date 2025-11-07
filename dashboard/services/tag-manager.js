/**
 * Tag Manager Service
 * Centralized tag management with validation and sanitization
 */

/**
 * Tag validation rules
 */
const TAG_RULES = {
    MIN_LENGTH: 1,
    MAX_LENGTH: 50,
    MAX_TAGS_PER_PAPER: 20,
    ALLOWED_PATTERN: /^[a-zA-Z0-9\s\-_]+$/,
    RESERVED_TAGS: ['all', 'none', 'undefined', 'null']
};

/**
 * Parses and sanitizes tag input
 * @param {string|Array} input - Comma-separated string or array of tags
 * @returns {Array<string>} Array of sanitized, unique, valid tags
 */
export function parseTags(input) {
    if (!input) return [];
    
    // Handle array input
    if (Array.isArray(input)) {
        return input
            .map(tag => sanitizeTag(tag))
            .filter(tag => tag && isValidTag(tag).valid)
            .filter((tag, index, self) => self.indexOf(tag) === index); // Remove duplicates
    }
    
    // Handle string input
    if (typeof input !== 'string') return [];
    
    return input
        .split(',')
        .map(tag => sanitizeTag(tag))
        .filter(tag => tag && isValidTag(tag).valid)
        .filter((tag, index, self) => self.indexOf(tag) === index); // Remove duplicates
}

/**
 * Sanitizes a single tag
 * @param {string} tag - Tag to sanitize
 * @returns {string} Sanitized tag
 */
export function sanitizeTag(tag) {
    if (typeof tag !== 'string') return '';
    
    return tag
        .trim()
        .toLowerCase()
        .replace(/\s+/g, '-') // Replace spaces with hyphens
        .replace(/[^\w\s\-]/g, '') // Remove special characters except hyphens
        .substring(0, TAG_RULES.MAX_LENGTH); // Enforce max length
}

/**
 * Validates a single tag
 * @param {string} tag - Tag to validate
 * @returns {Object} Validation result with valid flag and error message
 */
export function isValidTag(tag) {
    if (!tag || typeof tag !== 'string') {
        return { valid: false, error: 'Tag must be a non-empty string' };
    }
    
    if (tag.length < TAG_RULES.MIN_LENGTH) {
        return { valid: false, error: `Tag must be at least ${TAG_RULES.MIN_LENGTH} character` };
    }
    
    if (tag.length > TAG_RULES.MAX_LENGTH) {
        return { valid: false, error: `Tag must not exceed ${TAG_RULES.MAX_LENGTH} characters` };
    }
    
    if (!TAG_RULES.ALLOWED_PATTERN.test(tag)) {
        return { valid: false, error: 'Tag contains invalid characters' };
    }
    
    if (TAG_RULES.RESERVED_TAGS.includes(tag.toLowerCase())) {
        return { valid: false, error: 'Tag name is reserved' };
    }
    
    return { valid: true };
}

/**
 * Validates an array of tags
 * @param {Array<string>} tags - Tags to validate
 * @returns {Object} Validation result with valid flag, errors array, and valid tags
 */
export function validateTags(tags) {
    if (!Array.isArray(tags)) {
        return { valid: false, errors: ['Tags must be an array'], validTags: [] };
    }
    
    if (tags.length > TAG_RULES.MAX_TAGS_PER_PAPER) {
        return { 
            valid: false, 
            errors: [`Maximum ${TAG_RULES.MAX_TAGS_PER_PAPER} tags allowed per paper`],
            validTags: tags.slice(0, TAG_RULES.MAX_TAGS_PER_PAPER)
        };
    }
    
    const errors = [];
    const validTags = [];
    
    tags.forEach((tag, index) => {
        const validation = isValidTag(tag);
        if (validation.valid) {
            validTags.push(tag);
        } else {
            errors.push(`Tag ${index + 1}: ${validation.error}`);
        }
    });
    
    return {
        valid: errors.length === 0,
        errors,
        validTags
    };
}

/**
 * Adds tags to a paper's existing tags
 * @param {Object} paper - Paper object
 * @param {Array<string>} tagsToAdd - Tags to add
 * @returns {Object} Result with updated tags and any errors
 */
export function addTagsToPaper(paper, tagsToAdd) {
    const currentTags = paper.tags || [];
    const sanitizedTags = parseTags(tagsToAdd);
    
    // Combine and deduplicate
    const combinedTags = [...new Set([...currentTags, ...sanitizedTags])];
    
    // Validate combined tags
    const validation = validateTags(combinedTags);
    
    if (!validation.valid) {
        return {
            success: false,
            tags: currentTags,
            errors: validation.errors,
            addedCount: 0
        };
    }
    
    const addedCount = validation.validTags.length - currentTags.length;
    
    return {
        success: true,
        tags: validation.validTags,
        errors: [],
        addedCount
    };
}

/**
 * Removes tags from a paper's existing tags
 * @param {Object} paper - Paper object
 * @param {Array<string>} tagsToRemove - Tags to remove
 * @returns {Object} Result with updated tags and removed count
 */
export function removeTagsFromPaper(paper, tagsToRemove) {
    const currentTags = paper.tags || [];
    const sanitizedTagsToRemove = parseTags(tagsToRemove);
    
    const updatedTags = currentTags.filter(tag => 
        !sanitizedTagsToRemove.includes(tag.toLowerCase())
    );
    
    const removedCount = currentTags.length - updatedTags.length;
    
    return {
        success: true,
        tags: updatedTags,
        removedCount
    };
}

/**
 * Replaces all tags on a paper
 * @param {Object} paper - Paper object
 * @param {Array<string>} newTags - New tags to set
 * @returns {Object} Result with updated tags and any errors
 */
export function replaceTagsOnPaper(paper, newTags) {
    const sanitizedTags = parseTags(newTags);
    const validation = validateTags(sanitizedTags);
    
    if (!validation.valid) {
        return {
            success: false,
            tags: paper.tags || [],
            errors: validation.errors
        };
    }
    
    return {
        success: true,
        tags: validation.validTags,
        errors: []
    };
}

/**
 * Gets all unique tags from a collection of papers
 * @param {Array<Object>} papers - Array of paper objects
 * @returns {Array<string>} Sorted array of unique tags
 */
export function getAllTags(papers) {
    if (!Array.isArray(papers)) return [];
    
    const tagSet = new Set();
    
    papers.forEach(paper => {
        if (paper.tags && Array.isArray(paper.tags)) {
            paper.tags.forEach(tag => tagSet.add(tag));
        }
    });
    
    return Array.from(tagSet).sort();
}

/**
 * Gets tag usage statistics
 * @param {Array<Object>} papers - Array of paper objects
 * @returns {Array<Object>} Array of {tag, count} objects sorted by count descending
 */
export function getTagStatistics(papers) {
    if (!Array.isArray(papers)) return [];
    
    const tagCounts = {};
    
    papers.forEach(paper => {
        if (paper.tags && Array.isArray(paper.tags)) {
            paper.tags.forEach(tag => {
                tagCounts[tag] = (tagCounts[tag] || 0) + 1;
            });
        }
    });
    
    return Object.entries(tagCounts)
        .map(([tag, count]) => ({ tag, count }))
        .sort((a, b) => b.count - a.count);
}

/**
 * Suggests tags based on paper title and authors
 * @param {Object} paper - Paper object
 * @param {Array<Object>} allPapers - All papers for context
 * @returns {Array<string>} Suggested tags
 */
export function suggestTags(paper, allPapers = []) {
    const suggestions = new Set();
    
    // Extract keywords from title
    if (paper.title) {
        const titleWords = paper.title
            .toLowerCase()
            .split(/\s+/)
            .filter(word => word.length > 4) // Only words longer than 4 chars
            .filter(word => !['about', 'using', 'based', 'study', 'paper'].includes(word));
        
        titleWords.slice(0, 3).forEach(word => suggestions.add(sanitizeTag(word)));
    }
    
    // Find similar papers by author
    if (paper.authors && allPapers.length > 0) {
        const authorPapers = allPapers.filter(p => 
            p.id !== paper.id && 
            p.authors && 
            p.authors.some(author => paper.authors.includes(author))
        );
        
        // Get most common tags from author's other papers
        const authorTags = getTagStatistics(authorPapers);
        authorTags.slice(0, 2).forEach(({ tag }) => suggestions.add(tag));
    }
    
    // Validate and return
    return Array.from(suggestions)
        .filter(tag => isValidTag(tag).valid)
        .slice(0, 5); // Limit to 5 suggestions
}

/**
 * Merges duplicate or similar tags
 * @param {Array<string>} tags - Tags to merge
 * @param {Object} mergeMap - Map of {oldTag: newTag}
 * @returns {Array<string>} Merged tags
 */
export function mergeTags(tags, mergeMap) {
    if (!Array.isArray(tags) || !mergeMap) return tags;
    
    const mergedTags = tags.map(tag => mergeMap[tag] || tag);
    return [...new Set(mergedTags)]; // Remove duplicates after merge
}

/**
 * Exports tag manager configuration
 * @returns {Object} Tag rules configuration
 */
export function getTagRules() {
    return { ...TAG_RULES };
}

