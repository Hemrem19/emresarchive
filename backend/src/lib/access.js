/**
 * Access control: the one place that decides who may touch what.
 *
 * Every row lives in a library:
 *   personal  { ownerId }  rows with user_id = owner and group_id NULL
 *   group     { groupId }  rows with group_id = the group (user_id is the
 *                          member who added them), reached through membership
 * Only this file knows how a library maps to columns, so routes must not
 * compare user ids or group ids themselves.
 *
 * Routes ask whether the caller may perform an action, never "is it mine":
 *   READ         see metadata (papers, notes, folders, graphs)
 *   WRITE        create, change or delete metadata
 *   READ_FILES   download PDFs (a public group may show metadata but not files)
 *   WRITE_FILES  attach, replace or detach PDFs
 *
 * Group management (rename, members, invites, delete) is decided by `can`.
 * Ownership operations (wipe my data, restore my backup, my stats and quota)
 * act on the caller's personal library and use ownedBy / liveOwnedBy.
 *
 * The auth middleware loads the caller's memberships as user.memberships
 * ({ [groupId]: role }), so every check here is synchronous.
 */
import { and, eq, inArray, isNull, or, sql } from 'drizzle-orm';

export const READ = 'read';
export const WRITE = 'write';
export const READ_FILES = 'read_files';
export const WRITE_FILES = 'write_files';

const ACTIONS = new Set([READ, WRITE, READ_FILES, WRITE_FILES]);

function checkAction(action) {
    if (!ACTIONS.has(action)) throw new Error(`Unknown access action: ${action}`);
}

// --- Groups ----------------------------------------------------------------

export const OWNER = 'owner';
export const ADMIN = 'admin';
export const MEMBER = 'member';
export const ROLES = [OWNER, ADMIN, MEMBER];

/** Library actions each group role grants. Phase 1: every member edits everything. */
const ROLE_ACTIONS = {
    [OWNER]: ACTIONS,
    [ADMIN]: ACTIONS,
    [MEMBER]: ACTIONS,
};

export const MANAGE_GROUP = 'manage_group';   // rename, invite, remove members
export const CHANGE_ROLES = 'change_roles';   // make members admins and back
export const DELETE_GROUP = 'delete_group';

const MANAGEMENT = {
    [MANAGE_GROUP]: new Set([OWNER, ADMIN]),
    [CHANGE_ROLES]: new Set([OWNER]),
    [DELETE_GROUP]: new Set([OWNER]),
};

/** The caller's role in a group, or undefined when not a member. */
export const roleIn = (user, groupId) => user.memberships?.[groupId];

/** Whether `user` may perform a group management action on group `groupId`. */
export function can(user, action, groupId) {
    const allowed = MANAGEMENT[action];
    if (!allowed) throw new Error(`Unknown group action: ${action}`);
    return allowed.has(roleIn(user, groupId));
}

/** Ids of the groups in which `user` may perform `action`. */
const groupsAllowing = (user, action) => Object.entries(user.memberships ?? {})
    .filter(([, role]) => ROLE_ACTIONS[role]?.has(action))
    .map(([groupId]) => Number(groupId));

// --- Libraries -------------------------------------------------------------

/** The caller's personal library. */
export const personalLibrary = (user) => ({ ownerId: user.id });

/** A group's library. */
export const groupLibrary = (groupId) => ({ groupId: Number(groupId) });

export const isGroupLibrary = (library) => library.groupId !== undefined;

/**
 * The library a row lives in. The row must have been loaded with userId, and
 * with groupId when its table has that column.
 */
export function libraryOf(row) {
    if (row?.groupId !== undefined && row.groupId !== null) return groupLibrary(row.groupId);
    if (row?.userId === undefined || row.userId === null) {
        throw new Error('libraryOf: row was loaded without userId');
    }
    return { ownerId: row.userId };
}

export const sameLibrary = (a, b) =>
    isGroupLibrary(a) ? a.groupId === b.groupId : !isGroupLibrary(b) && a.ownerId === b.ownerId;

/** "personal" or "group:12", as clients name libraries. */
export const libraryName = (library) => (isGroupLibrary(library) ? `group:${library.groupId}` : 'personal');

/**
 * The library a client names (X-Library header or a request field), if the
 * caller may read it: missing or "personal" is their own; "group:12" needs
 * membership. Returns null otherwise.
 */
export function parseLibrary(user, value) {
    if (value === undefined || value === null || value === '' || value === 'personal') return personalLibrary(user);
    const match = /^group:(\d+)$/.exec(String(value));
    if (!match) return null;
    const library = groupLibrary(match[1]);
    return allowsIn(user, READ, library) ? library : null;
}

const hasGroups = (table) => table.groupId !== undefined;

/** Condition: rows of `table` that live in `library`. */
export function inLibrary(table, library) {
    if (isGroupLibrary(library)) {
        if (!hasGroups(table)) throw new Error('inLibrary: this table has no group libraries');
        return eq(table.groupId, library.groupId);
    }
    const owned = eq(table.userId, library.ownerId);
    return hasGroups(table) ? and(owned, isNull(table.groupId)) : owned;
}

/** Column values that place a new row in `library`, added by `user`. */
export function libraryFields(library, user) {
    if (!isGroupLibrary(library)) return { userId: library.ownerId };
    if (!user) throw new Error('libraryFields: a group row needs the member who adds it');
    return { userId: user.id, groupId: library.groupId };
}

// --- Ownership (personal library) ------------------------------------------

const notDeleted = (table, condition) => (table.deletedAt ? and(condition, isNull(table.deletedAt)) : condition);

/** Rows of `table` in the user's personal library, including soft-deleted ones. */
export const ownedBy = (table, user) => inLibrary(table, personalLibrary(user));

/** Rows of `table` in the user's personal library that are not soft-deleted. */
export const liveOwnedBy = (table, user) => notDeleted(table, ownedBy(table, user));

// --- Access ----------------------------------------------------------------

const NOTHING = sql`0 = 1`;

/** Whether `user` may perform `action` in `library`. */
export function allowsIn(user, action, library) {
    checkAction(action);
    if (isGroupLibrary(library)) return ROLE_ACTIONS[roleIn(user, library.groupId)]?.has(action) ?? false;
    return library.ownerId === user.id;
}

/** Whether `user` may perform `action` on a loaded row (needs its userId and groupId). */
export const allows = (user, action, row) => allowsIn(user, action, libraryOf(row));

/**
 * Condition: rows of `table` (soft-deleted ones included) on which `user` may
 * perform `action`; only those in `library` when one is given.
 */
export function accessibleWithDeleted(table, user, action, library) {
    checkAction(action);
    if (library) return allowsIn(user, action, library) ? inLibrary(table, library) : NOTHING;
    const own = ownedBy(table, user);
    const groupIds = hasGroups(table) ? groupsAllowing(user, action) : [];
    return groupIds.length ? or(own, inArray(table.groupId, groupIds)) : own;
}

/** Like accessibleWithDeleted, but live rows only (most reads). */
export const accessible = (table, user, action, library) =>
    notDeleted(table, accessibleWithDeleted(table, user, action, library));

/**
 * One live row by id on which the user may perform `action`, in any library
 * they can reach, or undefined. `query` is the matching relational query,
 * e.g. db.query.papers.
 */
export function findAccessible(query, table, user, id, action, columns) {
    return query.findFirst({
        where: and(eq(table.id, id), accessible(table, user, action)),
        ...(columns ? { columns } : {}),
    });
}

// --- Authorship ----------------------------------------------------------
// In a group, user_id is the member who added a row. Some rows belong to that
// person within the library (a comment): only they may edit it, while group
// managers may still remove it.

/** Whether `user` wrote this loaded row (needs its userId). */
export const isAuthor = (user, row) => row?.userId === user.id;

/** The column naming who wrote a row of `table`, e.g. to join their name. */
export const authorColumn = (table) => table.userId;

/** Condition: rows of `table` written by `user`. */
export const authoredBy = (table, user) => eq(table.userId, user.id);

/**
 * Whether `user` may remove someone else's row in its library: group owners
 * and admins in a group, the owner in a personal library.
 */
export function maySupervise(user, row) {
    const library = libraryOf(row);
    return isGroupLibrary(library) ? can(user, MANAGE_GROUP, library.groupId) : library.ownerId === user.id;
}

// --- PDF storage -----------------------------------------------------------
// Object keys are papers/{ownerId}/{paperId}/{file} in a personal library and
// papers/g{groupId}/{paperId}/{file} in a group: files live under the library
// that owns them (and pays for them). A paper's pdfUrl is client
// writable, so a key is only honoured inside that paper's own library;
// otherwise anyone could point a paper at someone else's file and read it.

export function storagePrefix(library) {
    if (Number.isInteger(library?.groupId)) return `papers/g${library.groupId}/`;
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
