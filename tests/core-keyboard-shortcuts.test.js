/**
 * Core Keyboard Shortcuts Tests  
 * Tests for core/keyboardShortcuts.js
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createKeyboardShortcuts } from '../core/keyboardShortcuts.js';

// Mock dependencies
vi.mock('../core/filters.js', () => ({
    applyFiltersAndRender: vi.fn()
}));

import { applyFiltersAndRender } from '../core/filters.js';

describe('core/keyboardShortcuts.js', () => {
    let keyboardShortcuts;
    let mockCommandPalette;
    let appState;

    beforeEach(() => {
        mockCommandPalette = {
            isOpen: false,
            close: vi.fn()
        };

        appState = {
            selectedPaperIds: new Set()
        };

        document.body.innerHTML = `
      <input id="search-input" />
      <input id="quick-add-doi" />
    `;

        delete window.location;
        window.location = { hash: '#/' };

        keyboardShortcuts = createKeyboardShortcuts(mockCommandPalette, appState);
        vi.clearAllMocks();
    });

    afterEach(() => {
        document.body.innerHTML = '';
    });

    describe('init', () => {
        it('should add global keydown listener', () => {
            const spy = vi.spyOn(document, 'addEventListener');
            keyboardShortcuts.init();

            expect(spy).toHaveBeenCalledWith('keydown', expect.any(Function));
        });
    });

    describe('Escape key handling', () => {
        beforeEach(() => {
            keyboardShortcuts.init();
        });

        it('should blur active input on Escape', () => {
            const input = document.getElementById('search-input');
            input.focus();

            const event = new KeyboardEvent('keydown', { key: 'Escape' });
            document.dispatchEvent(event);

            expect(document.activeElement).not.toBe(input);
        });

        it('should close command palette if open', () => {
            mockCommandPalette.isOpen = true;

            const event = new KeyboardEvent('keydown', { key: 'Escape' });
            document.dispatchEvent(event);

            expect(mockCommandPalette.close).toHaveBeenCalled();
        });
    });

    describe('Global shortcuts', () => {
        beforeEach(() => {
            keyboardShortcuts.init();
        });

        it('should navigate to add paper (N)', () => {
            const event = new KeyboardEvent('keydown', { key: 'n' });
            document.dispatchEvent(event);

            expect(window.location.hash).toBe('#/add');
        });

        it('should focus search (/)', () => {
            const input = document.getElementById('search-input');
            const focusSpy = vi.spyOn(input, 'focus');

            const event = new KeyboardEvent('keydown', { key: '/' });
            document.dispatchEvent(event);

            expect(focusSpy).toHaveBeenCalled();
        });
    });
});
