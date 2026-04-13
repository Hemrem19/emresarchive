/**
 * Sync Manager (CRDT Phase 4 Pivot)
 * Handles Yjs document synchronization via WebSockets to Edge Durable Objects
 */

import { isCloudSyncEnabled, getApiBaseUrl } from '../config.js';
import { isAuthenticated, getAccessToken } from '../api/auth.js';
import { showToast } from '../ui.js';
import * as Y from 'https://esm.sh/yjs@13.6.14';
import { WebsocketProvider } from 'https://esm.sh/y-websocket@1.5.0';

let provider = null;
let yDoc = null;

/**
 * Checks if sync should run automatically.
 */
function shouldAutoSync() {
    return isCloudSyncEnabled() && isAuthenticated();
}

/**
 * Debounced sync trigger - (Legacy mapping)
 * CRDT sync is continuous, so this is primarily a no-op but kept for backwards compatibility
 * until UI is completely decoupled from explicit save operations in Phase 5.
 */
export function triggerDebouncedSync() {
    if (!shouldAutoSync() || !provider) return;
    // Y.Doc mutations sync automatically over WebSocket.
}

/**
 * Initializes automatic real-time sync with Edge WebSocket.
 */
export function initializeAutoSync() {
    if (!shouldAutoSync()) {
        console.log('[Sync Manager] Auto sync disabled (cloud sync off or not authenticated)');
        return;
    }

    if (provider) return;

    console.log('[Sync Manager] Initializing Yjs Websocket Sync...');

    yDoc = new Y.Doc();
    window.yDoc = yDoc; // Expose globally for UI Data Stores bridging (Phase 5)

    try {
        const token = getAccessToken();
        let baseUrl = getApiBaseUrl() || window.location.origin;
        // Convert protocol to ws/wss
        const wsUrl = baseUrl.replace(/^http/, 'ws') + '/api/sync/workspace/default';
        
        provider = new WebsocketProvider(wsUrl, 'default', yDoc, {
            connect: true,
            params: { token }
        });

        provider.on('status', event => {
            console.log('[Sync Manager] Websocket status:', event.status);
            if (event.status === 'connected') {
                // Determine if we should notify user - only if explicit connection or reconnect
                console.log('[Sync Manager] Connected to Edge Sync server');
            } else if (event.status === 'disconnected') {
                console.log('[Sync Manager] Disconnected from Edge Sync server. Retrying...');
            }
        });
        
        provider.on('sync', isSynced => {
            if (isSynced) {
                console.log('[Sync Manager] Initial Yjs state synchronized');
            }
        });
        
    } catch (e) {
        console.error('[Sync Manager] Initialization failed:', e);
    }
}

/**
 * Stops all automatic sync operations.
 * Useful when user disables cloud sync or logs out.
 */
export function stopAutoSync() {
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
 * Performs immediate sync (manual trigger).
 * Shows notification with sync results.
 */
export async function performManualSync() {
    if (!shouldAutoSync()) {
        throw new Error('Cloud sync is not enabled or user is not authenticated');
    }

    if (provider) {
        if (!provider.wsconnected) {
            provider.connect();
        } else {
            showToast('Already synchronized (Real-time connection active)', 'success');
        }
    }
}

