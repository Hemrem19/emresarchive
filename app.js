import { openDB } from './db.js';
import { views as templates } from './views/index.js';
import { highlightActiveSidebarLink } from './ui.js';
import { getStatusOrder } from './config.js';
import { authView } from './auth.view.js';

// Import refactored core modules
import { createAppState } from './core/state.js';
import { updateUrlHash, applyFiltersAndRender } from './core/filters.js';
import { createRouter, renderView, handleBeforeUnload, initializeRouter } from './core/router.js';
import { createCommandPalette } from './core/commandPalette.js';
import { createKeyboardShortcuts } from './core/keyboardShortcuts.js';
import { initializeAutoSync } from './core/syncManager.js';

// Register Service Worker for PWA
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('./service-worker.js')
            .then(registration => {
                console.log('ServiceWorker registration successful with scope: ', registration.scope);
            })
            .catch(err => {
                console.log('ServiceWorker registration failed: ', err);
            });
    });
}

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
            <a href="#/app/status/${encodeURIComponent(status)}" data-status="${status}" class="sidebar-status-link flex items-center gap-3 px-3 py-2 rounded-lg text-stone-500 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-100 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors">
                <span class="h-2 w-2 rounded-full ${statusColors[status] || 'bg-gray-400'}"></span>
                <span class="text-sm font-medium">${status}</span>
            </a>
        `).join('');

    if (desktopList) desktopList.innerHTML = linksHtml;
    if (mobileList) mobileList.innerHTML = linksHtml;
};

renderSidebarStatusLinks(); // Initial render on page load

// Make renderSidebarStatusLinks available globally for re-initialization
if (typeof window !== 'undefined') {
    window.renderSidebarStatusLinks = renderSidebarStatusLinks;
}

// --- Authentication Initialization ---
authView.mount().then(() => {
    console.log('Authentication view initialized');

    // Note: Email verification is now handled by the router
    // The router will detect #/verify-email?token=... and handle it
}).catch(console.error);

// --- Global Logout Handler ---
window.addEventListener('auth:logout', () => {
    console.warn('Global logout event received. Showing login modal.');
    authView.open('login');
});

// --- Initialize Application State ---
const app = document.getElementById('app');
const appState = createAppState();

// --- Initialize Command Palette ---
const commandPalette = createCommandPalette(appState);
commandPalette.init();

// --- Initialize Keyboard Shortcuts ---
const keyboardShortcuts = createKeyboardShortcuts(commandPalette, appState);
keyboardShortcuts.init();

// --- Search Input Listener ---
const searchInput = document.getElementById('search-input');
if (searchInput) {
    searchInput.addEventListener('input', (e) => {
        appState.currentSearchTerm = e.target.value.trim();
        appState.pagination.currentPage = 1; // Reset to first page when search changes
        updateUrlHash(appState);
        applyFiltersAndRender(appState);
    });
}

// --- Sidebar Filter Toggle Logic ---
// Intercept clicks on sidebar status and tag links to toggle filters instead of replacing
document.addEventListener('click', (e) => {
    const statusLink = e.target.closest('.sidebar-status-link');
    const tagLink = e.target.closest('.sidebar-tag');
    const allPapersLink = e.target.closest('.sidebar-all-papers-link');

    if (statusLink) {
        e.preventDefault();
        e.stopPropagation(); // Prevent router from handling this
        const status = statusLink.dataset.status;

        // Toggle: if clicking the same status, remove it; otherwise set/change it
        if (appState.activeFilters.status === status) {
            appState.activeFilters.status = null;
        } else {
            appState.activeFilters.status = status;
        }

        appState.pagination.currentPage = 1; // Reset to first page when filter changes
        
        // Use updateUrlHash to preserve existing tags when changing status
        // This creates a compound filter URL if tags exist, or single status URL if no tags
        updateUrlHash(appState);
        // The hash change will trigger the router which will call parseUrlHash and applyFiltersAndRender
    } else if (tagLink) {
        e.preventDefault();
        e.stopPropagation(); // Prevent router from handling this
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
        // Update URL hash to reflect current filters
        updateUrlHash(appState);
        // The hash change will trigger the router which will call applyFiltersAndRender
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
let mobileMenuBtn = null;
let closeMobileMenuBtn = null;
let mobileSidebar = null;
let mobileSidebarOverlay = null;

const openMobileMenu = () => {
    if (mobileSidebar && mobileSidebarOverlay) {
        mobileSidebar.classList.remove('-translate-x-full');
        mobileSidebarOverlay.classList.remove('hidden', 'opacity-0', 'pointer-events-none');
        mobileSidebarOverlay.classList.add('opacity-100', 'pointer-events-auto');
    }
};

const closeMobileMenu = () => {
    if (mobileSidebar && mobileSidebarOverlay) {
        mobileSidebar.classList.add('-translate-x-full');
        mobileSidebarOverlay.classList.remove('opacity-100', 'pointer-events-auto');
        mobileSidebarOverlay.classList.add('opacity-0', 'pointer-events-none');
        // Slight delay to hide completely after transition
        setTimeout(() => {
            if (mobileSidebar && mobileSidebar.classList.contains('-translate-x-full')) {
                mobileSidebarOverlay.classList.add('hidden');
            }
        }, 300);
    }
};

// Initialize mobile menu handlers
const initializeMobileMenu = () => {
    // Get fresh references to elements (they might have been hidden/shown)
    const newMobileMenuBtn = document.getElementById('mobile-menu-btn');
    const newCloseMobileMenuBtn = document.getElementById('close-mobile-menu-btn');
    const newMobileSidebar = document.getElementById('mobile-sidebar');
    const newMobileSidebarOverlay = document.getElementById('mobile-sidebar-overlay');

    // Only initialize if elements exist (app shell is visible)
    if (!newMobileMenuBtn || !newCloseMobileMenuBtn || !newMobileSidebar || !newMobileSidebarOverlay) {
        return; // Elements not available yet
    }

    // Remove existing listeners by cloning nodes (clean way to remove all listeners)
    if (mobileMenuBtn && mobileMenuBtn.parentNode) {
        const clonedBtn = mobileMenuBtn.cloneNode(true);
        mobileMenuBtn.replaceWith(clonedBtn);
    }
    if (closeMobileMenuBtn && closeMobileMenuBtn.parentNode) {
        const clonedBtn = closeMobileMenuBtn.cloneNode(true);
        closeMobileMenuBtn.replaceWith(clonedBtn);
    }
    if (mobileSidebarOverlay && mobileSidebarOverlay.parentNode) {
        const clonedOverlay = mobileSidebarOverlay.cloneNode(true);
        mobileSidebarOverlay.replaceWith(clonedOverlay);
    }

    // Update references to the new cloned elements
    mobileMenuBtn = document.getElementById('mobile-menu-btn');
    closeMobileMenuBtn = document.getElementById('close-mobile-menu-btn');
    mobileSidebar = document.getElementById('mobile-sidebar');
    mobileSidebarOverlay = document.getElementById('mobile-sidebar-overlay');

    // Attach event listeners
    if (mobileMenuBtn) {
        mobileMenuBtn.addEventListener('click', openMobileMenu);
    }
    if (closeMobileMenuBtn) {
        closeMobileMenuBtn.addEventListener('click', closeMobileMenu);
    }
    if (mobileSidebarOverlay) {
        mobileSidebarOverlay.addEventListener('click', closeMobileMenu);
    }
    // Close menu when a link inside it is clicked
    if (mobileSidebar) {
        mobileSidebar.addEventListener('click', (e) => {
            if (e.target.closest('a')) {
                closeMobileMenu();
            }
        });
    }
};

// Initialize on DOMContentLoaded
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeMobileMenu);
} else {
    initializeMobileMenu();
}

// Re-initialize when app shell becomes visible (e.g., navigating from landing page)
window.addEventListener('app-shell-visible', initializeMobileMenu);

// --- Swipe Gesture for Mobile Sidebar (Left to Right) ---
let touchStartX = 0;
let touchStartY = 0;
let touchStartTime = 0;
const SWIPE_THRESHOLD = 50; // Minimum distance for swipe
const SWIPE_VELOCITY_THRESHOLD = 0.3; // Minimum velocity (px/ms)
const EDGE_ZONE = 20; // Distance from left edge to trigger swipe
const MAX_VERTICAL_DIFF = 100; // Maximum vertical movement to consider it a horizontal swipe

const handleTouchStart = (e) => {
    // Get fresh reference in case element was recreated
    if (!mobileSidebar) {
        mobileSidebar = document.getElementById('mobile-sidebar');
    }
    // Only handle swipe if sidebar is closed
    if (mobileSidebar && mobileSidebar.classList.contains('-translate-x-full')) {
        touchStartX = e.touches[0].clientX;
        touchStartY = e.touches[0].clientY;
        touchStartTime = Date.now();
    }
};

const handleTouchMove = (e) => {
    // Get fresh reference in case element was recreated
    if (!mobileSidebar) {
        mobileSidebar = document.getElementById('mobile-sidebar');
    }
    // Prevent default scrolling if we're in a potential swipe gesture
    if (mobileSidebar && mobileSidebar.classList.contains('-translate-x-full')) {
        const currentX = e.touches[0].clientX;
        const currentY = e.touches[0].clientY;

        // Check if starting from left edge and moving right
        if (touchStartX <= EDGE_ZONE && currentX > touchStartX) {
            const horizontalDiff = currentX - touchStartX;
            const verticalDiff = Math.abs(currentY - touchStartY);

            // Only prevent default if horizontal movement is significant and vertical is minimal
            if (horizontalDiff > 10 && verticalDiff < MAX_VERTICAL_DIFF) {
                e.preventDefault();
            }
        }
    }
};

const handleTouchEnd = (e) => {
    // Get fresh reference in case element was recreated
    if (!mobileSidebar) {
        mobileSidebar = document.getElementById('mobile-sidebar');
    }
    if (!mobileSidebar || !mobileSidebar.classList.contains('-translate-x-full')) {
        return;
    }

    const touchEndX = e.changedTouches[0].clientX;
    const touchEndY = e.changedTouches[0].clientY;
    const touchEndTime = Date.now();

    const horizontalDiff = touchEndX - touchStartX;
    const verticalDiff = Math.abs(touchEndY - touchStartY);
    const timeDiff = touchEndTime - touchStartTime;
    const velocity = timeDiff > 0 ? horizontalDiff / timeDiff : 0;

    // Check if swipe started from left edge, moved right, exceeds threshold, and is primarily horizontal
    if (
        touchStartX <= EDGE_ZONE &&
        horizontalDiff > SWIPE_THRESHOLD &&
        verticalDiff < MAX_VERTICAL_DIFF &&
        (horizontalDiff > SWIPE_THRESHOLD || velocity > SWIPE_VELOCITY_THRESHOLD)
    ) {
        openMobileMenu();
    }
};

// Touch event listener management
let touchListenersAdded = false;

const addTouchListeners = () => {
    if (!touchListenersAdded && window.innerWidth < 1024) {
        document.body.addEventListener('touchstart', handleTouchStart, { passive: true });
        document.body.addEventListener('touchmove', handleTouchMove, { passive: false });
        document.body.addEventListener('touchend', handleTouchEnd, { passive: true });
        touchListenersAdded = true;
    }
};

const removeTouchListeners = () => {
    if (touchListenersAdded) {
        document.body.removeEventListener('touchstart', handleTouchStart);
        document.body.removeEventListener('touchmove', handleTouchMove);
        document.body.removeEventListener('touchend', handleTouchEnd);
        touchListenersAdded = false;
    }
};

// Add listeners initially if on mobile
addTouchListeners();

// Handle resize to add/remove listeners dynamically
window.addEventListener('resize', () => {
    if (window.innerWidth < 1024) {
        addTouchListeners();
    } else {
        removeTouchListeners();
    }
});

// --- Router Initialization ---
const router = createRouter(app, appState, renderSidebarStatusLinks);
initializeRouter(router);

// --- Database Initialization & Initial Routing ---
openDB().then(() => {
    console.log('IndexedDB initialized.');
    router(); // Initial load
    highlightActiveSidebarLink(); // Also highlight on initial load

    // Initialize automatic sync (if cloud sync enabled and authenticated)
    initializeAutoSync();
}).catch(console.error);

