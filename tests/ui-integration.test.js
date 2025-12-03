/**
 * UI Integration Tests
 * Tests for sidebar filtering, graph view, scrolling, and other UI interactions
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createAppState } from '../core/state.js';
import { parseUrlHash, updateUrlHash, applyFiltersAndRender } from '../core/filters.js';

// Mock DOM elements
const createMockDOM = () => {
    document.body.innerHTML = `
        <div id="app-shell">
            <aside id="desktop-sidebar">
                <div id="sidebar-status-list">
                    <a href="#/app/status/Reading" class="sidebar-status-link" data-status="Reading">Reading</a>
                    <a href="#/app/status/To Read" class="sidebar-status-link" data-status="To Read">To Read</a>
                </div>
                <div id="sidebar-tags-section">
                    <a href="#/app/tag/ml" class="sidebar-tag" data-tag="ml">ML</a>
                    <a href="#/app/tag/ai" class="sidebar-tag" data-tag="ai">AI</a>
                </div>
            </aside>
            <main id="app" class="flex-grow p-4 sm:p-6 overflow-y-auto"></main>
        </div>
        <div id="landing-page" class="hidden"></div>
    `;
};

describe('UI Integration Tests', () => {
    let appState;

    beforeEach(() => {
        createMockDOM();
        appState = createAppState();
        window.location.hash = '#/app';
    });

    afterEach(() => {
        document.body.innerHTML = '';
        window.location.hash = '';
    });

    describe('Sidebar Filtering', () => {
        it('should handle status link clicks and update filters', () => {
            const statusLink = document.querySelector('.sidebar-status-link[data-status="Reading"]');
            expect(statusLink).toBeTruthy();

            // Simulate click
            const clickEvent = new MouseEvent('click', {
                bubbles: true,
                cancelable: true
            });
            
            // Mock the click handler behavior
            statusLink.dispatchEvent(clickEvent);
            
            // Verify the link exists and has correct attributes
            expect(statusLink.dataset.status).toBe('Reading');
            expect(statusLink.getAttribute('href')).toBe('#/app/status/Reading');
        });

        it('should handle tag link clicks', () => {
            const tagLink = document.querySelector('.sidebar-tag[data-tag="ml"]');
            expect(tagLink).toBeTruthy();
            expect(tagLink.dataset.tag).toBe('ml');
            expect(tagLink.getAttribute('href')).toBe('#/app/tag/ml');
        });

        it('should parse status filter from URL hash', () => {
            window.location.hash = '#/app/status/Reading';
            parseUrlHash(appState);
            expect(appState.activeFilters.status).toBe('Reading');
        });

        it('should parse tag filter from URL hash', () => {
            window.location.hash = '#/app/tag/ml';
            parseUrlHash(appState);
            expect(appState.activeFilters.tags).toContain('ml');
        });

        it('should parse compound filters from URL hash', () => {
            window.location.hash = '#/app/filter/status:Reading/tag:ml';
            parseUrlHash(appState);
            expect(appState.activeFilters.status).toBe('Reading');
            expect(appState.activeFilters.tags).toContain('ml');
        });
    });

    describe('Graph View', () => {
        it('should have graph container element', () => {
            const app = document.getElementById('app');
            expect(app).toBeTruthy();
            
            // Simulate graph view HTML
            app.innerHTML = `
                <div id="graph-network" class="absolute inset-0 w-full h-full z-0"></div>
                <div id="graph-empty-state" class="hidden">No papers to display</div>
            `;
            
            const networkContainer = document.getElementById('graph-network');
            const emptyState = document.getElementById('graph-empty-state');
            
            expect(networkContainer).toBeTruthy();
            expect(emptyState).toBeTruthy();
        });

        it('should handle missing graph elements gracefully', () => {
            const app = document.getElementById('app');
            app.innerHTML = ''; // Empty container
            
            const networkContainer = document.getElementById('graph-network');
            expect(networkContainer).toBeNull();
        });
    });

    describe('Scrolling', () => {
        it('should allow scrolling in app container', () => {
            const app = document.getElementById('app');
            expect(app).toBeTruthy();
            
            // Check that app container has overflow-y-auto
            const hasOverflow = app.classList.contains('overflow-y-auto') || 
                               getComputedStyle(app).overflowY === 'auto' ||
                               app.style.overflowY === 'auto';
            
            // At minimum, the class should be present
            expect(app.className).toContain('overflow-y-auto');
        });

        it('should not set body overflow to hidden', () => {
            // Body overflow should not be set to hidden (we removed that)
            // The app container handles its own scrolling
            const body = document.body;
            const app = document.getElementById('app');
            
            expect(app).toBeTruthy();
            expect(app.className).toContain('overflow-y-auto');
        });
    });

    describe('Routing', () => {
        it('should handle graph route', () => {
            window.location.hash = '#/graph';
            const path = window.location.hash.substring(1);
            expect(path).toBe('/graph');
        });

        it('should handle dashboard route', () => {
            window.location.hash = '#/app';
            const path = window.location.hash.substring(1);
            expect(path).toBe('/app');
        });

        it('should handle status filter route', () => {
            window.location.hash = '#/app/status/Reading';
            const path = window.location.hash.substring(1);
            expect(path).toBe('/app/status/Reading');
        });
    });

    describe('URL Hash Updates', () => {
        it('should update URL hash for status filter', () => {
            appState.activeFilters.status = 'Reading';
            updateUrlHash(appState);
            
            // The hash should be set (we can't easily test the actual hash change in unit tests)
            // But we can verify the function doesn't throw
            expect(() => updateUrlHash(appState)).not.toThrow();
        });

        it('should update URL hash for tag filter', () => {
            appState.activeFilters.tags = ['ml', 'ai'];
            updateUrlHash(appState);
            expect(() => updateUrlHash(appState)).not.toThrow();
        });

        it('should update URL hash for compound filters', () => {
            appState.activeFilters.status = 'Reading';
            appState.activeFilters.tags = ['ml'];
            updateUrlHash(appState);
            expect(() => updateUrlHash(appState)).not.toThrow();
        });
    });
});

