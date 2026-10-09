import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { buildConnections, fetchCitations, normalizeDoi } from '../../src/services/citation.js';

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

    describe('fetchCitations', () => {
        it('uses OpenAlex when available', async () => {
            fetchMock.mockResolvedValueOnce(jsonResponse({
                id: 'https://openalex.org/W1', title: 'T', cited_by_count: 3,
                referenced_works: ['https://openalex.org/W2'],
            }));

            const data = await fetchCitations('10.1/a');

            expect(data).toMatchObject({ source: 'openalex', openAlexId: 'https://openalex.org/W1', references: ['https://openalex.org/W2'] });
            expect(fetchMock).toHaveBeenCalledTimes(1);
        });

        it('falls back to Semantic Scholar when OpenAlex fails', async () => {
            fetchMock
                .mockResolvedValueOnce(jsonResponse({}, 500))
                .mockResolvedValueOnce(jsonResponse({
                    title: 'T', citationCount: 1,
                    references: [{ externalIds: { DOI: '10.1/B' } }, { externalIds: {} }],
                }));

            const data = await fetchCitations('10.1/a');

            expect(data).toMatchObject({ source: 'semantic_scholar', references: ['10.1/b'] });
        });

        it('returns null when neither source knows the DOI', async () => {
            fetchMock.mockResolvedValue(jsonResponse({}, 404));
            expect(await fetchCitations('10.1/missing')).toBeNull();
        });
    });

    describe('buildConnections', () => {
        it('links papers sharing tags or authors once per pair', () => {
            const papers = [
                { id: 1, tags: ['ML', 'nlp'], authors: ['Ada'] },
                { id: 2, tags: ['ml', 'NLP'], authors: ['ada'] },
                { id: 3, tags: '["other"]', authors: '[]' },
            ];

            const edges = buildConnections(papers, new Map());

            expect(edges).toEqual([
                { fromPaperId: 1, toPaperId: 2, connectionType: 'common_tag' },
                { fromPaperId: 1, toPaperId: 2, connectionType: 'common_author' },
            ]);
        });

        it('skips overly common tags', () => {
            const papers = Array.from({ length: 60 }, (_, i) => ({ id: i + 1, tags: ['everything'], authors: [] }));
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
    });
});
