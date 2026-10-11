/**
 * Access control: the one place that decides who may touch what.
 *
 * Today every resource belongs to exactly one user. Routes must go through
 * these helpers instead of writing `eq(table.userId, user.id)` themselves, so
 * shared workspaces can later widen access here without auditing every route.
 */
import { and, eq, isNull } from 'drizzle-orm';

/** Rows of `table` the user owns (including soft-deleted ones). */
export const ownedBy = (table, user) => eq(table.userId, user.id);

/** Rows of `table` the user owns and that are not soft-deleted. */
export const liveOwnedBy = (table, user) => and(ownedBy(table, user), isNull(table.deletedAt));

/**
 * One live row by id that the user owns, or undefined.
 * `query` is the matching relational query, e.g. db.query.papers.
 */
export function findOwned(query, table, user, id, columns) {
    return query.findFirst({
        where: and(eq(table.id, id), liveOwnedBy(table, user)),
        ...(columns ? { columns } : {}),
    });
}

// --- PDF storage -----------------------------------------------------------
// Object keys are papers/{userId}/{paperId}/{file}. A paper's pdfUrl is client
// writable, so a key is only honoured inside the caller's own prefix;
// otherwise anyone could point a paper at someone else's file and read it.

export const storagePrefix = (user) => `papers/${user.id}/`;

export const isStorageKey = (value) => typeof value === 'string' && value.startsWith('papers/');

export const ownsStorageKey = (user, key) =>
    isStorageKey(key) && key.startsWith(storagePrefix(user)) && !key.includes('..');

const isHttpUrl = (value) => {
    try {
        const { protocol } = new URL(value);
        return protocol === 'https:' || protocol === 'http:';
    } catch {
        return false;
    }
};

/**
 * Validates a pdfUrl a client wants to store: null/empty, one of the user's
 * own storage keys, or an external http(s) link. Returns an error message or
 * null when acceptable.
 */
export function pdfUrlError(user, pdfUrl) {
    if (pdfUrl === undefined || pdfUrl === null || pdfUrl === '') return null;
    if (typeof pdfUrl !== 'string') return 'pdfUrl must be a string';
    if (isStorageKey(pdfUrl)) {
        return ownsStorageKey(user, pdfUrl) ? null : 'pdfUrl refers to a file you do not own';
    }
    return isHttpUrl(pdfUrl) ? null : 'pdfUrl must be an uploaded file key or an http(s) URL';
}

export { isHttpUrl };
