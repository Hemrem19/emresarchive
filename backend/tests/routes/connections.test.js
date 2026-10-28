/**
 * Connected papers: why a paper is linked to others in its library's network.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { createTestApp } from '../support/app.js';
import { sharedAuthors } from '../../src/services/citation.js';

let t, alice, bob, a, b, c, d;

beforeEach(() => {
    t = createTestApp();
    alice = t.addUser(1);
    bob = t.addUser(2);
    a = t.addPaper(alice, { title: 'Main', authors: JSON.stringify(['Ada Lovelace', 'Alan Turing']) });
    b = t.addPaper(alice, { title: 'Cited one', year: 2020 });
    c = t.addPaper(alice, { title: 'Citing one' });
    d = t.addPaper(alice, { title: 'Coauthored', authors: JSON.stringify(['alan turing', 'Grace Hopper']) });
    const link = (id, from, to, type) => t.insert('paper_connections', { id, from_paper_id: from, to_paper_id: to, connection_type: type, source: 'auto' });
    link('1', a, b, 'cites');
    link('2', c, a, 'cites');
    link('3', a, d, 'common_author');
    link('4', a, d, 'common_tag'); // older runs; no longer a reason
    link('5', c, a, 'common_author'); // authors no longer shared: dropped
});

const get = async (user, id = a) => {
    const res = await t.request(`/api/networks/papers/${id}/connections`, { user });
    return { status: res.status, body: await res.json() };
};

describe('connected papers', () => {
    it('lists each connected paper once with its reasons, citations first', async () => {
        const { status, body } = await get(alice);
        expect(status).toBe(200);
        expect(body.data.connections).toEqual([
            { paper: { id: b, title: 'Cited one', year: 2020 }, reasons: [{ type: 'cites' }] },
            { paper: { id: c, title: 'Citing one', year: null }, reasons: [{ type: 'cited_by' }] },
            { paper: { id: d, title: 'Coauthored', year: null }, reasons: [{ type: 'same_author', names: ['Alan Turing'] }] },
        ]);
    });

    it("hides other people's papers and connections", async () => {
        expect((await get(bob)).status).toBe(404);
        const mine = t.addPaper(bob, { title: 'Bob' });
        t.insert('paper_connections', { id: 'x', from_paper_id: mine, to_paper_id: a, connection_type: 'cites', source: 'manual' });
        expect((await get(bob, mine)).body.data.connections).toEqual([]);
    });

    it('matches shared authors as the network does', () => {
        expect(sharedAuthors(['Ada', { name: 'Bo Li' }, 'ada'], '["ADA","bo li"]')).toEqual(['Ada', 'Bo Li']);
        expect(sharedAuthors([], ['x'])).toEqual([]);
    });
});
