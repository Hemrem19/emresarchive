import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../api/auth.js', () => ({
    getAccessToken: vi.fn(() => 'token'),
    refreshToken: vi.fn(),
}));

const { getAllPapers } = await import('../api/papers.js');
const { getAllFolders } = await import('../api/folders.js');

const okJson = (data) => ({
    ok: true, status: 200,
    headers: { get: () => 'application/json' },
    json: async () => ({ success: true, data }),
    clone() { return this; },
    text: async () => JSON.stringify({ success: true, data }),
});

beforeEach(() => {
    localStorage.clear();
    global.fetch = vi.fn(async () => okJson({ papers: [], folders: [], pagination: {} }));
});

const sentHeaders = () => global.fetch.mock.calls.map(([, init]) => init.headers);

describe('X-Library header', () => {
    it('is absent in the personal library', async () => {
        await getAllPapers().catch(() => {});
        await getAllFolders().catch(() => {});
        expect(sentHeaders().every((h) => !('X-Library' in h))).toBe(true);
    });

    it('names the open group on paper and folder requests', async () => {
        localStorage.setItem('citavers:library', 'group:5');
        await getAllPapers().catch(() => {});
        await getAllFolders().catch(() => {});
        expect(sentHeaders().length).toBeGreaterThan(1);
        expect(sentHeaders().every((h) => h['X-Library'] === 'group:5')).toBe(true);
    });
});
