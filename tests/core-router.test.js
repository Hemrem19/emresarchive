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

vi.mock('../landing.view.js', () => ({
    landingView: {
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
        home: '<div>All Papers</div>',
        landing: '<div>Your Research, Fully Under Your Control</div>',
        details: '<div>Details</div>',
        add: '<div>Add Paper</div>',
        settings: '<div>Settings</div>',
        graph: '<div>Graph</div>',
        docs: '<div>Docs</div>'
    }
}));

vi.mock('../ui.js', () => ({
    highlightActiveSidebarLink: vi.fn(),
    showToast: vi.fn()
}));

vi.mock('../api/auth.js', () => ({
    verifyEmail: vi.fn(() => Promise.resolve()),
    getUser: vi.fn(() => ({ id: 1, email: 'test@example.com', emailVerified: false })),
    setAuth: vi.fn(),
    getAccessToken: vi.fn(() => 'mock-token')
}));

vi.mock('../auth.view.js', () => ({
    authView: {
        updateUIForAuthenticated: vi.fn()
    }
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

        // Mock AbortSignal.timeout for email verification tests
        if (!AbortSignal.timeout) {
            AbortSignal.timeout = vi.fn((timeout) => {
                const controller = new AbortController();
                setTimeout(() => controller.abort(), timeout);
                return controller.signal;
            });
        }
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

        it('should route to landing page for root path', async () => {
            window.location.hash = '#/';

            await router();
            // Advance fake timers to trigger mount callback
            vi.advanceTimersByTime(1);

            expect(appState.currentPath).toBe('/');
            // Router should render landing page
            expect(appElement.innerHTML).toContain('Your Research, Fully Under Your Control');
        });

        it('should route to dashboard for /app path', async () => {
            window.location.hash = '#/app';

            await router();
            // Advance fake timers to trigger mount callback
            vi.advanceTimersByTime(1);

            expect(appState.currentPath).toBe('/app');
            // Router should render home view (dashboard)
            expect(appElement.innerHTML).toContain('All Papers');
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
            window.location.hash = '#/app';
            global.confirm.mockReturnValueOnce(true);

            await router();
            // Advance timers to allow mount to be called
            vi.advanceTimersByTime(1);

            expect(appState.hasUnsavedChanges).toBe(false);
            expect(appState.currentPath).toBe('/app');
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
            window.location.hash = '#/app';

            await router();
            // Advance fake timers to trigger mount callback
            vi.advanceTimersByTime(1);

            // Should not throw - router should handle gracefully
            expect(appElement.innerHTML).toContain('All Papers');
        });

        it('should handle filter routes with tag', async () => {
            window.location.hash = '#/tag/ml';

            await router();
            vi.advanceTimersByTime(1);

            expect(appState.currentPath).toBe('/tag/ml');
        });

        it('should handle filter routes with status', async () => {
            window.location.hash = '#/status/Reading';

            await router();
            vi.advanceTimersByTime(1);

            expect(appState.currentPath).toBe('/status/Reading');
        });

        it('should handle filter routes with complex filters', async () => {
            window.location.hash = '#/filter/status:Reading,tag:ml';

            await router();
            vi.advanceTimersByTime(1);

            expect(appState.currentPath).toBe('/filter/status:Reading,tag:ml');
        });

        it('should show 404 for invalid routes', async () => {
            window.location.hash = '#/invalid-route';

            await router();

            expect(appElement.innerHTML).toContain('404');
            expect(appState.currentPath).toBe('/invalid-route');
        });

        it('should handle email verification route with token', async () => {
            window.location.hash = '#/verify-email?token=test-token-123';

            await router();

            expect(appElement.innerHTML).toContain('Verifying Email');
        });

        it('should handle email verification route without token', async () => {
            window.location.hash = '#/verify-email';

            await router();

            expect(appElement.innerHTML).toContain('Invalid Verification Link');
        });

        it('should prevent navigation when user cancels unsaved changes', async () => {
            // Set up initial state
            appState.hasUnsavedChanges = true;
            appState.currentPath = '/add';

            // Track hash changes properly
            let currentHash = '#/add';
            Object.defineProperty(window, 'location', {
                value: {
                    ...window.location,
                    get hash() {
                        return currentHash;
                    },
                    set hash(value) {
                        // Ensure hash always has '#' prefix
                        currentHash = value.startsWith('#') ? value : '#' + value;
                    }
                },
                writable: true,
                configurable: true
            });

            // User tries to navigate away
            window.location.hash = '#/dashboard';
            global.confirm.mockReturnValueOnce(false);

            await router();

            expect(global.confirm).toHaveBeenCalledWith('You have unsaved changes. Are you sure you want to leave?');
            // Hash should be reverted to original
            expect(window.location.hash).toBe('#/add');
        });

        it('should handle view mounting errors gracefully', async () => {
            const { dashboardView } = await import('../dashboard.view.js');
            dashboardView.mount.mockRejectedValueOnce(new Error('Mount error'));

            window.location.hash = '#/';

            // Should not throw
            await expect(router()).resolves.not.toThrow();
        });

        it('should parse details route ID correctly', async () => {
            window.location.hash = '#/details/42';

            await router();
            vi.advanceTimersByTime(1);

            const { detailsView } = await import('../details/index.js');
            expect(detailsView.mount).toHaveBeenCalledWith(42, expect.any(Object));
        });

        it('should parse edit route ID correctly', async () => {
            window.location.hash = '#/edit/99';

            await router();
            vi.advanceTimersByTime(1);

            const { formView } = await import('../form.view.js');
            expect(formView.mount).toHaveBeenCalledWith(99, expect.any(Object));
        });
    });

    describe('initializeRouter', () => {
        it('should add hashchange event listener', async () => {
            const { initializeRouter } = await import('../core/router.js');
            const router = vi.fn();

            const addEventListenerSpy = vi.spyOn(window, 'addEventListener');

            initializeRouter(router);

            expect(addEventListenerSpy).toHaveBeenCalledWith('hashchange', router);
            expect(addEventListenerSpy).toHaveBeenCalledWith('hashchange', expect.any(Function)); // highlightActiveSidebarLink
        });
    });
});

