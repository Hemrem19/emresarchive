/**
 * Copying papers between libraries: an independent copy in the target,
 * with stored PDFs copied into (and paid by) the target library.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { createTestApp } from '../support/app.js';

let t, alice, bob, eve, group, G, key, paper;

beforeEach(async () => {
    t = createTestApp();
    alice = t.addUser(1);
    bob = t.addUser(2);
    eve = t.addUser(3);
    group = t.addGroup(alice, [[bob, 'member']]);
    G = `group:${group}`;
    key = 'papers/1/7/paper.pdf';
    await t.bucket.put(key, new Uint8Array(300).buffer);
    paper = t.addPaper(alice, {
        title: 'Original', doi: '10.1/x', tags: ['ml'], notes: 'my notes', status: 'Finished', rating: 5,
        related_paper_ids: [99], pdf_url: key,
    });
});

const json = async (res) => ({ status: res.status, body: await res.json().catch(() => null) });
const copy = async (user, paperIds, to) => json(await t.request('/api/papers/copy', { user, method: 'POST', body: { paperIds, to } }));

describe('copy into a group', () => {
    it('creates an independent paper in the group with its own PDF', async () => {
        const res = await copy(alice, [paper], G);
        const [result] = res.body.data.results;
        expect(result).toMatchObject({ sourceId: paper, success: true, pdfCopied: true });

        const row = t.row('SELECT * FROM papers WHERE id = ?', result.id);
        expect(row).toMatchObject({ group_id: group, user_id: alice.id, title: 'Original', doi: '10.1/x', notes: 'my notes', status: 'To Read', rating: null });
        expect(JSON.parse(row.related_paper_ids)).toEqual([]);
        expect(row.pdf_url).toBe(`papers/g${group}/${result.id}/paper.pdf`);
        expect(t.bucket.objects.get(row.pdf_url).bytes.byteLength).toBe(300);
        expect(t.bucket.objects.has(key)).toBe(true); // the original stays

        await t.request(`/api/papers/${result.id}`, { user: bob, method: 'PUT', body: { title: 'Changed in group' } });
        expect(t.row('SELECT title FROM papers WHERE id = ?', paper).title).toBe('Original');
    });

    it('lets members open the copied PDF', async () => {
        const { body } = await copy(alice, [paper], G);
        const res = await t.request(`/api/papers/${body.data.results[0].id}/pdf-proxy`, { user: bob });
        expect(res.status).toBe(200);
    });

    it('copies the paper without its PDF when the group is out of space', async () => {
        t.env.STORAGE_LIMIT_GROUP = '100B';
        const { body } = await copy(alice, [paper], G);
        const [result] = body.data.results;
        expect(result).toMatchObject({ success: true, pdfCopied: false, pdfSkipped: expect.stringMatching(/Not enough cloud storage/) });
        expect(t.row('SELECT pdf_url FROM papers WHERE id = ?', result.id).pdf_url).toBeNull();
    });

    it('keeps external PDF links as they are', async () => {
        const linked = t.addPaper(alice, { pdf_url: 'https://arxiv.org/pdf/1' });
        const { body } = await copy(alice, [linked], G);
        expect(t.row('SELECT pdf_url FROM papers WHERE id = ?', body.data.results[0].id).pdf_url).toBe('https://arxiv.org/pdf/1');
    });
});

describe('copy out of a group', () => {
    it('lets a member copy a group paper into their personal library', async () => {
        const { body: into } = await copy(alice, [paper], G);
        const groupCopy = into.data.results[0].id;

        const { body } = await copy(bob, [groupCopy], 'personal');
        const row = t.row('SELECT * FROM papers WHERE id = ?', body.data.results[0].id);
        expect(row).toMatchObject({ user_id: bob.id, group_id: null });
        expect(row.pdf_url).toMatch(/^papers\/2\//);
    });
});

describe('refusals', () => {
    it('refuses to copy into a library the caller is not in', async () => {
        expect((await copy(eve, [paper], G)).status).toBe(404);
        expect((await copy(alice, [paper], 'group:999')).status).toBe(404);
    });

    it('treats papers the caller cannot read as not found, and copies nothing for them', async () => {
        const { body } = await copy(eve, [paper], 'personal');
        expect(body.data.results).toEqual([{ sourceId: paper, success: false, error: 'Paper not found' }]);
        expect(t.rows('SELECT id FROM papers WHERE user_id = ?', eve.id)).toEqual([]);
    });

    it('refuses copies into the paper\'s own library', async () => {
        const { body } = await copy(alice, [paper], 'personal');
        expect(body.data.results[0]).toMatchObject({ success: false, error: 'The paper is already in that library' });
    });

    it('needs between 1 and 100 papers', async () => {
        expect((await copy(alice, [], G)).status).toBe(400);
        expect((await copy(alice, Array.from({ length: 101 }, (_, i) => i + 1), G)).status).toBe(400);
    });
});
