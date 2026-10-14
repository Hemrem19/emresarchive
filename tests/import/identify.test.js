import { describe, it, expect, vi } from 'vitest';
import { identify, searchCrossrefByTitle, TITLE_MATCH } from '../../import/identify.js';

const file = (name = 'paper.pdf') => ({ name });
const parsed = (overrides = {}) => ({ info: {}, xmp: {}, text: '', firstPageItems: [], ...overrides });
const META = { title: 'Found', authors: ['A'], doi: '10.1016/x.1' };

function deps({ pdf = parsed(), lookup = async () => META, search = async () => null } = {}) {
    return {
        readPdf: vi.fn(async () => pdf),
        fetchDoiMetadata: vi.fn(lookup),
        searchByTitle: vi.fn(search),
    };
}

describe('identify', () => {
    it('uses the DOI printed in the file first', async () => {
        const d = deps({ pdf: parsed({ text: 'https://doi.org/10.1016/j.cce.2024.1 arXiv:2310.00123' }) });
        expect(await identify(file(), d)).toEqual({ metadata: META, matchedBy: 'doi' });
        expect(d.fetchDoiMetadata).toHaveBeenCalledWith('10.1016/j.cce.2024.1');
        expect(d.searchByTitle).not.toHaveBeenCalled();
    });

    it('uses the arXiv id when there is no DOI', async () => {
        const d = deps({ pdf: parsed({ text: 'arXiv:1801.01290v2 [cs.LG]' }) });
        const result = await identify(file(), d);
        expect(result.matchedBy).toBe('arxiv');
        expect(d.fetchDoiMetadata).toHaveBeenCalledWith('10.48550/arXiv.1801.01290');
        expect(result.metadata).toMatchObject({ journal: 'arXiv', url: 'https://arxiv.org/abs/1801.01290' });
    });

    it('falls back to a title search, accepting only a near-exact match', async () => {
        const pdf = parsed({ info: { Title: 'Reinforcement learning for chemical process control' } });
        const good = deps({ pdf, search: async () => [{ doi: '10.1000/abcd', score: TITLE_MATCH }] });
        expect((await identify(file(), good)).matchedBy).toBe('title');
        expect(good.fetchDoiMetadata).toHaveBeenCalledWith('10.1000/abcd');

        const weak = deps({ pdf, search: async () => [{ doi: '10.1000/abcd', score: 0.6 }] });
        const result = await identify(file(), weak);
        expect(result.matchedBy).toBe('none');
        expect(weak.fetchDoiMetadata).not.toHaveBeenCalled();
    });

    it('falls through when a lookup fails on the network', async () => {
        const d = deps({
            pdf: parsed({ text: 'doi:10.1016/j.x.2024.2', info: { Title: 'A long enough real paper title here' } }),
            lookup: async (id) => { if (id.startsWith('10.1016')) throw new Error('offline'); return META; },
            search: async () => [{ doi: '10.1000/zzzz', score: 1 }],
        });
        expect(await identify(file(), d)).toEqual({ metadata: META, matchedBy: 'title' });
    });

    it('keeps what the file says when nothing is found', async () => {
        const d = deps({
            pdf: parsed({ info: { Title: 'Microsoft Word - x.docx', Author: 'A. Smith; B. Jones' } }),
            search: async () => { throw new Error('offline'); },
        });
        const result = await identify(file('Thesis_on_reactor_design_final.pdf'), d);
        expect(result).toEqual({
            matchedBy: 'none',
            metadata: { title: 'Thesis on reactor design final', authors: ['A. Smith', 'B. Jones'] },
        });
    });

    it('still names unreadable files after their file name', async () => {
        const d = deps({ pdf: null });
        const result = await identify(file('scan.pdf'), d);
        expect(result).toEqual({ matchedBy: 'none', metadata: { title: 'scan', authors: [] } });
    });
});

describe('searchCrossrefByTitle', () => {
    it('prefers the published article over a preprint with the same title', async () => {
        const fetchImpl = async () => ({
            ok: true,
            json: async () => ({ message: { items: [
                { DOI: '10.1038/npre.2007.361.1', title: ['Sharing detailed research data'], type: 'posted-content' },
                { DOI: '10.1371/journal.pone.0000308', title: ['Sharing Detailed Research Data'], type: 'journal-article' },
            ] } }),
        });
        expect((await searchCrossrefByTitle('Sharing detailed research data', { fetchImpl }))[0].doi).toBe('10.1371/journal.pone.0000308');
    });

    it('returns the best scoring hit', async () => {
        const fetchImpl = vi.fn(async () => ({
            ok: true,
            json: async () => ({ message: { items: [
                { DOI: '10.1/a', title: ['Something else entirely'] },
                { DOI: '10.1/b', title: ['Deep learning for process control'] },
            ] } }),
        }));
        const [hit] = await searchCrossrefByTitle('Deep Learning for Process Control', { fetchImpl });
        expect(hit).toMatchObject({ doi: '10.1/b', score: 1 });
        expect(fetchImpl.mock.calls[0][0]).toContain('query.bibliographic=Deep%20Learning%20for%20Process%20Control');
    });
});

describe('tied title matches', () => {
    it('keeps the record whose journal is printed in the PDF', async () => {
        const records = {
            '10.1038/npre.1': { title: 'Sharing data', journal: 'Nature Precedings', doi: '10.1038/npre.1' },
            '10.1371/pone.1': { title: 'Sharing data', journal: 'PLoS ONE', doi: '10.1371/pone.1' },
        };
        const d = deps({
            pdf: parsed({ text: 'OPEN ACCESS Freely available online PLoS ONE | www.plosone.org March 2007', info: { Title: 'Sharing detailed research data citations' } }),
            search: async () => [{ doi: '10.1038/npre.1', score: 1 }, { doi: '10.1371/pone.1', score: 1 }],
            lookup: async (doi) => records[doi],
        });
        expect((await identify(file(), d)).metadata.doi).toBe('10.1371/pone.1');
    });
});
