/**
 * Cross-account isolation, end to end: user B (the attacker) aims every route
 * at user A's data. Runs the real Worker app against SQLite with the
 * production schema (see tests/support).
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { createTestApp } from '../support/app.js';

let t, alice, bob;
let aPaper, aPaper2, aFolder, aKey;

beforeEach(async () => {
    t = createTestApp();
    alice = t.addUser(1);
    bob = t.addUser(2);
    aKey = 'papers/1/1/secret.pdf';
    await t.bucket.put(aKey, new TextEncoder().encode('%PDF alice').buffer);
    aPaper = t.addPaper(alice, { title: 'Alice secret', doi: '10.1/a', pdf_url: aKey, notes: 'private notes' });
    aPaper2 = t.addPaper(alice, { title: 'Alice second', doi: '10.1/b' });
    aFolder = t.addFolder(alice, { name: 'Alice folder' });
    t.insert('paper_folders', { paper_id: aPaper, folder_id: aFolder, user_id: alice.id });
    t.insert('paper_connections', { id: 'c1', from_paper_id: aPaper, to_paper_id: aPaper2, connection_type: 'cites', source: 'auto' });
    t.insert('network_graphs', { id: 'g-alice', user_id: alice.id, name: 'Alice net', is_auto: 1 });
});

const json = async (res) => ({ status: res.status, body: await res.json().catch(() => null) });
const alicePaper = () => t.row('SELECT * FROM papers WHERE id = ?', aPaper);

describe('papers', () => {
    it('hides other users\' papers from list, search, delta and single reads', async () => {
        const list = await json(await t.request('/api/papers', { user: bob }));
        const delta = await json(await t.request('/api/papers?since=2000-01-01', { user: bob }));
        const search = await json(await t.request('/api/papers/search?q=Alice', { user: bob }));
        const one = await t.request(`/api/papers/${aPaper}`, { user: bob });

        expect(list.body.data.papers).toEqual([]);
        expect(delta.body.data.papers).toEqual([]);
        expect(search.body.data.papers).toEqual([]);
        expect(one.status).toBe(404);
    });

    it('refuses to update or delete another user\'s paper', async () => {
        const put = await t.request(`/api/papers/${aPaper}`, { user: bob, method: 'PUT', body: { title: 'pwned' } });
        const del = await t.request(`/api/papers/${aPaper}`, { user: bob, method: 'DELETE' });
        const batch = await json(await t.request('/api/papers/batch', {
            user: bob, method: 'POST',
            body: { operations: [{ type: 'update', id: aPaper, data: { title: 'pwned' } }, { type: 'delete', id: aPaper2 }] },
        }));

        expect(put.status).toBe(404);
        expect(del.status).toBe(404);
        expect(batch.body.data.results.every((r) => !r.success)).toBe(true);
        expect(alicePaper()).toMatchObject({ title: 'Alice secret', deleted_at: null });
        expect(t.row('SELECT deleted_at FROM papers WHERE id = ?', aPaper2).deleted_at).toBeNull();
    });

    it('refuses to point a paper at another user\'s PDF', async () => {
        const own = t.addPaper(bob);
        const create = await t.request('/api/papers', { user: bob, method: 'POST', body: { title: 'x', pdfUrl: aKey } });
        const update = await t.request(`/api/papers/${own}`, { user: bob, method: 'PUT', body: { pdfUrl: aKey } });
        const batch = await json(await t.request('/api/papers/batch', {
            user: bob, method: 'POST', body: { operations: [{ type: 'update', id: own, data: { pdfUrl: aKey } }] },
        }));

        expect(create.status).toBe(400);
        expect(update.status).toBe(400);
        expect(batch.body.data.results[0].success).toBe(false);
        expect(t.row('SELECT pdf_url FROM papers WHERE id = ?', own).pdf_url).toBeNull();
    });

    it('never serves another user\'s PDF, even through a legacy row that points at it', async () => {
        const planted = t.addPaper(bob, { pdf_url: aKey }); // e.g. written before validation existed
        for (const id of [aPaper, planted]) {
            for (const path of [`/api/papers/${id}/pdf`, `/api/papers/${id}/pdf-proxy`]) {
                const res = await t.request(path, { user: bob });
                expect(res.status, path).toBe(404);
            }
        }
    });

    it('keeps uploads inside the uploader\'s own storage prefix', async () => {
        const form = new FormData();
        form.append('file', new File(['%PDF'], '../../1/1/secret.pdf', { type: 'application/pdf' }));
        const res = await json(await t.request('/api/papers/upload?paperId=../../1/1', { user: bob, method: 'POST', body: form }));

        expect(res.status).toBe(200);
        expect(res.body.data.s3Key.startsWith('papers/2/')).toBe(true);
        expect(res.body.data.s3Key.includes('..')).toBe(false);
        expect(new TextDecoder().decode(t.bucket.objects.get(aKey).bytes)).toBe('%PDF alice');
    });
});

describe('folders', () => {
    it('hides other users\' folders and their contents', async () => {
        const list = await json(await t.request('/api/folders', { user: bob }));
        const one = await t.request(`/api/folders/${aFolder}`, { user: bob });
        const papers = await json(await t.request(`/api/folders/${aFolder}/papers`, { user: bob }));

        expect(list.body.data.folders).toEqual([]);
        expect(one.status).toBe(404);
        expect(papers.body.data?.paperIds ?? []).toEqual([]);
    });

    it('refuses to change, delete or relink another user\'s folder or paper', async () => {
        const bFolder = t.addFolder(bob);
        const bPaper = t.addPaper(bob);

        const put = await t.request(`/api/folders/${aFolder}`, { user: bob, method: 'PUT', body: { name: 'pwned' } });
        const del = await t.request(`/api/folders/${aFolder}`, { user: bob, method: 'DELETE' });
        const intoTheirs = await t.request(`/api/folders/${aFolder}/papers`, { user: bob, method: 'POST', body: { paperId: bPaper } });
        const stealPaper = await t.request(`/api/folders/${bFolder}/papers`, { user: bob, method: 'POST', body: { paperId: aPaper } });
        await t.request(`/api/folders/${aFolder}/papers/${aPaper}`, { user: bob, method: 'DELETE' });

        expect(put.status).toBe(404);
        expect(del.status).toBe(404);
        expect(intoTheirs.status).toBe(404);
        expect(stealPaper.status).toBe(404);
        expect(t.row('SELECT name, deleted_at, updated_at FROM folders WHERE id = ?', aFolder)).toMatchObject({ name: 'Alice folder', deleted_at: null });
        expect(t.rows('SELECT * FROM paper_folders WHERE deleted_at IS NULL')).toHaveLength(1);
        expect(t.rows('SELECT * FROM paper_folders WHERE folder_id = ?', bFolder)).toEqual([]);
    });
});

describe('networks', () => {
    it('hides other users\' graphs, nodes and edges', async () => {
        const list = await json(await t.request('/api/networks', { user: bob }));
        const one = await t.request('/api/networks/g-alice', { user: bob });

        expect(list.body.data).toEqual([]);
        expect(one.status).toBe(404);
    });

    it('shows only the caller\'s own papers and edges in their graph', async () => {
        const b1 = t.addPaper(bob);
        const b2 = t.addPaper(bob);
        t.insert('paper_connections', { id: 'c2', from_paper_id: b1, to_paper_id: b2, connection_type: 'cites', source: 'auto' });
        // A forged edge from Bob's paper into Alice's library
        t.insert('paper_connections', { id: 'c3', from_paper_id: b1, to_paper_id: aPaper, connection_type: 'cites', source: 'manual' });
        t.insert('network_graphs', { id: 'g-bob', user_id: bob.id, name: 'Bob net', is_auto: 1 });

        const { body } = await json(await t.request('/api/networks/g-bob', { user: bob }));

        expect(body.data.nodes.map((n) => Number(n.id)).sort()).toEqual([b1, b2]);
        expect(body.data.edges.map((e) => e.id)).toEqual(['c2']);
    });

    it('regenerating a network never touches another user\'s connections', async () => {
        t.addPaper(bob);
        const res = await t.request('/api/networks/auto-generate', { user: bob, method: 'POST' });

        expect(res.status).toBe(200);
        expect(t.row("SELECT id FROM paper_connections WHERE id = 'c1'")).toBeTruthy();
        expect(t.row("SELECT user_id FROM network_graphs WHERE id = 'g-alice'").user_id).toBe(alice.id);
    });
});

describe('account-wide operations', () => {
    it('stats count only the caller\'s data', async () => {
        t.addPaper(bob);
        const { body } = await json(await t.request('/api/user/stats', { user: bob }));
        expect(body.data.stats).toMatchObject({ papers: 1, folders: 0 });
    });

    it('clearing all data leaves other users untouched, including their PDFs and edges', async () => {
        t.addPaper(bob);
        await t.bucket.put('papers/2/9/mine.pdf', new ArrayBuffer(1));

        const res = await t.request('/api/user/data', { user: bob, method: 'DELETE' });

        expect(res.status).toBe(200);
        expect(t.rows('SELECT id FROM papers WHERE user_id = 1')).toHaveLength(2);
        expect(t.rows('SELECT id FROM folders WHERE user_id = 1')).toHaveLength(1);
        expect(t.rows('SELECT id FROM paper_connections')).toHaveLength(1);
        expect(t.bucket.objects.has(aKey)).toBe(true);
        expect(t.bucket.objects.has('papers/2/9/mine.pdf')).toBe(false);
    });

    it('a replace-mode restore never touches another user\'s library or files', async () => {
        const res = await json(await t.request('/api/import/batch-import', {
            user: bob, method: 'POST',
            body: { mode: 'replace', papers: [{ ref: 'x', title: 'Restored', pdfUrl: aKey }] },
        }));

        expect(res.status).toBe(200);
        expect(res.body.data.droppedPdfRefs).toEqual(['x']);
        expect(t.rows('SELECT id FROM papers WHERE user_id = 1 AND deleted_at IS NULL')).toHaveLength(2);
        expect(t.rows('SELECT id FROM paper_connections')).toHaveLength(1);
        expect(t.bucket.objects.has(aKey)).toBe(true);
    });
});

describe('authentication', () => {
    it('rejects missing, forged and wrong-type tokens', async () => {
        const forged = alice.token.slice(0, -4) + 'AAAA';
        const { generateRefreshToken } = await import('../../src/lib/jwt.js');
        const refreshAsAccess = generateRefreshToken(alice.id, 1, { JWT_REFRESH_SECRET: t.env.JWT_ACCESS_SECRET });

        expect((await t.request('/api/papers')).status).toBe(401);
        expect((await t.request('/api/papers', { token: forged })).status).toBe(401);
        expect((await t.request('/api/papers', { token: refreshAsAccess })).status).toBe(401);
    });

    it('does not accept the access token in the query string on REST routes', async () => {
        const res = await t.request(`/api/papers?token=${alice.token}`);
        expect(res.status).toBe(401);
    });
});

describe('PDF download links', () => {
    const link = async (user, paperId) => {
        const { body } = await json(await t.request(`/api/papers/${paperId}/pdf`, { user }));
        return body.data.downloadUrl.replace('https://api.test', '');
    };

    it('hands out a one-paper link instead of the login token when presigning is unavailable', async () => {
        const url = await link(alice, aPaper);

        expect(url).toMatch(/^\/api\/files\/pdf\?t=/);
        expect(url).not.toContain(alice.token);
        const res = await t.request(url);
        expect(res.status).toBe(200);
        expect(await res.text()).toBe('%PDF alice');
    });

    it('a download link is not a login token', async () => {
        const token = new URL(`https://x${await link(alice, aPaper)}`).searchParams.get('t');
        expect((await t.request('/api/papers', { token })).status).toBe(401);
    });

    it('rejects login tokens, tampered and expired links', async () => {
        const { generateFileToken } = await import('../../src/lib/jwt.js');
        const jwt = (await import('jsonwebtoken')).default;
        const expired = jwt.sign({ userId: 1, paperId: aPaper, type: 'file', exp: 1 }, t.env.JWT_ACCESS_SECRET);
        const tampered = generateFileToken(1, aPaper, t.env).slice(0, -3) + 'abc';

        for (const token of [alice.token, expired, tampered]) {
            expect((await t.request(`/api/files/pdf?t=${token}`)).status).toBe(401);
        }
    });

    it('re-checks access when the link is used', async () => {
        const url = await link(alice, aPaper);
        t.db.sqlite.prepare('UPDATE papers SET deleted_at = ? WHERE id = ?').run('2026-01-01', aPaper);
        expect((await t.request(url)).status).toBe(404);
    });
});

describe('WebSocket sync', () => {
    beforeEach(() => {
        t.env.WORKSPACE_DO = {
            idFromName: (name) => name,
            get: (room) => ({ fetch: async (req) => Response.json({ room, user: req.headers.get('X-User-Id') }) }),
        };
    });

    it('accepts the token in the query string and joins the caller\'s own room, whatever room is asked for', async () => {
        const res = await t.request(`/api/sync/workspace/user:1?token=${bob.token}`, { headers: { Upgrade: 'websocket' } });
        expect(await res.json()).toEqual({ room: 'user:2', user: '2' });
    });

    it('rejects an upgrade without a valid token', async () => {
        const res = await t.request('/api/sync/workspace/default?token=nope', { headers: { Upgrade: 'websocket' } });
        expect(res.status).toBe(401);
    });
});
