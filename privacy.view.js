/**
 * Privacy Policy view module
 */
export const privacyView = {
    /**
     * Mounts the privacy policy view
     */
    mount: () => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    },

    /**
     * Unmounts the privacy policy view
     */
    unmount: () => {
        // No cleanup needed
    }
};
