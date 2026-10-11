/**
 * Access control: the one place that decides who may touch what.
 *
 * Every row lives in a library. Today the only kind is a user's personal
 * library (rows whose user_id is the owner). Shared group libraries
 * (plans/collab.md) will add libraries reached through membership, with roles
 * that grant some actions and not others. Only this file should need to
 * change for that, so routes must not compare user ids themselves.
 *
 * Routes ask whether the caller may perform an action, never "is it mine":
 *   READ         see metadata (papers, notes, folders, graphs)
 *   WRITE        create, change or delete metadata
 *   READ_FILES   download PDFs (a public group may show metadata but not files)
 *   WRITE_FILES  attach, replace or detach PDFs
 *
 * Ownership operations (wipe my data, restore my backup, my stats and quota)
 * act on the caller's personal library and use ownedBy / liveOwnedBy.
 */
import { and, eq, isNull } from 'drizzle-orm';

export const READ = 'read';
export const WRITE = 'write';
export const READ_FILES = 'read_files';
export const WRITE_FILES = 'write_files';

const ACTIONS = new Set([READ, WRITE, READ_FILES, WRITE_FILES]);

function checkAction(action) {
    if (!ACTIONS.has(action)) throw new Error(`Unknown access action: ${action}`);
}

const notDeleted = (table, condition) => (table.deletedAt ? and(condition, isNull(table.deletedAt)) : condition);

// --- Libraries -------------------------------------------------------------

/** The caller's personal library. */
export const personalLibrary = (user) => ({ ownerId: user.id });

/** The library a row lives in. The row must have been loaded with its userId. */
export function libraryOf(row) {
    if (row?.userId === undefined || row.userId === null) {
        throw new Error('libraryOf: row was loaded without userId');
    }
    return { ownerId: row.userId };
}

export const sameLibrary = (a, b) => a.ownerId === b.ownerId;

/** Condition: rows of `table` that live in `library`. */
export const inLibrary = (table, library) => eq(table.userId, library.ownerId);

/** Column values that place a new row in `library`. */
export const libraryFields = (library) => ({ userId: library.ownerId });

// --- Ownership (personal library) ------------------------------------------

/** Rows of `table` in the user's personal library, including soft-deleted ones. */
export const ownedBy = (table, user) => inLibrary(table, personalLibrary(user));

/** Rows of `table` in the user's personal library that are not soft-deleted. */
export const liveOwnedBy = (table, user) => notDeleted(table, ownedBy(table, user));

// --- Access ----------------------------------------------------------------

/** Condition: live rows of `table` on which `user` may perform `action`. */
export function accessible(table, user, action) {
    checkAction(action);
    return liveOwnedBy(table, user);
}

/** Like accessible, but also matches soft-deleted rows (delta sync needs tombstones). */
export function accessibleWithDeleted(table, user, action) {
    checkAction(action);
    return ownedBy(table, user);
}

/** Whether `user` may perform `action` in `library`. */
export function allowsIn(user, action, library) {
    checkAction(action);
    return library.ownerId === user.id;
}

/** Whether `user` may perform `action` on a loaded row (needs its userId). */
export const allows = (user, action, row) => allowsIn(user, action, libraryOf(row));

/**
 * One live row by id on which the user may perform `action`, or undefined.
 * `query` is the matching relational query, e.g. db.query.papers.
 */
export function findAccessible(query, table, user, id, action, columns) {
    return query.findFirst({
        where: and(eq(table.id, id), accessible(table, user, action)),
        ...(columns ? { columns } : {}),
    });
}

// --- PDF storage -----------------------------------------------------------
// Object keys are papers/{ownerId}/{paperId}/{file}: files live under the
// library that owns them (and pays for them). A paper's pdfUrl is client
// writable, so a key is only honoured inside that paper's own library;
// otherwise anyone could point a paper at someone else's file and read it.

export function storagePrefix(library) {
    // A user passed where a library belongs would give papers/undefined/
    if (!Number.isInteger(library?.ownerId)) throw new Error('storagePrefix: not a library');
    return `papers/${library.ownerId}/`;
}

export const isStorageKey = (value) => typeof value === 'string' && value.startsWith('papers/');

export const keyInLibrary = (library, key) =>
    isStorageKey(key) && key.startsWith(storagePrefix(library)) && !key.includes('..');

/** A new object key in `library`. Anything but a numeric paper id becomes a temp id. */
export function pdfKey(library, paperId, filename, now = Date.now()) {
    const id = /^\d+$/.test(String(paperId ?? '')) ? String(paperId) : `temp-${now}`;
    const name = String(filename || 'upload.pdf').replace(/[^a-zA-Z0-9._-]/g, '_').replace(/\.{2,}/g, '.');
    return `${storagePrefix(library)}${id}/${name}`;
}

export const isHttpUrl = (value) => {
    try {
        const { protocol } = new URL(value);
        return protocol === 'https:' || protocol === 'http:';
    } catch {
        return false;
    }
};

/**
 * Validates a pdfUrl a client wants to store on a paper in `library`:
 * null/empty, a key inside that library, or an external http(s) link.
 * Returns an error message, or null when acceptable.
 */
export function pdfUrlError(library, pdfUrl) {
    if (pdfUrl === undefined || pdfUrl === null || pdfUrl === '') return null;
    if (typeof pdfUrl !== 'string') return 'pdfUrl must be a string';
    if (isStorageKey(pdfUrl)) {
        return keyInLibrary(library, pdfUrl) ? null : 'pdfUrl refers to a file you do not own';
    }
    return isHttpUrl(pdfUrl) ? null : 'pdfUrl must be an uploaded file key or an http(s) URL';
}
