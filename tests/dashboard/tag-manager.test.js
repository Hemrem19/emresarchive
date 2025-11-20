/**
 * Tests for Tag Manager Service
 */

import { describe, it, expect } from 'vitest';
import {
    parseTags,
    sanitizeTag,
    isValidTag,
    validateTags,
    addTagsToPaper,
    removeTagsFromPaper,
    replaceTagsOnPaper,
    getAllTags,
    getTagStatistics,
    suggestTags,
    mergeTags,
    getTagRules
} from '../../dashboard/services/tag-manager.js';

describe('Tag Manager Service', () => {
    describe('parseTags', () => {
        it('should parse comma-separated tags', () => {
            const result = parseTags('tag1, tag2, tag3');
            expect(result).toEqual(['tag1', 'tag2', 'tag3']);
        });

        it('should sanitize and lowercase tags', () => {
            const result = parseTags('Tag1, TAG2, TaG3');
            expect(result).toEqual(['tag1', 'tag2', 'tag3']);
        });

        it('should replace spaces with hyphens', () => {
            const result = parseTags('machine learning, deep learning');
            expect(result).toEqual(['machine-learning', 'deep-learning']);
        });

        it('should remove duplicates', () => {
            const result = parseTags('tag1, tag2, tag1');
            expect(result).toEqual(['tag1', 'tag2']);
        });

        it('should filter empty tags', () => {
            const result = parseTags('tag1, , tag2, ');
            expect(result).toEqual(['tag1', 'tag2']);
        });

        it('should handle array input', () => {
            const result = parseTags(['Tag1', 'Tag2', 'Tag3']);
            expect(result).toEqual(['tag1', 'tag2', 'tag3']);
        });

        it('should return empty array for empty input', () => {
            expect(parseTags('')).toEqual([]);
            expect(parseTags(null)).toEqual([]);
            expect(parseTags(undefined)).toEqual([]);
        });

        it('should remove special characters', () => {
            const result = parseTags('tag@1, tag#2, tag$3');
            expect(result).toEqual(['tag1', 'tag2', 'tag3']);
        });
    });

    describe('sanitizeTag', () => {
        it('should trim whitespace', () => {
            expect(sanitizeTag('  tag  ')).toBe('tag');
        });

        it('should convert to lowercase', () => {
            expect(sanitizeTag('TAG')).toBe('tag');
        });

        it('should replace spaces with hyphens', () => {
            expect(sanitizeTag('machine learning')).toBe('machine-learning');
        });

        it('should remove special characters', () => {
            expect(sanitizeTag('tag@#$%')).toBe('tag');
        });

        it('should enforce max length', () => {
            const longTag = 'a'.repeat(100);
            const result = sanitizeTag(longTag);
            expect(result.length).toBeLessThanOrEqual(50);
        });

        it('should return empty string for non-string input', () => {
            expect(sanitizeTag(null)).toBe('');
            expect(sanitizeTag(undefined)).toBe('');
            expect(sanitizeTag(123)).toBe('');
        });
    });

    describe('isValidTag', () => {
        it('should validate correct tags', () => {
            const result = isValidTag('valid-tag');
            expect(result.valid).toBe(true);
        });

        it('should reject empty tags', () => {
            const result = isValidTag('');
            expect(result.valid).toBe(false);
            expect(result.error).toContain('non-empty');
        });

        it('should reject tags that are too long', () => {
            const longTag = 'a'.repeat(51);
            const result = isValidTag(longTag);
            expect(result.valid).toBe(false);
            expect(result.error).toContain('exceed');
        });

        it('should reject reserved tags', () => {
            const result = isValidTag('all');
            expect(result.valid).toBe(false);
            expect(result.error).toContain('reserved');
        });

        it('should reject non-string input', () => {
            const result = isValidTag(null);
            expect(result.valid).toBe(false);
        });
    });

    describe('validateTags', () => {
        it('should validate array of valid tags', () => {
            const result = validateTags(['tag1', 'tag2', 'tag3']);
            expect(result.valid).toBe(true);
            expect(result.errors).toHaveLength(0);
            expect(result.validTags).toEqual(['tag1', 'tag2', 'tag3']);
        });

        it('should reject non-array input', () => {
            const result = validateTags('not-an-array');
            expect(result.valid).toBe(false);
            expect(result.errors).toContain('Tags must be an array');
        });

        it('should reject too many tags', () => {
            const manyTags = Array(25).fill('tag');
            const result = validateTags(manyTags);
            expect(result.valid).toBe(false);
            expect(result.errors[0]).toContain('Maximum');
        });

        it('should collect errors for invalid tags', () => {
            const result = validateTags(['valid', '', 'all']);
            expect(result.valid).toBe(false);
            expect(result.errors.length).toBeGreaterThan(0);
            expect(result.validTags).toEqual(['valid']);
        });
    });

    describe('addTagsToPaper', () => {
        it('should add tags to paper', () => {
            const paper = { id: 1, tags: ['existing'] };
            const result = addTagsToPaper(paper, ['new1', 'new2']);
            
            expect(result.success).toBe(true);
            expect(result.tags).toContain('existing');
            expect(result.tags).toContain('new1');
            expect(result.tags).toContain('new2');
            expect(result.addedCount).toBe(2);
        });

        it('should not add duplicate tags', () => {
            const paper = { id: 1, tags: ['tag1', 'tag2'] };
            const result = addTagsToPaper(paper, ['tag2', 'tag3']);
            
            expect(result.success).toBe(true);
            expect(result.tags).toEqual(['tag1', 'tag2', 'tag3']);
            expect(result.addedCount).toBe(1);
        });

        it('should handle paper with no existing tags', () => {
            const paper = { id: 1 };
            const result = addTagsToPaper(paper, ['tag1', 'tag2']);
            
            expect(result.success).toBe(true);
            expect(result.tags).toEqual(['tag1', 'tag2']);
        });

        it('should sanitize tags before adding', () => {
            const paper = { id: 1, tags: [] };
            const result = addTagsToPaper(paper, ['Tag1', 'TAG2']);
            
            expect(result.tags).toEqual(['tag1', 'tag2']);
        });

        it('should fail if too many tags', () => {
            // Create 15 unique existing tags
            const existingTags = Array.from({length: 15}, (_, i) => `tag${i}`);
            const paper = { id: 1, tags: existingTags };
            
            // Try to add 10 more unique tags (total would be 25, which exceeds MAX_TAGS_PER_PAPER of 20)
            const newTags = Array.from({length: 10}, (_, i) => `newtag${i}`);
            const result = addTagsToPaper(paper, newTags);
            
            expect(result.success).toBe(false);
            expect(result.errors.length).toBeGreaterThan(0);
        });
    });

    describe('removeTagsFromPaper', () => {
        it('should remove tags from paper', () => {
            const paper = { id: 1, tags: ['tag1', 'tag2', 'tag3'] };
            const result = removeTagsFromPaper(paper, ['tag1', 'tag3']);
            
            expect(result.success).toBe(true);
            expect(result.tags).toEqual(['tag2']);
            expect(result.removedCount).toBe(2);
        });

        it('should handle removing non-existent tags', () => {
            const paper = { id: 1, tags: ['tag1', 'tag2'] };
            const result = removeTagsFromPaper(paper, ['tag3', 'tag4']);
            
            expect(result.success).toBe(true);
            expect(result.tags).toEqual(['tag1', 'tag2']);
            expect(result.removedCount).toBe(0);
        });

        it('should handle paper with no tags', () => {
            const paper = { id: 1 };
            const result = removeTagsFromPaper(paper, ['tag1']);
            
            expect(result.success).toBe(true);
            expect(result.tags).toEqual([]);
        });

        it('should handle case-insensitive removal', () => {
            const paper = { id: 1, tags: ['tag1', 'tag2'] };
            const result = removeTagsFromPaper(paper, ['TAG1']);
            
            expect(result.tags).toEqual(['tag2']);
        });

        it('should successfully remove a tag that exists', () => {
             const paper = { id: 1, tags: ['machine-learning'] };
             const result = removeTagsFromPaper(paper, 'machine-learning');
             expect(result.tags).toEqual([]);
             expect(result.removedCount).toBe(1);
        });
        
        it('should successfully remove multiple tags', () => {
            const paper = { id: 1, tags: ['ai', 'ml', 'data'] };
            const result = removeTagsFromPaper(paper, ['ai', 'data']);
            expect(result.tags).toEqual(['ml']);
            expect(result.removedCount).toBe(2);
        });

        it('should handle messy input for removal', () => {
            const paper = { id: 1, tags: ['machine-learning', 'ai'] };
            const result = removeTagsFromPaper(paper, ' Machine Learning ');
            expect(result.tags).toEqual(['ai']);
            expect(result.removedCount).toBe(1);
        });
    });

    describe('replaceTagsOnPaper', () => {
        it('should replace all tags', () => {
            const paper = { id: 1, tags: ['old1', 'old2'] };
            const result = replaceTagsOnPaper(paper, ['new1', 'new2']);
            
            expect(result.success).toBe(true);
            expect(result.tags).toEqual(['new1', 'new2']);
        });

        it('should sanitize new tags', () => {
            const paper = { id: 1, tags: ['old'] };
            const result = replaceTagsOnPaper(paper, ['New1', 'NEW2']);
            
            expect(result.tags).toEqual(['new1', 'new2']);
        });

        it('should fail if new tags are invalid', () => {
            const paper = { id: 1, tags: ['old'] };
            // Create 25 unique tags (exceeds MAX_TAGS_PER_PAPER of 20)
            const tooManyTags = Array.from({length: 25}, (_, i) => `tag${i}`);
            const result = replaceTagsOnPaper(paper, tooManyTags);
            
            expect(result.success).toBe(false);
            expect(result.tags).toEqual(['old']);
        });
    });

    describe('getAllTags', () => {
        it('should get all unique tags from papers', () => {
            const papers = [
                { id: 1, tags: ['tag1', 'tag2'] },
                { id: 2, tags: ['tag2', 'tag3'] },
                { id: 3, tags: ['tag3', 'tag4'] }
            ];
            
            const result = getAllTags(papers);
            
            expect(result).toEqual(['tag1', 'tag2', 'tag3', 'tag4']);
        });

        it('should return sorted tags', () => {
            const papers = [
                { id: 1, tags: ['zebra', 'apple', 'banana'] }
            ];
            
            const result = getAllTags(papers);
            
            expect(result).toEqual(['apple', 'banana', 'zebra']);
        });

        it('should handle papers with no tags', () => {
            const papers = [
                { id: 1 },
                { id: 2, tags: ['tag1'] }
            ];
            
            const result = getAllTags(papers);
            
            expect(result).toEqual(['tag1']);
        });

        it('should return empty array for empty input', () => {
            expect(getAllTags([])).toEqual([]);
            expect(getAllTags(null)).toEqual([]);
        });
    });

    describe('getTagStatistics', () => {
        it('should count tag usage', () => {
            const papers = [
                { id: 1, tags: ['tag1', 'tag2'] },
                { id: 2, tags: ['tag1', 'tag3'] },
                { id: 3, tags: ['tag1', 'tag2'] }
            ];
            
            const result = getTagStatistics(papers);
            
            expect(result).toEqual([
                { tag: 'tag1', count: 3 },
                { tag: 'tag2', count: 2 },
                { tag: 'tag3', count: 1 }
            ]);
        });

        it('should sort by count descending', () => {
            const papers = [
                { id: 1, tags: ['rare'] },
                { id: 2, tags: ['common', 'common'] },
                { id: 3, tags: ['common'] }
            ];
            
            const result = getTagStatistics(papers);
            
            expect(result[0].tag).toBe('common');
            expect(result[0].count).toBeGreaterThan(result[1].count);
        });

        it('should return empty array for empty input', () => {
            expect(getTagStatistics([])).toEqual([]);
        });
    });

    describe('suggestTags', () => {
        it('should suggest tags from title', () => {
            const paper = {
                title: 'Machine Learning Algorithms for Classification'
            };
            
            const result = suggestTags(paper);
            
            expect(result.length).toBeGreaterThan(0);
            expect(result.every(tag => tag.length > 0)).toBe(true);
        });

        it('should suggest tags from similar papers by author', () => {
            const paper = {
                title: 'New Paper',
                authors: ['John Doe']
            };
            
            const allPapers = [
                { id: 1, authors: ['John Doe'], tags: ['ml', 'ai'] },
                { id: 2, authors: ['John Doe'], tags: ['ml', 'deep-learning'] }
            ];
            
            const result = suggestTags(paper, allPapers);
            
            expect(result).toContain('ml');
        });

        it('should limit suggestions to 5', () => {
            const paper = {
                title: 'Machine Learning Deep Learning Neural Networks Artificial Intelligence Computer Vision'
            };
            
            const result = suggestTags(paper);
            
            expect(result.length).toBeLessThanOrEqual(5);
        });

        it('should return empty array for paper with no title', () => {
            const paper = { id: 1 };
            
            const result = suggestTags(paper);
            
            expect(result).toEqual([]);
        });
    });

    describe('mergeTags', () => {
        it('should merge tags according to map', () => {
            const tags = ['ml', 'machine-learning', 'ai'];
            const mergeMap = {
                'machine-learning': 'ml',
                'artificial-intelligence': 'ai'
            };
            
            const result = mergeTags(tags, mergeMap);
            
            expect(result).toEqual(['ml', 'ai']);
        });

        it('should remove duplicates after merge', () => {
            const tags = ['tag1', 'tag2', 'tag3'];
            const mergeMap = {
                'tag2': 'tag1',
                'tag3': 'tag1'
            };
            
            const result = mergeTags(tags, mergeMap);
            
            expect(result).toEqual(['tag1']);
        });

        it('should handle empty merge map', () => {
            const tags = ['tag1', 'tag2'];
            
            const result = mergeTags(tags, {});
            
            expect(result).toEqual(['tag1', 'tag2']);
        });
    });

    describe('getTagRules', () => {
        it('should return tag rules configuration', () => {
            const rules = getTagRules();
            
            expect(rules).toHaveProperty('MIN_LENGTH');
            expect(rules).toHaveProperty('MAX_LENGTH');
            expect(rules).toHaveProperty('MAX_TAGS_PER_PAPER');
            expect(rules).toHaveProperty('ALLOWED_PATTERN');
            expect(rules).toHaveProperty('RESERVED_TAGS');
        });

        it('should return a copy of rules', () => {
            const rules1 = getTagRules();
            const rules2 = getTagRules();
            
            expect(rules1).not.toBe(rules2);
            expect(rules1).toEqual(rules2);
        });
    });
});
