/**
 * Citation network generation on D1.
 *
 * Papers are looked up by DOI in batches: OpenAlex first (100 DOIs per list
 * call, $0.0001 each; OPENALEX_API_KEY gives the Worker its own daily budget
 * instead of one shared with every Worker on the same IP), then Semantic
 * Scholar for the DOIs OpenAlex does not know (one POST of up to 500 ids;
 * S2_API_KEY optional). Results are cached in D1, misses too, so every run
 * only asks about papers it has not seen. A rate limit leaves the rest for
 * the next run (`pendingLookups`).
 *
 * Workers cap subrequests per invocation, so bulk reads/writes go through a
 * single json_each() query each and lookups are batched.
 */
import { and, eq, inArray, isNull, sql } from 'drizzle-orm';
import * as schema from '../../drizzle/schema.js';
import { inLibrary, libraryFields } from '../lib/access.js';

const CACHE_TTL = 90 * 24 * 60 * 60 * 1000;
// Neither source knew the DOI: ask again after this
const MISS_TTL = 14 * 24 * 60 * 60 * 1000;
// Entries written by the one-DOI-at-a-time lookup may be Semantic Scholar
// results only because OpenAlex was rate-limited; those are asked again once
const CACHE_VERSION = 2;
const OPENALEX_BATCH = 100;
// Keeps a run well inside the free plan's 50 subrequests (≈3,000 papers)
export const MAX_OPENALEX_BATCHES = 30;
const S2_BATCH = 500;
// An author shared by more papers than this adds noise, not structure
const MAX_GROUP_SIZE = 50;
const INSERT_CHUNK = 2000;
// Suggested papers: cited by at least this many library papers, at most this many
const SUGGEST_MIN_CITED_BY = 2;
export const MAX_SUGGESTIONS = 15;

const USER_AGENT = 'citavErs/2.2 (https://citavers.com)';
const OPENALEX = 'https://api.openalex.org';
const S2 = 'https://api.semanticscholar.org/graph/v1';

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

/** Authors two papers share, as the first paper spells them (matched as the network matches them). */
export function sharedAuthors(authorsA, authorsB) {
    const name = (v) => String((typeof v === 'object' ? v?.name : v) ?? '').trim();
    const others = new Set(asArray(authorsB).map((v) => normalizeKey(name(v))));
    const seen = new Set();
    return asArray(authorsA).map(name).filter((n) => {
        const key = normalizeKey(n);
        if (!key || !others.has(key) || seen.has(key)) return false;
        seen.add(key);
        return true;
    });
}

class RateLimited extends Error {}

const chunk = (items, size) => Array.from({ length: Math.ceil(items.length / size) }, (_, i) => items.slice(i * size, (i + 1) * size));

async function openAlexList(filter, select, env) {
    const params = new URLSearchParams({ filter, select, per_page: String(OPENALEX_BATCH) });
    if (env?.OPENALEX_API_KEY) params.set('api_key', env.OPENALEX_API_KEY);
    const res = await fetch(`${OPENALEX}/works?${params}`, { headers: { 'User-Agent': USER_AGENT } });
    if (res.status === 429) throw new RateLimited('OpenAlex rate limit');
    if (!res.ok) throw new Error(`OpenAlex API error: ${res.status}`);
    return (await res.json()).results || [];
}

// A "," ends an OpenAlex filter and "|" separates its values
const batchable = (doi) => !/[,|]/.test(doi);

/**
 * OpenAlex works for these DOIs, in batches.
 * @returns {{ found: Map<string, Object>, asked: Set<string> }} `asked`: the
 *   DOIs OpenAlex answered for (found or not); the rest were not asked
 */
export async function fetchOpenAlexBatch(dois, env, { maxBatches = MAX_OPENALEX_BATCHES } = {}) {
    const found = new Map();
    const asked = new Set();
    for (const batch of chunk(dois.filter(batchable), OPENALEX_BATCH).slice(0, maxBatches)) {
        let works;
        try {
            works = await openAlexList(`doi:${batch.join('|')}`, 'id,doi,title,publication_year,cited_by_count,referenced_works', env);
        } catch (e) {
            console.error('[citations] OpenAlex:', e.message);
            break; // rate-limited or down: the rest waits for the next run
        }
        for (const work of works) {
            const doi = normalizeDoi(work.doi);
            if (!doi || found.has(doi)) continue;
            found.set(doi, {
                doi,
                title: work.title,
                year: work.publication_year ?? null,
                openAlexId: work.id || null,
                citationCount: work.cited_by_count || 0,
                references: work.referenced_works || [], // OpenAlex work IDs
                source: 'openalex',
                v: CACHE_VERSION,
            });
        }
        batch.forEach((doi) => asked.add(doi));
    }
    return { found, asked };
}

// arXiv's DataCite DOIs (10.48550/arxiv.<id>), which Semantic Scholar knows by arXiv id
const ARXIV_DOI = /^10\.48550\/arxiv\.(.+)$/;
const s2Id = (doi) => {
    const arxiv = ARXIV_DOI.exec(doi);
    return arxiv ? `ARXIV:${arxiv[1]}` : `DOI:${doi}`;
};
const s2RefDoi = (ids = {}) => normalizeDoi(ids.DOI) || (ids.ArXiv ? `10.48550/arxiv.${String(ids.ArXiv).toLowerCase()}` : null);

/**
 * Semantic Scholar papers for these DOIs, in one request per 500.
 * @returns {{ found: Map<string, Object>, asked: Set<string> }}
 */
export async function fetchSemanticScholarBatch(dois, env) {
    const found = new Map();
    const asked = new Set();
    for (const batch of chunk(dois, S2_BATCH)) {
        const headers = { 'User-Agent': USER_AGENT, 'Content-Type': 'application/json' };
        if (env?.S2_API_KEY) headers['x-api-key'] = env.S2_API_KEY;
        let papers;
        try {
            const res = await fetch(`${S2}/paper/batch?fields=title,year,citationCount,references.externalIds`, {
                method: 'POST', headers, body: JSON.stringify({ ids: batch.map(s2Id) }),
            });
            if (!res.ok) throw new Error(`Semantic Scholar API error: ${res.status}`);
            papers = await res.json();
        } catch (e) {
            console.error('[citations] Semantic Scholar:', e.message);
            break;
        }
        batch.forEach((doi, i) => {
            asked.add(doi);
            const paper = Array.isArray(papers) ? papers[i] : null;
            if (!paper) return;
            found.set(doi, {
                doi,
                title: paper.title,
                year: paper.year ?? null,
                citationCount: paper.citationCount || 0,
                references: (paper.references || []).map((ref) => s2RefDoi(ref.externalIds)).filter(Boolean), // DOIs
                source: 'semantic_scholar',
                v: CACHE_VERSION,
            });
        });
    }
    return { found, asked };
}

/**
 * Looks up DOIs: OpenAlex, then Semantic Scholar for the rest.
 * @returns {{ found: Map<string, Object>, misses: string[], pending: string[] }}
 *   misses: neither source knows them; pending: not asked (rate limit or budget)
 */
export async function lookupCitations(dois, env, options) {
    const openAlex = await fetchOpenAlexBatch(dois, env, options);
    const notInOpenAlex = dois.filter((doi) => !openAlex.found.has(doi) && (openAlex.asked.has(doi) || !batchable(doi)));
    const s2 = await fetchSemanticScholarBatch(notInOpenAlex, env);
    const found = new Map([...openAlex.found, ...s2.found]);
    return {
        found,
        misses: notInOpenAlex.filter((doi) => s2.asked.has(doi) && !s2.found.has(doi)),
        pending: dois.filter((doi) => !found.has(doi) && !s2.asked.has(doi)),
    };
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
        try {
            const data = JSON.parse(row.rawData);
            if (data.source !== 'openalex' && data.v !== CACHE_VERSION) continue; // see CACHE_VERSION
            cache.set(row.doi, data);
        } catch { /* treat as uncached */ }
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
        expires: new Date(now.getTime() + (data.source === 'none' ? MISS_TTL : CACHE_TTL)).toISOString(),
    }));
    await db.run(sql`
        INSERT INTO citation_cache (id, doi, api_source, citation_count, reference_count, raw_data, last_fetched, expires_at)
        SELECT lower(hex(randomblob(16))), json_extract(value, '$.doi'), json_extract(value, '$.source'),
               json_extract(value, '$.citations'), json_extract(value, '$.refs'), json_extract(value, '$.raw'),
               ${now.toISOString()}, json_extract(value, '$.expires')
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

    // 1. Shared authors via inverted index (avoids O(N^2) pair scans). Shared
    //    tags are not links: broad tags tied most of a library into one knot.
    const groups = new Map();
    for (const paper of papers) {
        for (const name of new Set(asArray(paper.authors).map(v => normalizeKey(typeof v === 'object' ? v?.name : v)))) {
            if (!name) continue;
            if (!groups.has(name)) groups.set(name, []);
            groups.get(name).push(paper.id);
        }
    }
    for (const ids of groups.values()) {
        if (ids.length < 2 || ids.length > MAX_GROUP_SIZE) continue;
        for (let i = 0; i < ids.length; i++) {
            for (let j = i + 1; j < ids.length; j++) add(ids[i], ids[j], 'common_author');
        }
    }

    // 2. Citations between papers in the library. OpenAlex references are work
    //    IDs, Semantic Scholar ones DOIs; each is matched against every paper
    //    known by that kind of id, whichever source described the paper itself.
    const { byDoi, byOpenAlexId } = libraryIndex(papers, citations);
    for (const paper of papers) {
        const data = citations.get(normalizeDoi(paper.doi));
        if (!data) continue;
        for (const ref of data.references || []) {
            const citedId = data.source === 'openalex' ? byOpenAlexId.get(ref) : byDoi.get(normalizeDoi(ref));
            if (citedId !== undefined) add(paper.id, citedId, 'cites');
        }
    }

    return connections;
}

function libraryIndex(papers, citations) {
    const byDoi = new Map();
    const byOpenAlexId = new Map();
    for (const paper of papers) {
        const doi = normalizeDoi(paper.doi);
        if (!doi) continue;
        byDoi.set(doi, paper.id);
        const openAlexId = citations.get(doi)?.openAlexId;
        if (openAlexId) byOpenAlexId.set(openAlexId, paper.id);
    }
    return { byDoi, byOpenAlexId };
}

/**
 * Works that several library papers cite but the library lacks (OpenAlex
 * references only), most cited-by-the-library first.
 * @returns {Array<{ openAlexId: string, citedBy: number[] }>}
 */
export function missingReferences(papers, citations, { minCitedBy = SUGGEST_MIN_CITED_BY, limit = MAX_SUGGESTIONS } = {}) {
    const { byOpenAlexId } = libraryIndex(papers, citations);
    const citedBy = new Map();
    for (const paper of papers) {
        const data = citations.get(normalizeDoi(paper.doi));
        if (data?.source !== 'openalex') continue;
        for (const ref of new Set(data.references || [])) {
            if (byOpenAlexId.has(ref)) continue;
            if (!citedBy.has(ref)) citedBy.set(ref, []);
            citedBy.get(ref).push(paper.id);
        }
    }
    return [...citedBy]
        .filter(([, ids]) => ids.length >= minCitedBy)
        .sort((a, b) => b[1].length - a[1].length)
        .slice(0, limit)
        .map(([openAlexId, ids]) => ({ openAlexId, citedBy: ids }));
}

/** Titles and DOIs for missing references, in one OpenAlex call. Empty on failure. */
export async function describeSuggestions(missing, env) {
    if (missing.length === 0) return [];
    const shortId = (id) => String(id).split('/').pop();
    let works;
    try {
        works = await openAlexList(`openalex:${missing.map((m) => shortId(m.openAlexId)).join('|')}`,
            'id,doi,title,publication_year,cited_by_count', env);
    } catch (e) {
        console.error('[citations] OpenAlex suggestions:', e.message);
        return [];
    }
    const byId = new Map(works.map((w) => [w.id, w]));
    return missing.flatMap(({ openAlexId, citedBy }) => {
        const work = byId.get(openAlexId);
        if (!work?.title) return [];
        return [{
            openAlexId,
            doi: normalizeDoi(work.doi),
            title: work.title,
            year: work.publication_year ?? null,
            citedByCount: work.cited_by_count || 0,
            citedBy,
        }];
    });
}

/**
 * Regenerate the auto network of a library. The caller must have checked that
 * the user may read it.
 * @param {import('drizzle-orm/d1').DrizzleD1Database} db
 * @param {{ ownerId: number } | { groupId: number }} library
 * @param {Object} user - who regenerates (recorded on a new group network)
 * @param {Object} env - Worker env (OPENALEX_API_KEY, S2_API_KEY)
 */
export async function generateNetwork(db, library, user, env = {}, options = {}) {
    const { papers: P, paperConnections: PC, networkGraphs: G } = schema;
    const papers = await db.select({ id: P.id, doi: P.doi, authors: P.authors, tags: P.tags })
        .from(P)
        .where(and(inLibrary(P, library), isNull(P.deletedAt)));

    const dois = [...new Set(papers.map(p => normalizeDoi(p.doi)).filter(Boolean))];
    const citations = await loadCache(db, dois);

    const missing = dois.filter(doi => !citations.has(doi));
    const { found, misses, pending } = await lookupCitations(missing, env, options);
    const looked = [...found, ...misses.map((doi) => [doi, { doi, source: 'none', references: [], v: CACHE_VERSION }])];
    for (const [doi, data] of looked) citations.set(doi, data);
    await saveCache(db, looked);

    const connections = buildConnections(papers, citations);
    const suggestions = await describeSuggestions(missingReferences(papers, citations), env);

    // Replace previous auto connections of this library's papers
    await db.delete(PC).where(and(
        eq(PC.source, 'auto'),
        inArray(PC.fromPaperId, db.select({ id: P.id }).from(P).where(inLibrary(P, library)))
    ));
    for (let i = 0; i < connections.length; i += INSERT_CHUNK) {
        const rows = connections.slice(i, i + INSERT_CHUNK)
            .map(c => [c.fromPaperId, c.toPaperId, c.connectionType]);
        await db.run(sql`
            INSERT INTO paper_connections (id, from_paper_id, to_paper_id, connection_type, source, confidence)
            SELECT lower(hex(randomblob(16))), json_extract(value, '$[0]'), json_extract(value, '$[1]'),
                   json_extract(value, '$[2]'), 'auto', 1.0
            FROM json_each(${JSON.stringify(rows)})
        `);
    }

    const now = new Date().toISOString();
    const [existing] = await db.select({ id: G.id }).from(G)
        .where(and(inLibrary(G, library), eq(G.isAuto, true)))
        .limit(1);
    const graphId = existing?.id || crypto.randomUUID();
    const fields = { nodeCount: papers.length, edgeCount: connections.length, suggestions, updatedAt: now };
    if (existing) {
        await db.update(G).set(fields).where(eq(G.id, graphId));
    } else {
        await db.insert(G).values({
            id: graphId, ...libraryFields(library, user), name: 'Auto-Generated Network', isAuto: true, createdAt: now, ...fields,
        });
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
            citationEdges: connections.filter((c) => c.connectionType === 'cites').length,
            withoutDoi: papers.length - papers.filter((p) => normalizeDoi(p.doi)).length,
            notFound: dois.filter((doi) => citations.get(doi)?.source === 'none').length,
            pendingLookups: pending.length,
            suggestions: suggestions.length,
        },
    };
}
