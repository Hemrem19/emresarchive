/**
 * PDF proxy limits for external links, user settings round trip, and the
 * library indexes the access layer's queries rely on.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createTestApp } from '../support/app.js';
import { MAX_EXTERNAL_PDF_BYTES } from '../../src/services/pdf.js';

let t, alice;

beforeEach(() => {
    t = createTestApp();
    alice = t.addUser(1);
});
afterEach(() => vi.unstubAllGlobals());

const json = async (res) => ({ status: res.status, body: await res.json().catch(() => null) });

describe('external PDF proxy', () => {
    const proxy = (paperId) => t.request(`/api/papers/${paperId}/pdf-proxy`, { user: alice });
    const externalPaper = () => t.addPaper(alice, { pdf_url: 'https://example.org/paper.pdf' });

    it('streams a normal external PDF with a timeout signal', async () => {
        const fetchMock = vi.fn(async () => new Response('%PDF-1.7 hello', { headers: { 'content-length': '14' } }));
        vi.stubGlobal('fetch', fetchMock);

        const res = await proxy(externalPaper());
        expect(res.status).toBe(200);
        expect(await res.text()).toBe('%PDF-1.7 hello');
        expect(res.headers.get('content-type')).toBe('application/pdf');
        expect(fetchMock.mock.calls[0][1].signal).toBeInstanceOf(AbortSignal);
    });

    it('refuses a PDF whose declared size is over the limit', async () => {
        vi.stubGlobal('fetch', vi.fn(async () => new Response('x', {
            headers: { 'content-length': String(MAX_EXTERNAL_PDF_BYTES + 1) },
        })));
        expect((await proxy(externalPaper())).status).toBe(413);
    });

    it('cuts off a body that grows past the limit without declaring its size', async () => {
        const chunk = new Uint8Array(1024 * 1024);
        let sent = 0;
        const endless = new ReadableStream({
            pull(controller) {
                sent += chunk.length;
                if (sent > MAX_EXTERNAL_PDF_BYTES + 2 * chunk.length) controller.close();
                else controller.enqueue(chunk);
            },
        });
        vi.stubGlobal('fetch', vi.fn(async () => new Response(endless)));

        const res = await proxy(externalPaper());
        await expect(res.arrayBuffer()).rejects.toThrow();
    });

    it('reports an unreachable or timed-out source as a failed fetch', async () => {
        vi.stubGlobal('fetch', vi.fn(async () => { throw new DOMException('timed out', 'TimeoutError'); }));
        expect((await json(await proxy(externalPaper()))).status).toBe(500);
    });
});

describe('user settings', () => {
    it('round-trips settings as an object, never a JSON string', async () => {
        const me = await json(await t.request('/api/auth/me', { user: alice }));
        expect(me.body.data.user.settings).toEqual({});

        await t.request('/api/user/settings', { user: alice, method: 'PUT', body: { settings: { theme: 'dark' } } });
        const after = await json(await t.request('/api/auth/me', { user: alice }));
        expect(after.body.data.user.settings).toEqual({ theme: 'dark' });
    });
});

describe('library indexes', () => {
    const plan = (sql) => t.rows(`EXPLAIN QUERY PLAN ${sql}`).map((r) => r.detail).join(' | ');

    it('serves the paper list from the user_id index', () => {
        expect(plan('SELECT * FROM papers WHERE user_id = 1 AND deleted_at IS NULL ORDER BY updated_at DESC'))
            .toContain('papers_user_id_updated_at_idx');
        expect(plan("SELECT * FROM papers WHERE user_id = 1 AND updated_at > '2026-01-01'"))
            .toContain('papers_user_id_updated_at_idx');
    });

    it('indexes the other per-library tables', () => {
        expect(plan('SELECT * FROM annotations WHERE user_id = 1')).toContain('annotations_user_id_idx');
        expect(plan('SELECT * FROM network_graphs WHERE user_id = 1')).toContain('network_graphs_user_id_idx');
    });
});
