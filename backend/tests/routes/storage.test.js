/**
 * Storage quota: usage is measured from stored objects, uploads are refused
 * past the library's limit, and client-reported sizes are never trusted.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { createTestApp } from '../support/app.js';
import { MAX_PDF_BYTES, libraryLimit, parseSize } from '../../src/services/storage-quota.js';

let t, alice, bob;

beforeEach(() => {
    t = createTestApp();
    alice = t.addUser(1);
    bob = t.addUser(2);
});

const json = async (res) => ({ status: res.status, body: await res.json().catch(() => null) });
const setLimit = (limit) => { t.env.STORAGE_LIMIT = limit; };
const usage = (user) => t.row('SELECT storage_used_bytes AS used FROM users WHERE id = ?', user.id).used;

function upload(user, { bytes = 100, name = 'paper.pdf', paperId = 7 } = {}) {
    const form = new FormData();
    form.append('file', new File([new Uint8Array(bytes)], name, { type: 'application/pdf' }));
    return t.request(`/api/papers/upload?paperId=${paperId}`, { user, method: 'POST', body: form });
}

describe('uploads', () => {
    it('stores a PDF that fits and records the measured usage', async () => {
        await t.bucket.put('papers/1/1/old.pdf', new Uint8Array(300).buffer);
        const res = await json(await upload(alice, { bytes: 100 }));

        expect(res.status).toBe(200);
        expect(res.body.data.pdfSizeBytes).toBe(100);
        expect(usage(alice)).toBe(400);
    });

    it('refuses an upload that would exceed the limit and stores nothing', async () => {
        setLimit('1000B');
        await t.bucket.put('papers/1/1/old.pdf', new Uint8Array(950).buffer);
        const res = await json(await upload(alice, { bytes: 100 }));

        expect(res.status).toBe(413);
        expect(res.body.error.message).toMatch(/Not enough cloud storage/);
        expect(t.bucket.objects.has('papers/1/7/paper.pdf')).toBe(false);
    });

    it('does not count the file being replaced', async () => {
        setLimit('1000B');
        expect((await upload(alice, { bytes: 800 })).status).toBe(200);
        const again = await upload(alice, { bytes: 900 });

        expect(again.status).toBe(200);
        expect(usage(alice)).toBe(900);
    });

    it('refuses files over the size limit', async () => {
        const res = await json(await upload(alice, { bytes: MAX_PDF_BYTES + 1 }));
        expect(res.status).toBe(413);
        expect(t.bucket.objects.size).toBe(0);
    });

    it('counts only the uploader\'s own library', async () => {
        setLimit('1000B');
        await t.bucket.put('papers/1/1/big.pdf', new Uint8Array(5000).buffer);
        await t.bucket.put('papers/12/1/big.pdf', new Uint8Array(5000).buffer);

        expect((await upload(bob, { bytes: 500 })).status).toBe(200);
        expect(usage(bob)).toBe(500);
    });
});

describe('limit configuration', () => {
    it.each([['2GB', 2 * 1024 ** 3], ['500 MB', 500 * 1024 ** 2], ['1.5gb', 1.5 * 1024 ** 3], ['1000B', 1000]])(
        'reads %s', (value, bytes) => expect(parseSize(value)).toBe(bytes));

    it.each(['2', 'two GB', '', '-1GB', '2PB'])('rejects %s', (value) => {
        expect(() => parseSize(value)).toThrow(/Invalid storage size/);
    });

    it('defaults to 2GB when STORAGE_LIMIT is not set', () => {
        expect(libraryLimit({}, { ownerId: 1 })).toBe(2 * 1024 ** 3);
    });

    it('applies a changed limit without touching user rows', async () => {
        setLimit('1KB');
        expect((await upload(alice, { bytes: 1000 })).status).toBe(200);
        setLimit('2KB');
        expect((await upload(alice, { bytes: 1000, name: 'b.pdf' })).status).toBe(200);
        expect((await upload(alice, { bytes: 100, name: 'c.pdf' })).status).toBe(413);
    });
});

describe('stats', () => {
    it('reports stored bytes, not the sizes clients claimed', async () => {
        await t.bucket.put('papers/1/5/a.pdf', new Uint8Array(700).buffer);
        t.addPaper(alice, { pdf_url: 'papers/1/5/a.pdf', pdf_size_bytes: 1 });
        const res = await json(await t.request('/api/user/stats', { user: alice }));

        expect(res.body.data.stats.storageUsedBytes).toBe('700');
        expect(res.body.data.stats.storageLimitBytes).toBe(String(2 * 1024 ** 3));

        setLimit('5GB');
        const changed = await json(await t.request('/api/user/stats', { user: alice }));
        expect(changed.body.data.stats.storageLimitBytes).toBe(String(5 * 1024 ** 3));
        expect(usage(alice)).toBe(700);
    });
});

describe('upload paths', () => {
    it('has no presigned upload route (uploads go through the Worker only)', async () => {
        const res = await t.request('/api/papers/upload-url', {
            user: alice, method: 'POST', body: { filename: 'a.pdf', size: 10, contentType: 'application/pdf' },
        });
        expect(res.status).toBe(404);
    });
});

describe('group storage', () => {
    it('measures a group on its own and applies the group limit', async () => {
        const group = t.addGroup(alice, [[bob, 'member']]);
        t.env.STORAGE_LIMIT_GROUP = '1000B';
        await t.bucket.put(`papers/g${group}/1/a.pdf`, new Uint8Array(950).buffer);
        await t.bucket.put('papers/2/1/mine.pdf', new Uint8Array(5000).buffer);

        const form = new FormData();
        form.append('file', new File([new Uint8Array(100)], 'b.pdf', { type: 'application/pdf' }));
        const res = await t.request('/api/papers/upload?paperId=5', { user: bob, library: `group:${group}`, method: 'POST', body: form });
        expect(res.status).toBe(413);
        expect(libraryLimit(t.env, { groupId: group })).toBe(1000);
        expect(libraryLimit(t.env, { ownerId: 1 })).toBe(2 * 1024 ** 3);
    });
});
