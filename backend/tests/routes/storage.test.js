/**
 * Storage quota: usage is measured from stored objects, uploads are refused
 * past the library's limit, and client-reported sizes are never trusted.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { createTestApp } from '../support/app.js';
import { MAX_PDF_BYTES } from '../../src/services/storage-quota.js';

let t, alice, bob;

beforeEach(() => {
    t = createTestApp();
    alice = t.addUser(1);
    bob = t.addUser(2);
});

const json = async (res) => ({ status: res.status, body: await res.json().catch(() => null) });
const setLimit = (user, bytes) => t.db.sqlite.prepare('UPDATE users SET storage_limit_bytes = ? WHERE id = ?').run(bytes, user.id);
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
        setLimit(alice, 1000);
        await t.bucket.put('papers/1/1/old.pdf', new Uint8Array(950).buffer);
        const res = await json(await upload(alice, { bytes: 100 }));

        expect(res.status).toBe(413);
        expect(res.body.error.message).toMatch(/Not enough cloud storage/);
        expect(t.bucket.objects.has('papers/1/7/paper.pdf')).toBe(false);
    });

    it('does not count the file being replaced', async () => {
        setLimit(alice, 1000);
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
        setLimit(bob, 1000);
        await t.bucket.put('papers/1/1/big.pdf', new Uint8Array(5000).buffer);
        await t.bucket.put('papers/12/1/big.pdf', new Uint8Array(5000).buffer);

        expect((await upload(bob, { bytes: 500 })).status).toBe(200);
        expect(usage(bob)).toBe(500);
    });
});

describe('presigned uploads', () => {
    beforeEach(() => {
        Object.assign(t.env, {
            S3_ENDPOINT: 'https://example.r2.cloudflarestorage.com',
            S3_ACCESS_KEY_ID: 'id',
            S3_SECRET_ACCESS_KEY: 'secret',
            S3_BUCKET_NAME: 'bucket',
        });
    });

    const presign = (user, size) => t.request('/api/papers/upload-url', {
        user, method: 'POST', body: { filename: 'a.pdf', size, contentType: 'application/pdf', paperId: 3 },
    });

    it('signs the declared size so a larger body is rejected by storage', async () => {
        const res = await json(await presign(alice, 1234));
        expect(res.status).toBe(200);
        const signed = new URL(res.body.data.uploadUrl).searchParams.get('X-Amz-SignedHeaders');
        expect(signed.split(';')).toContain('content-length');
    });

    it('applies the quota before handing out a URL', async () => {
        setLimit(alice, 1000);
        await t.bucket.put('papers/1/1/old.pdf', new Uint8Array(900).buffer);
        expect((await presign(alice, 200)).status).toBe(413);
    });

    it.each([0, -5, 1.5, '100', null])('rejects size %s', async (size) => {
        expect((await presign(alice, size)).status).toBe(400);
    });
});

describe('stats', () => {
    it('reports stored bytes, not the sizes clients claimed', async () => {
        await t.bucket.put('papers/1/5/a.pdf', new Uint8Array(700).buffer);
        t.addPaper(alice, { pdf_url: 'papers/1/5/a.pdf', pdf_size_bytes: 1 });
        const res = await json(await t.request('/api/user/stats', { user: alice }));

        expect(res.body.data.stats.storageUsedBytes).toBe('700');
        expect(res.body.data.stats.storageLimitBytes).toBe(String(2 * 1024 ** 3));
        expect(usage(alice)).toBe(700);
    });
});
