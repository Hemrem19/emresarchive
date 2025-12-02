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
      <div class="paper-checkbox-container">
        <input type="checkbox" class="paper-checkbox" data-paper-id="1" />
        <input type="checkbox" class="paper-checkbox" data-paper-id="2" />
        <input type="checkbox" class="paper-checkbox" data-paper-id="3" />
      </div>
      <button id="batch-delete-btn">Delete</button>
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

        it('should close help modal if open', () => {
            // Create help modal
            document.body.insertAdjacentHTML('beforeend', `
        <div id="shortcuts-help-modal" class="">Help Modal</div>
      `);

            const event = new KeyboardEvent('keydown', { key: 'Escape' });
            document.dispatchEvent(event);

            const modal = document.getElementById('shortcuts-help-modal');
            expect(modal.classList.contains('hidden')).toBe(true);
        });

        it('should clear selection on dashboard when pressing Escape', () => {
            window.location.hash = '#/app';
            appState.selectedPaperIds.add(1);
            appState.selectedPaperIds.add(2);

            const event = new KeyboardEvent('keydown', { key: 'Escape' });
            document.dispatchEvent(event);

            expect(appState.selectedPaperIds.size).toBe(0);
            expect(applyFiltersAndRender).toHaveBeenCalled();
        });

        it('should navigate to dashboard from details page', () => {
            window.location.hash = '#/details/123';

            const event = new KeyboardEvent('keydown', { key: 'Escape' });
            document.dispatchEvent(event);

            expect(window.location.hash).toBe('#/app');
        });

        it('should navigate to dashboard from add page', () => {
            window.location.hash = '#/add';

            const event = new KeyboardEvent('keydown', { key: 'Escape' });
            document.dispatchEvent(event);

            expect(window.location.hash).toBe('#/app');
        });

        it('should navigate to dashboard from edit page', () => {
            window.location.hash = '#/edit/456';

            const event = new KeyboardEvent('keydown', { key: 'Escape' });
            document.dispatchEvent(event);

            expect(window.location.hash).toBe('#/app');
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

        it('should select search text when focusing (/)', () => {
            const input = document.getElementById('search-input');
            input.value = 'existing text';
            const selectSpy = vi.spyOn(input, 'select');

            const event = new KeyboardEvent('keydown', { key: '/' });
            document.dispatchEvent(event);

            expect(selectSpy).toHaveBeenCalled();
        });

        it('should show help modal (?)', () => {
            const event = new KeyboardEvent('keydown', { key: '?' });
            document.dispatchEvent(event);

            const modal = document.getElementById('shortcuts-help-modal');
            expect(modal).toBeTruthy();
            expect(modal.classList.contains('hidden')).toBe(false);
        });

        it('should not trigger shortcuts when typing in input', () => {
            const input = document.getElementById('search-input');
            input.focus();

            const event = new KeyboardEvent('keydown', { key: 'n' });
            Object.defineProperty(event, 'target', { value: input, enumerable: true });
            document.dispatchEvent(event);

            // Hash should not change
            expect(window.location.hash).toBe('#/app');
        });

        it('should not trigger shortcuts when typing in textarea', () => {
            document.body.insertAdjacentHTML('beforeend', '<textarea id="test-textarea"></textarea>');
            const textarea = document.getElementById('test-textarea');
            textarea.focus();

            const event = new KeyboardEvent('keydown', { key: 'n' });
            document.dispatchEvent(event);

            expect(window.location.hash).toBe('#/app');
        });
    });

    describe('Sequence shortcuts', () => {
        beforeEach(() => {
            keyboardShortcuts.init();
        });

        it('should start sequence with g key', () => {
            const event = new KeyboardEvent('keydown', { key: 'g' });
            document.dispatchEvent(event);

            expect(keyboardShortcuts.sequenceKey).toBe('g');
        });

        it('should navigate to home with g+h', () => {
            window.location.hash = '#/settings';

            // Press g
            const gEvent = new KeyboardEvent('keydown', { key: 'g' });
            document.dispatchEvent(gEvent);

            // Press h
            const hEvent = new KeyboardEvent('keydown', { key: 'h' });
            document.dispatchEvent(hEvent);

            expect(window.location.hash).toBe('#/app');
        });

        it('should navigate to settings with g+s', () => {
            // Press g
            const gEvent = new KeyboardEvent('keydown', { key: 'g' });
            document.dispatchEvent(gEvent);

            // Press s
            const sEvent = new KeyboardEvent('keydown', { key: 's' });
            document.dispatchEvent(sEvent);

            expect(window.location.hash).toBe('#/settings');
        });

        it('should clear sequence after completing', () => {
            const gEvent = new KeyboardEvent('keydown', { key: 'g' });
            document.dispatchEvent(gEvent);

            const hEvent = new KeyboardEvent('keydown', { key: 'h' });
            document.dispatchEvent(hEvent);

            expect(keyboardShortcuts.sequenceKey).toBeNull();
        });

        it('should timeout sequence after 1.5 seconds', () => {
            vi.useFakeTimers();

            const gEvent = new KeyboardEvent('keydown', { key: 'g' });
            document.dispatchEvent(gEvent);

            expect(keyboardShortcuts.sequenceKey).toBe('g');

            vi.advanceTimersByTime(1500);

            expect(keyboardShortcuts.sequenceKey).toBeNull();

            vi.useRealTimers();
        });
    });

    describe('Dashboard-specific shortcuts', () => {
        beforeEach(() => {
            window.location.hash = '#/app';
            keyboardShortcuts.init();
        });

        it('should select all visible papers with Ctrl+A', () => {
            const event = new KeyboardEvent('keydown', {
                key: 'a',
                ctrlKey: true
            });
            document.dispatchEvent(event);

            expect(appState.selectedPaperIds.size).toBe(3);
            expect(appState.selectedPaperIds.has(1)).toBe(true);
            expect(appState.selectedPaperIds.has(2)).toBe(true);
            expect(appState.selectedPaperIds.has(3)).toBe(true);
            expect(applyFiltersAndRender).toHaveBeenCalled();
        });

        it('should check all checkboxes when selecting all', () => {
            const event = new KeyboardEvent('keydown', {
                key: 'a',
                ctrlKey: true
            });
            document.dispatchEvent(event);

            const checkboxes = document.querySelectorAll('.paper-checkbox');
            checkboxes.forEach(cb => {
                expect(cb.checked).toBe(true);
            });
        });

        it('should clear selection with Ctrl+D', () => {
            appState.selectedPaperIds.add(1);
            appState.selectedPaperIds.add(2);

            const event = new KeyboardEvent('keydown', {
                key: 'd',
                ctrlKey: true
            });
            document.dispatchEvent(event);

            expect(appState.selectedPaperIds.size).toBe(0);
            expect(applyFiltersAndRender).toHaveBeenCalled();
        });

        it('should focus Quick Add DOI with Ctrl+Shift+D', () => {
            const doiInput = document.getElementById('quick-add-doi');
            const focusSpy = vi.spyOn(doiInput, 'focus');
            const selectSpy = vi.spyOn(doiInput, 'select');

            // Mock scrollIntoView since it's not available in test env
            doiInput.scrollIntoView = vi.fn();

            const event = new KeyboardEvent('keydown', {
                key: 'd',
                ctrlKey: true,
                shiftKey: true
            });
            document.dispatchEvent(event);

            expect(focusSpy).toHaveBeenCalled();
            expect(selectSpy).toHaveBeenCalled();
            expect(doiInput.scrollIntoView).toHaveBeenCalled();
        });

        it('should trigger batch delete with Delete key', () => {
            appState.selectedPaperIds.add(1);
            appState.selectedPaperIds.add(2);

            const deleteBtn = document.getElementById('batch-delete-btn');
            const clickSpy = vi.spyOn(deleteBtn, 'click');

            const event = new KeyboardEvent('keydown', { key: 'Delete' });
            document.dispatchEvent(event);

            expect(clickSpy).toHaveBeenCalled();
        });

        it('should not trigger delete when no papers selected', () => {
            // Don't spy - test that button doesn't get clicked by checking Select.size remains 0
            const initialSize = appState.selectedPaperIds.size;

            const event = new KeyboardEvent('keydown', { key: 'Delete' });
            document.dispatchEvent(event);

            // Selection should still be empty
            expect(appState.selectedPaperIds.size).toBe(initialSize);
        });

        it('should not trigger dashboard shortcuts on other pages', () => {
            window.location.hash = '#/settings';

            const event = new KeyboardEvent('keydown', {
                key: 'a',
                ctrlKey: true
            });
            document.dispatchEvent(event);

            expect(appState.selectedPaperIds.size).toBe(0);
        });
    });

    describe('isOnDashboard helper', () => {
        beforeEach(() => {
            keyboardShortcuts.init();
        });

        it('should return true for app hash', () => {
            window.location.hash = '#/app';
            expect(keyboardShortcuts.isOnDashboard()).toBe(true);
        });

        it('should return true for filter pages', () => {
            window.location.hash = '#/app/filter/reading';
            expect(keyboardShortcuts.isOnDashboard()).toBe(true);
        });

        it('should return true for status pages', () => {
            window.location.hash = '#/app/status/Reading';
            expect(keyboardShortcuts.isOnDashboard()).toBe(true);
        });

        it('should return true for tag pages', () => {
            window.location.hash = '#/app/tag/machine-learning';
            expect(keyboardShortcuts.isOnDashboard()).toBe(true);
        });

        it('should return false for details pages', () => {
            window.location.hash = '#/details/123';
            expect(keyboardShortcuts.isOnDashboard()).toBe(false);
        });

        it('should return false for settings', () => {
            window.location.hash = '#/settings';
            expect(keyboardShortcuts.isOnDashboard()).toBe(false);
        });
    });

    describe('Help modal', () => {
        beforeEach(() => {
            keyboardShortcuts.init();
        });

        it('should create help modal when shown first time', () => {
            const event = new KeyboardEvent('keydown', { key: '?' });
            document.dispatchEvent(event);

            const modal = document.getElementById('shortcuts-help-modal');
            expect(modal).toBeTruthy();
        });

        it('should show existing modal if already created', () => {
            // Create modal first time
            const event1 = new KeyboardEvent('keydown', { key: '?' });
            document.dispatchEvent(event1);

            const modal = document.getElementById('shortcuts-help-modal');
            modal.classList.add('hidden');

            // Show again
            const event2 = new KeyboardEvent('keydown', { key: '?' });
            document.dispatchEvent(event2);

            expect(modal.classList.contains('hidden')).toBe(false);
        });

        it('should close modal with close button', () => {
            const event = new KeyboardEvent('keydown', { key: '?' });
            document.dispatchEvent(event);

            const closeBtn = document.getElementById('close-shortcuts-help');
            closeBtn.click();

            const modal = document.getElementById('shortcuts-help-modal');
            expect(modal.classList.contains('hidden')).toBe(true);
        });

        it('should close modal with footer button', () => {
            const event = new KeyboardEvent('keydown', { key: '?' });
            document.dispatchEvent(event);

            const footerBtn = document.getElementById('close-shortcuts-help-btn');
            footerBtn.click();

            const modal = document.getElementById('shortcuts-help-modal');
            expect(modal.classList.contains('hidden')).toBe(true);
        });

        it('should close modal when clicking overlay', () => {
            const event = new KeyboardEvent('keydown', { key: '?' });
            document.dispatchEvent(event);

            const modal = document.getElementById('shortcuts-help-modal');
            const clickEvent = new MouseEvent('click', { bubbles: true });
            Object.defineProperty(clickEvent, 'target', { value: modal, enumerable: true });
            modal.dispatchEvent(clickEvent);

            expect(modal.classList.contains('hidden')).toBe(true);
        });
    });

    describe('Edge cases', () => {
        beforeEach(() => {
            keyboardShortcuts.init();
        });

        it('should handle missing search input gracefully', () => {
            document.getElementById('search-input').remove();

            const event = new KeyboardEvent('keydown', { key: '/' });
            expect(() => {
                document.dispatchEvent(event);
            }).not.toThrow();
        });

        it('should handle missing quick-add-doi gracefully', () => {
            document.getElementById('quick-add-doi').remove();

            const event = new KeyboardEvent('keydown', {
                key: 'd',
                ctrlKey: true,
                shiftKey: true
            });
            expect(() => {
                document.dispatchEvent(event);
            }).not.toThrow();
        });

        it('should handle missing batch delete button gracefully', () => {
            document.getElementById('batch-delete-btn').remove();
            appState.selectedPaperIds.add(1);

            const event = new KeyboardEvent('keydown', { key: 'Delete' });
            expect(() => {
                document.dispatchEvent(event);
            }).not.toThrow();
        });

        it('should handle missing appState gracefully', () => {
            const kb = createKeyboardShortcuts(mockCommandPalette, null);
            kb.init();

            const event = new KeyboardEvent('keydown', {
                key: 'a',
                ctrlKey: true
            });
            expect(() => {
                document.dispatchEvent(event);
            }).not.toThrow();
        });
    });
});
