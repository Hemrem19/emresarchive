/**
 * Core Command Palette Tests
 * Tests for core/commandPalette.js - Complex UI search component
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createCommandPalette } from '../core/commandPalette.js';
import { createMockPaper } from './helpers.js';

// Mock dependencies
vi.mock('../views/index.js', () => ({
    views: {
        commandPalette: `
      <div id="command-palette-overlay" class="hidden">
        <input id="command-palette-input" />
        <div id="command-palette-empty"></div>
        <div id="command-palette-results-list" class="hidden"></div>
        <div id="command-palette-no-results" class="hidden"></div>
      </div>
    `
    }
}));

vi.mock('../config.js', () => ({
    getStatusOrder: () => ['To Read', 'Reading', 'Finished']
}));

describe('core/commandPalette.js', () => {
    let commandPalette;
    let appState;

    beforeEach(() => {
        // Setup mock DOM container
        document.body.innerHTML = '<div id="command-palette-container"></div>';

        // Mock appState with test data
        appState = {
            allPapersCache: [
                createMockPaper({ id: 1, title: 'Machine Learning Paper', authors: ['John Doe'], year: 2023, tags: ['ML', 'AI'] }),
                createMockPaper({ id: 2, title: 'Deep Learning Study', authors: ['Jane Smith'], year: 2024, tags: ['DL'] })
            ],
            collectionsCache: [
                { id: 1, name: 'AI Papers', icon: 'folder' },
                { id: 2, name: 'Research', icon: 'science' }
            ]
        };

        // Create command palette instance
        commandPalette = createCommandPalette(appState);
        commandPalette.init();
    });

    afterEach(() => {
        document.body.innerHTML = '';
        vi.clearAllMocks();
    });

    describe('Initialization', () => {
        it('should render command palette HTML', () => {
            expect(document.getElementById('command-palette-overlay')).toBeTruthy();
            expect(document.getElementById('command-palette-input')).toBeTruthy();
        });

        it('should start with isOpen false', () => {
            expect(commandPalette.isOpen).toBe(false);
        });

        it('should start with empty results', () => {
            expect(commandPalette.results).toEqual([]);
            expect(commandPalette.selectedIndex).toBe(0);
        });
    });

    describe('Open and Close', () => {
        it('should open command palette', () => {
            commandPalette.open();

            const overlay = document.getElementById('command-palette-overlay');
            expect(overlay.classList.contains('hidden')).toBe(false);
            expect(commandPalette.isOpen).toBe(true);
        });

        it('should close command palette', () => {
            commandPalette.open();
            commandPalette.close();

            const overlay = document.getElementById('command-palette-overlay');
            expect(overlay.classList.contains('hidden')).toBe(true);
            expect(commandPalette.isOpen).toBe(false);
        });

        it('should clear input on close', () => {
            commandPalette.open();
            const input = document.getElementById('command-palette-input');
            input.value = 'test query';

            commandPalette.close();

            expect(input.value).toBe('');
        });

        it('should reset results on close', () => {
            commandPalette.results = [{ title: 'Test' }];
            commandPalette.selectedIndex = 5;

            commandPalette.close();

            expect(commandPalette.results).toEqual([]);
            expect(commandPalette.selectedIndex).toBe(0);
        });
    });

    describe('Toggle', () => {
        it('should open when closed', () => {
            commandPalette.toggle();
            expect(commandPalette.isOpen).toBe(true);
        });

        it('should close when open', () => {
            commandPalette.open();
            commandPalette.toggle();
            expect(commandPalette.isOpen).toBe(false);
        });
    });

    describe('Search - Papers', () => {
        it('should show default state for empty query', () => {
            commandPalette.search('');

            expect(commandPalette.results).toEqual([]);
            expect(commandPalette.selectedIndex).toBe(0);
        });

        it('should search papers by title', () => {
            commandPalette.search('Machine Learning');

            const paperResults = commandPalette.results.filter(r => r.type === 'paper');
            expect(paperResults.length).toBeGreaterThan(0);
            expect(paperResults[0].title).toContain('Machine Learning');
        });

        it('should search papers by author', () => {
            commandPalette.search('John Doe');

            const paperResults = commandPalette.results.filter(r => r.type === 'paper');
            expect(paperResults.length).toBeGreaterThan(0);
        });

        it('should be case insensitive', () => {
            commandPalette.search('MACHINE learning');

            expect(commandPalette.results.length).toBeGreaterThan(0);
        });
    });

    describe('Search - Tags', () => {
        it('should search tags', () => {
            commandPalette.search('ML');

            const tagResults = commandPalette.results.filter(r => r.type === 'tag');
            expect(tagResults.length).toBeGreaterThan(0);
            expect(tagResults[0].title).toContain('ML');
        });
    });

    describe('Search - Collections', () => {
        it('should search collections', () => {
            commandPalette.search('AI Papers');

            const collectionResults = commandPalette.results.filter(r => r.type === 'collection');
            expect(collectionResults.length).toBeGreaterThan(0);
            expect(collectionResults[0].title).toBe('AI Papers');
        });
    });

    describe('Search - Status Filters', () => {
        it('should search status filters', () => {
            commandPalette.search('Read');

            const statusResults = commandPalette.results.filter(r => r.type === 'status');
            expect(statusResults.length).toBeGreaterThan(0);
        });
    });

    describe('Search - Actions', () => {
        it('should search actions', () => {
            commandPalette.search('Add New');

            const actionResults = commandPalette.results.filter(r => r.type === 'action');
            expect(actionResults.length).toBeGreaterThan(0);
            expect(actionResults[0].title).toContain('Add');
        });
    });

    describe('Navigation', () => {
        beforeEach(() => {
            commandPalette.search('test');
        });

        it('should do nothing if no results', () => {
            commandPalette.results = [];
            const initialIndex = commandPalette.selectedIndex;

            commandPalette.navigate(1);

            expect(commandPalette.selectedIndex).toBe(initialIndex);
        });

        it('should navigate down', () => {
            if (commandPalette.results.length > 1) {
                commandPalette.selectedIndex = 0;
                commandPalette.navigate(1);
                expect(commandPalette.selectedIndex).toBe(1);
            }
        });

        it('should navigate up', () => {
            if (commandPalette.results.length > 1) {
                commandPalette.selectedIndex = 1;
                commandPalette.navigate(-1);
                expect(commandPalette.selectedIndex).toBe(0);
            }
        });

        it('should wrap around when navigating down from end', () => {
            if (commandPalette.results.length > 0) {
                commandPalette.selectedIndex = commandPalette.results.length - 1;
                commandPalette.navigate(1);
                expect(commandPalette.selectedIndex).toBe(0);
            }
        });

        it('should wrap around when navigating up from start', () => {
            if (commandPalette.results.length > 0) {
                commandPalette.selectedIndex = 0;
                commandPalette.navigate(-1);
                expect(commandPalette.selectedIndex).toBe(commandPalette.results.length - 1);
            }
        });
    });

    describe('Execute Selected', () => {
        it('should do nothing if no results', () => {
            commandPalette.results = [];
            expect(() => commandPalette.executeSelected()).not.toThrow();
        });

        it('should do nothing if selected index invalid', () => {
            commandPalette.results = [{ action: vi.fn() }];
            commandPalette.selectedIndex = 99;

            expect(() => commandPalette.executeSelected()).not.toThrow();
        });

        it('should execute selected result action', () => {
            const mockAction = vi.fn();
            commandPalette.results = [{ action: mockAction }];
            commandPalette.selectedIndex = 0;

            commandPalette.executeSelected();

            expect(mockAction).toHaveBeenCalled();
            expect(commandPalette.isOpen).toBe(false);
        });
    });

    describe('HTML Escaping', () => {
        it('should escape HTML special characters', () => {
            const escaped = commandPalette.escapeHtml('<script>alert("xss")</script>');

            expect(escaped).not.toContain('<script>');
            expect(escaped).toContain('&lt;');
            expect(escaped).toContain('&gt;');
        });

        it('should handle quotes', () => {
            const escaped = commandPalette.escapeHtml('"test"');
            expect(escaped).toContain('&quot;');
        });
    });
});
