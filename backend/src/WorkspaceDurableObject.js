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

    // Bind awareness update events to broadcast to all clients
    this.awareness.on('update', ({ added, updated, removed }) => {
      const changedClients = added.concat(updated, removed);
      const encoder = encoding.createEncoder();
      encoding.writeVarUint(encoder, messageAwareness);
      encoding.writeUint8Array(encoder, awarenessProtocol.encodeAwarenessUpdate(this.awareness, changedClients));
      const buff = encoding.toUint8Array(encoder);
      this.broadcastToAll(buff);
    });

    // Listen to document updates to sync across connected clients
    this.doc.on('update', (update, origin) => {
      // Store incrementals onto DO Storage
      this.saveStateToStorage();

      const encoder = encoding.createEncoder();
      encoding.writeVarUint(encoder, messageSync);
      syncProtocol.writeUpdate(encoder, update);
      const message = encoding.toUint8Array(encoder);
      
      // Broadcast update to all clients except the sender
      for (const [ws, session] of this.sessions.entries()) {
        if (ws !== origin) {
          try {
            ws.send(message);
          } catch (e) {
            this.handleError(ws, e);
          }
        }
      }
    });

    // Load initial state asynchronously
    this.state.blockConcurrencyWhile(async () => {
      const storedUpdate = await this.state.storage.get("yjs_doc_snapshot");
      if (storedUpdate) {
        Y.applyUpdate(this.doc, storedUpdate);
      }
    });
  }

  async saveStateToStorage() {
    // Encodes the entire document as a single Uint8Array
    const snapshot = Y.encodeStateAsUpdate(this.doc);
    await this.state.storage.put("yjs_doc_snapshot", snapshot);
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
      encoding.writeUint8Array(
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

    // Handle incoming messages natively in DO
    try {
      const decoder = decoding.createDecoder(new Uint8Array(message));
      const messageType = decoding.readVarUint(decoder);
      const encoder = encoding.createEncoder();

      switch (messageType) {
        case messageSync:
          encoding.writeVarUint(encoder, messageSync);
          syncProtocol.readSyncMessage(decoder, encoder, this.doc, ws);
          // If the server has a response step (e.g. step 2 responding to step 1)
          if (encoding.length(encoder) > 1) {
            ws.send(encoding.toUint8Array(encoder));
          }
          break;
        case messageAwareness:
          awarenessProtocol.applyAwarenessUpdate(this.awareness, decoding.readUint8Array(decoder), ws);
          break;
      }
    } catch (err) {
      console.error('Do webSocketMessage error:', err);
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
      // Clear security timeouts to prevent memory leaks
      if (session.timeoutId) {
         clearTimeout(session.timeoutId);
      }
      // Remove awareness from disconnected standard users
      awarenessProtocol.removeAwarenessStates(this.awareness, Array.from(this.awareness.getStates().keys()), this);
    }
    this.sessions.delete(ws);
    ws.close();
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
