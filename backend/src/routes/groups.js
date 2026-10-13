import { Hono } from 'hono';
import { drizzle } from 'drizzle-orm/d1';
import * as schema from '../../drizzle/schema.js';
import { authenticate } from '../middleware/auth.js';
import {
    ADMIN, CHANGE_ROLES, DELETE_GROUP, MANAGE_GROUP, MEMBER, OWNER, can, roleIn,
} from '../lib/access.js';
import {
    acceptInvite, cancelInvite, cleanName, closeMemberSockets, createGroup, declineInvite, deleteGroup,
    findGroup, findInviteFor, findMember, groupStorage, invite, invitesFor, isEmail, listGroups, listInvites,
    listMembers, normalizeEmail, removeMember, renameGroup, setRole, MAX_NAME_LENGTH,
} from '../services/groups.js';
import { sendGroupInviteEmail } from '../lib/mailer.js';

const groups = new Hono();
groups.use('*', authenticate);

const getDb = (c) => drizzle(c.env.citavers_db, { schema });

const fail = (c, status, message) => c.json({ success: false, error: { message } }, status);
const notFound = (c) => fail(c, 404, 'Group not found');
const forbidden = (c) => fail(c, 403, 'You do not have permission to do that in this group');

const idParam = (c, name = 'id') => {
    const id = Number(c.req.param(name));
    return Number.isInteger(id) && id > 0 ? id : null;
};

/** The group in the URL, when the caller is a member; otherwise null. */
function memberGroupId(c) {
    const id = idParam(c);
    return id && roleIn(c.get('user'), id) ? id : null;
}

// Background work (emails, room messages) must not delay or fail the response
const inBackground = (c, job) => {
    const guarded = job.catch((err) => console.error('[groups]', err.message));
    try {
        c.executionCtx.waitUntil(guarded);
    } catch {
        return guarded; // no execution context (tests)
    }
};

/**
 * My groups and the invites waiting for me
 * GET /api/groups
 */
groups.get('/', async (c) => {
    const db = getDb(c);
    const user = c.get('user');
    const [mine, invites] = await Promise.all([
        listGroups(db, user),
        user.emailVerified ? invitesFor(db, user) : [],
    ]);
    return c.json({ success: true, data: { groups: mine, invites } });
});

/**
 * Create a group (the caller becomes its owner)
 * POST /api/groups { name }
 */
groups.post('/', async (c) => {
    const body = await c.req.json().catch(() => ({}));
    const name = cleanName(body.name);
    if (!name) return fail(c, 400, `Give the group a name of up to ${MAX_NAME_LENGTH} characters`);

    const result = await createGroup(getDb(c), c.env, c.get('user'), name);
    if (result.error) return fail(c, 409, result.error);
    return c.json({ success: true, data: { group: { ...result.group, role: OWNER, memberCount: 1 } } }, 201);
});

/**
 * Accept or decline an invite addressed to me
 * POST /api/groups/invites/:inviteId/accept | /decline
 */
groups.post('/invites/:inviteId/:answer{accept|decline}', async (c) => {
    const db = getDb(c);
    const user = c.get('user');
    if (!user.emailVerified) return fail(c, 403, 'Verify your email address before joining a group');

    const inviteId = idParam(c, 'inviteId');
    const row = inviteId && await findInviteFor(db, user, inviteId);
    if (!row) return fail(c, 404, 'Invitation not found or expired');

    if (c.req.param('answer') === 'decline') {
        await declineInvite(db, row);
        return c.json({ success: true, data: { declined: true } });
    }
    const result = await acceptInvite(db, c.env, user, row);
    if (result.error) return fail(c, result.status, result.error);
    return c.json({ success: true, data: { groupId: result.groupId } });
});

/**
 * One group, with my role and its storage
 * GET /api/groups/:id
 */
groups.get('/:id', async (c) => {
    const id = memberGroupId(c);
    if (!id) return notFound(c);
    const group = await findGroup(getDb(c), id);
    if (!group) return notFound(c);
    return c.json({
        success: true,
        data: { group: { ...group, role: roleIn(c.get('user'), id), storage: await groupStorage(c.env, id) } },
    });
});

/**
 * Rename
 * PATCH /api/groups/:id { name }
 */
groups.patch('/:id', async (c) => {
    const id = memberGroupId(c);
    if (!id) return notFound(c);
    if (!can(c.get('user'), MANAGE_GROUP, id)) return forbidden(c);
    const name = cleanName((await c.req.json().catch(() => ({}))).name);
    if (!name) return fail(c, 400, `Give the group a name of up to ${MAX_NAME_LENGTH} characters`);
    await renameGroup(getDb(c), id, name);
    return c.json({ success: true, data: { group: { id, name } } });
});

/**
 * Delete the group and everything in it (owner only)
 * DELETE /api/groups/:id
 */
groups.delete('/:id', async (c) => {
    const id = memberGroupId(c);
    if (!id) return notFound(c);
    if (!can(c.get('user'), DELETE_GROUP, id)) return forbidden(c);
    const db = getDb(c);
    const members = await listMembers(db, id);
    await deleteGroup(db, id);
    await inBackground(c, closeMemberSockets(c.env, id, members.map((m) => m.userId)));
    return c.json({ success: true, data: { deleted: true } });
});

/**
 * Members
 * GET /api/groups/:id/members
 */
groups.get('/:id/members', async (c) => {
    const id = memberGroupId(c);
    if (!id) return notFound(c);
    return c.json({ success: true, data: { members: await listMembers(getDb(c), id) } });
});

/**
 * Change a member's role between admin and member (owner only)
 * PATCH /api/groups/:id/members/:userId { role }
 */
groups.patch('/:id/members/:userId', async (c) => {
    const id = memberGroupId(c);
    if (!id) return notFound(c);
    if (!can(c.get('user'), CHANGE_ROLES, id)) return forbidden(c);
    const { role } = await c.req.json().catch(() => ({}));
    if (role !== ADMIN && role !== MEMBER) return fail(c, 400, 'Role must be "admin" or "member"');

    const db = getDb(c);
    const target = await findMember(db, id, idParam(c, 'userId'));
    if (!target) return fail(c, 404, 'Member not found');
    if (target.role === OWNER) return fail(c, 409, 'The owner\'s role cannot be changed');
    await setRole(db, id, target.userId, role);
    return c.json({ success: true, data: { userId: target.userId, role } });
});

/**
 * Remove a member, or leave the group (your own id)
 * DELETE /api/groups/:id/members/:userId
 */
groups.delete('/:id/members/:userId', async (c) => {
    const id = memberGroupId(c);
    if (!id) return notFound(c);
    const user = c.get('user');
    const db = getDb(c);
    const target = await findMember(db, id, idParam(c, 'userId'));
    if (!target) return fail(c, 404, 'Member not found');

    const leaving = target.userId === user.id;
    if (target.role === OWNER) {
        return fail(c, 409, leaving ? 'The owner cannot leave; delete the group instead' : 'The owner cannot be removed');
    }
    if (!leaving) {
        // Admins remove members; only the owner removes admins
        const allowed = target.role === ADMIN ? can(user, CHANGE_ROLES, id) : can(user, MANAGE_GROUP, id);
        if (!allowed) return forbidden(c);
    }
    await removeMember(db, id, target.userId);
    await inBackground(c, closeMemberSockets(c.env, id, [target.userId]));
    return c.json({ success: true, data: { removed: target.userId, left: leaving } });
});

/**
 * Pending invites
 * GET /api/groups/:id/invites
 */
groups.get('/:id/invites', async (c) => {
    const id = memberGroupId(c);
    if (!id) return notFound(c);
    if (!can(c.get('user'), MANAGE_GROUP, id)) return forbidden(c);
    return c.json({ success: true, data: { invites: await listInvites(getDb(c), id) } });
});

/**
 * Invite someone by email (sends them an email; they accept in the app)
 * POST /api/groups/:id/invites { email, role? }
 */
groups.post('/:id/invites', async (c) => {
    const id = memberGroupId(c);
    if (!id) return notFound(c);
    const user = c.get('user');
    if (!can(user, MANAGE_GROUP, id)) return forbidden(c);

    const body = await c.req.json().catch(() => ({}));
    const email = normalizeEmail(body.email);
    if (!isEmail(email)) return fail(c, 400, 'Enter a valid email address');
    const role = body.role === ADMIN ? ADMIN : MEMBER;
    if (role === ADMIN && !can(user, CHANGE_ROLES, id)) return forbidden(c);

    const db = getDb(c);
    const result = await invite(db, c.env, { groupId: id, email, role, invitedBy: user.id });
    if (result.error) return fail(c, result.status, result.error);

    const group = await findGroup(db, id);
    await inBackground(c, sendGroupInviteEmail(c.env, { email, groupName: group.name, inviterName: user.name || user.email }));
    return c.json({ success: true, data: { invite: result.invite } }, 201);
});

/**
 * Cancel an invite
 * DELETE /api/groups/:id/invites/:inviteId
 */
groups.delete('/:id/invites/:inviteId', async (c) => {
    const id = memberGroupId(c);
    if (!id) return notFound(c);
    if (!can(c.get('user'), MANAGE_GROUP, id)) return forbidden(c);
    const removed = await cancelInvite(getDb(c), id, idParam(c, 'inviteId'));
    if (!removed.length) return fail(c, 404, 'Invitation not found');
    return c.json({ success: true, data: { cancelled: true } });
});

export default groups;
