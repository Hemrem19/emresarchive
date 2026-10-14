/**
 * The sync room must be able to hibernate between messages: an idle object
 * with open sockets is billed by duration, so nothing in it may keep timers
 * running, and keepalives are answered without waking it.
 */
import { describe, it, expect, vi, afterEach } from 'vitest';
import * as Y from 'yjs';
import { WorkspaceDurableObject, KEEPALIVE_PING, KEEPALIVE_PONG } from '../../src/WorkspaceDurableObject.js';

afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
});

function room({ snapshot = null } = {}) {
    const state = {
        blockConcurrencyWhile: (fn) => fn(),
        storage: { get: vi.fn(async () => snapshot), put: vi.fn(async () => {}) },
        getWebSockets: () => [],
        acceptWebSocket: () => {},
        setWebSocketAutoResponse: vi.fn(),
    };
    return { doc: new WorkspaceDurableObject(state, {}), state };
}

describe('sync room hibernation', () => {
    it('leaves no timers running once constructed', async () => {
        vi.useFakeTimers();
        room();
        await vi.runOnlyPendingTimersAsync();
        expect(vi.getTimerCount()).toBe(0);
    });

    it('has the runtime answer keepalive pings', () => {
        class Pair { constructor(req, res) { Object.assign(this, { req, res }); } }
        vi.stubGlobal('WebSocketRequestResponsePair', Pair);
        const { state } = room();
        expect(state.setWebSocketAutoResponse).toHaveBeenCalledWith(new Pair(KEEPALIVE_PING, KEEPALIVE_PONG));
    });

    it('does not rewrite the snapshot it just loaded', async () => {
        vi.useFakeTimers();
        const source = new Y.Doc();
        source.getMap('signals').set('changedAt', 1);
        const { state } = room({ snapshot: Array.from(Y.encodeStateAsUpdate(source)) });
        await vi.advanceTimersByTimeAsync(5000);
        expect(state.storage.put).not.toHaveBeenCalled();
    });

    it('closes a socket whose token expired when it next sends', () => {
        const { doc } = room();
        const ws = { close: vi.fn(), send: vi.fn() };
        doc.sessions.set(ws, { userId: '1', expiresAt: Date.now() - 1, tokens: 100, lastRefill: Date.now() });
        doc.webSocketMessage(ws, new Uint8Array([0, 0]).buffer);
        expect(ws.close).toHaveBeenCalledWith(1008, 'Token expired');
        expect(doc.sessions.has(ws)).toBe(false);
    });
});
