/**
 * Tests for core/router.js - Client-side Routing
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderView, handleBeforeUnload, createRouter } from '../core/router.js';

// Mock view modules
vi.mock('../dashboard.view.js', () => ({
    dashboardView: {
        mount: vi.fn(),
        unmount: vi.fn()
    }
}));

vi.mock('../details/index.js', () => ({
    detailsView: {
        mount: vi.fn(),
        unmount: vi.fn()
    }
}));

vi.mock('../form.view.js', () => ({
    formView: {
        mount: vi.fn(),
        unmount: vi.fn()
    }
}));

vi.mock('../settings.view.js', () => ({
    settingsView: {
        mount: vi.fn(() => Promise.resolve())
    }
}));

vi.mock('../graph.view.js', () => ({
    graphView: {
        mount: vi.fn(),
        unmount: vi.fn()
    }
}));

vi.mock('../docs.view.js', () => ({
    docsView: {
        mount: vi.fn(),
        unmount: vi.fn()
    }
}));

vi.mock('../views/index.js', () => ({
    views: {
        home: '<div>Dashboard</div>',
        details: '<div>Details</div>',
        add: '<div>Add Paper</div>',
        settings: '<div>Settings</div>',
        graph: '<div>Graph</div>',
        docs: '<div>Docs</div>'
    }
}));

vi.mock('../ui.js', () => ({
    highlightActiveSidebarLink: vi.fn()
}));

vi.mock('../core/filters.js', () => ({
    parseUrlHash: vi.fn((appState) => {
        // Update appState with parsed hash
        const hash = window.location.hash.substring(1) || '/';
        appState.currentPath = hash;
    }),
    applyFiltersAndRender: vi.fn()
}));

describe('core/router.js - Router Functions', () => {
    let appElement;

    beforeEach(() => {
        vi.clearAllMocks();
        vi.useFakeTimers();

        // Create mock app element
        appElement = document.createElement('div');
        appElement.id = 'app';
        document.body.appendChild(appElement);

        // Mock window.location.hash
        Object.defineProperty(window, 'location', {
            value: { hash: '#/' },
            writable: true
        });

        // Mock confirm
        global.confirm = vi.fn(() => true);
    });

    afterEach(() => {
        vi.useRealTimers();
        if (appElement && appElement.parentNode) {
            appElement.parentNode.removeChild(appElement);
        }
    });

    describe('renderView', () => {
        it('should set innerHTML of app element', () => {
            renderView(appElement, '<div>Test Content</div>');
            expect(appElement.innerHTML).toBe('<div>Test Content</div>');
        });

        it('should call setup function after render', () => {
            const setupFn = vi.fn();
            renderView(appElement, '<div>Test</div>', setupFn);

            // Setup function should be called asynchronously
            expect(setupFn).not.toHaveBeenCalled();

            // Fast-forward timers
            vi.advanceTimersByTime(1);
            expect(setupFn).toHaveBeenCalled();
        });

        it('should not call setup function if not provided', () => {
            const setupFn = vi.fn();
            renderView(appElement, '<div>Test</div>');

            vi.advanceTimersByTime(1);
            expect(setupFn).not.toHaveBeenCalled();
        });

        it('should not call setup function if not a function', () => {
            renderView(appElement, '<div>Test</div>', 'not a function');
            vi.advanceTimersByTime(1);
            // Should not throw
            expect(appElement.innerHTML).toBe('<div>Test</div>');
        });
    });

    describe('handleBeforeUnload', () => {
        it('should return warning message when unsaved changes on add form', () => {
            const event = {
                preventDefault: vi.fn(),
                returnValue: ''
            };
            const appState = {
                hasUnsavedChanges: true,
                currentPath: '/add'
            };

            const result = handleBeforeUnload(event, appState);

            expect(event.preventDefault).toHaveBeenCalled();
            expect(event.returnValue).toBe('');
            expect(result).toBe('You have unsaved changes. Are you sure you want to leave?');
        });

        it('should return warning message when unsaved changes on edit form', () => {
            const event = {
                preventDefault: vi.fn(),
                returnValue: ''
            };
            const appState = {
                hasUnsavedChanges: true,
                currentPath: '/edit/1'
            };

            const result = handleBeforeUnload(event, appState);

            expect(event.preventDefault).toHaveBeenCalled();
            expect(result).toBe('You have unsaved changes. Are you sure you want to leave?');
        });

        it('should return undefined when no unsaved changes', () => {
            const event = {
                preventDefault: vi.fn(),
                returnValue: ''
            };
            const appState = {
                hasUnsavedChanges: false,
                currentPath: '/add'
            };

            const result = handleBeforeUnload(event, appState);

            expect(event.preventDefault).not.toHaveBeenCalled();
            expect(result).toBeUndefined();
        });

        it('should return undefined when not on add/edit form', () => {
            const event = {
                preventDefault: vi.fn(),
                returnValue: ''
            };
            const appState = {
                hasUnsavedChanges: true,
                currentPath: '/dashboard'
            };

            const result = handleBeforeUnload(event, appState);

            expect(event.preventDefault).not.toHaveBeenCalled();
            expect(result).toBeUndefined();
        });
    });

    describe('createRouter', () => {
        let appState;
        let router;
        let renderSidebarStatusLinks;

        beforeEach(() => {
            appState = {
                currentPath: '/',
                currentView: null,
                hasUnsavedChanges: false
            };
            renderSidebarStatusLinks = vi.fn();
            router = createRouter(appElement, appState, renderSidebarStatusLinks);
        });

        it('should route to dashboard for root path', async () => {
            window.location.hash = '#/';

            await router();
            // Advance fake timers to trigger mount callback
            vi.advanceTimersByTime(1);

            expect(appState.currentPath).toBe('/');
            // Router should render home view (dashboard)
            expect(appElement.innerHTML).toContain('Dashboard');
        });

        it('should route to add form', async () => {
            window.location.hash = '#/add';

            await router();

            expect(appElement.innerHTML).toContain('Add Paper');
            expect(appState.currentPath).toBe('/add');
        });

        it('should route to details view with ID', async () => {
            window.location.hash = '#/details/1';

            await router();

            expect(appElement.innerHTML).toContain('Details');
            expect(appState.currentPath).toBe('/details/1');
        });

        it('should route to edit form with ID', async () => {
            window.location.hash = '#/edit/1';

            await router();

            expect(appElement.innerHTML).toContain('Add Paper');
            expect(appState.currentPath).toBe('/edit/1');
        });

        it('should route to settings', async () => {
            window.location.hash = '#/settings';

            await router();

            expect(appElement.innerHTML).toContain('Settings');
            expect(appState.currentPath).toBe('/settings');
        });

        it('should route to graph view', async () => {
            window.location.hash = '#/graph';

            await router();

            expect(appElement.innerHTML).toContain('Graph');
            expect(appState.currentPath).toBe('/graph');
        });

        it('should route to docs view', async () => {
            window.location.hash = '#/docs';

            await router();

            expect(appElement.innerHTML).toContain('Docs');
            expect(appState.currentPath).toBe('/docs');
        });

        it('should allow navigation when user confirms unsaved changes', async () => {
            const { formView } = await import('../form.view.js');
            const { dashboardView } = await import('../dashboard.view.js');

            appState.currentView = formView;
            appState.hasUnsavedChanges = true;
            appState.currentPath = '/add';
            window.location.hash = '#/';
            global.confirm.mockReturnValueOnce(true);

            await router();
            // Advance timers to allow mount to be called
            vi.advanceTimersByTime(1);

            expect(appState.hasUnsavedChanges).toBe(false);
            expect(appState.currentPath).toBe('/');
            expect(formView.unmount).toHaveBeenCalled();
            expect(dashboardView.mount).toHaveBeenCalled();
        });

        it('should unmount previous view before mounting new one', async () => {
            const { dashboardView } = await import('../dashboard.view.js');
            const { detailsView } = await import('../details/index.js');

            appState.currentView = dashboardView;
            window.location.hash = '#/details/1';

            await router();
            // Advance timers to allow mount to be called  
            vi.advanceTimersByTime(1);

            expect(dashboardView.unmount).toHaveBeenCalled();
            expect(detailsView.mount).toHaveBeenCalled();
        });

        it('should not unmount if current view has no unmount method', async () => {
            appState.currentView = { mount: vi.fn() }; // No unmount method
            window.location.hash = '#/';

            await router();
            // Advance fake timers to trigger mount callback
            vi.advanceTimersByTime(1);

            // Should not throw - router should handle gracefully
            expect(appElement.innerHTML).toContain('Dashboard');
        });
    });
});

