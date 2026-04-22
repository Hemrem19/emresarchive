import * as Y from 'yjs';
import * as syncProtocol from 'y-protocols/sync';
import * as awarenessProtocol from 'y-protocols/awareness';
import * as encoding from 'lib0/encoding';
import * as decoding from 'lib0/decoding';

// Message Types
const messageSync = 0;
const messageAwareness = 1;

export class WorkspaceDurableObject {
  constructor(state, env) {
    this.state = state;
    this.env = env;
    
    // In-memory Yjs Document
    this.doc = new Y.Doc();
    this.awareness = new awarenessProtocol.Awareness(this.doc);
    
    // Track active WebSocket connections
    this.sessions = new Map();

    // Debounce persistence — every keystroke fires an update; storing the
    // full snapshot each time is wasteful and any unhandled rejection from
    // state.storage.put leaks as an unhandled error with binary bytes in the
    // message (looks like JSON syntax errors).
    this._persistTimer = null;

    // Bind awareness update events to broadcast to all clients.
    // Must use writeVarUint8Array (length-prefixed): y-websocket clients read
    // awareness payloads with readVarUint8Array, so omitting the prefix
    // desyncs their decoder and throws "Unexpected end of array" / JSON errors.
    this.awareness.on('update', ({ added, updated, removed }) => {
      const changedClients = added.concat(updated, removed);
      const encoder = encoding.createEncoder();
      encoding.writeVarUint(encoder, messageAwareness);
      encoding.writeVarUint8Array(encoder, awarenessProtocol.encodeAwarenessUpdate(this.awareness, changedClients));
      const buff = encoding.toUint8Array(encoder);
      this.broadcastToAll(buff);
    });

    // Listen to document updates to sync across connected clients
    this.doc.on('update', (update, origin) => {
      this.schedulePersist();

      const encoder = encoding.createEncoder();
      encoding.writeVarUint(encoder, messageSync);
      syncProtocol.writeUpdate(encoder, update);
      const message = encoding.toUint8Array(encoder);

      for (const [ws, _session] of this.sessions.entries()) {
        if (ws !== origin) {
          try {
            ws.send(message);
          } catch (e) {
            this.handleError(ws, e);
          }
        }
      }
    });

    // Load initial state and rebuild session map from hibernated sockets.
    // If the snapshot is corrupt/incompatible, we log and continue with a fresh
    // doc rather than letting the constructor throw — an unhandled throw here
    // would reset the DO on every incoming request and cause WS handshake refusals.
    this.state.blockConcurrencyWhile(async () => {
      try {
        const storedUpdate = await this.state.storage.get("yjs_doc_snapshot");
        if (storedUpdate) {
          // Accept both the new Array<number> format and the legacy Uint8Array.
          const bytes = storedUpdate instanceof Uint8Array
            ? storedUpdate
            : (Array.isArray(storedUpdate) ? new Uint8Array(storedUpdate) : null);
          if (bytes) Y.applyUpdate(this.doc, bytes);
        }
      } catch (err) {
        console.error('[DO] Failed to apply stored snapshot, starting fresh:', err && err.message);
      }

      // Re-register hibernation-wake sockets in the in-memory session map so
      // webSocketMessage/webSocketClose can find them.
      try {
        for (const ws of this.state.getWebSockets()) {
          if (!this.sessions.has(ws)) {
            const attached = (typeof ws.deserializeAttachment === 'function')
              ? (ws.deserializeAttachment() || {})
              : {};
            this.sessions.set(ws, {
              connectionId: attached.connectionId || crypto.randomUUID(),
              userId: attached.userId || null,
              tokens: 100,
              lastRefill: Date.now(),
              timeoutId: null
            });
          }
        }
      } catch (err) {
        console.error('[DO] Failed to rebuild session map from hibernated sockets:', err);
      }
    });
  }

  schedulePersist() {
    if (this._persistTimer) return;
    this._persistTimer = setTimeout(() => {
      this._persistTimer = null;
      this.saveStateToStorage().catch(err => {
        // Swallow so it never becomes an unhandled rejection; bytes in the
        // snapshot can produce JSON-like error messages that are misleading.
        console.error('[DO] saveStateToStorage failed:', err && err.message);
      });
    }, 2000);
  }

  async saveStateToStorage() {
    const snapshot = Y.encodeStateAsUpdate(this.doc);
    // DO storage supports Uint8Array via structured clone on SQLite-backed
    // classes, but some runtimes round-trip it through JSON which corrupts
    // binary data. Store as Array<number> to be safe — ~2x size, worth it for
    // correctness.
    await this.state.storage.put("yjs_doc_snapshot", Array.from(snapshot));
  }

  async fetch(request) {
    const upgradeHeader = request.headers.get('Upgrade');
    if (!upgradeHeader || upgradeHeader !== 'websocket') {
      return new Response('Expected Upgrade: websocket', { status: 426 });
    }

    const [client, server] = Object.values(new WebSocketPair());
    
    // Accept the WebSocket connection explicitly
    this.state.acceptWebSocket(server);

    // Securely extract User context injected by worker route
    const userId = request.headers.get('X-User-Id');
    const jwtExpSecs = request.headers.get('X-JWT-Exp');

    const sessionData = { 
      connectionId: crypto.randomUUID(),
      userId: userId,
      tokens: 100, // Burst capacity
      lastRefill: Date.now(),
      timeoutId: null
    };

    // Active JWT Expiry Severing Logic
    if (jwtExpSecs) {
      const expMs = parseInt(jwtExpSecs, 10) * 1000;
      const ttl = expMs - Date.now();
      
      if (ttl <= 0) {
        return new Response('Token already expired', { status: 401 });
      }
      
      // Forcefully terminate this connection when the token natively expires
      sessionData.timeoutId = setTimeout(() => {
        console.warn(`[Zero-Trust] Token natively expired for User ${userId}. Force closing socket.`);
        try {
          server.close(1008, 'Token expired natively during session');
        } catch (e) {}
        this.closeSession(server);
      }, ttl);
    }

    this.sessions.set(server, sessionData);

    // Persist minimal metadata across hibernation so we can rebuild the map.
    try {
      if (typeof server.serializeAttachment === 'function') {
        server.serializeAttachment({
          connectionId: sessionData.connectionId,
          userId: sessionData.userId
        });
      }
    } catch (e) {
      // Non-fatal — hibernation just won't carry attachment.
    }

    // Send Step 1 of the Yjs sync protocol (server sends its state vector)
    const encoder = encoding.createEncoder();
    encoding.writeVarUint(encoder, messageSync);
    syncProtocol.writeSyncStep1(encoder, this.doc);
    server.send(encoding.toUint8Array(encoder));

    // Send awareness state
    const awarenessStates = this.awareness.getStates();
    if (awarenessStates.size > 0) {
      const encoderAwareness = encoding.createEncoder();
      encoding.writeVarUint(encoderAwareness, messageAwareness);
      encoding.writeVarUint8Array(
        encoderAwareness,
        awarenessProtocol.encodeAwarenessUpdate(this.awareness, Array.from(awarenessStates.keys()))
      );
      server.send(encoding.toUint8Array(encoderAwareness));
    }

    return new Response(null, {
      status: 101,
      webSocket: client,
    });
  }

  webSocketMessage(ws, message) {
    const session = this.sessions.get(ws);
    if (!session) return;

    // Rate limiting (Token Bucket) - Zero-Trust Phase 5
    const now = Date.now();
    const elapsedTimeMs = now - session.lastRefill;
    const tokensToAdd = (elapsedTimeMs / 1000) * 20; // Re-fill at 20 msgs/sec
    
    session.tokens = Math.min(100, session.tokens + tokensToAdd);
    session.lastRefill = now;

    if (session.tokens < 1) {
      // Active Severing Mechanism
      console.warn(`[Zero-Trust] Rate limit exceeded by User ${session.userId}. Severing connection.`);
      ws.close(1008, 'Rate limit exceeded');
      this.closeSession(ws);
      return;
    }
    
    session.tokens -= 1;

    // Normalize incoming frame to Uint8Array. Binary Yjs messages arrive as
    // ArrayBuffer; text frames (shouldn't happen, but guard anyway) as strings.
    let bytes;
    if (message instanceof ArrayBuffer) {
      bytes = new Uint8Array(message);
    } else if (message instanceof Uint8Array) {
      bytes = message;
    } else if (typeof message === 'string') {
      console.warn('[DO] Ignoring unexpected text frame on Yjs socket');
      return;
    } else {
      console.warn('[DO] Ignoring unknown message type:', typeof message);
      return;
    }

    try {
      const decoder = decoding.createDecoder(bytes);
      const messageType = decoding.readVarUint(decoder);
      const encoder = encoding.createEncoder();

      switch (messageType) {
        case messageSync:
          encoding.writeVarUint(encoder, messageSync);
          syncProtocol.readSyncMessage(decoder, encoder, this.doc, ws);
          if (encoding.length(encoder) > 1) {
            ws.send(encoding.toUint8Array(encoder));
          }
          break;
        case messageAwareness:
          awarenessProtocol.applyAwarenessUpdate(this.awareness, decoding.readVarUint8Array(decoder), ws);
          break;
        default:
          console.warn('[DO] Unknown Yjs message type:', messageType);
      }
    } catch (err) {
      // err.message can contain raw binary bytes from protocol decoding or
      // awareness JSON.parse — log name + a hex prefix of the frame so we can
      // actually diagnose rather than print control characters.
      const hexPrefix = Array.from(bytes.slice(0, 16))
        .map(b => b.toString(16).padStart(2, '0')).join(' ');
      console.error(`[DO] webSocketMessage error: ${err && err.name}: ${err && err.message} | first16=[${hexPrefix}]`);
    }
  }

  webSocketClose(ws, code, reason, wasClean) {
    this.closeSession(ws);
  }

  webSocketError(ws, error) {
    this.handleError(ws, error);
  }

  handleError(ws, error) {
    console.error('WebSocket Error:', error);
    this.closeSession(ws);
  }

  closeSession(ws) {
    const session = this.sessions.get(ws);
    if (session) {
      if (session.timeoutId) clearTimeout(session.timeoutId);
      // Only remove awareness states originating from *this* client. The previous
      // code nuked every peer's awareness on any disconnect, which made shared
      // sessions flicker and lose presence.
      if (session.awarenessClientId != null) {
        awarenessProtocol.removeAwarenessStates(this.awareness, [session.awarenessClientId], this);
      }
    }
    this.sessions.delete(ws);
    try { ws.close(); } catch (_) { /* already closed */ }
  }

  broadcastToAll(message) {
    for (const ws of this.sessions.keys()) {
      try {
        ws.send(message);
      } catch (err) {
        this.handleError(ws, err);
      }
    }
  }
}
