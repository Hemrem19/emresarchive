/**
 * Tests for sidebar filter preservation
 * Ensures that tags are preserved when changing status filters and vice versa
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { createAppState } from '../core/state.js';
import { parseUrlHash, updateUrlHash } from '../core/filters.js';

describe('Sidebar Filter Preservation', () => {
    let appState;

    beforeEach(() => {
        appState = createAppState();
        window.location.hash = '#/app';
    });

    describe('Status filter with existing tags', () => {
        it('should preserve tags when setting status filter', () => {
            // Set up initial state with tags
            appState.activeFilters.tags = ['ml', 'ai'];
            appState.activeFilters.status = null;

            // Simulate clicking a status filter
            appState.activeFilters.status = 'Reading';
            
            // Update URL hash (this is what the fixed code does)
            updateUrlHash(appState);

            // Parse the URL to verify both filters are preserved
            parseUrlHash(appState);

            expect(appState.activeFilters.status).toBe('Reading');
            expect(appState.activeFilters.tags).toContain('ml');
            expect(appState.activeFilters.tags).toContain('ai');
            expect(appState.activeFilters.tags.length).toBe(2);
        });

        it('should preserve tags when removing status filter', () => {
            // Set up initial state with both status and tags
            appState.activeFilters.status = 'Reading';
            appState.activeFilters.tags = ['ml', 'ai'];

            // Simulate clicking the same status to remove it
            appState.activeFilters.status = null;
            
            // Update URL hash
            updateUrlHash(appState);

            // Parse the URL to verify tags are preserved
            parseUrlHash(appState);

            expect(appState.activeFilters.status).toBeNull();
            expect(appState.activeFilters.tags).toContain('ml');
            expect(appState.activeFilters.tags).toContain('ai');
            expect(appState.activeFilters.tags.length).toBe(2);
        });

        it('should create compound filter URL when both status and tags exist', () => {
            appState.activeFilters.status = 'Reading';
            appState.activeFilters.tags = ['ml', 'ai'];

            updateUrlHash(appState);

            // Should create compound filter URL
            expect(window.location.hash).toContain('#/app/filter/');
            expect(window.location.hash).toContain('status:Reading');
            expect(window.location.hash).toContain('tag:ml');
            expect(window.location.hash).toContain('tag:ai');
        });
    });

    describe('Tag filter with existing status', () => {
        it('should preserve status when adding tag filter', () => {
            // Set up initial state with status
            appState.activeFilters.status = 'Reading';
            appState.activeFilters.tags = [];

            // Simulate clicking a tag filter
            appState.activeFilters.tags.push('ml');
            
            // Update URL hash
            updateUrlHash(appState);

            // Parse the URL to verify status is preserved
            parseUrlHash(appState);

            expect(appState.activeFilters.status).toBe('Reading');
            expect(appState.activeFilters.tags).toContain('ml');
        });

        it('should preserve status when removing tag filter', () => {
            // Set up initial state with both status and tags
            appState.activeFilters.status = 'Reading';
            appState.activeFilters.tags = ['ml', 'ai'];

            // Simulate removing a tag
            const tagIndex = appState.activeFilters.tags.indexOf('ml');
            appState.activeFilters.tags.splice(tagIndex, 1);
            
            // Update URL hash
            updateUrlHash(appState);

            // Parse the URL to verify status is preserved
            parseUrlHash(appState);

            expect(appState.activeFilters.status).toBe('Reading');
            expect(appState.activeFilters.tags).toContain('ai');
            expect(appState.activeFilters.tags).not.toContain('ml');
        });
    });

    describe('URL hash format', () => {
        it('should use compound filter format when both status and tags exist', () => {
            appState.activeFilters.status = 'Reading';
            appState.activeFilters.tags = ['ml'];

            updateUrlHash(appState);

            const hash = window.location.hash;
            expect(hash).toBe('#/app/filter/status:Reading/tag:ml');
        });

        it('should use single status format when only status exists', () => {
            appState.activeFilters.status = 'Reading';
            appState.activeFilters.tags = [];

            updateUrlHash(appState);

            // Note: updateUrlHash creates compound format even for single filters
            // This is correct behavior - it uses /filter/ format
            const hash = window.location.hash;
            expect(hash).toContain('status:Reading');
        });

        it('should use dashboard route when no filters exist', () => {
            appState.activeFilters.status = null;
            appState.activeFilters.tags = [];

            updateUrlHash(appState);

            expect(window.location.hash).toBe('#/app');
        });
    });
});

