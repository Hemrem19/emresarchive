// core/router.js
// Client-side Routing and Navigation

import { dashboardView } from '../dashboard.view.js';
import { detailsView } from '../details/index.js';
import { formView } from '../form.view.js';
import { settingsView } from '../settings.view.js';
import { graphView } from '../graph.view.js';
import { docsView } from '../docs.view.js';
import { views as templates } from '../views/index.js';
import { highlightActiveSidebarLink } from '../ui.js';
import { parseUrlHash, applyFiltersAndRender } from './filters.js';

/**
 * Renders a view by setting innerHTML and executing a setup function
 * 
 * @param {HTMLElement} app - The main app container element
 * @param {string} viewContent - HTML content to render
 * @param {Function} setupFn - Optional setup/mount function to call after render
 */
export const renderView = (app, viewContent, setupFn = null) => {
    app.innerHTML = viewContent;
    // Defer execution of setupFn to allow the browser to parse the new HTML and create DOM elements.
    // This prevents race conditions where view mount methods try to access elements not yet in the DOM.
    if (setupFn && typeof setupFn === 'function') {
        setTimeout(() => setupFn(), 0);
    }
};

/**
 * Handler for browser beforeunload event to warn about unsaved changes
 * 
 * @param {Event} event - The beforeunload event
 * @param {Object} appState - Application state object
 * @returns {string|undefined} Warning message or undefined
 */
export const handleBeforeUnload = (event, appState) => {
    // Only prompt if there are unsaved changes AND we are on the add/edit form
    if (appState.hasUnsavedChanges && (appState.currentPath.startsWith('/add') || appState.currentPath.startsWith('/edit/'))) {
        event.preventDefault();
        // Chrome requires returnValue to be set
        event.returnValue = '';
        return 'You have unsaved changes. Are you sure you want to leave?';
    }
    return undefined; // Allow navigation
};

/**
 * Main router function that handles URL hash changes and view rendering
 * 
 * @param {HTMLElement} app - The main app container element
 * @param {Object} appState - Application state object
 * @param {Function} renderSidebarStatusLinks - Function to re-render sidebar status links
 */
export const createRouter = (app, appState, renderSidebarStatusLinks) => {
    return async () => { // Made async to allow await for confirm
        // Get the hash from the URL, remove the '#'
        const requestedPath = window.location.hash.substring(1) || '/';

        // Check for unsaved changes before navigating away from add/edit form
        if (appState.hasUnsavedChanges && (appState.currentPath.startsWith('/add') || appState.currentPath.startsWith('/edit/')) && requestedPath !== appState.currentPath) {
            const confirmNavigation = confirm('You have unsaved changes. Are you sure you want to leave?');
            if (!confirmNavigation) {
                // User cancelled navigation, revert hash to current path
                window.location.hash = appState.currentPath;
                return;
            }
            // If user confirmed, reset unsaved changes flag
            appState.hasUnsavedChanges = false;
            window.removeEventListener('beforeunload', (e) => handleBeforeUnload(e, appState)); // Remove listener as we are leaving the form
        }

        // Unmount the previous view if it has an unmount method
        if (appState.currentView && typeof appState.currentView.unmount === 'function') {
            appState.currentView.unmount(appState);
            appState.currentView = null; // Clear the current view
        }

        // CRITICAL FIX: Update the current path *before* rendering the new view.
        appState.currentPath = requestedPath;

        // Simple routing logic
        if (requestedPath === '/add') {
            appState.currentView = formView;
            renderView(app, templates.add, () => appState.currentView.mount(null, appState));
        } else if (requestedPath.startsWith('/details/')) {
            const id = parseInt(requestedPath.split('/')[2], 10);
            appState.currentView = detailsView; // Set the new current view
            renderView(app, templates.details, () => appState.currentView.mount(id, appState));
        } else if (requestedPath.startsWith('/edit/')) {
            const id = parseInt(requestedPath.split('/')[2], 10);
            appState.currentView = formView;
            renderView(app, templates.add, () => appState.currentView.mount(id, appState));
        } else if (requestedPath === '/settings') {
            appState.currentView = settingsView;
            renderView(app, templates.settings, async () => {
                await appState.currentView.mount(appState);
                renderSidebarStatusLinks(); // Re-render in case order changed
            });
        } else if (requestedPath === '/graph') {
            appState.currentView = graphView;
            renderView(app, templates.graph, () => appState.currentView.mount(appState));
        } else if (requestedPath === '/docs' || requestedPath.startsWith('/docs')) {
            appState.currentView = docsView;
            renderView(app, templates.docs, () => appState.currentView.mount(appState));
        } else if (requestedPath.startsWith('/verify-email')) {
            // Handle email verification - extract token from hash query string
            const hashQueryString = requestedPath.split('?')[1] || '';
            const hashParams = new URLSearchParams(hashQueryString);
            const token = hashParams.get('token');

            if (token) {
                // Show verification loading state
                renderView(app, `
                    <div class="flex items-center justify-center min-h-screen">
                        <div class="text-center">
                            <div class="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-primary mb-4"></div>
                            <h2 class="text-xl font-semibold text-stone-900 dark:text-stone-100 mb-2">Verifying Email...</h2>
                            <p class="text-stone-600 dark:text-stone-400">Please wait while we verify your email address.</p>
                        </div>
                    </div>
                `);

                // Handle email verification
                try {
                    const { verifyEmail } = await import('../api/auth.js');
                    const { showToast } = await import('../ui.js');
                    const { getUser, setAuth, getAccessToken } = await import('../api/auth.js');

                    // Verify email
                    await verifyEmail(token);

                    // Update user data if logged in
                    if (getAccessToken()) {
                        const user = getUser();
                        if (user) {
                            user.emailVerified = true;
                            setAuth(getAccessToken(), user);
                            // Import authView to update UI
                            const { authView } = await import('../auth.view.js');
                            authView.updateUIForAuthenticated(user);
                        }
                    }

                    // Show success message and redirect
                    showToast('Email verified successfully!', 'success');
                    setTimeout(() => {
                        window.location.hash = '#/';
                        window.location.search = ''; // Remove any query params from URL
                    }, 2000);
                } catch (error) {
                    const { showToast } = await import('../ui.js');
                    showToast(error.message || 'Email verification failed', 'error');

                    // Show error state
                    renderView(app, `
                        <div class="flex items-center justify-center min-h-screen">
                            <div class="text-center max-w-md mx-auto px-4">
                                <div class="inline-block rounded-full bg-red-100 dark:bg-red-900 p-4 mb-4">
                                    <span class="material-symbols-outlined text-red-600 dark:text-red-400 text-4xl">error</span>
                                </div>
                                <h2 class="text-xl font-semibold text-stone-900 dark:text-stone-100 mb-2">Verification Failed</h2>
                                <p class="text-stone-600 dark:text-stone-400 mb-4">${error.message || 'Email verification failed. The link may have expired or is invalid.'}</p>
                                <a href="#/" class="inline-block px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors">
                                    Go to Dashboard
                                </a>
                            </div>
                        </div>
                    `);

                    setTimeout(() => {
                        window.location.hash = '#/';
                        window.location.search = '';
                    }, 5000);
                }
            } else {
                // No token in URL - show error
                renderView(app, `
                    <div class="flex items-center justify-center min-h-screen">
                        <div class="text-center max-w-md mx-auto px-4">
                            <div class="inline-block rounded-full bg-yellow-100 dark:bg-yellow-900 p-4 mb-4">
                                <span class="material-symbols-outlined text-yellow-600 dark:text-yellow-400 text-4xl">warning</span>
                            </div>
                            <h2 class="text-xl font-semibold text-stone-900 dark:text-stone-100 mb-2">Invalid Verification Link</h2>
                            <p class="text-stone-600 dark:text-stone-400 mb-4">No verification token found in the URL. Please check your email for the correct link.</p>
                            <a href="#/" class="inline-block px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors">
                                Go to Dashboard
                            </a>
                        </div>
                    </div>
                `);
            }
        } else if (requestedPath === '/' || requestedPath.startsWith('/tag/') || requestedPath.startsWith('/status/') || requestedPath.startsWith('/filter/')) {
            // Parse URL hash to update filters
            parseUrlHash(appState);

            appState.currentView = dashboardView; // Set the new current view
            // All dashboard-like views
            renderView(app, templates.home, async () => {
                await appState.currentView.mount(appState, () => applyFiltersAndRender(appState));
                applyFiltersAndRender(appState); // This now handles the initial render correctly
            });
        } else {
            renderView(app, `<h1>404 - Not Found</h1>`);
        }
    };
};

/**
 * Initializes the router by setting up event listeners
 * 
 * @param {Function} router - The router function
 */
export const initializeRouter = (router) => {
    // Listen for hash changes to update the view
    window.addEventListener('hashchange', router);
    window.addEventListener('hashchange', highlightActiveSidebarLink);
};

