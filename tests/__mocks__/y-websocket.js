/**
 * WebsocketProvider mock for y-websocket (imported via esm.sh CDN)
 */
export class WebsocketProvider {
    constructor(url, room, doc, opts = {}) {
        this.url = url;
        this.room = room;
        this.doc = doc;
        this.connected = false;
        this.awareness = {
            setLocalStateField: () => {},
            getStates: () => new Map(),
            on: () => {},
            off: () => {},
            clientID: 1,
        };
        this._observers = {};
    }
    on(event, fn) { (this._observers[event] = this._observers[event] || []).push(fn); }
    off(event, fn) {}
    connect() { this.connected = true; }
    disconnect() { this.connected = false; }
    destroy() {}
}

export default { WebsocketProvider };
