/**
 * The paper network of the library the app has open (X-Library): citation
 * links found in batches, suggested papers, and a stale flag.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createTestApp } from '../support/app.js';

const W = (n) => `https://openalex.org/W${n}`;
// What OpenAlex knows: DOI → work
const WORKS = {
    '10.1/a': { id: W(1), referenced_works: [W(2), W(9)] },
    '10.1/b': { id: W(2), referenced_works: [W(9)] },
    '10.1/c': { id: W(3), referenced_works: [W(1)] },
};
const SUGGESTED = { id: W(9), doi: 'https://doi.org/10.1/z', title: 'Classic', publication_year: 1999, cited_by_count: 500 };

const json = (body, status = 200) => ({ ok: status < 400, status, json: async () => body });

const openAlex = vi.fn(async (url, init) => {
    if (init?.method === 'POST') return json([null]); // Semantic Scholar knows nothing either
    const filter = new URL(url).searchParams.get('filter');
    if (filter.startsWith('openalex:')) return json({ results: [SUGGESTED] });
    const dois = filter.replace(/^doi:/, '').split('|');
    return json({ results: dois.filter((d) => WORKS[d]).map((d) => ({ ...WORKS[d], doi: `https://doi.org/${d}`, title: d })) });
});

let t, alice, bob, eve, group, lib;

beforeEach(() => {
    vi.stubGlobal('fetch', openAlex);
    openAlex.mockClear();
    vi.spyOn(console, 'error').mockImplementation(() => {});
    t = createTestApp();
    alice = t.addUser(1);
    bob = t.addUser(2);
    eve = t.addUser(3);
    group = t.addGroup(alice, [[bob, 'member']]);
    lib = `group:${group}`;
    for (const doi of ['10.1/a', '10.1/b', '10.1/c', '10.1/unknown']) {
        t.insert('papers', { user_id: alice.id, group_id: group, title: doi, doi });
    }
    t.addPaper(alice, { title: 'Personal', doi: '10.1/a' });
});

afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
});

const call = async (path, opts) => {
    const res = await t.request(path, opts);
    return { status: res.status, body: await res.json() };
};
const generate = (user, library = lib) => call('/api/networks/auto-generate', { user, library, method: 'POST' });
const show = (user, id, library = lib) => call(`/api/networks/${id}`, { user, library });

describe('network of the open library', () => {
    it('is made from that library\'s papers, with citation links and suggestions', async () => {
        const { status, body } = await generate(bob);

        expect(status).toBe(200);
        expect(body.data.stats).toMatchObject({ nodeCount: 4, citationEdges: 2, notFound: 1, pendingLookups: 0, suggestions: 1 });
        const graph = await show(bob, body.data.graph.id);
        expect(graph.body.data.nodes.map((n) => n.label).sort()).toEqual(['10.1/a', '10.1/b', '10.1/c', '10.1/unknown']);
        expect(graph.body.data.edges).toHaveLength(body.data.graph.edgeCount);
        expect(graph.body.data.graph.stale).toBe(false);
        expect(graph.body.data.suggestions).toEqual([
            expect.objectContaining({ openAlexId: W(9), doi: '10.1/z', title: 'Classic', year: 1999, citedBy: expect.any(Array) }),
        ]);
        expect(graph.body.data.suggestions[0].citedBy).toHaveLength(2);
        expect(t.row('SELECT group_id FROM network_graphs WHERE id = ?', body.data.graph.id).group_id).toBe(group);
    });

    it('is listed in its own library only', async () => {
        const { body } = await generate(alice);
        expect((await call('/api/networks', { user: alice, library: lib })).body.data.map((g) => g.id)).toEqual([body.data.graph.id]);
        expect((await call('/api/networks', { user: alice })).body.data).toEqual([]);
    });

    it('is refused for a library the caller is not in', async () => {
        expect((await generate(eve)).status).toBe(404);
        expect((await call('/api/networks', { user: eve, library: lib })).status).toBe(404);
    });

    it('asks the APIs only about papers it has not seen, misses included', async () => {
        await generate(alice);
        openAlex.mockClear();
        await generate(alice);
        // Only the suggestions' titles are fetched again
        expect(openAlex).toHaveBeenCalledTimes(1);
        expect(new URL(openAlex.mock.calls[0][0]).searchParams.get('filter')).toMatch(/^openalex:/);
    });

    it('is stale once papers change, and drops suggestions the library now has', async () => {
        const { body } = await generate(alice);
        t.insert('papers', { user_id: alice.id, group_id: group, title: 'Classic', doi: 'https://doi.org/10.1/Z' });

        const graph = await show(alice, body.data.graph.id);

        expect(graph.body.data.graph.stale).toBe(true);
        expect(graph.body.data.suggestions).toEqual([]);
    });
});
