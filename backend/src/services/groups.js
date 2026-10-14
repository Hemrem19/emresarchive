/**
 * Private groups: shared libraries reached through membership.
 *
 * Who may do what is decided in src/lib/access.js (allowsIn, can); this file
 * stores groups, members and invites, enforces the size limits, and talks to
 * the group's sync room (one Durable Object per group, `group:{id}`).
 *
 * Limits are configuration (wrangler.toml [vars]), placeholders for now:
 *   MAX_OWNED_GROUPS   groups one person may own (each has its own storage)
 *   MAX_GROUP_MEMBERS  members plus pending invites per group
 */
import { and, count, eq, gt, inArray, sql } from 'drizzle-orm';
import * as schema from '../../drizzle/schema.js';
import { ADMIN, MEMBER, OWNER, groupLibrary } from '../lib/access.js';
import { CLOSE_SOCKETS_PATH } from './sessions.js';
import { libraryLimit, measureLibrary } from './storage-quota.js';
import { isStorageConfigured } from '../lib/storage.js';

export const INVITE_DAYS = 14;
export const MAX_NAME_LENGTH = 100;
/** Path the Worker posts to on a group room after the group's library changed. */
export const CHANGED_PATH = '/internal/changed';

const GR = schema.groups;
const GM = schema.groupMembers;
const GI = schema.groupInvites;
const U = schema.users;

const intVar = (value, fallback) => {
    const n = parseInt(value, 10);
    return Number.isInteger(n) && n > 0 ? n : fallback;
};
export const maxOwnedGroups = (env) => intVar(env.MAX_OWNED_GROUPS, 3);
export const maxGroupMembers = (env) => intVar(env.MAX_GROUP_MEMBERS, 25);

export const normalizeEmail = (email) => String(email ?? '').trim().toLowerCase();
export const isEmail = (email) => /^[^\s@<>"]+@[^\s@<>"]+\.[^\s@<>"]+$/.test(email);

/** A group name from user input, or null when unusable. */
export function cleanName(name) {
    const value = String(name ?? '').trim().replace(/\s+/g, ' ');
    return value && value.length <= MAX_NAME_LENGTH ? value : null;
}

const nowIso = () => new Date().toISOString();

// --- Groups ------------------------------------------------------------------

/** A user's group roles, { [groupId]: role }: what src/lib/access.js reads as user.memberships. */
export async function loadMemberships(db, userId) {
    const rows = await db.select({ groupId: GM.groupId, role: GM.role }).from(GM).where(eq(GM.userId, userId));
    return Object.fromEntries(rows.map((m) => [m.groupId, m.role]));
}

/** The groups `user` belongs to, with their role and member count. */
export async function listGroups(db, user) {
    const ids = Object.keys(user.memberships ?? {}).map(Number);
    if (!ids.length) return [];
    const [groups, counts] = await Promise.all([
        db.select({ id: GR.id, name: GR.name, ownerId: GR.ownerId, createdAt: GR.createdAt })
            .from(GR).where(inArray(GR.id, ids)),
        db.select({ groupId: GM.groupId, members: count() }).from(GM)
            .where(inArray(GM.groupId, ids)).groupBy(GM.groupId),
    ]);
    const membersOf = new Map(counts.map((c) => [c.groupId, c.members]));
    return groups
        .map((g) => ({ ...g, role: user.memberships[g.id], memberCount: membersOf.get(g.id) ?? 0 }))
        .sort((a, b) => a.name.localeCompare(b.name));
}

export const findGroup = (db, groupId) => db.query.groups.findFirst({ where: eq(GR.id, groupId) });

/** Creates a group owned by `user`; returns it, or { error } past the limit. */
export async function createGroup(db, env, user, name) {
    const [{ owned }] = await db.select({ owned: count() }).from(GR).where(eq(GR.ownerId, user.id));
    if (owned >= maxOwnedGroups(env)) {
        return { error: `You can own at most ${maxOwnedGroups(env)} groups` };
    }
    const [group] = await db.insert(GR).values({ name, ownerId: user.id }).returning();
    await db.insert(GM).values({ groupId: group.id, userId: user.id, role: OWNER });
    return { group };
}

export const renameGroup = (db, groupId, name) =>
    db.update(GR).set({ name, updatedAt: nowIso() }).where(eq(GR.id, groupId));

/** Deletes a group; its rows cascade, and its PDFs go with the nightly purge. */
export const deleteGroup = (db, groupId) => db.delete(GR).where(eq(GR.id, groupId));

/** Bytes the group's PDFs use, and its limit. */
export async function groupStorage(env, groupId) {
    const library = groupLibrary(groupId);
    return {
        usedBytes: isStorageConfigured(env) ? await measureLibrary(env, library) : 0,
        limitBytes: libraryLimit(env, library),
    };
}

// --- Members -------------------------------------------------------------------

export function listMembers(db, groupId) {
    return db.select({ userId: GM.userId, role: GM.role, joinedAt: GM.joinedAt, name: U.name, email: U.email })
        .from(GM).innerJoin(U, eq(U.id, GM.userId))
        .where(eq(GM.groupId, groupId))
        .orderBy(sql`CASE ${GM.role} WHEN 'owner' THEN 0 WHEN 'admin' THEN 1 ELSE 2 END`, U.email);
}

export const findMember = (db, groupId, userId) =>
    db.query.groupMembers.findFirst({ where: and(eq(GM.groupId, groupId), eq(GM.userId, userId)) });

export const setRole = (db, groupId, userId, role) =>
    db.update(GM).set({ role }).where(and(eq(GM.groupId, groupId), eq(GM.userId, userId)));

export const removeMember = (db, groupId, userId) =>
    db.delete(GM).where(and(eq(GM.groupId, groupId), eq(GM.userId, userId)));

/** Members plus pending invites: what the member limit counts. */
async function seatsTaken(db, groupId, exceptEmail) {
    const [[{ members }], [{ invites }]] = await Promise.all([
        db.select({ members: count() }).from(GM).where(eq(GM.groupId, groupId)),
        db.select({ invites: count() }).from(GI).where(and(
            eq(GI.groupId, groupId), gt(GI.expiresAt, nowIso()),
            exceptEmail ? sql`${GI.email} <> ${exceptEmail}` : undefined,
        )),
    ]);
    return members + invites;
}

// --- Invites -------------------------------------------------------------------

export function listInvites(db, groupId) {
    return db.select({ id: GI.id, email: GI.email, role: GI.role, createdAt: GI.createdAt, expiresAt: GI.expiresAt })
        .from(GI).where(and(eq(GI.groupId, groupId), gt(GI.expiresAt, nowIso())))
        .orderBy(GI.createdAt);
}

/**
 * Invites `email` (or renews their invite). Returns { invite } or { error, status }.
 */
export async function invite(db, env, { groupId, email, role, invitedBy }) {
    const already = await db.select({ id: U.id }).from(GM).innerJoin(U, eq(U.id, GM.userId))
        .where(and(eq(GM.groupId, groupId), eq(U.email, email)));
    if (already.length) return { error: 'That person is already a member', status: 409 };
    if (await seatsTaken(db, groupId, email) >= maxGroupMembers(env)) {
        return { error: `A group can have at most ${maxGroupMembers(env)} members and pending invites`, status: 409 };
    }
    const expiresAt = new Date(Date.now() + INVITE_DAYS * 24 * 60 * 60 * 1000).toISOString();
    const [row] = await db.insert(GI).values({ groupId, email, role, invitedBy, expiresAt })
        .onConflictDoUpdate({ target: [GI.groupId, GI.email], set: { role, invitedBy, expiresAt, createdAt: nowIso() } })
        .returning({ id: GI.id, email: GI.email, role: GI.role, createdAt: GI.createdAt, expiresAt: GI.expiresAt });
    return { invite: row };
}

export const cancelInvite = (db, groupId, inviteId) =>
    db.delete(GI).where(and(eq(GI.id, inviteId), eq(GI.groupId, groupId))).returning({ id: GI.id });

/** Unexpired invites addressed to `user`'s email, with the group and inviter names. */
export function invitesFor(db, user) {
    return db.select({
        id: GI.id, groupId: GI.groupId, role: GI.role, expiresAt: GI.expiresAt,
        groupName: GR.name, invitedBy: U.name, invitedByEmail: U.email,
    })
        .from(GI).innerJoin(GR, eq(GR.id, GI.groupId)).leftJoin(U, eq(U.id, GI.invitedBy))
        .where(and(eq(GI.email, normalizeEmail(user.email)), gt(GI.expiresAt, nowIso())));
}

/** An unexpired invite addressed to `user`, or undefined. */
export const findInviteFor = (db, user, inviteId) => db.query.groupInvites.findFirst({
    where: and(eq(GI.id, inviteId), eq(GI.email, normalizeEmail(user.email)), gt(GI.expiresAt, nowIso())),
});

/** Turns an invite into a membership. Returns { groupId } or { error, status }. */
export async function acceptInvite(db, env, user, row) {
    if (!(await findMember(db, row.groupId, user.id))) {
        const [{ members }] = await db.select({ members: count() }).from(GM).where(eq(GM.groupId, row.groupId));
        if (members >= maxGroupMembers(env)) return { error: 'This group is full', status: 409 };
        await db.insert(GM).values({ groupId: row.groupId, userId: user.id, role: row.role === ADMIN ? ADMIN : MEMBER });
    }
    await db.delete(GI).where(eq(GI.id, row.id));
    return { groupId: row.groupId };
}

export const declineInvite = (db, row) => db.delete(GI).where(eq(GI.id, row.id));

// --- Sync room -----------------------------------------------------------------

/** The Durable Object holding a group's sync room. */
export const groupRoom = (env, groupId) => env.WORKSPACE_DO.get(env.WORKSPACE_DO.idFromName(`group:${groupId}`));

async function postToRoom(env, groupId, path, body) {
    if (!env.WORKSPACE_DO) return;
    try {
        await groupRoom(env, groupId).fetch(`https://sync${path}`, { method: 'POST', body: JSON.stringify(body) });
    } catch (err) {
        console.error(`[groups] room ${groupId} ${path} failed:`, err.message);
    }
}

/** Tells the group's open apps that its library changed, so they pull. */
export const announceChange = (env, groupId) => postToRoom(env, groupId, CHANGED_PATH, {});

/** Closes these users' sync connections to the group (removed, left, or group deleted). */
export const closeMemberSockets = (env, groupId, userIds) =>
    postToRoom(env, groupId, CLOSE_SOCKETS_PATH, { userIds });
