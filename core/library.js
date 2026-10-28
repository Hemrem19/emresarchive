/**
 * The library this tab works in: the personal one or a group's.
 *
 * Each library has its own IndexedDB database and sync marker, so every view,
 * cache and store works unchanged on whichever library is open. Switching
 * libraries reloads the page to start clean. Group libraries are cloud
 * libraries: their local database is a copy of the server's, removed on
 * logout (clearGroupData).
 *
 * The backend learns the library from the X-Library header ("group:12");
 * requests without it work in the personal library.
 */

const STORAGE_KEY = 'citavers:library';
const PERSONAL = 'personal';
const GROUP_DB_PREFIX = 'CitaversDB-group-';

export const PERSONAL_DB_NAME = 'CitaversDB';

function read() {
    try {
        const value = localStorage.getItem(STORAGE_KEY);
        return /^group:\d+$/.test(value || '') ? value : PERSONAL;
    } catch {
        return PERSONAL;
    }
}

/** "personal" or "group:12". */
export const currentLibrary = () => read();

/** The open group's id, or null in the personal library. */
export function currentGroupId() {
    const match = /^group:(\d+)$/.exec(read());
    return match ? Number(match[1]) : null;
}

export const inGroupLibrary = () => currentGroupId() !== null;

/** IndexedDB database of the open library. */
export function dbName() {
    const groupId = currentGroupId();
    return groupId === null ? PERSONAL_DB_NAME : `${GROUP_DB_PREFIX}${groupId}`;
}

const OPENED_KEY = 'citavers:groupDbs';

/** Records a group database as opened, so clearGroupData can find it without indexedDB.databases(). */
export function rememberOpened(name) {
    if (!name.startsWith(GROUP_DB_PREFIX)) return;
    try {
        const known = new Set(JSON.parse(localStorage.getItem(OPENED_KEY) || '[]'));
        if (!known.has(name)) localStorage.setItem(OPENED_KEY, JSON.stringify([...known, name]));
    } catch { /* storage unavailable */ }
}

/** localStorage key of the open library's "last pulled from the cloud" time. */
export function lastSyncedKey() {
    const groupId = currentGroupId();
    // v2: group pulls start over once so every paper gets its addedBy
    return groupId === null ? 'citavers:lastSyncedAt' : `citavers:lastSyncedAt:group:${groupId}:v2`;
}

/** Headers naming the open library to the backend (none for the personal one). */
export function libraryHeaders() {
    const library = read();
    return library === PERSONAL ? {} : { 'X-Library': library };
}

/** Sync room of the open library ("personal" maps to the user's own room server-side). */
export const syncRoom = () => read();

/**
 * Opens a library: "personal" or a group id. Reloads unless `reload` is false,
 * landing on `hash` (default the dashboard).
 */
export function openLibrary(library, { reload = true, hash = '#/app' } = {}) {
    const value = library === PERSONAL || library === null || library === undefined ? PERSONAL : `group:${Number(library)}`;
    try {
        if (value === PERSONAL) localStorage.removeItem(STORAGE_KEY);
        else localStorage.setItem(STORAGE_KEY, value);
    } catch { /* storage unavailable: stays in the personal library */ }
    if (reload && typeof window !== 'undefined') {
        window.location.hash = hash;
        window.location.reload();
    }
}

/**
 * Removes every group's local copy and sync marker and returns to the
 * personal library, so the next person on this browser sees no group data.
 */
export async function clearGroupData() {
    try {
        const keys = Array.from({ length: localStorage.length }, (_, i) => localStorage.key(i));
        for (const key of keys) {
            if (key?.startsWith('citavers:lastSyncedAt:group:')) localStorage.removeItem(key);
        }
        localStorage.removeItem(STORAGE_KEY);
    } catch { /* storage unavailable */ }

    const names = new Set();
    try {
        JSON.parse(localStorage.getItem(OPENED_KEY) || '[]').forEach((n) => names.add(n));
        localStorage.removeItem(OPENED_KEY);
    } catch { /* storage unavailable */ }

    if (typeof indexedDB === 'undefined') return;
    if (typeof indexedDB.databases === 'function') {
        try {
            for (const { name } of await indexedDB.databases()) {
                if (name?.startsWith(GROUP_DB_PREFIX)) names.add(name);
            }
        } catch { /* listing unsupported */ }
    }
    await Promise.all([...names].map((name) => new Promise((resolve) => {
        const request = indexedDB.deleteDatabase(name);
        request.onsuccess = request.onerror = request.onblocked = () => resolve();
    })));
}
