/**
 * Sync Manager
 * Handles automatic sync triggers and background synchronization
 */

import { isCloudSyncEnabled } from '../config.js';
import { isAuthenticated } from '../api/auth.js';
import { performSync, getSyncStatusInfo, isSyncInProgress } from '../db/sync.js';
import { showToast } from '../ui.js';
import { isRateLimited, getRateLimitRemainingTime } from '../api/utils.js';

// Sync configuration
const SYNC_CONFIG = {
    PERIODIC_INTERVAL: 5 * 60 * 1000, // 5 minutes
    DEBOUNCE_DELAY: 2000, // 2 seconds after CRUD operations
    INITIAL_SYNC_DELAY: 2000, // 2 seconds after app load
    NETWORK_RECONNECT_DELAY: 3000 // 3 seconds after network reconnect
};

let periodicSyncInterval = null;
let debouncedSyncTimeout = null;
let isInitialSyncDone = false;

/**
 * Checks if sync should run automatically.
 * @returns {boolean} True if sync is enabled and user is authenticated.
 */
function shouldAutoSync() {
    return isCloudSyncEnabled() && isAuthenticated();
}

/**
 * Performs a silent sync (no user notification unless error).
 * @param {boolean} silent - If true, only show errors, not success.
 * @returns {Promise<void>}
 */
async function performAutoSync(silent = true) {
    console.log('[Sync Manager] performAutoSync called, silent:', silent);
    
    if (!shouldAutoSync()) {
        const cloudSyncEnabled = isCloudSyncEnabled();
        const authenticated = isAuthenticated();
        console.warn('[Sync Manager] Sync skipped - cloudSyncEnabled:', cloudSyncEnabled, 'authenticated:', authenticated);
        return;
    }

    // Don't sync if already in progress
    if (isSyncInProgress()) {
        console.log('[Sync Manager] Sync already in progress, skipping');
        return;
    }

    // Check if we're rate limited
    if (isRateLimited()) {
        const remainingTime = getRateLimitRemainingTime();
        const remainingSeconds = Math.ceil(remainingTime / 1000);
        console.log(`[Sync Manager] Rate limited, skipping sync. Retry in ${remainingSeconds}s`);
        if (!silent) {
            showToast(`Sync rate limited. Please wait ${remainingSeconds} seconds.`, 'warning', {
                duration: 3000
            });
        }
        return;
    }

    try {
        console.log('[Sync Manager] Calling performSync...');
        const result = await performSync();
        console.log('[Sync Manager] Sync completed:', {
            success: result.success,
            hasLocalChanges: result.hasLocalChanges,
            serverChangeCount: result.serverChangeCount,
            conflicts: result.conflicts
        });

        // Only show notification if there are server changes or conflicts
        if (!silent || result.serverChangeCount || result.conflicts) {
            const hasServerChanges = 
                (result.serverChangeCount?.papers || 0) +
                (result.serverChangeCount?.collections || 0) +
                (result.serverChangeCount?.annotations || 0) > 0;
            
            const hasConflicts = 
                (result.conflicts?.papers?.length || 0) +
                (result.conflicts?.collections?.length || 0) +
                (result.conflicts?.annotations?.length || 0) > 0;

            if (hasServerChanges || hasConflicts) {
                let message = 'Sync complete';
                if (hasServerChanges) {
                    const total = 
                        (result.serverChangeCount.papers || 0) +
                        (result.serverChangeCount.collections || 0) +
                        (result.serverChangeCount.annotations || 0);
                    message += `. ${total} update${total !== 1 ? 's' : ''} from server.`;
                }
                if (hasConflicts) {
                    const totalConflicts = 
                        (result.conflicts.papers?.length || 0) +
                        (result.conflicts.collections?.length || 0) +
                        (result.conflicts.annotations?.length || 0);
                    message += ` ${totalConflicts} conflict${totalConflicts !== 1 ? 's' : ''} resolved.`;
                }
                showToast(message, 'success', { duration: 3000 });
            }
        }

        console.log('[Sync Manager] Auto sync completed successfully');
    } catch (error) {
        console.error('[Sync Manager] Auto sync error:', error);
        
        // Check if error is rate limit related
        const isRateLimitError = error.message && error.message.includes('Rate Limited');
        
        if (isRateLimitError) {
            // Rate limit error - only show if not silent
            if (!silent) {
                const remainingTime = getRateLimitRemainingTime();
                const remainingSeconds = Math.ceil(remainingTime / 1000);
                showToast(`Rate limited. Sync will resume in ${remainingSeconds} seconds.`, 'warning', {
                    duration: 5000
                });
            }
        } else {
            // Other errors - show with retry option if not silent
            if (!silent) {
                showToast(`Sync failed: ${error.message}`, 'error', {
                    duration: 5000,
                    actions: [{
                        label: 'Retry',
                        onClick: () => performAutoSync(false)
                    }]
                });
            }
        }
    }
}

/**
 * Debounced sync trigger - syncs after a delay when triggered.
 * Useful for syncing after CRUD operations without overwhelming the server.
 */
export function triggerDebouncedSync() {
    if (!shouldAutoSync()) {
        return;
    }

    // Clear existing timeout
    if (debouncedSyncTimeout) {
        clearTimeout(debouncedSyncTimeout);
    }

    // Set new timeout
    debouncedSyncTimeout = setTimeout(() => {
        performAutoSync(true); // Silent sync after CRUD
        debouncedSyncTimeout = null;
    }, SYNC_CONFIG.DEBOUNCE_DELAY);
}

/**
 * Initializes automatic sync on app load.
 * Performs initial sync after a short delay to allow app to initialize.
 */
export function initializeAutoSync() {
    if (!shouldAutoSync()) {
        console.log('[Sync Manager] Auto sync disabled (cloud sync off or not authenticated)');
        return;
    }

    console.log('[Sync Manager] Initializing auto sync...');

    // Perform initial sync after delay
    setTimeout(async () => {
        if (!isInitialSyncDone && shouldAutoSync()) {
            console.log('[Sync Manager] Performing initial sync on app load');
            await performAutoSync(true); // Silent initial sync
            isInitialSyncDone = true;
        }
    }, SYNC_CONFIG.INITIAL_SYNC_DELAY);

    // Start periodic sync
    startPeriodicSync();

    // Listen for network reconnection
    setupNetworkReconnectListener();
}

/**
 * Starts periodic background sync.
 * Syncs every N minutes when cloud sync is enabled.
 */
function startPeriodicSync() {
    if (periodicSyncInterval) {
        clearInterval(periodicSyncInterval);
    }

    periodicSyncInterval = setInterval(() => {
        if (shouldAutoSync() && !isSyncInProgress()) {
            console.log('[Sync Manager] Performing periodic sync');
            performAutoSync(true); // Silent periodic sync
        }
    }, SYNC_CONFIG.PERIODIC_INTERVAL);

    console.log(`[Sync Manager] Periodic sync started (every ${SYNC_CONFIG.PERIODIC_INTERVAL / 1000 / 60} minutes)`);
}

/**
 * Stops periodic background sync.
 */
function stopPeriodicSync() {
    if (periodicSyncInterval) {
        clearInterval(periodicSyncInterval);
        periodicSyncInterval = null;
        console.log('[Sync Manager] Periodic sync stopped');
    }
}

/**
 * Sets up network reconnect listener.
 * Syncs automatically when browser comes back online.
 */
function setupNetworkReconnectListener() {
    // Listen for online event
    window.addEventListener('online', () => {
        if (shouldAutoSync()) {
            console.log('[Sync Manager] Network reconnected, syncing...');
            
            // Wait a bit for network to stabilize
            setTimeout(() => {
                if (shouldAutoSync() && !isSyncInProgress()) {
                    performAutoSync(false); // Show notification on reconnect
                }
            }, SYNC_CONFIG.NETWORK_RECONNECT_DELAY);
        }
    });

    // Listen for offline event (just log, don't sync)
    window.addEventListener('offline', () => {
        console.log('[Sync Manager] Network offline, sync paused');
        showToast('Network offline. Sync will resume when connection is restored.', 'warning', {
            duration: 5000
        });
    });
}

/**
 * Stops all automatic sync operations.
 * Useful when user disables cloud sync or logs out.
 */
export function stopAutoSync() {
    stopPeriodicSync();
    
    if (debouncedSyncTimeout) {
        clearTimeout(debouncedSyncTimeout);
        debouncedSyncTimeout = null;
    }

    isInitialSyncDone = false;
    console.log('[Sync Manager] Auto sync stopped');
}

/**
 * Restarts automatic sync (e.g., when user enables cloud sync).
 */
export function restartAutoSync() {
    stopAutoSync();
    initializeAutoSync();
}

/**
 * Performs immediate sync (manual trigger).
 * Shows notification with sync results.
 */
export async function performManualSync() {
    if (!shouldAutoSync()) {
        throw new Error('Cloud sync is not enabled or user is not authenticated');
    }

    await performAutoSync(false); // Show notification
}

