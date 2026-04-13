/**
 * DOMPurify mock for vitest (imported via esm.sh CDN in ui.js)
 */
export default {
    sanitize: (html, opts) => html,
    addHook: () => {},
    removeHook: () => {},
    isValidAttribute: () => true,
};
