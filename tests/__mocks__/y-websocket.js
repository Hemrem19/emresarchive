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
        WebsocketProvider.last = this; // lets tests reach the provider syncManager created
    }
    on(event, fn) { (this._observers[event] = this._observers[event] || []).push(fn); }
    off(event, fn) {}
    emit(event, args) { (this._observers[event] || []).forEach((fn) => fn(...args)); }
    connect() { this.connected = true; }
    disconnect() { this.connected = false; }
    destroy() {}
}

export default { WebsocketProvider };
