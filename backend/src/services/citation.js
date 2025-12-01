import { prisma } from '../lib/prisma.js';

// Cache TTL: 90 days
const CACHE_TTL = 90 * 24 * 60 * 60 * 1000;

export class CitationService {
    /**
     * Fetch citations for a given DOI
     * Strategy: Cache -> OpenAlex -> Semantic Scholar
     */
    async fetchCitations(doi) {
        if (!doi) return null;

        // 1. Check Cache
        const cached = await prisma.citationCache.findUnique({
            where: { doi }
        });

        if (cached) {
            const age = new Date().getTime() - new Date(cached.lastFetched).getTime();
            if (age < CACHE_TTL) {
                return cached.rawData;
            }
        }

        // 2. Try OpenAlex (Free, high limits)
        try {
            const openAlexData = await this.fetchOpenAlex(doi);
            if (openAlexData) {
                await this.cacheResult(doi, 'openalex', openAlexData);
                return openAlexData;
            }
        } catch (e) {
            console.error(`OpenAlex failed for ${doi}:`, e.message);
        }

        // 3. Try Semantic Scholar (Free tier)
        try {
            const semanticData = await this.fetchSemanticScholar(doi);
            if (semanticData) {
                await this.cacheResult(doi, 'semantic_scholar', semanticData);
                return semanticData;
            }
        } catch (e) {
            console.error(`Semantic Scholar failed for ${doi}:`, e.message);
        }

        return null;
    }

    async fetchOpenAlex(doi) {
        const url = `https://api.openalex.org/works/doi:${doi}`;
        const response = await fetch(url);

        if (!response.ok) {
            if (response.status === 404) return null;
            throw new Error(`OpenAlex API error: ${response.status}`);
        }

        const data = await response.json();

        // Transform to common format
        return {
            title: data.title,
            doi: data.doi?.replace('https://doi.org/', ''),
            citationCount: data.cited_by_count,
            references: data.referenced_works || [], // URLs to other works
            source: 'openalex'
        };
    }

    async fetchSemanticScholar(doi) {
        const url = `https://api.semanticscholar.org/graph/v1/paper/DOI:${doi}?fields=title,citationCount,references.doi,references.title`;
        const response = await fetch(url);

        if (!response.ok) {
            if (response.status === 404) return null;
            throw new Error(`Semantic Scholar API error: ${response.status}`);
        }

        const data = await response.json();

        return {
            title: data.title,
            doi: doi,
            citationCount: data.citationCount,
            references: (data.references || []).map(ref => ({
                doi: ref.doi,
                title: ref.title
            })).filter(r => r.doi), // Only keep refs with DOIs
            source: 'semantic_scholar'
        };
    }

    async cacheResult(doi, source, data) {
        const expiresAt = new Date(Date.now() + CACHE_TTL);

        await prisma.citationCache.upsert({
            where: { doi },
            update: {
                apiSource: source,
                citationCount: data.citationCount || 0,
                referenceCount: data.references?.length || 0,
                rawData: data,
                lastFetched: new Date(),
                expiresAt
            },
            create: {
                doi,
                apiSource: source,
                citationCount: data.citationCount || 0,
                referenceCount: data.references?.length || 0,
                rawData: data,
                lastFetched: new Date(),
                expiresAt
            }
        });
    }

    normalizeDoi(doi) {
        if (!doi) return null;
        return doi.toLowerCase().trim().replace(/^https?:\/\/doi\.org\//, '').replace(/^doi:/, '');
    }

    /**
     * Generate network for a user
     */
    async generateNetwork(userId) {
        // Get all user papers with metadata
        const papers = await prisma.paper.findMany({
            where: {
                userId,
                deletedAt: null
            },
            select: { id: true, doi: true, title: true, authors: true, tags: true }
        });

        console.log(`Generating network for user ${userId} with ${papers.length} papers`);

        const connections = [];
        const existingConnections = new Set(); // To prevent duplicates

        const addConnection = (fromId, toId, type, source = 'auto') => {
            const key = [Math.min(fromId, toId), Math.max(fromId, toId), type].join('-');
            if (!existingConnections.has(key)) {
                existingConnections.add(key);
                connections.push({
                    fromPaperId: fromId,
                    toPaperId: toId,
                    connectionType: type,
                    source
                });
            }
        };

        // 1. Internal Matching (Tags & Authors) - O(N^2) but fine for typical library size
        for (let i = 0; i < papers.length; i++) {
            for (let j = i + 1; j < papers.length; j++) {
                const p1 = papers[i];
                const p2 = papers[j];

                // Check common tags
                const commonTags = p1.tags.filter(tag => p2.tags.includes(tag));
                if (commonTags.length > 0) {
                    addConnection(p1.id, p2.id, 'common_tag', 'auto');
                }

                // Check common authors
                const commonAuthors = p1.authors.filter(author => p2.authors.includes(author));
                if (commonAuthors.length > 0) {
                    addConnection(p1.id, p2.id, 'common_author', 'auto');
                }
            }
        }

        // 2. External Citation Matching (Only for papers with DOIs)
        const papersWithDoi = papers.filter(p => p.doi);
        const BATCH_SIZE = 5;

        for (let i = 0; i < papersWithDoi.length; i += BATCH_SIZE) {
            const batch = papersWithDoi.slice(i, i + BATCH_SIZE);

            await Promise.all(batch.map(async (paper) => {
                try {
                    const normalizedPaperDoi = this.normalizeDoi(paper.doi);
                    const data = await this.fetchCitations(normalizedPaperDoi);
                    if (!data) return;

                    // Check references
                    if (data.source === 'semantic_scholar') {
                        for (const ref of data.references) {
                            if (!ref.doi) continue;
                            const normalizedRefDoi = this.normalizeDoi(ref.doi);

                            // Find in our library
                            const citedPaper = papersWithDoi.find(p => this.normalizeDoi(p.doi) === normalizedRefDoi);

                            if (citedPaper && citedPaper.id !== paper.id) {
                                addConnection(paper.id, citedPaper.id, 'cites', 'auto');
                            }
                        }
                    }
                } catch (e) {
                    console.error(`Error processing paper ${paper.id}:`, e);
                }
            }));

            // Small delay to be polite
            await new Promise(r => setTimeout(r, 1000));
        }

        // 3. Save connections
        if (connections.length > 0) {
            await prisma.paperConnection.createMany({
                data: connections,
                skipDuplicates: true
            });
        }

        // Update or create NetworkGraph record
        let graph = await prisma.networkGraph.findFirst({
            where: { userId, isAuto: true }
        });

        if (graph) {
            graph = await prisma.networkGraph.update({
                where: { id: graph.id },
                data: {
                    nodeCount: papers.length,
                    edgeCount: connections.length,
                    updatedAt: new Date()
                }
            });
        } else {
            graph = await prisma.networkGraph.create({
                data: {
                    userId,
                    name: 'Auto-Generated Network',
                    isAuto: true,
                    nodeCount: papers.length,
                    edgeCount: connections.length
                }
            });
        }

        return {
            nodeCount: papers.length,
            edgeCount: connections.length,
            connections
        };
    }
}

export const citationService = new CitationService();
