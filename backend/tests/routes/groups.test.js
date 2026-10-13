/**
 * Groups API: creating groups, invites by email, roles, leaving, deleting,
 * and the sync room (members only, closed for people who lose access,
 * told when the library changes).
 */
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { createTestApp } from '../support/app.js';
import { CHANGED_PATH } from '../../src/services/groups.js';
import { CLOSE_SOCKETS_PATH } from '../../src/services/sessions.js';
import { WorkspaceDurableObject } from '../../src/WorkspaceDurableObject.js';

let t, owner, admin, member, carol, eve, roomCalls, group;

beforeEach(() => {
    t = createTestApp();
    owner = t.addUser(1, 'owner@test.dev');
    admin = t.addUser(2, 'admin@test.dev');
    member = t.addUser(3, 'member@test.dev');
    carol = t.addUser(4, 'carol@test.dev');
    eve = t.addUser(5, 'eve@test.dev');
    group = t.addGroup(owner, [[admin, 'admin'], [member, 'member']], 'Lab');

    roomCalls = [];
    t.env.WORKSPACE_DO = {
        idFromName: (name) => name,
        get: (room) => ({
            fetch: async (input, init) => {
                const request = input instanceof Request ? input : null;
                const url = new URL(request ? request.url : input);
                roomCalls.push({ room, path: url.pathname, body: init?.body ? JSON.parse(init.body) : null });
                return Response.json({ ok: true });
            },
        }),
    };
});
afterEach(() => vi.unstubAllGlobals());

const json = async (res) => ({ status: res.status, body: await res.json().catch(() => null) });
const call = (user, method, path, body) => t.request(`/api/groups${path}`, { user, method, body });
const memberIds = () => t.rows('SELECT user_id FROM group_members WHERE group_id = ? ORDER BY user_id', group).map((r) => r.user_id);
const inviteTo = (user, email, role) => call(user, 'POST', `/${group}/invites`, { email, role });
const pendingInvite = (email) => t.row('SELECT * FROM group_invites WHERE group_id = ? AND email = ?', group, email);

describe('creating and listing', () => {
    it('creates a group owned by the caller', async () => {
        const res = await json(await call(carol, 'POST', '', { name: '  Reading   club ' }));
        expect(res.status).toBe(201);
        expect(res.body.data.group).toMatchObject({ name: 'Reading club', role: 'owner', memberCount: 1 });
        expect(t.row('SELECT role FROM group_members WHERE group_id = ? AND user_id = ?', res.body.data.group.id, carol.id).role).toBe('owner');
    });

    it('rejects empty or overlong names', async () => {
        expect((await call(carol, 'POST', '', { name: '   ' })).status).toBe(400);
        expect((await call(carol, 'POST', '', { name: 'x'.repeat(101) })).status).toBe(400);
    });

    it('limits how many groups one person owns', async () => {
        t.env.MAX_OWNED_GROUPS = '2';
        expect((await call(owner, 'POST', '', { name: 'Second' })).status).toBe(201);
        const third = await json(await call(owner, 'POST', '', { name: 'Third' }));
        expect(third.status).toBe(409);
        expect(third.body.error.message).toMatch(/at most 2 groups/);
    });

    it('lists my groups with my role, and nobody else\'s', async () => {
        t.addGroup(eve, [], 'Eve only');
        const mine = await json(await call(member, 'GET', ''));
        expect(mine.body.data.groups).toEqual([expect.objectContaining({ id: group, name: 'Lab', role: 'member', memberCount: 3 })]);
        expect((await json(await call(carol, 'GET', ''))).body.data.groups).toEqual([]);
    });

    it('shows a group\'s details and storage to members only', async () => {
        await t.bucket.put(`papers/g${group}/1/a.pdf`, new Uint8Array(500).buffer);
        const res = await json(await call(member, 'GET', `/${group}`));
        expect(res.body.data.group).toMatchObject({ name: 'Lab', role: 'member', storage: { usedBytes: 500 } });
        expect((await call(eve, 'GET', `/${group}`)).status).toBe(404);
    });
});

describe('managing the group', () => {
    it('lets admins rename, not members or outsiders', async () => {
        expect((await call(admin, 'PATCH', `/${group}`, { name: 'Lab 2' })).status).toBe(200);
        expect((await call(member, 'PATCH', `/${group}`, { name: 'x' })).status).toBe(403);
        expect((await call(eve, 'PATCH', `/${group}`, { name: 'x' })).status).toBe(404);
        expect(t.row('SELECT name FROM groups WHERE id = ?', group).name).toBe('Lab 2');
    });

    it('lets only the owner change roles, never the owner\'s own', async () => {
        expect((await call(owner, 'PATCH', `/${group}/members/${member.id}`, { role: 'admin' })).status).toBe(200);
        expect((await call(admin, 'PATCH', `/${group}/members/${member.id}`, { role: 'member' })).status).toBe(403);
        expect((await call(owner, 'PATCH', `/${group}/members/${owner.id}`, { role: 'member' })).status).toBe(409);
        expect((await call(owner, 'PATCH', `/${group}/members/${member.id}`, { role: 'owner' })).status).toBe(400);
        expect(t.row('SELECT role FROM group_members WHERE group_id = ? AND user_id = ?', group, member.id).role).toBe('admin');
    });

    it('lists members with the owner first', async () => {
        const res = await json(await call(member, 'GET', `/${group}/members`));
        expect(res.body.data.members.map((m) => [m.email, m.role])).toEqual([
            ['owner@test.dev', 'owner'], ['admin@test.dev', 'admin'], ['member@test.dev', 'member'],
        ]);
    });

    it('deletes the group and its library (owner only), closing everyone\'s sync', async () => {
        const paper = t.addPaper(member, { group_id: group });
        expect((await call(admin, 'DELETE', `/${group}`)).status).toBe(403);

        expect((await call(owner, 'DELETE', `/${group}`)).status).toBe(200);
        expect(t.row('SELECT id FROM groups WHERE id = ?', group)).toBeUndefined();
        expect(t.row('SELECT id FROM papers WHERE id = ?', paper)).toBeUndefined();
        expect(roomCalls).toContainEqual({ room: `group:${group}`, path: CLOSE_SOCKETS_PATH, body: { userIds: [owner.id, admin.id, member.id] } });
    });
});

describe('removing and leaving', () => {
    it('lets admins remove members; their access and sync end at once', async () => {
        const paper = t.addPaper(owner, { group_id: group });
        expect((await call(admin, 'DELETE', `/${group}/members/${member.id}`)).status).toBe(200);

        expect(memberIds()).toEqual([owner.id, admin.id]);
        expect(roomCalls).toContainEqual({ room: `group:${group}`, path: CLOSE_SOCKETS_PATH, body: { userIds: [member.id] } });
        expect((await t.request(`/api/papers/${paper}`, { user: member })).status).toBe(404);
        expect((await t.request('/api/papers', { user: member, library: `group:${group}` })).status).toBe(404);
    });

    it('lets only the owner remove an admin, and nobody remove the owner', async () => {
        const other = t.addUser(6);
        t.insert('group_members', { group_id: group, user_id: other.id, role: 'admin' });
        expect((await call(admin, 'DELETE', `/${group}/members/${other.id}`)).status).toBe(403);
        expect((await call(member, 'DELETE', `/${group}/members/${admin.id}`)).status).toBe(403);
        expect((await call(admin, 'DELETE', `/${group}/members/${owner.id}`)).status).toBe(409);
        expect((await call(owner, 'DELETE', `/${group}/members/${other.id}`)).status).toBe(200);
    });

    it('lets members leave, but not the owner', async () => {
        const left = await json(await call(member, 'DELETE', `/${group}/members/${member.id}`));
        expect(left.body.data).toEqual({ removed: member.id, left: true });
        expect((await call(owner, 'DELETE', `/${group}/members/${owner.id}`)).status).toBe(409);
    });
});

describe('invites', () => {
    it('emails the invitee', async () => {
        t.env.RESEND_API_KEY = 'test-key';
        const fetchMock = vi.fn(async () => Response.json({ id: 'email' }));
        vi.stubGlobal('fetch', fetchMock);

        const res = await json(await inviteTo(admin, ' Carol@Test.dev ', 'member'));
        expect(res.status).toBe(201);
        expect(res.body.data.invite).toMatchObject({ email: 'carol@test.dev', role: 'member' });
        const sent = JSON.parse(fetchMock.mock.calls[0][1].body);
        expect(sent.to).toBe('carol@test.dev');
        expect(sent.subject).toContain('"Lab"');
        expect(sent.text).toContain('/#/invites');
    });

    it('lets admins invite members, only the owner invite admins, and members invite nobody', async () => {
        expect((await inviteTo(admin, 'a@x.dev', 'member')).status).toBe(201);
        expect((await inviteTo(admin, 'b@x.dev', 'admin')).status).toBe(403);
        expect((await inviteTo(owner, 'b@x.dev', 'admin')).status).toBe(201);
        expect((await inviteTo(member, 'c@x.dev')).status).toBe(403);
        expect((await inviteTo(eve, 'c@x.dev')).status).toBe(404);
    });

    it('refuses bad addresses and people already in the group', async () => {
        expect((await inviteTo(owner, 'not-an-email')).status).toBe(400);
        expect((await inviteTo(owner, 'member@test.dev')).status).toBe(409);
    });

    it('renews an existing invite instead of adding another', async () => {
        await inviteTo(owner, 'carol@test.dev', 'member');
        await inviteTo(owner, 'carol@test.dev', 'admin');
        expect(t.rows('SELECT role FROM group_invites WHERE email = ?', 'carol@test.dev')).toEqual([{ role: 'admin' }]);
    });

    it('counts pending invites toward the member limit', async () => {
        t.env.MAX_GROUP_MEMBERS = '4';
        expect((await inviteTo(owner, 'carol@test.dev')).status).toBe(201);
        expect((await inviteTo(owner, 'dan@test.dev')).status).toBe(409);
        expect((await inviteTo(owner, 'carol@test.dev')).status).toBe(201); // renewing is fine
    });

    it('shows invites to the invitee, who can accept and join', async () => {
        await inviteTo(owner, 'carol@test.dev', 'admin');
        const listed = await json(await call(carol, 'GET', ''));
        expect(listed.body.data.invites).toEqual([expect.objectContaining({ groupId: group, groupName: 'Lab', role: 'admin', invitedByEmail: 'owner@test.dev' })]);

        const inviteId = listed.body.data.invites[0].id;
        const res = await json(await call(carol, 'POST', `/invites/${inviteId}/accept`));
        expect(res.body.data).toEqual({ groupId: group });
        expect(t.row('SELECT role FROM group_members WHERE group_id = ? AND user_id = ?', group, carol.id).role).toBe('admin');
        expect(pendingInvite('carol@test.dev')).toBeUndefined();
        expect((await t.request('/api/papers', { user: carol, library: `group:${group}` })).status).toBe(200);
    });

    it('lets the invitee decline', async () => {
        await inviteTo(owner, 'carol@test.dev');
        const { id } = pendingInvite('carol@test.dev');
        expect((await call(carol, 'POST', `/invites/${id}/decline`)).status).toBe(200);
        expect(pendingInvite('carol@test.dev')).toBeUndefined();
        expect(memberIds()).not.toContain(carol.id);
    });

    it('lets nobody else use an invite', async () => {
        await inviteTo(owner, 'carol@test.dev');
        const { id } = pendingInvite('carol@test.dev');
        expect((await call(eve, 'POST', `/invites/${id}/accept`)).status).toBe(404);
        expect(memberIds()).not.toContain(eve.id);
    });

    it('requires a verified email to join', async () => {
        await inviteTo(owner, 'carol@test.dev');
        t.db.sqlite.prepare('UPDATE users SET email_verified = 0 WHERE id = ?').run(carol.id);
        const { id } = pendingInvite('carol@test.dev');
        expect((await call(carol, 'POST', `/invites/${id}/accept`)).status).toBe(403);
        expect((await json(await call(carol, 'GET', ''))).body.data.invites).toEqual([]);
    });

    it('ignores expired invites', async () => {
        await inviteTo(owner, 'carol@test.dev');
        t.db.sqlite.prepare("UPDATE group_invites SET expires_at = '2020-01-01T00:00:00.000Z'").run();
        const { id } = pendingInvite('carol@test.dev');
        expect((await call(carol, 'POST', `/invites/${id}/accept`)).status).toBe(404);
        expect((await json(await call(owner, 'GET', `/${group}/invites`))).body.data.invites).toEqual([]);
    });

    it('lets admins see and cancel invites', async () => {
        await inviteTo(owner, 'carol@test.dev');
        const { id } = pendingInvite('carol@test.dev');
        expect((await call(member, 'GET', `/${group}/invites`)).status).toBe(403);
        expect((await json(await call(admin, 'GET', `/${group}/invites`))).body.data.invites).toHaveLength(1);
        expect((await call(admin, 'DELETE', `/${group}/invites/${id}`)).status).toBe(200);
        expect(pendingInvite('carol@test.dev')).toBeUndefined();
    });
});

describe('sync room', () => {
    const upgrade = (user, room) => t.request(`/api/sync/workspace/${room}?token=${user.token}`, { headers: { Upgrade: 'websocket' } });

    it('admits members to the group\'s room and keeps others out', async () => {
        expect((await upgrade(member, `group:${group}`)).status).toBe(200);
        expect(roomCalls.at(-1).room).toBe(`group:${group}`);
        expect((await upgrade(eve, `group:${group}`)).status).toBe(404);

        await upgrade(eve, 'default');
        expect(roomCalls.at(-1).room).toBe(`user:${eve.id}`);
    });

    it('tells the group\'s room when its library changes, and only then', async () => {
        await t.request('/api/papers', { user: member, library: `group:${group}`, method: 'POST', body: { title: 'New' } });
        expect(roomCalls).toEqual([{ room: `group:${group}`, path: CHANGED_PATH, body: {} }]);

        await t.request('/api/papers', { user: member, method: 'POST', body: { title: 'Mine' } });
        await t.request('/api/papers', { user: member, library: `group:${group}` });
        expect(roomCalls).toHaveLength(1);
    });

    function room() {
        return new WorkspaceDurableObject({
            blockConcurrencyWhile: (fn) => fn(),
            storage: { get: async () => null, put: async () => {} },
            getWebSockets: () => [],
            acceptWebSocket: () => {},
        }, {});
    }
    const post = (doc, path, body) => doc.fetch(new Request(`https://sync${path}`, { method: 'POST', body: JSON.stringify(body) }));

    it('closes a removed member\'s sockets only', async () => {
        const doc = room();
        const gone = { close: vi.fn(), send: vi.fn() }, stays = { close: vi.fn(), send: vi.fn() };
        doc.sessions.set(gone, { userId: '3', sessionId: 9 });
        doc.sessions.set(stays, { userId: '1', sessionId: 10 });

        expect(await (await post(doc, CLOSE_SOCKETS_PATH, { userIds: [3] })).json()).toEqual({ closed: 1 });
        expect(gone.close).toHaveBeenCalled();
        expect(stays.close).not.toHaveBeenCalled();
    });

    it('announces changes to every connected app as a Yjs update', async () => {
        const doc = room();
        const socket = { close: vi.fn(), send: vi.fn() };
        doc.sessions.set(socket, { userId: '1' });

        await post(doc, CHANGED_PATH, {});
        expect(doc.doc.getMap('signals').get('changedAt')).toEqual(expect.any(Number));
        expect(socket.send).toHaveBeenCalledTimes(1);
    });
});
