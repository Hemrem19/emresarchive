import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { buildConnections, lookupCitations, missingReferences, normalizeDoi } from '../../src/services/citation.js';

const fetchMock = vi.fn();

const jsonResponse = (body, status = 200) => ({
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
});

describe('Citation Service', () => {
    beforeEach(() => {
        vi.stubGlobal('fetch', fetchMock);
        fetchMock.mockReset();
        vi.spyOn(console, 'error').mockImplementation(() => {});
    });

    afterEach(() => {
        vi.unstubAllGlobals();
        vi.restoreAllMocks();
    });

    describe('normalizeDoi', () => {
        it('strips URL/prefix and lowercases', () => {
            expect(normalizeDoi('https://doi.org/10.1000/ABC')).toBe('10.1000/abc');
            expect(normalizeDoi('doi:10.1000/x ')).toBe('10.1000/x');
            expect(normalizeDoi(null)).toBeNull();
        });
    });

    describe('lookupCitations', () => {
        const work = (n, refs = []) => ({
            id: `https://openalex.org/W${n}`, doi: `https://doi.org/10.1/${n}`, title: `T${n}`,
            publication_year: 2020, cited_by_count: 3, referenced_works: refs,
        });
        const urlOf = (i) => new URL(fetchMock.mock.calls[i][0]);

        it('asks OpenAlex for up to 100 DOIs per request', async () => {
            const dois = Array.from({ length: 150 }, (_, i) => `10.1/${i}`);
            fetchMock
                .mockResolvedValueOnce(jsonResponse({ results: [work(1, ['https://openalex.org/W2'])] }))
                .mockResolvedValueOnce(jsonResponse({ results: [] }))
                .mockResolvedValueOnce(jsonResponse([])); // Semantic Scholar: nothing

            const { found } = await lookupCitations(dois, {});

            expect(urlOf(0).searchParams.get('filter').split('|')).toHaveLength(100);
            expect(urlOf(1).searchParams.get('filter').split('|')).toHaveLength(50);
            expect(urlOf(0).searchParams.has('api_key')).toBe(false);
            expect(found.get('10.1/1')).toMatchObject({
                source: 'openalex', openAlexId: 'https://openalex.org/W1', references: ['https://openalex.org/W2'],
            });
        });

        it('sends the OpenAlex key when one is configured', async () => {
            fetchMock.mockResolvedValue(jsonResponse({ results: [work(1)] }));
            await lookupCitations(['10.1/1'], { OPENALEX_API_KEY: 'k' });
            expect(urlOf(0).searchParams.get('api_key')).toBe('k');
        });

        it('asks Semantic Scholar in one request for what OpenAlex lacks, arXiv by arXiv id', async () => {
            fetchMock
                .mockResolvedValueOnce(jsonResponse({ results: [work(1)] }))
                .mockResolvedValueOnce(jsonResponse([
                    { title: 'S', citationCount: 1, references: [{ externalIds: { DOI: '10.1/B' } }, { externalIds: { ArXiv: '2401.1' } }, { externalIds: {} }] },
                    null,
                ]));

            const result = await lookupCitations(['10.1/1', '10.48550/arxiv.2510.1', '10.1/unknown'], { S2_API_KEY: 's' });

            const [url, init] = fetchMock.mock.calls[1];
            expect(url).toContain('/paper/batch');
            expect(JSON.parse(init.body).ids).toEqual(['ARXIV:2510.1', 'DOI:10.1/unknown']);
            expect(init.headers['x-api-key']).toBe('s');
            expect(result.found.get('10.48550/arxiv.2510.1')).toMatchObject({
                source: 'semantic_scholar', references: ['10.1/b', '10.48550/arxiv.2401.1'],
            });
            expect(result.misses).toEqual(['10.1/unknown']);
            expect(result.pending).toEqual([]);
        });

        it('leaves everything after a rate limit for the next run, without calling it a miss', async () => {
            const dois = Array.from({ length: 150 }, (_, i) => `10.1/${i}`);
            fetchMock
                .mockResolvedValueOnce(jsonResponse({ results: [work(1)] }))
                .mockResolvedValueOnce(jsonResponse({}, 429))
                .mockResolvedValueOnce(jsonResponse({}, 429)); // Semantic Scholar too

            const result = await lookupCitations(dois, {});

            expect(result.found.size).toBe(1);
            expect(result.misses).toEqual([]);
            expect(result.pending).toHaveLength(149);
        });
    });

    describe('buildConnections', () => {
        it('links papers sharing authors once per pair, but not papers sharing tags', () => {
            const papers = [
                { id: 1, tags: ['ML', 'nlp'], authors: ['Ada'] },
                { id: 2, tags: ['ml', 'NLP'], authors: ['ada'] },
                { id: 3, tags: '["other"]', authors: '[]' },
            ];

            const edges = buildConnections(papers, new Map());

            expect(edges).toEqual([
                { fromPaperId: 1, toPaperId: 2, connectionType: 'common_author' },
            ]);
        });

        it('skips overly common authors', () => {
            const papers = Array.from({ length: 60 }, (_, i) => ({ id: i + 1, tags: [], authors: ['Everyone'] }));
            expect(buildConnections(papers, new Map())).toEqual([]);
        });

        it('links citations within the library for both sources', () => {
            const papers = [
                { id: 1, doi: '10.1/A', tags: [], authors: [] },
                { id: 2, doi: '10.1/b', tags: [], authors: [] },
                { id: 3, doi: '10.1/c', tags: [], authors: [] },
            ];
            const citations = new Map([
                ['10.1/a', { source: 'semantic_scholar', references: ['10.1/B', '10.9/outside'] }],
                ['10.1/b', { source: 'openalex', openAlexId: 'W2', references: ['W3'] }],
                ['10.1/c', { source: 'openalex', openAlexId: 'W3', references: [] }],
            ]);

            const edges = buildConnections(papers, citations);

            expect(edges).toEqual([
                { fromPaperId: 1, toPaperId: 2, connectionType: 'cites' },
                { fromPaperId: 2, toPaperId: 3, connectionType: 'cites' },
            ]);
        });
        it('links a paper to one Semantic Scholar described, and the other way round', () => {
            const papers = [
                { id: 1, doi: '10.1/a', authors: [] },
                { id: 2, doi: '10.1/b', authors: [] },
            ];
            const citations = new Map([
                ['10.1/a', { source: 'openalex', openAlexId: 'W1', references: [] }],
                ['10.1/b', { source: 'semantic_scholar', references: ['10.1/a'] }],
            ]);
            expect(buildConnections(papers, citations)).toEqual([
                { fromPaperId: 2, toPaperId: 1, connectionType: 'cites' },
            ]);
        });

        it('makes no links from papers neither source knew', () => {
            const papers = [{ id: 1, doi: '10.1/a', authors: [] }, { id: 2, doi: '10.1/b', authors: [] }];
            const citations = new Map([['10.1/a', { source: 'none', references: [] }]]);
            expect(buildConnections(papers, citations)).toEqual([]);
        });
    });

    describe('missingReferences', () => {
        it('suggests works several library papers cite but the library lacks, most cited first', () => {
            const papers = [1, 2, 3].map((id) => ({ id, doi: `10.1/${id}` }));
            const citations = new Map([
                ['10.1/1', { source: 'openalex', openAlexId: 'W1', references: ['W9', 'W8', 'W2', 'W7'] }],
                ['10.1/2', { source: 'openalex', openAlexId: 'W2', references: ['W9', 'W8', 'W9'] }],
                ['10.1/3', { source: 'openalex', openAlexId: 'W3', references: ['W9', 'W2'] }],
            ]);

            expect(missingReferences(papers, citations)).toEqual([
                { openAlexId: 'W9', citedBy: [1, 2, 3] },
                { openAlexId: 'W8', citedBy: [1, 2] },
            ]);
            expect(missingReferences(papers, citations, { limit: 1 })).toHaveLength(1);
        });
    });
});
