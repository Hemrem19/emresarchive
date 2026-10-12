import { describe, it, expect, beforeEach } from 'vitest';
import { createTestApp } from '../support/app.js';
import { purgeStorage, TRASH_DAYS, ORPHAN_GRACE_DAYS } from '../../src/services/purge.js';

const NOW = new Date('2026-10-12T03:00:00Z');
const daysAgo = (n) => new Date(NOW.getTime() - n * 24 * 60 * 60 * 1000);

let t, alice, bob;

beforeEach(() => {
    t = createTestApp();
    alice = t.addUser(1);
    bob = t.addUser(2);
});

async function store(key, { age = 30, bytes = 10 } = {}) {
    await t.bucket.put(key, new Uint8Array(bytes).buffer);
    t.bucket.objects.get(key).uploaded = daysAgo(age);
}
const has = (key) => t.bucket.objects.has(key);
const purge = (mode = 'delete') => purgeStorage(t.env, { now: NOW, mode });

describe('storage purge', () => {
    it('keeps files referenced by live papers and by recent trash', async () => {
        await store('papers/1/1/live.pdf');
        await store('papers/1/2/recent-trash.pdf');
        t.addPaper(alice, { pdf_url: 'papers/1/1/live.pdf' });
        t.addPaper(alice, { pdf_url: 'papers/1/2/recent-trash.pdf', deleted_at: daysAgo(TRASH_DAYS - 1).toISOString() });

        const summary = await purge();
        expect(summary.deleted).toBe(0);
        expect(has('papers/1/1/live.pdf') && has('papers/1/2/recent-trash.pdf')).toBe(true);
    });

    it('removes the PDF of trash older than the trash period but keeps the tombstone', async () => {
        await store('papers/1/3/old-trash.pdf');
        await store('papers/1/1/live.pdf');
        t.addPaper(alice, { pdf_url: 'papers/1/1/live.pdf' });
        const id = t.addPaper(alice, { pdf_url: 'papers/1/3/old-trash.pdf', deleted_at: daysAgo(TRASH_DAYS + 1).toISOString() });

        const summary = await purge();
        expect(summary.expiredTrashPapers).toBe(1);
        expect(has('papers/1/3/old-trash.pdf')).toBe(false);
        const row = t.row('SELECT pdf_url, deleted_at FROM papers WHERE id = ?', id);
        expect(row.pdf_url).toBeNull();
        expect(row.deleted_at).not.toBeNull();
    });

    it('keeps a file that expired trash shares with a live paper', async () => {
        await store('papers/1/1/shared.pdf');
        t.addPaper(alice, { pdf_url: 'papers/1/1/shared.pdf' });
        t.addPaper(alice, { pdf_url: 'papers/1/1/shared.pdf', deleted_at: daysAgo(90).toISOString() });

        await purge();
        expect(has('papers/1/1/shared.pdf')).toBe(true);
    });

    it('removes unreferenced files only after the grace period', async () => {
        await store('papers/1/1/live.pdf');
        t.addPaper(alice, { pdf_url: 'papers/1/1/live.pdf' });
        await store('papers/2/9/old-orphan.pdf', { age: ORPHAN_GRACE_DAYS + 1 });
        await store('papers/2/9/new-orphan.pdf', { age: ORPHAN_GRACE_DAYS - 1 });

        const summary = await purge();
        expect(summary.deleted).toBe(1);
        expect(has('papers/2/9/old-orphan.pdf')).toBe(false);
        expect(has('papers/2/9/new-orphan.pdf')).toBe(true);
    });

    it('recognises legacy full-URL references, encoded or not', async () => {
        await store('papers/1/1/My Paper.pdf');
        await store('papers/1/2/plain.pdf');
        t.addPaper(alice, { pdf_url: 'https://acc.r2.cloudflarestorage.com/bucket/papers/1/1/My%20Paper.pdf' });
        t.addPaper(alice, { pdf_url: 'https://acc.r2.cloudflarestorage.com/bucket/papers/1/2/plain.pdf' });

        expect((await purge()).deleted).toBe(0);
    });

    it('ignores external links and objects outside papers/', async () => {
        await store('papers/1/1/live.pdf');
        await store('other/thing.bin');
        t.addPaper(alice, { pdf_url: 'papers/1/1/live.pdf' });
        t.addPaper(bob, { pdf_url: 'https://arxiv.org/pdf/1', deleted_at: daysAgo(90).toISOString() });

        const summary = await purge();
        expect(summary.expiredTrashPapers).toBe(0);
        expect(has('other/thing.bin')).toBe(true);
    });

    it('report mode changes nothing', async () => {
        await store('papers/1/1/live.pdf');
        await store('papers/1/3/old-trash.pdf');
        await store('papers/2/9/orphan.pdf');
        t.addPaper(alice, { pdf_url: 'papers/1/1/live.pdf' });
        const id = t.addPaper(alice, { pdf_url: 'papers/1/3/old-trash.pdf', deleted_at: daysAgo(90).toISOString() });

        const summary = await purge('report');
        expect(summary).toMatchObject({ mode: 'report', expiredTrashPapers: 1, unreferenced: 2, deleted: 0 });
        expect(summary.sample.sort()).toEqual(['papers/1/3/old-trash.pdf', 'papers/2/9/orphan.pdf']);
        expect(t.bucket.objects.size).toBe(3);
        expect(t.row('SELECT pdf_url FROM papers WHERE id = ?', id).pdf_url).toBe('papers/1/3/old-trash.pdf');
    });

    it('defaults to report mode when STORAGE_PURGE is unset', async () => {
        await store('papers/2/9/orphan.pdf');
        await store('papers/1/1/live.pdf');
        t.addPaper(alice, { pdf_url: 'papers/1/1/live.pdf' });

        expect((await purgeStorage(t.env, { now: NOW })).mode).toBe('report');
        expect(has('papers/2/9/orphan.pdf')).toBe(true);
    });

    it('refuses to delete anything when no paper references a stored file', async () => {
        await store('papers/1/1/a.pdf');
        await store('papers/2/1/b.pdf');

        const summary = await purge();
        expect(summary.aborted).toBeTruthy();
        expect(t.bucket.objects.size).toBe(2);
    });
});
