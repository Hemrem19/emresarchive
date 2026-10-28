/**
 * Sync Manager (CRDT Phase 4 Pivot — with backwards-compat debounce layer)
 * 
 * Primary: Yjs document synchronization via WebSockets to Edge Durable Objects.
 * Secondary: Debounced performSync wrapper for UI components that trigger explicit saves,
 *            and toast notification coordination.
 */

import { isCloudSyncEnabled, getApiBaseUrl } from '../config.js';
import { isAuthenticated, getAccessToken, refreshToken, getUser } from '../api/auth.js';
import { showToast } from '../ui.js';
// Both imports point to the same esm.sh URL for yjs via ?deps= so the browser
// module cache returns one Y.Doc constructor — prevents "Yjs was already imported" warning.
import * as Y from 'https://esm.sh/yjs@13.6.30';
import { WebsocketProvider } from 'https://esm.sh/y-websocket@3.0.0?deps=yjs@13.6.30';
import { upgradeLegacySchemaToYjs } from './schemaUpgrade.js';
import { isSyncInProgress } from '../db/sync.js';
import { syncFromCloud } from '../db/adapter.js';
import { inGroupLibrary, syncRoom } from './library.js';
import { renderLibrarySwitcher } from '../components/librarySwitcher.js';
import { COMMENTS_CHANGED } from '../components/paperComments.js';
import { NOTIFY } from '../components/notificationBell.js';

// Close code the server uses when this user lost access to the open group (backend services/groups.js)
const REMOVED_FROM_GROUP_CODE = 4003;

let provider = null;
let yDoc = null;

// Debounce state for backwards-compat sync triggers
let _debounceTimer = null;
const DEBOUNCE_MS = 2000;

// Network event handlers (stored so we can remove them)
let _offlineHandler = null;
let _onlineHandler = null;
let _focusHandler = null;
let _keepAliveInterval = null;

// Guard so syncFromCloud only fires once per WebSocket session, not on every reconnect.
let _yjsSyncDoneForSession = false;

const WS_KEEPALIVE_MS = 20_000; // y-websocket closes after 30 s without any message
const TOKEN_REFRESH_THRESHOLD_MS = 60_000; // Refresh if <60s of life remains

/**
 * Checks if sync should run automatically.
 */
function shouldAutoSync() {
    return isCloudSyncEnabled() && isAuthenticated();
}

/**
 * Returns the current access token, refreshing it first if it's expired or
 * about to expire. The WS handshake puts the token in a query param, so a
 * stale token causes a 401 upgrade and an infinite reconnect loop — this
 * avoids that by guaranteeing a fresh token at connect time.
 */
async function ensureFreshToken() {
    const token = getAccessToken();
    if (!token) return null;
    try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        if (!payload.exp) return token;
        const msLeft = payload.exp * 1000 - Date.now();
        if (msLeft > TOKEN_REFRESH_THRESHOLD_MS) return token;
    } catch (_) {
        // Malformed token — fall through to refresh attempt
    }
    try {
        return await refreshToken();
    } catch (e) {
        console.warn('[Sync Manager] Token refresh before WS connect failed:', e.message);
        return null;
    }
}

/**
 * Refreshes the token if needed, writes it onto provider.params (y-websocket
 * v3 reads params as a plain object at URL-build time — passing a function
 * silently serializes nothing, which was the original 401 cause), then calls
 * provider.connect(). Used for both the initial connect and each retry.
 */
async function connectWithFreshToken() {
    if (!provider) return;
    const token = await ensureFreshToken();
    if (!provider) return; // sync was stopped while the token was being fetched
    // No token means signed out (or the login was ended elsewhere): retrying
    // with the old one would only be refused again
    if (!token) {
        provider.shouldConnect = false;
        return;
    }
    provider.params = { token };
    try { provider.connect(); } catch (e) {
        console.warn('[Sync Manager] provider.connect() threw:', e.message);
    }
}

const KEEPALIVE_PING = 'ping';
const KEEPALIVE_PONG = 'pong';

/**
 * Lets the keepalive reply count as traffic without reaching the Yjs decoder,
 * which only understands binary frames. y-websocket sets ws.onmessage on each
 * new socket, so this runs on every connect.
 */
function acceptKeepaliveReplies(provider) {
    const ws = provider.ws;
    if (!ws || ws._keepaliveAware) return;
    const handle = ws.onmessage;
    ws.onmessage = (event) => {
        if (typeof event.data === 'string') {
            if (event.data === KEEPALIVE_PONG) provider.wsLastMessageReceived = Date.now();
            return;
        }
        handle?.call(ws, event);
    };
    ws._keepaliveAware = true;
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

    // Pull latest from cloud on tab focus (catches changes made on other devices).
    // syncFromCloud() internally enforces a cooldown so rapid focus switches don't flood.
    _focusHandler = () => {
        syncFromCloud().catch(e => console.warn('[SyncManager] Focus sync failed:', e.message));
    };
    window.addEventListener('focus', _focusHandler);

    // NOTE: No REST polling interval. The WebSocket is the live channel; if it's
    // down, REST seed runs once per page load and on explicit user action only —
    // polling every 30s was flooding the API (N requests per folder per poll).

    if (provider) return; // Already initialized

    console.log('[Sync Manager] Initializing Yjs Websocket Sync...');

    yDoc = new Y.Doc();
    window.yDoc = yDoc; // Expose globally for UI Data Stores bridging

    try {
        let baseUrl = getApiBaseUrl() || window.location.origin;
        const wsUrl = baseUrl.replace(/^http/, 'ws') + '/api/sync/workspace';

        // Pass connect:false so y-websocket does NOT auto-reconnect. Its built-in
        // retry loop fires regardless of connection-error handlers and couldn't be
        // stopped cleanly mid-flight, so we drive reconnection ourselves.
        let _wsFailureCount = 0;
        let _wsBackoffTimer = null;

        // params must be a plain object — y-websocket v3 does not call it if it's
        // a function. The actual token is written in connectWithFreshToken()
        // immediately before every connect() so refreshed tokens are used.
        // Room of the open library: a group's (members only) or the personal one
        provider = new WebsocketProvider(wsUrl, syncRoom(), yDoc, {
            connect: false,
            params: {},
            maxBackoffTime: 30_000
        });

        // No presence is shown anywhere, and a non-null local state is re-sent
        // every 15 s, waking the sync room each time
        provider.awareness.setLocalState(null);

        provider.on('connection-error', err => {
            console.warn('[Sync Manager] WebSocket connection error:', err?.message ?? err);
            if (_wsBackoffTimer !== null) return; // Already waiting — ignore further errors
            // Stop y-websocket's internal retry by flipping the flag and cancelling the
            // onclose-scheduled setupWS by nulling its timeoutId isn't exposed, so rely
            // on shouldConnect=false being checked inside setupWS before creating a WS.
            provider.shouldConnect = false;
            _wsFailureCount++;
            const delay = _wsFailureCount < 3 ? 2_000 * _wsFailureCount : 30_000;
            if (delay === 30_000) {
                console.warn('[Sync Manager] WebSocket repeatedly refused — pausing 30s before retry');
            }
            _wsBackoffTimer = setTimeout(() => {
                _wsBackoffTimer = null;
                // Refresh the token before reconnecting — 401s from stale tokens
                // are the most common cause of repeated connection-errors.
                connectWithFreshToken();
            }, delay);
        });

        provider.on('status', event => {
            console.log('[Sync Manager] Websocket status:', event.status);
            if (event.status === 'connected') {
                acceptKeepaliveReplies(provider);
                _wsFailureCount = 0;
                if (_wsBackoffTimer) { clearTimeout(_wsBackoffTimer); _wsBackoffTimer = null; }
                // Reset session guard so we get one syncFromCloud per connection
                _yjsSyncDoneForSession = false;
            }
        });

        // Removed from the open group (or it was deleted): the switcher re-checks
        // membership and returns to the personal library.
        provider.on('connection-close', (event) => {
            if (event?.code === REMOVED_FROM_GROUP_CODE && inGroupLibrary()) {
                provider.shouldConnect = false;
                renderLibrarySwitcher();
            }
        });

        // The server sets signals.changedAt after any write to a group library;
        // pull so other members' changes show up without a manual sync.
        // signals.comments names one paper whose comments changed: only a
        // thread showing it refetches (components/paperComments.js).
        const signals = yDoc.getMap('signals');
        signals.observe((event) => {
            if (event.keysChanged.has('comments')) {
                const { paperId } = signals.get('comments') || {};
                window.dispatchEvent(new CustomEvent(COMMENTS_CHANGED, { detail: { paperId } }));
            }
            // signals.notify names people with something new in their bell
            if (event.keysChanged.has('notify')) {
                const { userIds = [] } = signals.get('notify') || {};
                if (userIds.includes(getUser()?.id)) window.dispatchEvent(new CustomEvent(NOTIFY));
            }
            if (event.keysChanged.has('changedAt')) {
                syncFromCloud({ force: true }).catch(e => console.warn('[Sync Manager] Pull after change signal failed:', e.message));
            }
        });

        // Kick off the first connection attempt with a fresh token.
        connectWithFreshToken();

        provider.on('sync', isSynced => {
            if (isSynced && !_yjsSyncDoneForSession) {
                _yjsSyncDoneForSession = true;
                console.log('[Sync Manager] Initial Yjs state synchronized');
                upgradeLegacySchemaToYjs(yDoc).catch(e => console.error(e));
                syncFromCloud().catch(e => console.warn('[SyncManager] WS sync pull failed:', e.message));
            }
        });

        // Keep-alive: y-websocket drops a connection that received nothing for
        // 30 s. A "ping" text frame is answered with "pong" by the Cloudflare
        // runtime itself, so the sync room is not woken (or billed) for it.
        _keepAliveInterval = setInterval(() => {
            if (provider && provider.wsconnected && provider.ws?.readyState === 1) {
                try { provider.ws.send(KEEPALIVE_PING); } catch (_) { /* reconnect handles it */ }
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

        await syncFromCloud({ force: true });
        showToast('Sync complete.', 'success', { duration: 3000 });
    } catch (err) {
        showToast(`Sync failed: ${err.message}`, 'error', {
            duration: 5000,
            actions: [{ label: 'Retry', onClick: () => performManualSync() }]
        });
    }
}

