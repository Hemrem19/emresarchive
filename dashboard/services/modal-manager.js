/**
 * Modal Manager Service
 * Centralized modal lifecycle management with automatic cleanup
 */

/**
 * Active modals registry
 * Tracks open modals and their cleanup functions
 */
const activeModals = new Map();

/**
 * Modal configuration interface
 * @typedef {Object} ModalConfig
 * @property {string} id - Modal element ID
 * @property {string} html - Modal HTML content
 * @property {Object} handlers - Event handlers for modal elements
 * @property {Function} onOpen - Callback when modal opens
 * @property {Function} onClose - Callback when modal closes
 * @property {boolean} closeOnBackdropClick - Close modal when clicking backdrop (default: true)
 * @property {boolean} closeOnEscape - Close modal on Escape key (default: true)
 */

/**
 * Shows a modal with automatic lifecycle management
 * @param {ModalConfig} config - Modal configuration
 * @returns {Object} Modal controller with close method
 */
export function showModal(config) {
    const {
        id,
        html,
        handlers = {},
        onOpen = null,
        onClose = null,
        closeOnBackdropClick = true,
        closeOnEscape = true
    } = config;

    // Remove existing modal if present
    if (activeModals.has(id)) {
        closeModal(id);
    }

    // Inject modal HTML
    const existingModal = document.getElementById(id);
    if (existingModal) {
        existingModal.remove();
    }
    document.body.insertAdjacentHTML('beforeend', html);

    const modal = document.getElementById(id);
    if (!modal) {
        console.error(`Modal with id "${id}" not found after injection`);
        return { close: () => {} };
    }

    // Store cleanup functions
    const cleanupFunctions = [];

    // Attach event handlers
    Object.entries(handlers).forEach(([elementId, handler]) => {
        const element = document.getElementById(elementId);
        if (element) {
            const { event, callback } = handler;
            element.addEventListener(event, callback);
            cleanupFunctions.push(() => {
                element.removeEventListener(event, callback);
            });
        } else {
            console.warn(`Element with id "${elementId}" not found in modal "${id}"`);
        }
    });

    // Close modal function
    const close = () => {
        modal.classList.add('hidden');
        
        // Remove from active modals immediately
        activeModals.delete(id);
        
        // Call onClose callback
        if (onClose) {
            onClose();
        }

        // Cleanup after animation
        setTimeout(() => {
            // Remove all event listeners
            cleanupFunctions.forEach(cleanup => cleanup());
            
            // Remove modal from DOM
            modal.remove();
        }, 300); // Match CSS transition duration
    };

    // Backdrop click handler
    if (closeOnBackdropClick) {
        const backdropClickHandler = (e) => {
            if (e.target === modal) {
                close();
            }
        };
        modal.addEventListener('click', backdropClickHandler);
        cleanupFunctions.push(() => {
            modal.removeEventListener('click', backdropClickHandler);
        });
    }

    // Escape key handler
    if (closeOnEscape) {
        const escapeHandler = (e) => {
            if (e.key === 'Escape') {
                close();
            }
        };
        document.addEventListener('keydown', escapeHandler);
        cleanupFunctions.push(() => {
            document.removeEventListener('keydown', escapeHandler);
        });
    }

    // Store modal info
    activeModals.set(id, {
        modal,
        close,
        cleanupFunctions
    });

    // Show modal
    modal.classList.remove('hidden');

    // Call onOpen callback
    if (onOpen) {
        onOpen(modal);
    }

    return { close };
}

/**
 * Closes a specific modal
 * @param {string} id - Modal element ID
 */
export function closeModal(id) {
    const modalInfo = activeModals.get(id);
    if (modalInfo) {
        modalInfo.close();
    }
}

/**
 * Closes all active modals
 */
export function closeAllModals() {
    activeModals.forEach((modalInfo, id) => {
        modalInfo.close();
    });
}

/**
 * Checks if a modal is currently open
 * @param {string} id - Modal element ID
 * @returns {boolean} True if modal is open
 */
export function isModalOpen(id) {
    return activeModals.has(id);
}

/**
 * Gets the number of active modals
 * @returns {number} Number of open modals
 */
export function getActiveModalCount() {
    return activeModals.size;
}

/**
 * Creates a confirmation modal
 * @param {Object} config - Confirmation config
 * @param {string} config.title - Modal title
 * @param {string} config.message - Confirmation message
 * @param {string} config.confirmText - Confirm button text (default: "Confirm")
 * @param {string} config.cancelText - Cancel button text (default: "Cancel")
 * @param {Function} config.onConfirm - Callback when confirmed
 * @param {Function} config.onCancel - Callback when cancelled
 * @returns {Object} Modal controller
 */
export function showConfirmationModal(config) {
    const {
        title = 'Confirm Action',
        message,
        confirmText = 'Confirm',
        cancelText = 'Cancel',
        onConfirm = () => {},
        onCancel = () => {}
    } = config;

    const modalId = 'confirmation-modal';
    const html = `
        <div id="${modalId}" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 hidden">
            <div class="bg-white dark:bg-stone-800 rounded-lg shadow-xl max-w-md w-full mx-4 p-6">
                <h3 class="text-xl font-semibold mb-4 text-stone-900 dark:text-stone-100">${title}</h3>
                <p class="text-stone-700 dark:text-stone-300 mb-6">${message}</p>
                <div class="flex justify-end gap-3">
                    <button id="confirmation-cancel-btn" class="px-4 py-2 rounded-lg border border-stone-300 dark:border-stone-600 hover:bg-stone-100 dark:hover:bg-stone-700 transition-colors">
                        ${cancelText}
                    </button>
                    <button id="confirmation-confirm-btn" class="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors">
                        ${confirmText}
                    </button>
                </div>
            </div>
        </div>
    `;

    return showModal({
        id: modalId,
        html,
        handlers: {
            'confirmation-confirm-btn': {
                event: 'click',
                callback: () => {
                    onConfirm();
                    closeModal(modalId);
                }
            },
            'confirmation-cancel-btn': {
                event: 'click',
                callback: () => {
                    onCancel();
                    closeModal(modalId);
                }
            }
        }
    });
}

/**
 * Creates an alert modal
 * @param {Object} config - Alert config
 * @param {string} config.title - Modal title
 * @param {string} config.message - Alert message
 * @param {string} config.type - Alert type: 'info', 'success', 'warning', 'error' (default: 'info')
 * @param {string} config.buttonText - Button text (default: "OK")
 * @param {Function} config.onClose - Callback when closed
 * @returns {Object} Modal controller
 */
export function showAlertModal(config) {
    const {
        title = 'Alert',
        message,
        type = 'info',
        buttonText = 'OK',
        onClose = () => {}
    } = config;

    const typeColors = {
        info: 'bg-blue-600 hover:bg-blue-700',
        success: 'bg-green-600 hover:bg-green-700',
        warning: 'bg-yellow-600 hover:bg-yellow-700',
        error: 'bg-red-600 hover:bg-red-700'
    };

    const buttonColor = typeColors[type] || typeColors.info;
    const modalId = 'alert-modal';
    
    const html = `
        <div id="${modalId}" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 hidden">
            <div class="bg-white dark:bg-stone-800 rounded-lg shadow-xl max-w-md w-full mx-4 p-6">
                <h3 class="text-xl font-semibold mb-4 text-stone-900 dark:text-stone-100">${title}</h3>
                <p class="text-stone-700 dark:text-stone-300 mb-6">${message}</p>
                <div class="flex justify-end">
                    <button id="alert-ok-btn" class="px-4 py-2 rounded-lg ${buttonColor} text-white transition-colors">
                        ${buttonText}
                    </button>
                </div>
            </div>
        </div>
    `;

    return showModal({
        id: modalId,
        html,
        handlers: {
            'alert-ok-btn': {
                event: 'click',
                callback: () => {
                    onClose();
                    closeModal(modalId);
                }
            }
        }
    });
}

