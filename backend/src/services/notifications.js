/**
 * Notifications: things to tell one person, shown in the app's bell.
 *
 *   mention  someone @mentioned them in a comment
 *   reply    someone replied to their comment
 *
 * Group invites are not stored here; the app lists them from GET /api/groups
 * beside these rows, and a new invite only signals the invitee's bell.
 *
 * Rows belong to a person, not a library; listing hides rows from groups the
 * person has left and rows whose comment or paper was deleted. Each person
 * keeps their latest KEEP_PER_USER rows.
 *
 * A new row is signalled live: the person's app is connected to exactly one
 * sync room (their own, or the group library they have open), so the signal
 * goes to their own room and to each of their groups' rooms. Rooms nobody is
 * in wake briefly and sleep again; nothing polls.
 */
import { and, count, desc, eq, inArray, isNull, lt, sql } from 'drizzle-orm';
import * as schema from '../../drizzle/schema.js';
import { CHANGED_PATH, groupRoom } from './groups.js';
import { userRoom } from './sessions.js';

export const MENTION = 'mention';
export const REPLY = 'reply';
export const KEEP_PER_USER = 200;
export const MAX_MENTIONS = 20;
export const LISTED = 30;
export const SNIPPET_LENGTH = 120;

const N = schema.notifications;
const GM = schema.groupMembers;
const GR = schema.groups;
const U = schema.users;
const P = schema.papers;
const A = schema.annotations;

/** The name the app shows for a person: their name, else their email's local part. */
export const displayName = (name, email) => name?.trim() || String(email || '').split('@')[0] || 'Someone';

const mentionedIn = (text, name) => text.toLowerCase().includes(`@${name.toLowerCase()}`);

/**
 * The ids among `ids` that belong to members of the group and whose @Name
 * appears in the text, so a mention cannot reach outsiders or be hidden.
 */
export async function validMentions(db, groupId, ids, text) {
    const wanted = [...new Set((Array.isArray(ids) ? ids : []).map(Number).filter(Number.isInteger))].slice(0, MAX_MENTIONS);
    if (!wanted.length) return [];
    const rows = await db.select({ userId: GM.userId, name: U.name, email: U.email })
        .from(GM).innerJoin(U, eq(U.id, GM.userId))
        .where(and(eq(GM.groupId, groupId), inArray(GM.userId, wanted)));
    return rows.filter((r) => mentionedIn(text, displayName(r.name, r.email))).map((r) => r.userId).sort((a, b) => a - b);
}

/**
 * Stores notifications ({ userId, type, actorId, groupId, paperId, commentId })
 * and returns the signal job for their recipients. Nobody is told about their
 * own comment, and a person both mentioned and replied to gets one row: the mention.
 */
export async function notify(db, env, items) {
    const byUser = new Map();
    for (const item of items) {
        if (!item.userId || item.userId === item.actorId) continue;
        if (!byUser.has(item.userId) || item.type === MENTION) byUser.set(item.userId, item);
    }
    const rows = [...byUser.values()];
    if (!rows.length) return null;

    const now = new Date().toISOString();
    await db.insert(N).values(rows.map((r) => ({ ...r, createdAt: now })));
    for (const { userId } of rows) {
        const oldestKept = sql`(SELECT id FROM notifications WHERE user_id = ${userId} ORDER BY id DESC LIMIT 1 OFFSET ${KEEP_PER_USER - 1})`;
        await db.delete(N).where(and(eq(N.userId, userId), lt(N.id, oldestKept)));
    }
    return signalUsers(db, env, rows.map((r) => r.userId));
}

/** Tells these people's open apps to refresh the bell. */
export async function signalUsers(db, env, userIds) {
    if (!env.WORKSPACE_DO || !userIds.length) return;
    const groups = await db.selectDistinct({ groupId: GM.groupId }).from(GM).where(inArray(GM.userId, userIds));
    const rooms = [...userIds.map((id) => userRoom(env, id)), ...groups.map((g) => groupRoom(env, g.groupId))];
    const body = JSON.stringify({ notify: userIds });
    await Promise.all(rooms.map((room) => room.fetch(`https://sync${CHANGED_PATH}`, { method: 'POST', body })
        .catch((err) => console.error('[notifications] signal failed:', err.message))));
}

/** Refreshes the bell of the person an invite is for, if they have a verified account. */
export async function signalInvitee(db, env, email) {
    const invitee = await db.select({ id: U.id }).from(U).where(and(eq(U.email, email), eq(U.emailVerified, true))).get();
    if (invitee) await signalUsers(db, env, [invitee.id]);
}

/** A deleted comment takes its notifications with it. */
export const forgetComment = (db, commentId) => db.delete(N).where(eq(N.commentId, commentId));

// Only rows the person can still open: still a member, comment and paper still there
const visible = (user) => and(
    eq(N.userId, user.id),
    isNull(A.deletedAt),
    isNull(P.deletedAt),
);

const joined = (query) => query
    .innerJoin(GM, and(eq(GM.groupId, N.groupId), eq(GM.userId, N.userId)))
    .innerJoin(A, eq(A.id, N.commentId))
    .innerJoin(P, eq(P.id, N.paperId));

const snippet = (text) => {
    const flat = String(text || '').replace(/\s+/g, ' ').trim();
    return flat.length > SNIPPET_LENGTH ? `${flat.slice(0, SNIPPET_LENGTH - 1)}…` : flat;
};

/** The person's latest notifications and how many are unread. */
export async function listNotifications(db, user) {
    const rows = await joined(db.select({
        id: N.id, type: N.type, createdAt: N.createdAt, readAt: N.readAt,
        groupId: N.groupId, paperId: N.paperId, commentId: N.commentId,
        actorName: U.name, actorEmail: U.email, paperTitle: P.title, groupName: GR.name, content: A.content,
    }).from(N))
        .innerJoin(GR, eq(GR.id, N.groupId))
        .leftJoin(U, eq(U.id, N.actorId))
        .where(visible(user))
        .orderBy(desc(N.id))
        .limit(LISTED);
    const [{ unread }] = await joined(db.select({ unread: count() }).from(N))
        .where(and(visible(user), isNull(N.readAt)));

    const items = rows.map((r) => ({
        id: r.id,
        type: r.type,
        createdAt: r.createdAt,
        read: Boolean(r.readAt),
        actor: { name: r.actorEmail ? displayName(r.actorName, r.actorEmail) : 'Someone' },
        group: { id: r.groupId, name: r.groupName },
        paper: { id: r.paperId, title: r.paperTitle },
        commentId: r.commentId,
        snippet: snippet(r.content),
    }));
    return { items, unread };
}

/** Marks the given notifications read, or all of them without ids. */
export function markRead(db, user, ids) {
    const mine = and(eq(N.userId, user.id), isNull(N.readAt));
    const which = Array.isArray(ids) ? ids.map(Number).filter(Number.isInteger) : null;
    if (which && !which.length) return null;
    return db.update(N).set({ readAt: new Date().toISOString() })
        .where(which ? and(mine, inArray(N.id, which)) : mine);
}
