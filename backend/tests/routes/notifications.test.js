/**
 * Mentions and notifications: who gets told about a comment, what the bell
 * lists, and the live signal that reaches each person's open app.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { createTestApp } from '../support/app.js';
import { WorkspaceDurableObject } from '../../src/WorkspaceDurableObject.js';
import { CHANGED_PATH } from '../../src/services/groups.js';
import { KEEP_PER_USER } from '../../src/services/notifications.js';

let t, owner, admin, member, eve, group, otherGroup, paper, roomCalls;

beforeEach(() => {
    t = createTestApp();
    owner = t.addUser(1, 'owner@test.dev');
    admin = t.addUser(2, 'admin@test.dev');
    member = t.addUser(3, 'member@test.dev');
    eve = t.addUser(4, 'eve@test.dev');
    t.db.sqlite.prepare('UPDATE users SET name = ? WHERE id = ?').run('Olivia Owner', owner.id);
    group = t.addGroup(owner, [[admin, 'admin'], [member, 'member']], 'Lab');
    otherGroup = t.addGroup(eve, [[member, 'member']], 'Reading club');
    paper = t.addPaper(owner, { group_id: group, title: 'Shared' });

    roomCalls = [];
    t.env.WORKSPACE_DO = {
        idFromName: (name) => name,
        get: (room) => ({
            fetch: async (input, init) => {
                roomCalls.push({ room, path: new URL(input).pathname, body: JSON.parse(init.body) });
                return Response.json({ ok: true });
            },
        }),
    };
});

const json = async (res) => ({ status: res.status, body: await res.json().catch(() => null) });
const post = async (user, body, id = paper) =>
    (await json(await t.request(`/api/comments/papers/${id}`, { user, method: 'POST', body }))).body.data.comment;
const patch = async (user, id, body) => json(await t.request(`/api/comments/${id}`, { user, method: 'PATCH', body }));
const bell = async (user) => (await json(await t.request('/api/notifications', { user }))).body.data;
const read = async (user, body = {}) => json(await t.request('/api/notifications/read', { user, method: 'POST', body }));

describe('mentions', () => {
    it('tells a mentioned member, and shows the mention with their name', async () => {
        const comment = await post(owner, { content: 'What do you think, @member?', mentions: [member.id] });
        expect(comment.mentions).toEqual([{ userId: member.id, name: 'member' }]);

        const { items, unread } = await bell(member);
        expect(unread).toBe(1);
        expect(items).toEqual([expect.objectContaining({
            type: 'mention', read: false, commentId: comment.id,
            actor: { name: 'Olivia Owner' }, group: { id: group, name: 'Lab' }, paper: { id: paper, title: 'Shared' },
            snippet: 'What do you think, @member?',
        })]);
        expect((await bell(admin)).items).toEqual([]);
    });

    it('drops mentions of outsiders, of names missing from the text, and of yourself', async () => {
        const comment = await post(owner, { content: '@eve @Olivia Owner look', mentions: [eve.id, admin.id, owner.id] });
        expect(comment.mentions).toEqual([{ userId: owner.id, name: 'Olivia Owner' }]);
        expect((await bell(eve)).items).toEqual([]);
        expect((await bell(admin)).items).toEqual([]);
        expect((await bell(owner)).items).toEqual([]);
    });

    it('tells only people newly mentioned by an edit', async () => {
        const comment = await post(owner, { content: 'Hi @member', mentions: [member.id] });
        const edited = await patch(owner, comment.id, { content: 'Hi @member and @admin', mentions: [member.id, admin.id] });
        expect(edited.body.data.comment.mentions.map((m) => m.userId)).toEqual([admin.id, member.id]);
        expect((await bell(member)).items).toHaveLength(1);
        expect((await bell(admin)).items).toHaveLength(1);
    });

    it('signals the person in their own room and every group room they are in', async () => {
        await post(owner, { content: '@member', mentions: [member.id] });
        const signals = roomCalls.filter((call) => call.body.notify);
        expect(signals.map((s) => s.room).sort()).toEqual([`group:${group}`, `group:${otherGroup}`, `user:${member.id}`]);
        expect(signals.every((s) => s.path === CHANGED_PATH && s.body.notify[0] === member.id)).toBe(true);
    });
});

describe('replies', () => {
    it("tells the parent's author once, as a mention when they are also mentioned", async () => {
        const top = await post(member, { content: 'Question' });
        await post(admin, { content: 'Answer' , parentId: top.id });
        await post(owner, { content: '@member see above', parentId: top.id, mentions: [member.id] });
        await post(member, { content: 'Thanks', parentId: top.id }); // own thread: nobody told

        expect((await bell(member)).items.map((n) => [n.type, n.actor.name])).toEqual([
            ['mention', 'Olivia Owner'],
            ['reply', 'admin'],
        ]);
    });
});

describe('the bell', () => {
    it('marks some or all read', async () => {
        const a = await post(owner, { content: '@member one', mentions: [member.id] });
        await post(owner, { content: '@member two', mentions: [member.id] });
        const first = (await bell(member)).items.find((n) => n.commentId === a.id);

        expect((await read(member, { ids: [first.id] })).status).toBe(200);
        expect((await bell(member)).unread).toBe(1);
        await read(admin); // someone else's read touches nothing of theirs
        expect((await bell(member)).unread).toBe(1);
        await read(member);
        expect((await bell(member)).unread).toBe(0);
    });

    it('hides notifications from deleted comments and from groups the person left', async () => {
        const gone = await post(owner, { content: '@member a', mentions: [member.id] });
        await post(owner, { content: '@admin b', mentions: [admin.id] });
        await t.request(`/api/comments/${gone.id}`, { user: owner, method: 'DELETE' });
        expect((await bell(member)).items).toEqual([]);

        t.db.sqlite.prepare('DELETE FROM group_members WHERE group_id = ? AND user_id = ?').run(group, admin.id);
        expect(await bell(admin)).toEqual({ items: [], unread: 0 });
    });

    it(`keeps each person's latest ${KEEP_PER_USER}`, async () => {
        const top = await post(member, { content: 'Start' });
        const insert = t.db.sqlite.prepare(
            "INSERT INTO notifications (user_id, type, actor_id, group_id, paper_id, comment_id) VALUES (?, 'reply', ?, ?, ?, ?)");
        for (let i = 0; i < KEEP_PER_USER; i++) insert.run(member.id, owner.id, group, paper, top.id);
        await post(owner, { content: 'One more', parentId: top.id });
        const { total } = t.db.sqlite.prepare('SELECT count(*) AS total FROM notifications WHERE user_id = ?').get(member.id);
        expect(total).toBe(KEEP_PER_USER);
    });
});

describe('sync room', () => {
    it('sets signals.notify without asking anyone to pull', async () => {
        const map = new Map();
        const fake = { doc: { getMap: () => map } };
        const res = await WorkspaceDurableObject.prototype.fetch.call(fake, new Request(`https://sync${CHANGED_PATH}`, {
            method: 'POST', body: JSON.stringify({ notify: [3] }),
        }));
        expect(res.status).toBe(200);
        expect(map.get('notify')).toMatchObject({ userIds: [3] });
        expect(map.has('changedAt')).toBe(false);
    });
});

describe('invites', () => {
    it("signals the invitee's bell when they have a verified account", async () => {
        const dana = t.addUser(5, 'dana@test.dev');
        t.db.sqlite.prepare('UPDATE users SET email_verified = 1 WHERE id = ?').run(dana.id);
        const res = await t.request(`/api/groups/${group}/invites`, { user: owner, method: 'POST', body: { email: 'dana@test.dev' } });
        expect(res.status).toBe(201);
        await new Promise((r) => setTimeout(r, 0));
        expect(roomCalls.filter((c) => c.body.notify).map((c) => c.room)).toEqual([`user:${dana.id}`]);
    });
});
