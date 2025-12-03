/**
 * Terms of Service view module
 */
export const termsView = {
    /**
     * Mounts the terms view
     */
    mount: () => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    },

    /**
     * Unmounts the terms view
     */
    unmount: () => {
        // No cleanup needed
    }
};
