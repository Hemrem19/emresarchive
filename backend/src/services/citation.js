/**
 * Citation network generation on D1.
 *
 * Workers cap subrequests (external fetches and D1 queries) per invocation,
 * so bulk reads/writes go through a single json_each() query each, and
 * external DOI lookups are capped per run. Uncached DOIs left over are
 * picked up by the next run (results are cached for 90 days).
 */
import { sql } from 'drizzle-orm';

const CACHE_TTL = 90 * 24 * 60 * 60 * 1000;
// Each lookup may cost two fetches (OpenAlex, then Semantic Scholar)
export const MAX_LOOKUPS_PER_RUN = 20;
const LOOKUP_CONCURRENCY = 5;
// A tag/author shared by more papers than this adds noise, not structure
const MAX_GROUP_SIZE = 50;
const INSERT_CHUNK = 2000;

const USER_AGENT = 'citavErs/2.2 (https://citavers.com)';

export function normalizeDoi(doi) {
    if (!doi) return null;
    return String(doi).toLowerCase().trim()
        .replace(/^https?:\/\/(dx\.)?doi\.org\//, '')
        .replace(/^doi:/, '') || null;
}

const normalizeKey = (value) => String(value ?? '').toLowerCase().trim();

const asArray = (value) => {
    if (Array.isArray(value)) return value;
    if (typeof value === 'string') {
        try { const parsed = JSON.parse(value); return Array.isArray(parsed) ? parsed : []; } catch { return []; }
    }
    return [];
};

async function fetchOpenAlex(doi) {
    const res = await fetch(
        `https://api.openalex.org/works/doi:${encodeURIComponent(doi)}?select=id,doi,title,cited_by_count,referenced_works`,
        { headers: { 'User-Agent': USER_AGENT } }
    );
    if (res.status === 404) return null;
    if (!res.ok) throw new Error(`OpenAlex API error: ${res.status}`);
    const data = await res.json();
    return {
        title: data.title,
        doi,
        openAlexId: data.id || null,
        citationCount: data.cited_by_count || 0,
        references: data.referenced_works || [], // OpenAlex work IDs
        source: 'openalex',
    };
}

async function fetchSemanticScholar(doi) {
    const res = await fetch(
        `https://api.semanticscholar.org/graph/v1/paper/DOI:${encodeURIComponent(doi)}?fields=title,citationCount,references.externalIds`,
        { headers: { 'User-Agent': USER_AGENT } }
    );
    if (res.status === 404) return null;
    if (!res.ok) throw new Error(`Semantic Scholar API error: ${res.status}`);
    const data = await res.json();
    return {
        title: data.title,
        doi,
        citationCount: data.citationCount || 0,
        references: (data.references || [])
            .map(ref => normalizeDoi(ref.externalIds?.DOI))
            .filter(Boolean), // DOIs
        source: 'semantic_scholar',
    };
}

export async function fetchCitations(doi) {
    try {
        const data = await fetchOpenAlex(doi);
        if (data) return data;
    } catch (e) {
        console.error(`OpenAlex failed for ${doi}:`, e.message);
    }
    try {
        return await fetchSemanticScholar(doi);
    } catch (e) {
        console.error(`Semantic Scholar failed for ${doi}:`, e.message);
        return null;
    }
}

async function loadCache(db, dois) {
    if (dois.length === 0) return new Map();
    const rows = await db.all(sql`
        SELECT doi, raw_data AS rawData, expires_at AS expiresAt
        FROM citation_cache
        WHERE doi IN (SELECT value FROM json_each(${JSON.stringify(dois)}))
    `);
    const now = Date.now();
    const cache = new Map();
    for (const row of rows) {
        if (new Date(row.expiresAt).getTime() <= now) continue;
        try { cache.set(row.doi, JSON.parse(row.rawData)); } catch { /* treat as uncached */ }
    }
    return cache;
}

async function saveCache(db, entries) {
    if (entries.length === 0) return;
    const now = new Date();
    const payload = entries.map(([doi, data]) => ({
        doi,
        source: data.source,
        citations: data.citationCount || 0,
        refs: data.references.length,
        raw: JSON.stringify(data),
    }));
    await db.run(sql`
        INSERT INTO citation_cache (id, doi, api_source, citation_count, reference_count, raw_data, last_fetched, expires_at)
        SELECT lower(hex(randomblob(16))), json_extract(value, '$.doi'), json_extract(value, '$.source'),
               json_extract(value, '$.citations'), json_extract(value, '$.refs'), json_extract(value, '$.raw'),
               ${now.toISOString()}, ${new Date(now.getTime() + CACHE_TTL).toISOString()}
        FROM json_each(${JSON.stringify(payload)})
        WHERE true
        ON CONFLICT(doi) DO UPDATE SET
            api_source = excluded.api_source,
            citation_count = excluded.citation_count,
            reference_count = excluded.reference_count,
            raw_data = excluded.raw_data,
            last_fetched = excluded.last_fetched,
            expires_at = excluded.expires_at
    `);
}

async function runLimited(items, limit, fn) {
    const queue = [...items];
    const workers = Array.from({ length: Math.min(limit, queue.length) }, async () => {
        while (queue.length) await fn(queue.shift());
    });
    await Promise.all(workers);
}

/**
 * Pure edge computation, exported for tests.
 * @param {Array} papers - { id, doi, authors, tags }
 * @param {Map<string, Object>} citations - normalized DOI -> cached citation data
 */
export function buildConnections(papers, citations) {
    const connections = [];
    const seen = new Set();
    const add = (fromId, toId, type) => {
        if (fromId === toId) return;
        const key = type === 'cites'
            ? `${fromId}-${toId}-${type}`
            : `${Math.min(fromId, toId)}-${Math.max(fromId, toId)}-${type}`;
        if (seen.has(key)) return;
        seen.add(key);
        connections.push({ fromPaperId: fromId, toPaperId: toId, connectionType: type });
    };

    // 1. Shared tags / authors via inverted index (avoids O(N^2) pair scans)
    const linkGroups = (field, type) => {
        const groups = new Map();
        for (const paper of papers) {
            for (const raw of new Set(asArray(paper[field]).map(v => normalizeKey(typeof v === 'object' ? v?.name : v)))) {
                if (!raw) continue;
                if (!groups.has(raw)) groups.set(raw, []);
                groups.get(raw).push(paper.id);
            }
        }
        for (const ids of groups.values()) {
            if (ids.length < 2 || ids.length > MAX_GROUP_SIZE) continue;
            for (let i = 0; i < ids.length; i++) {
                for (let j = i + 1; j < ids.length; j++) add(ids[i], ids[j], type);
            }
        }
    };
    linkGroups('tags', 'common_tag');
    linkGroups('authors', 'common_author');

    // 2. Citations between papers in the library
    const byDoi = new Map();
    const byOpenAlexId = new Map();
    for (const paper of papers) {
        const doi = normalizeDoi(paper.doi);
        if (!doi) continue;
        byDoi.set(doi, paper.id);
        const openAlexId = citations.get(doi)?.openAlexId;
        if (openAlexId) byOpenAlexId.set(openAlexId, paper.id);
    }
    for (const paper of papers) {
        const data = citations.get(normalizeDoi(paper.doi));
        if (!data) continue;
        const lookup = data.source === 'openalex' ? byOpenAlexId : byDoi;
        for (const ref of data.references || []) {
            const citedId = lookup.get(data.source === 'openalex' ? ref : normalizeDoi(ref));
            if (citedId !== undefined) add(paper.id, citedId, 'cites');
        }
    }

    return connections;
}

/**
 * Regenerate the auto network for a user.
 * @param {import('drizzle-orm/d1').DrizzleD1Database} db
 * @param {number} userId
 */
export async function generateNetwork(db, userId, { maxLookups = MAX_LOOKUPS_PER_RUN } = {}) {
    const papers = await db.all(sql`
        SELECT id, doi, authors, tags FROM papers
        WHERE user_id = ${userId} AND deleted_at IS NULL
    `);

    const dois = [...new Set(papers.map(p => normalizeDoi(p.doi)).filter(Boolean))];
    const citations = await loadCache(db, dois);

    const missing = dois.filter(doi => !citations.has(doi));
    const toFetch = missing.slice(0, maxLookups);
    const fetched = [];
    await runLimited(toFetch, LOOKUP_CONCURRENCY, async (doi) => {
        const data = await fetchCitations(doi);
        if (data) {
            citations.set(doi, data);
            fetched.push([doi, data]);
        }
    });
    await saveCache(db, fetched);

    const connections = buildConnections(papers, citations);

    // Replace previous auto connections for this user's papers
    await db.run(sql`
        DELETE FROM paper_connections
        WHERE source = 'auto'
          AND from_paper_id IN (SELECT id FROM papers WHERE user_id = ${userId})
    `);
    for (let i = 0; i < connections.length; i += INSERT_CHUNK) {
        const chunk = connections.slice(i, i + INSERT_CHUNK)
            .map(c => [c.fromPaperId, c.toPaperId, c.connectionType]);
        await db.run(sql`
            INSERT INTO paper_connections (id, from_paper_id, to_paper_id, connection_type, source, confidence)
            SELECT lower(hex(randomblob(16))), json_extract(value, '$[0]'), json_extract(value, '$[1]'),
                   json_extract(value, '$[2]'), 'auto', 1.0
            FROM json_each(${JSON.stringify(chunk)})
        `);
    }

    const now = new Date().toISOString();
    const [existing] = await db.all(sql`
        SELECT id FROM network_graphs WHERE user_id = ${userId} AND is_auto = 1 LIMIT 1
    `);
    const graphId = existing?.id || crypto.randomUUID();
    if (existing) {
        await db.run(sql`
            UPDATE network_graphs
            SET node_count = ${papers.length}, edge_count = ${connections.length}, updated_at = ${now}
            WHERE id = ${graphId}
        `);
    } else {
        await db.run(sql`
            INSERT INTO network_graphs (id, user_id, name, is_auto, node_count, edge_count, created_at, updated_at)
            VALUES (${graphId}, ${userId}, 'Auto-Generated Network', 1, ${papers.length}, ${connections.length}, ${now}, ${now})
        `);
    }

    return {
        graph: {
            id: graphId,
            name: 'Auto-Generated Network',
            isAuto: true,
            nodeCount: papers.length,
            edgeCount: connections.length,
            updatedAt: now,
        },
        stats: {
            nodeCount: papers.length,
            edgeCount: connections.length,
            pendingLookups: missing.length - toFetch.length,
        },
    };
}
