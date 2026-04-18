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
import * as Y from 'yjs';
import { WebsocketProvider } from 'y-websocket';
import { upgradeLegacySchemaToYjs } from './schemaUpgrade.js';
import { isSyncInProgress } from '../db/sync.js';
import { syncFromCloud } from '../db/adapter.js';

let provider = null;
let yDoc = null;

// Debounce state for backwards-compat sync triggers
let _debounceTimer = null;
const DEBOUNCE_MS = 2000;

// Network event handlers (stored so we can remove them)
let _offlineHandler = null;
let _onlineHandler = null;
let _focusHandler = null;
let _pollInterval = null;
let _keepAliveInterval = null;

// Guard so syncFromCloud only fires once per WebSocket session, not on every reconnect.
// The 30s poller handles subsequent background syncs.
let _yjsSyncDoneForSession = false;

const POLL_INTERVAL_MS = 30_000;
const WS_KEEPALIVE_MS = 25_000; // Under Cloudflare's 30s idle timeout

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
        syncFromCloud().catch(err => {
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
            await syncFromCloud();
        } catch (err) {
            console.warn('[SyncManager] Reconnect sync failed:', err.message);
        }
    };
    window.addEventListener('offline', _offlineHandler);
    window.addEventListener('online', _onlineHandler);

    // Pull latest from cloud on tab focus (catches changes made on other devices)
    _focusHandler = () => {
        syncFromCloud().catch(e => console.warn('[SyncManager] Focus sync failed:', e.message));
    };
    window.addEventListener('focus', _focusHandler);

    // Poll every 30 seconds while the tab is open — WS is the source of truth;
    // REST polling is a fallback for when the socket is not connected.
    _pollInterval = setInterval(() => {
        if (provider?.wsconnected) return;
        syncFromCloud().catch(e => console.warn('[SyncManager] Poll sync failed:', e.message));
    }, POLL_INTERVAL_MS);

    if (provider) return; // Already initialized

    console.log('[Sync Manager] Initializing Yjs Websocket Sync...');

    yDoc = new Y.Doc();
    window.yDoc = yDoc; // Expose globally for UI Data Stores bridging

    try {
        let baseUrl = getApiBaseUrl() || window.location.origin;
        const wsUrl = baseUrl.replace(/^http/, 'ws') + '/api/sync/workspace';

        // Use a getter function for params so each reconnect picks up a fresh token.
        // The DO force-closes the socket when the JWT expires (15m), so y-websocket
        // reconnects — without this it would reconnect with the stale expired token.
        provider = new WebsocketProvider(wsUrl, 'default', yDoc, {
            connect: true,
            params: () => ({ token: getAccessToken() }),
            maxBackoffTime: 30_000
        });

        provider.on('connection-error', err => {
            console.warn('[Sync Manager] WebSocket connection error:', err?.message ?? err);
        });

        provider.on('status', event => {
            console.log('[Sync Manager] Websocket status:', event.status);
            if (event.status === 'connected') {
                // Reset session guard so we get one syncFromCloud per connection
                _yjsSyncDoneForSession = false;
            }
        });

        provider.on('sync', isSynced => {
            if (isSynced && !_yjsSyncDoneForSession) {
                _yjsSyncDoneForSession = true;
                console.log('[Sync Manager] Initial Yjs state synchronized');
                upgradeLegacySchemaToYjs(yDoc).catch(e => console.error(e));
                bindDiscussionDrawer();
                syncFromCloud().catch(e => console.warn('[SyncManager] WS sync pull failed:', e.message));
            }
        });

        // Keep-alive: send a harmless awareness update every 25s to prevent
        // Cloudflare's 30s idle WebSocket timeout from closing the connection.
        _keepAliveInterval = setInterval(() => {
            if (provider && provider.wsconnected) {
                provider.awareness.setLocalStateField('_ka', Date.now());
            }
        }, WS_KEEPALIVE_MS);

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
    if (_focusHandler) {
        window.removeEventListener('focus', _focusHandler);
        _focusHandler = null;
    }
    if (_pollInterval) {
        clearInterval(_pollInterval);
        _pollInterval = null;
    }
    if (_keepAliveInterval) {
        clearInterval(_keepAliveInterval);
        _keepAliveInterval = null;
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

        await syncFromCloud();
        showToast('Sync complete.', 'success', { duration: 3000 });
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
