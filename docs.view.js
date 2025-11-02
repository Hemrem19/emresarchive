// docs.view.js
// Documentation and Onboarding View

/**
 * Documentation view module
 * Provides comprehensive user guide and onboarding experience
 */
export const docsView = {
    /**
     * Mounts the documentation view
     * @param {Object} appState - Application state
     */
    mount: (appState) => {
        // Smooth scroll to top
        window.scrollTo({ top: 0, behavior: 'smooth' });
        
        // Setup smooth scrolling for anchor links
        setupAnchorLinks();
    },

    /**
     * Unmounts the documentation view
     */
    unmount: () => {
        // No cleanup needed for documentation view
    }
};

/**
 * Setup smooth scrolling for anchor links within documentation
 */
function setupAnchorLinks() {
    const anchors = document.querySelectorAll('a[href^="#"]');
    anchors.forEach(anchor => {
        anchor.addEventListener('click', (e) => {
            const href = anchor.getAttribute('href');
            if (href.startsWith('#section-')) {
                e.preventDefault();
                const targetId = href.substring(1);
                const targetElement = document.getElementById(targetId);
                if (targetElement) {
                    targetElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    // Update URL without scrolling
                    window.history.pushState(null, null, `#/docs${href}`);
                }
            }
        });
    });
}

