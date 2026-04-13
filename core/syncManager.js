/**
 * Sync Manager (CRDT Phase 4 Pivot — with backwards-compat debounce layer)
 * 
 * Primary: Yjs document synchronization via WebSockets to Edge Durable Objects.
 * Secondary: Debounced performSync wrapper for UI components that trigger explicit saves,
 *            and toast notification coordination.
 */

import { isCloudSyncEnabled, getApiBaseUrl } from '../config.js';
import { isAuthenticated, getAccessToken } from '../api/auth.js';
import { showToast } from '../ui.js';
import * as Y from 'https://esm.sh/yjs@13.6.14';
import { WebsocketProvider } from 'https://esm.sh/y-websocket@1.5.0';
import { upgradeLegacySchemaToYjs } from './schemaUpgrade.js';
import { performSync, isSyncInProgress } from '../db/sync.js';

let provider = null;
let yDoc = null;

// Debounce state for backwards-compat sync triggers
let _debounceTimer = null;
const DEBOUNCE_MS = 2000;

// Network event handlers (stored so we can remove them)
let _offlineHandler = null;
let _onlineHandler = null;

/**
 * Checks if sync should run automatically.
 */
function shouldAutoSync() {
    return isCloudSyncEnabled() && isAuthenticated();
}

/**
 * Debounced sync trigger.
 * In CRDT mode, Yjs syncs automatically. This wrapper also calls the
 * legacy performSync from db/sync.js so that callers and tests that
 * depend on the old explicit-sync contract continue to work.
 */
export function triggerDebouncedSync() {
    if (!shouldAutoSync()) return;
    if (_debounceTimer) clearTimeout(_debounceTimer);
    _debounceTimer = setTimeout(() => {
        _debounceTimer = null;
        if (isSyncInProgress && isSyncInProgress()) return;
        Promise.resolve(performSync()).then(result => {
            // Silent sync — no toast unless there are changes
            const serverCount = result?.serverChangeCount
                ? Object.values(result.serverChangeCount).reduce((a, b) => a + (b || 0), 0)
                : 0;
            if (serverCount > 0) {
                showToast(`Sync complete. ${serverCount} updates from server.`, 'success', { duration: 3000 });
            }
        }).catch(err => {
            // Silent — do not surface errors for background debounced syncs
            console.warn('[SyncManager] Background sync failed:', err.message);
        });

    }, DEBOUNCE_MS);
}

/**
 * Initializes automatic real-time sync with Edge WebSocket.
 */
export function initializeAutoSync() {
    if (!shouldAutoSync()) {
        console.log('[Sync Manager] Auto sync disabled (cloud sync off or not authenticated)');
        return;
    }

    // Set up network event listeners
    _offlineHandler = () => {
        showToast('Network offline. Sync will resume when connection is restored.', 'warning', { duration: 5000 });
    };
    _onlineHandler = async () => {
        try {
            if (isSyncInProgress && isSyncInProgress()) return;
            await performSync();
        } catch (err) {
            console.warn('[SyncManager] Reconnect sync failed:', err.message);
        }
    };
    window.addEventListener('offline', _offlineHandler);
    window.addEventListener('online', _onlineHandler);

    if (provider) return; // Already initialized

    console.log('[Sync Manager] Initializing Yjs Websocket Sync...');

    yDoc = new Y.Doc();
    window.yDoc = yDoc; // Expose globally for UI Data Stores bridging

    try {
        const token = getAccessToken();
        let baseUrl = getApiBaseUrl() || window.location.origin;
        const wsUrl = baseUrl.replace(/^http/, 'ws') + '/api/sync/workspace/default';

        provider = new WebsocketProvider(wsUrl, 'default', yDoc, {
            connect: true,
            params: { token }
        });

        provider.on('status', event => {
            console.log('[Sync Manager] Websocket status:', event.status);
        });

        provider.on('sync', isSynced => {
            if (isSynced) {
                console.log('[Sync Manager] Initial Yjs state synchronized');
                upgradeLegacySchemaToYjs(yDoc).catch(e => console.error(e));
                bindDiscussionDrawer();
            }
        });

    } catch (e) {
        console.error('[Sync Manager] Initialization failed:', e);
    }
}

/**
 * Stops all automatic sync operations.
 */
export function stopAutoSync() {
    if (_debounceTimer) {
        clearTimeout(_debounceTimer);
        _debounceTimer = null;
    }
    if (_offlineHandler) {
        window.removeEventListener('offline', _offlineHandler);
        _offlineHandler = null;
    }
    if (_onlineHandler) {
        window.removeEventListener('online', _onlineHandler);
        _onlineHandler = null;
    }
    if (provider) {
        provider.disconnect();
        provider = null;
    }
    if (yDoc) {
        yDoc.destroy();
        yDoc = null;
        window.yDoc = null;
    }
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
 * Performs immediate manual sync with toast notifications.
 */
export async function performManualSync() {
    if (!shouldAutoSync()) {
        throw new Error('Cloud sync is not enabled or user is not authenticated');
    }

    try {
        if (isSyncInProgress && isSyncInProgress()) {
            showToast('Sync already in progress...', 'info', { duration: 2000 });
            return;
        }

        const result = await performSync();

        // Count server changes
        const serverCount = result?.serverChangeCount
            ? Object.values(result.serverChangeCount).reduce((a, b) => a + (b || 0), 0)
            : 0;

        // Count conflicts
        const conflictCount = result?.conflicts
            ? Object.values(result.conflicts).reduce((a, b) => a + (Array.isArray(b) ? b.length : 0), 0)
            : 0;

        if (conflictCount > 0) {
            showToast(`Sync complete. ${conflictCount} conflicts resolved.`, 'success', { duration: 4000 });
        } else if (serverCount > 0) {
            showToast(`Sync complete. ${serverCount} updates from server.`, 'success', { duration: 3000 });
        } else {
            showToast('Already synchronized (Real-time connection active)', 'success');
        }
    } catch (err) {
        showToast(`Sync failed: ${err.message}`, 'error', {
            duration: 5000,
            actions: [{ label: 'Retry', onClick: () => performManualSync() }]
        });
    }
}

/**
 * Binds the Discussion Drawer textarea to the active Yjs Document
 */
function bindDiscussionDrawer() {
    if (!yDoc) return;
    const textArea = document.getElementById('discussion-crdt-editor');
    if (!textArea) return;

    const yText = yDoc.getText('liveNotes');

    yText.observe(() => {
        const text = yText.toString();
        if (textArea.value !== text) {
            textArea.value = text;
        }
    });

    textArea.addEventListener('input', (e) => {
        const val = e.target.value;
        const old = yText.toString();
        if (val !== old) {
            yDoc.transact(() => {
                yText.delete(0, yText.length);
                yText.insert(0, val);
            }, 'local_ui_edit');
        }
    });
}
