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
    },

    /**
     * Unmounts the documentation view
     */
    unmount: () => {
        // No cleanup needed for documentation view
    }
};

