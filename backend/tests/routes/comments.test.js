/**
 * Paper comments: who may read, write, edit and delete them, replies one
 * level deep, safe retries, and the sync-room signal that names the paper.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createTestApp } from '../support/app.js';
import { CHANGED_PATH } from '../../src/services/groups.js';
import { WorkspaceDurableObject } from '../../src/WorkspaceDurableObject.js';
import { MAX_CONTENT } from '../../src/routes/comments.js';

let t, owner, admin, member, eve, group, paper, roomCalls;

beforeEach(() => {
    t = createTestApp();
    owner = t.addUser(1, 'owner@test.dev');
    admin = t.addUser(2, 'admin@test.dev');
    member = t.addUser(3, 'member@test.dev');
    eve = t.addUser(4, 'eve@test.dev');
    t.db.sqlite.prepare('UPDATE users SET name = ? WHERE id = ?').run('Olivia Owner', owner.id);
    group = t.addGroup(owner, [[admin, 'admin'], [member, 'member']], 'Lab');
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
const post = async (user, body, id = paper) => json(await t.request(`/api/comments/papers/${id}`, { user, method: 'POST', body }));
const list = async (user, id = paper) => json(await t.request(`/api/comments/papers/${id}`, { user }));
const patch = async (user, id, body) => json(await t.request(`/api/comments/${id}`, { user, method: 'PATCH', body }));
const remove = async (user, id) => json(await t.request(`/api/comments/${id}`, { user, method: 'DELETE' }));

describe('posting and reading', () => {
    it('lets members comment and read the thread, with author names', async () => {
        const created = await post(member, { content: '  Fig 3 contradicts eq. 2  ', pageNumber: 4 });
        expect(created.status).toBe(201);
        expect(created.body.data.comment).toMatchObject({
            content: 'Fig 3 contradicts eq. 2', pageNumber: 4, parentId: null,
            author: { name: 'member' }, mine: true, canEdit: true, canDelete: true, edited: false,
        });
        await post(owner, { content: 'Agreed' });

        const thread = (await list(admin)).body.data.comments;
        expect(thread.map((c) => [c.author.name, c.content, c.mine, c.canEdit, c.canDelete])).toEqual([
            ['member', 'Fig 3 contradicts eq. 2', false, false, true], // admins may remove others' comments
            ['Olivia Owner', 'Agreed', false, false, true],
        ]);
    });

    it('hides the thread from people outside the group', async () => {
        await post(member, { content: 'Hi' });
        expect((await list(eve)).status).toBe(404);
        expect((await post(eve, { content: 'Hi' })).status).toBe(404);
    });

    it('refuses empty, overlong or badly paged comments', async () => {
        expect((await post(member, { content: '   ' })).status).toBe(400);
        expect((await post(member, { content: 'x'.repeat(MAX_CONTENT + 1) })).status).toBe(400);
        expect((await post(member, { content: 'ok', pageNumber: 'four' })).status).toBe(400);
    });

    it('returns the same comment when a post is retried', async () => {
        const first = await post(member, { content: 'Once', clientId: 'c-1' });
        const again = await post(member, { content: 'Once', clientId: 'c-1' });
        expect(again.body.data.comment.id).toBe(first.body.data.comment.id);
        expect((await list(member)).body.data.comments).toHaveLength(1);
    });
});

describe('replies', () => {
    it('nests one level deep only', async () => {
        const top = (await post(member, { content: 'Question' })).body.data.comment;
        const reply = await post(owner, { content: 'Answer', parentId: top.id });
        expect(reply.body.data.comment.parentId).toBe(top.id);
        expect((await post(member, { content: 'Deeper', parentId: reply.body.data.comment.id })).status).toBe(400);
    });

    it('keeps a deleted comment as the head of its live replies', async () => {
        const top = (await post(member, { content: 'Question' })).body.data.comment;
        await post(owner, { content: 'Answer', parentId: top.id });
        const lone = (await post(member, { content: 'Alone' })).body.data.comment;
        await remove(member, top.id);
        await remove(member, lone.id);

        const thread = (await list(admin)).body.data.comments;
        expect(thread.map((c) => [c.content, c.deleted])).toEqual([[null, true], ['Answer', false]]);
    });
});

describe('editing and deleting', () => {
    it('lets only the author edit', async () => {
        const c = (await post(member, { content: 'Typo hree' })).body.data.comment;
        expect((await patch(admin, c.id, { content: 'Hijacked' })).status).toBe(403);
        const edited = await patch(member, c.id, { content: 'Typo here' });
        expect(edited.body.data.comment).toMatchObject({ content: 'Typo here' });
        expect(t.row('SELECT updated_at > created_at AS later FROM annotations WHERE id = ?', c.id).later).toBe(1);
    });

    it('lets admins delete others\' comments, but not plain members', async () => {
        const c = (await post(owner, { content: 'Mine' })).body.data.comment;
        expect((await remove(member, c.id)).status).toBe(403);
        expect((await remove(admin, c.id)).status).toBe(200);
        expect((await list(owner)).body.data.comments).toEqual([]);
    });

    it('undoes a delete', async () => {
        const c = (await post(member, { content: 'Oops' })).body.data.comment;
        await remove(member, c.id);
        expect((await patch(member, c.id, { restore: true })).status).toBe(200);
        expect((await list(member)).body.data.comments.map((x) => x.content)).toEqual(['Oops']);
    });
});

describe('summary and signals', () => {
    it('counts comments per paper and when others last wrote', async () => {
        const other = t.addPaper(owner, { group_id: group, title: 'Other' });
        await post(member, { content: 'a' });
        await post(owner, { content: 'b' });
        await post(owner, { content: 'c' }, other);

        const res = await json(await t.request('/api/comments/summary', { user: owner, library: `group:${group}` }));
        const byPaper = Object.fromEntries(res.body.data.papers.map((p) => [p.paperId, p]));
        expect(byPaper[paper]).toMatchObject({ count: 2, lastOtherAt: expect.any(String) });
        expect(byPaper[other]).toMatchObject({ count: 1, lastOtherAt: null });
        expect((await t.request('/api/comments/summary', { user: eve, library: `group:${group}` })).status).toBe(404);
    });

    it('tells the group room which paper changed', async () => {
        await post(member, { content: 'Hi' });
        expect(roomCalls).toEqual([{ room: `group:${group}`, path: CHANGED_PATH, body: { paperId: paper } }]);
    });

    it('sets the comments signal in the room, not the library one', async () => {
        const room = new WorkspaceDurableObject({
            blockConcurrencyWhile: (fn) => fn(),
            storage: { get: async () => null, put: async () => {} },
            getWebSockets: () => [],
            acceptWebSocket: () => {},
        }, {});
        const socket = { close: vi.fn(), send: vi.fn() };
        room.sessions.set(socket, { userId: '1' });

        await room.fetch(new Request(`https://sync${CHANGED_PATH}`, { method: 'POST', body: JSON.stringify({ paperId: 7 }) }));
        const signals = room.doc.getMap('signals');
        expect(signals.get('comments')).toEqual({ paperId: 7, at: expect.any(Number) });
        expect(signals.has('changedAt')).toBe(false);
        expect(socket.send).toHaveBeenCalledTimes(1);
    });
});
