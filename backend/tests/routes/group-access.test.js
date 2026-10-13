/**
 * Group libraries: members reach a group's rows through the X-Library header
 * or by id; everyone else sees nothing. Personal libraries never include
 * group rows, even the ones the user added.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { createTestApp } from '../support/app.js';

let t, alice, bob, eve, group, G;
let gPaper, gKey, gFolder, aPaper;

beforeEach(async () => {
    t = createTestApp();
    alice = t.addUser(1);
    bob = t.addUser(2);
    eve = t.addUser(3); // not a member
    group = t.addGroup(alice, [[bob, 'member']]);
    G = `group:${group}`;

    gKey = `papers/g${group}/1/shared.pdf`;
    await t.bucket.put(gKey, new TextEncoder().encode('%PDF group').buffer);
    gPaper = t.addPaper(bob, { group_id: group, title: 'Group paper', pdf_url: gKey });
    gFolder = t.addFolder(alice, { group_id: group, name: 'Group folder' });
    aPaper = t.addPaper(alice, { title: 'Alice personal' });
});

const json = async (res) => ({ status: res.status, body: await res.json().catch(() => null) });
const titles = (res) => res.body.data.papers.map((p) => p.title);

describe('reading', () => {
    it('lists a group\'s papers only when that library is asked for', async () => {
        const personal = await json(await t.request('/api/papers', { user: bob }));
        const inGroup = await json(await t.request('/api/papers', { user: alice, library: G }));
        const delta = await json(await t.request('/api/papers?since=2000-01-01', { user: alice, library: G }));
        const search = await json(await t.request('/api/papers/search?q=paper', { user: alice, library: G }));

        expect(titles(personal)).toEqual([]); // bob added it, but it lives in the group
        expect(titles(inGroup)).toEqual(['Group paper']);
        expect(titles(delta)).toEqual(['Group paper']);
        expect(titles(search)).toEqual(['Group paper']);
        expect(titles(await json(await t.request('/api/papers', { user: alice })))).toEqual(['Alice personal']);
    });

    it('lets members read a group paper and its PDF by id', async () => {
        expect((await t.request(`/api/papers/${gPaper}`, { user: alice })).status).toBe(200);
        const pdf = await t.request(`/api/papers/${gPaper}/pdf-proxy`, { user: alice });
        expect(pdf.status).toBe(200);
        expect(await pdf.text()).toBe('%PDF group');
    });

    it('shows nothing of a group to a non-member', async () => {
        expect((await t.request('/api/papers', { user: eve, library: G })).status).toBe(404);
        expect((await t.request('/api/folders', { user: eve, library: G })).status).toBe(404);
        for (const path of [`/api/papers/${gPaper}`, `/api/papers/${gPaper}/pdf`, `/api/papers/${gPaper}/pdf-proxy`, `/api/folders/${gFolder}`]) {
            expect((await t.request(path, { user: eve })).status, path).toBe(404);
        }
        const put = await t.request(`/api/papers/${gPaper}`, { user: eve, method: 'PUT', body: { title: 'x' } });
        expect(put.status).toBe(404);
        expect(t.row('SELECT title FROM papers WHERE id = ?', gPaper).title).toBe('Group paper');
    });

    it('refuses library names it does not understand', async () => {
        for (const library of ['group:abc', 'user:1', 'group:999']) {
            expect((await t.request('/api/papers', { user: alice, library })).status, library).toBe(404);
        }
        expect((await t.request('/api/papers', { user: alice, library: 'personal' })).status).toBe(200);
    });
});

describe('writing', () => {
    it('creates papers and folders in the group, recording who added them', async () => {
        const paper = await json(await t.request('/api/papers', { user: bob, library: G, method: 'POST', body: { title: 'New' } }));
        const folder = await json(await t.request('/api/folders', { user: bob, library: G, method: 'POST', body: { name: 'F' } }));

        expect(t.row('SELECT user_id, group_id FROM papers WHERE id = ?', paper.body.data.paper.id)).toEqual({ user_id: bob.id, group_id: group });
        expect(t.row('SELECT user_id, group_id FROM folders WHERE id = ?', folder.body.data.folder.id)).toEqual({ user_id: bob.id, group_id: group });
    });

    it('lets members edit papers others added', async () => {
        await t.request(`/api/papers/${gPaper}`, { user: alice, method: 'PUT', body: { title: 'Edited' } });
        expect(t.row('SELECT title FROM papers WHERE id = ?', gPaper).title).toBe('Edited');
    });

    it('stores group uploads under the group and leaves personal usage alone', async () => {
        const form = new FormData();
        form.append('file', new File([new Uint8Array(100)], 'g.pdf', { type: 'application/pdf' }));
        const res = await json(await t.request(`/api/papers/upload?paperId=${gPaper}`, { user: bob, library: G, method: 'POST', body: form }));

        expect(res.body.data.s3Key).toBe(`papers/g${group}/${gPaper}/g.pdf`);
        expect(t.row('SELECT storage_used_bytes AS used FROM users WHERE id = ?', bob.id).used).toBe(0);
    });

    it('keeps PDF keys inside their own library', async () => {
        const personalKey = 'papers/2/9/mine.pdf';
        const toGroup = await t.request(`/api/papers/${gPaper}`, { user: bob, method: 'PUT', body: { pdfUrl: personalKey } });
        const own = t.addPaper(bob);
        const toPersonal = await t.request(`/api/papers/${own}`, { user: bob, method: 'PUT', body: { pdfUrl: gKey } });
        const create = await t.request('/api/papers', { user: bob, library: G, method: 'POST', body: { title: 'x', pdfUrl: personalKey } });

        expect(toGroup.status).toBe(400);
        expect(toPersonal.status).toBe(400);
        expect(create.status).toBe(400);
    });

    it('files only papers of the same library into a folder', async () => {
        const same = await t.request(`/api/folders/${gFolder}/papers`, { user: alice, method: 'POST', body: { paperId: gPaper } });
        const cross = await t.request(`/api/folders/${gFolder}/papers`, { user: alice, method: 'POST', body: { paperId: aPaper } });
        expect(same.status).toBe(201);
        expect(cross.status).toBe(404);

        const folders = await json(await t.request('/api/folders', { user: bob, library: G }));
        expect(folders.body.data.folders).toEqual([expect.objectContaining({ name: 'Group folder', paperIds: [gPaper] })]);
        expect(t.row('SELECT group_id FROM paper_folders WHERE paper_id = ?', gPaper).group_id).toBe(group);
    });
});

describe('personal-library operations leave groups alone', () => {
    it('clearing my data keeps the group rows I added', async () => {
        const res = await t.request('/api/user/data', { user: bob, method: 'DELETE' });
        expect(res.status).toBe(200);
        expect(t.row('SELECT deleted_at FROM papers WHERE id = ?', gPaper)).toEqual({ deleted_at: null });
        expect(t.bucket.objects.has(gKey)).toBe(true);
    });

    it('restoring a backup in replace mode keeps the group rows I added', async () => {
        const res = await t.request('/api/import/batch-import', {
            user: bob, method: 'POST', body: { mode: 'replace', papers: [{ ref: 'a', title: 'From backup' }] },
        });
        expect(res.status).toBe(200);
        expect(t.row('SELECT deleted_at FROM papers WHERE id = ?', gPaper).deleted_at).toBeNull();
    });
});
