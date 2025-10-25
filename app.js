import { openDB } from './db.js';
import { views as templates } from './views.js';
import { highlightActiveSidebarLink, sortPapers, renderPaperList } from './ui.js';
import { dashboardView } from './dashboard.view.js';
import { detailsView } from './details.view.js';
import { formView } from './form.view.js';
import { settingsView } from './settings.view.js';

document.addEventListener('DOMContentLoaded', async () => {

    // Helper function to render a view and execute post-render scripts
    const applyTheme = () => {
        const isDarkMode = localStorage.getItem('theme') === 'dark';
        if (isDarkMode) {
            document.documentElement.classList.add('dark');
        } else {
            document.documentElement.classList.remove('dark');
        }
    };

    applyTheme(); // Apply theme on initial load

    const app = document.getElementById('app');
    const appState = {
        allPapersCache: [],
        // Initialize hasUnsavedChanges to false. It will be set to true by formView if changes are made.
        // This flag is managed by the formView module.
        hasUnsavedChanges: false, 
        currentSortBy: localStorage.getItem('currentSortBy') || 'date_added',
        currentSearchTerm: localStorage.getItem('searchTerm') || '',
        currentPath: window.location.hash.substring(1) || '/',
        currentView: null,
    };
    
    const renderView = (viewContent, setupFn = null) => {
        app.innerHTML = viewContent;
        // Defer execution of setupFn to allow the browser to parse the new HTML and create DOM elements.
        // This prevents race conditions where view mount methods try to access elements not yet in the DOM.
        if (setupFn && typeof setupFn === 'function') {
            setTimeout(() => setupFn(), 0);
        }
    };

    // Function to handle browser's native beforeunload event
    const handleBeforeUnload = (event) => {
        // Only prompt if there are unsaved changes AND we are on the add/edit form
        if (appState.hasUnsavedChanges && (appState.currentPath.startsWith('/add') || appState.currentPath.startsWith('/edit/'))) {
            event.preventDefault();
            // Chrome requires returnValue to be set
            event.returnValue = ''; 
            return 'You have unsaved changes. Are you sure you want to leave?';
        }
        return undefined; // Allow navigation
    };

    // Helper to get papers filtered by current route (tag/status) and search input
    const getFilteredPapersByCurrentRoute = (papers) => {
        let filtered = [...papers];
        const path = window.location.hash;
        const searchTerm = appState.currentSearchTerm; // Use the global currentSearchTerm

        // Apply tag filter
        if (path.startsWith('#/tag/')) {
            const tag = decodeURIComponent(path.split('/')[2]);
            filtered = filtered.filter(p => p.tags && p.tags.includes(tag));
        }
        // Apply status filter
        else if (path.startsWith('#/status/')) {
            const status = decodeURIComponent(path.split('/')[2]);
            filtered = filtered.filter(p => p.readingStatus === status);
        }

        // Apply search filter
        if (searchTerm) {
            filtered = filtered.filter(paper => {
                const titleMatch = paper.title.toLowerCase().includes(searchTerm);
                const authorMatch = paper.authors.some(author => author.toLowerCase().includes(searchTerm));
                const tagMatch = paper.tags?.some(tag => tag.toLowerCase().includes(searchTerm));
                const notesMatch = paper.notes?.toLowerCase().includes(searchTerm);
                return titleMatch || authorMatch || tagMatch || notesMatch;
            });
        }
        return filtered;
    };

    // Helper to apply current filters and sort, then render the list
    const applyFiltersAndRender = () => {
        let filteredPapers = getFilteredPapersByCurrentRoute(appState.allPapersCache);
        
        const sortedPapers = sortPapers(filteredPapers, appState.currentSortBy);
        renderPaperList(sortedPapers);
    };

    // --- GLOBAL EVENT LISTENERS ---
    const searchInput = document.getElementById('search-input');
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            appState.currentSearchTerm = e.target.value.toLowerCase().trim(); // Update global state
            localStorage.setItem('searchTerm', appState.currentSearchTerm); // Persist to localStorage

            // If not on a dashboard-like view, navigate to home to show results. (Improved condition)
            // The router will then call setupDashboard, which will apply the filters.
            if (window.location.hash !== '#/' && !window.location.hash.startsWith('#/tag/') && !window.location.hash.startsWith('#/status/')) {
                window.location.hash = '#/'; // Navigate to home
            } else {
                // If already on a dashboard-like view, just re-render with the new search term
                applyFiltersAndRender(); // Re-filter and re-render using the updated appState.currentSearchTerm
            }
        });
    }

    // --- Mobile Sidebar Logic ---
    const mobileMenuBtn = document.getElementById('mobile-menu-btn');
    const closeMobileMenuBtn = document.getElementById('close-mobile-menu-btn');
    const mobileSidebar = document.getElementById('mobile-sidebar');
    const mobileSidebarOverlay = document.getElementById('mobile-sidebar-overlay');

    const openMobileMenu = () => {
        mobileSidebar.classList.remove('-translate-x-full');
        mobileSidebarOverlay.classList.remove('hidden');
    };

    const closeMobileMenu = () => {
        mobileSidebar.classList.add('-translate-x-full');
        mobileSidebarOverlay.classList.add('hidden');
    };

    if (mobileMenuBtn && closeMobileMenuBtn && mobileSidebar && mobileSidebarOverlay) {
        mobileMenuBtn.addEventListener('click', openMobileMenu);
        closeMobileMenuBtn.addEventListener('click', closeMobileMenu);
        mobileSidebarOverlay.addEventListener('click', closeMobileMenu);
        // Close menu when a link inside it is clicked
        mobileSidebar.addEventListener('click', (e) => {
            if (e.target.closest('a')) {
                closeMobileMenu();
            }
        });
    }

    // --- ROUTER ---
    const router = async () => { // Made async to allow await for confirm
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
            window.removeEventListener('beforeunload', handleBeforeUnload); // Remove listener as we are leaving the form
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
            renderView(templates.add, () => appState.currentView.mount(null, appState));
        } else if (requestedPath.startsWith('/details/')) {
            const id = parseInt(requestedPath.split('/')[2], 10);
            appState.currentView = detailsView; // Set the new current view
            renderView(templates.details, () => appState.currentView.mount(id, appState));
        } else if (requestedPath.startsWith('/edit/')) {
            const id = parseInt(requestedPath.split('/')[2], 10);
            appState.currentView = formView;
            renderView(templates.add, () => appState.currentView.mount(id, appState));
        } else if (requestedPath === '/settings') {
            appState.currentView = settingsView;
            renderView(templates.settings, () => appState.currentView.mount(appState));
        } else if (requestedPath === '/' || requestedPath.startsWith('/tag/') || requestedPath.startsWith('/status/')) {
            appState.currentView = dashboardView; // Set the new current view
            // All dashboard-like views
            renderView(templates.home, async () => {
                await appState.currentView.mount(appState, applyFiltersAndRender);
                applyFiltersAndRender(); // This now handles the initial render correctly
            });
        } else {
            renderView(`<h1>404 - Not Found</h1>`);
        }
    };

    // Listen for hash changes to update the view
    window.addEventListener('hashchange', router);
    window.addEventListener('hashchange', highlightActiveSidebarLink); // This should be called inside the router after a view is rendered

    // Initialize the database first, then run the initial routing and setup.
    openDB().then(() => {
        console.log('IndexedDB initialized.');
        router(); // Initial load
        highlightActiveSidebarLink(); // Also highlight on initial load
    }).catch(console.error);
});