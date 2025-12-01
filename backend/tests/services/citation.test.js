import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { citationService } from '../../src/services/citation.js';
import { prisma } from '../../src/lib/prisma.js';

// Mock dependencies
vi.mock('../../src/lib/prisma.js');

// Mock global fetch
const fetchMock = vi.fn();
vi.stubGlobal('fetch', fetchMock);

describe('Citation Service', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('fetchCitations', () => {
        const doi = '10.1234/test';

        it('should return cached data if valid', async () => {
            const cachedData = { title: 'Cached Title', citationCount: 10 };
            prisma.citationCache.findUnique.mockResolvedValue({
                lastFetched: new Date(),
                rawData: cachedData
            });

            const result = await citationService.fetchCitations(doi);
            expect(result).toEqual(cachedData);
            expect(prisma.citationCache.findUnique).toHaveBeenCalledWith({ where: { doi } });
            expect(fetchMock).not.toHaveBeenCalled();
        });

        it('should fetch from OpenAlex if cache miss', async () => {
            prisma.citationCache.findUnique.mockResolvedValue(null);

            const openAlexData = {
                title: 'OpenAlex Title',
                doi: 'https://doi.org/10.1234/test',
                cited_by_count: 5,
                referenced_works: ['https://openalex.org/W123']
            };

            fetchMock.mockResolvedValue({
                ok: true,
                json: async () => openAlexData
            });

            // Mock upsert for cache
            prisma.citationCache.upsert.mockResolvedValue({});

            const result = await citationService.fetchCitations(doi);

            expect(fetchMock).toHaveBeenCalledWith(expect.stringContaining('api.openalex.org'));
            expect(result).toEqual({
                title: 'OpenAlex Title',
                doi: '10.1234/test',
                citationCount: 5,
                references: ['https://openalex.org/W123'],
                source: 'openalex'
            });
            expect(prisma.citationCache.upsert).toHaveBeenCalled();
        });

        it('should fallback to Semantic Scholar if OpenAlex fails', async () => {
            prisma.citationCache.findUnique.mockResolvedValue(null);

            // OpenAlex fails
            fetchMock.mockResolvedValueOnce({ ok: false, status: 404 });

            // Semantic Scholar succeeds
            const semanticData = {
                title: 'Semantic Title',
                citationCount: 8,
                references: [{ doi: '10.5678/ref', title: 'Ref Title' }]
            };

            fetchMock.mockResolvedValueOnce({
                ok: true,
                json: async () => semanticData
            });

            prisma.citationCache.upsert.mockResolvedValue({});

            const result = await citationService.fetchCitations(doi);

            expect(fetchMock).toHaveBeenCalledTimes(2);
            expect(fetchMock).toHaveBeenLastCalledWith(expect.stringContaining('api.semanticscholar.org'));
            expect(result).toEqual({
                title: 'Semantic Title',
                doi: doi,
                citationCount: 8,
                references: [{ doi: '10.5678/ref', title: 'Ref Title' }],
                source: 'semantic_scholar'
            });
        });

        it('should return null if both APIs fail', async () => {
            prisma.citationCache.findUnique.mockResolvedValue(null);
            fetchMock.mockResolvedValue({ ok: false, status: 404 }); // Both calls fail

            const result = await citationService.fetchCitations(doi);
            expect(result).toBeNull();
        });
    });

    describe('generateNetwork', () => {
        const userId = 1;
        const papers = [
            { id: 1, doi: '10.1111/a', title: 'Paper A', authors: ['Author 1'], tags: ['tag1'] },
            { id: 2, doi: '10.2222/b', title: 'Paper B', authors: ['Author 1'], tags: ['tag2'] }, // Common author
            { id: 3, doi: '10.3333/c', title: 'Paper C', authors: ['Author 2'], tags: ['tag1'] }  // Common tag
        ];

        it('should generate connections based on metadata', async () => {
            prisma.paper.findMany.mockResolvedValue(papers);
            prisma.paperConnection.createMany.mockResolvedValue({ count: 2 });
            prisma.networkGraph.findFirst.mockResolvedValue(null);
            prisma.networkGraph.create.mockResolvedValue({ id: 1 });

            // Mock fetchCitations to return null to skip external matching logic for this test
            // We can spy on the service method itself
            const fetchSpy = vi.spyOn(citationService, 'fetchCitations').mockResolvedValue(null);

            const result = await citationService.generateNetwork(userId);

            expect(prisma.paper.findMany).toHaveBeenCalledWith(expect.objectContaining({
                where: expect.objectContaining({ userId })
            }));

            // Should find 2 connections:
            // 1-2 (Common Author 1)
            // 1-3 (Common Tag tag1)
            expect(prisma.paperConnection.createMany).toHaveBeenCalledWith(expect.objectContaining({
                data: expect.arrayContaining([
                    expect.objectContaining({ fromPaperId: 1, toPaperId: 2, connectionType: 'common_author' }),
                    expect.objectContaining({ fromPaperId: 1, toPaperId: 3, connectionType: 'common_tag' })
                ])
            }));

            expect(result.edgeCount).toBe(2);
            fetchSpy.mockRestore();
        });

        it('should update existing graph if present', async () => {
            prisma.paper.findMany.mockResolvedValue([]);
            prisma.networkGraph.findFirst.mockResolvedValue({ id: 100 });
            prisma.networkGraph.update.mockResolvedValue({ id: 100 });

            await citationService.generateNetwork(userId);

            expect(prisma.networkGraph.update).toHaveBeenCalledWith({
                where: { id: 100 },
                data: expect.any(Object)
            });
        });
    });
});
