import { openDB } from './db.js';
import { views as templates } from './views.js';
import { highlightActiveSidebarLink } from './ui.js';
import { getStatusOrder } from './config.js';

// Import refactored core modules
import { createAppState } from './core/state.js';
import { updateUrlHash, applyFiltersAndRender } from './core/filters.js';
import { createRouter, renderView, handleBeforeUnload, initializeRouter } from './core/router.js';
import { createCommandPalette } from './core/commandPalette.js';
import { createKeyboardShortcuts } from './core/keyboardShortcuts.js';

document.addEventListener('DOMContentLoaded', async () => {

    // --- Theme Management ---
    const applyTheme = () => {
        const isDarkMode = localStorage.getItem('theme') === 'dark';
        if (isDarkMode) {
            document.documentElement.classList.add('dark');
        } else {
            document.documentElement.classList.remove('dark');
        }
    };

    applyTheme(); // Apply theme on initial load
    
    // --- Sidebar Status Links Rendering ---
    const renderSidebarStatusLinks = () => {
        const desktopList = document.getElementById('sidebar-status-list');
        const mobileList = document.getElementById('mobile-sidebar-status-list');
        const statusOrder = getStatusOrder();
        const statusColors = {
            'Reading': 'bg-blue-500',
            'To Read': 'bg-yellow-500',
            'Finished': 'bg-green-500',
            'Archived': 'bg-stone-500',
        };

        const linksHtml = statusOrder.map(status => `
            <a href="#/status/${encodeURIComponent(status)}" data-status="${status}" class="sidebar-status-link flex items-center gap-3 px-3 py-2 rounded-lg text-stone-500 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-100 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors">
                <span class="h-2 w-2 rounded-full ${statusColors[status] || 'bg-gray-400'}"></span>
                <span class="text-sm font-medium">${status}</span>
            </a>
        `).join('');

        if (desktopList) desktopList.innerHTML = linksHtml;
        if (mobileList) mobileList.innerHTML = linksHtml;
    };

    renderSidebarStatusLinks(); // Initial render on page load
    
    // --- Initialize Application State ---
    const app = document.getElementById('app');
    const appState = createAppState();
    
    // --- Initialize Command Palette ---
    const commandPalette = createCommandPalette(appState);
    commandPalette.init();

    // --- Initialize Keyboard Shortcuts ---
    const keyboardShortcuts = createKeyboardShortcuts(commandPalette);
    keyboardShortcuts.init();

    // --- Sidebar Filter Toggle Logic ---
    // Intercept clicks on sidebar status and tag links to toggle filters instead of replacing
    document.addEventListener('click', (e) => {
        const statusLink = e.target.closest('.sidebar-status-link');
        const tagLink = e.target.closest('.sidebar-tag');
        const allPapersLink = e.target.closest('.sidebar-all-papers-link');

        if (statusLink) {
            e.preventDefault();
            const status = statusLink.dataset.status;
            
            // Toggle: if clicking the same status, remove it; otherwise set/change it
            if (appState.activeFilters.status === status) {
                appState.activeFilters.status = null;
            } else {
                appState.activeFilters.status = status;
            }
            
            appState.pagination.currentPage = 1; // Reset to first page when filter changes
            updateUrlHash(appState);
            applyFiltersAndRender(appState);
        } else if (tagLink) {
            e.preventDefault();
            const tag = tagLink.dataset.tag;
            
            // Toggle: if tag is already selected, remove it; otherwise add it
            const tagIndex = appState.activeFilters.tags.indexOf(tag);
            if (tagIndex > -1) {
                // Tag is already selected, remove it
                appState.activeFilters.tags.splice(tagIndex, 1);
            } else {
                // Tag is not selected, add it
                appState.activeFilters.tags.push(tag);
            }
            
            appState.pagination.currentPage = 1; // Reset to first page when filter changes
            updateUrlHash(appState);
            applyFiltersAndRender(appState);
        } else if (allPapersLink) {
            e.preventDefault();
            // Clear all filters
            appState.activeFilters.status = null;
            appState.activeFilters.tags = [];
            appState.currentSearchTerm = '';
            // Clear search input
            const searchInput = document.getElementById('search-input');
            if (searchInput) searchInput.value = '';
            appState.pagination.currentPage = 1; // Reset to first page
            updateUrlHash(appState);
            applyFiltersAndRender(appState);
        }
    });

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

    // --- Router Initialization ---
    const router = createRouter(app, appState, renderSidebarStatusLinks);
    initializeRouter(router);

    // --- Database Initialization & Initial Routing ---
    openDB().then(() => {
        console.log('IndexedDB initialized.');
        router(); // Initial load
        highlightActiveSidebarLink(); // Also highlight on initial load
    }).catch(console.error);
});
