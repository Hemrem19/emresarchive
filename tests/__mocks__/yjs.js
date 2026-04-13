/**
 * Yjs test mock
 * Stubs the Yjs library imported via https://esm.sh/yjs in tests.
 */
export class Doc {
    constructor() {
        this.clientID = 1;
        this._map = new Map();
        this._observers = [];
    }
    getMap(name) {
        if (!this._map.has(name)) {
            const mockMap = {
                _store: new Map(),
                _observers: [],
                get: (k) => mockMap._store.get(k),
                set: (k, v) => { mockMap._store.set(k, v); mockMap._observers.forEach(fn => fn()); },
                has: (k) => mockMap._store.has(k),
                delete: (k) => mockMap._store.delete(k),
                toJSON: () => Object.fromEntries(mockMap._store),
                observe: (fn) => mockMap._observers.push(fn),
                unobserve: () => {},
                size: 0,
                keys: () => mockMap._store.keys(),
                values: () => mockMap._store.values(),
                entries: () => mockMap._store.entries(),
                forEach: (fn) => mockMap._store.forEach(fn),
            };
            this._map.set(name, mockMap);
        }
        return this._map.get(name);
    }
    getText(name) {
        return {
            insert: () => {},
            delete: () => {},
            toString: () => '',
            observe: () => {},
            unobserve: () => {},
        };
    }
    getArray(name) {
        return {
            push: () => {},
            delete: () => {},
            toArray: () => [],
            observe: () => {},
            unobserve: () => {},
        };
    }
    on(event, fn) {}
    off(event, fn) {}
    transact(fn) { fn(); }
    destroy() {}
}

export const applyUpdate = () => {};
export const encodeStateAsUpdate = () => new Uint8Array();
export const encodeStateVector = () => new Uint8Array();
export const diffUpdate = () => new Uint8Array();
export const mergeUpdates = () => new Uint8Array();
export const decodeUpdate = () => ({ structs: [], ds: {} });

export default { Doc, applyUpdate, encodeStateAsUpdate, encodeStateVector };
