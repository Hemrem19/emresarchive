import { Hono } from 'hono';
import { drizzle } from 'drizzle-orm/d1';
import { and, desc, eq, ne, or, sql } from 'drizzle-orm';
import { alias } from 'drizzle-orm/sqlite-core';
import * as schema from '../../drizzle/schema.js';
import { authenticate } from '../middleware/auth.js';
import { READ, WRITE, accessible, allowsIn, findAccessible, inLibrary, libraryOf, personalLibrary } from '../lib/access.js';
import { generateNetwork, sharedAuthors } from '../services/citation.js';

const network = new Hono();
network.use('*', authenticate);

const getDb = (c) => drizzle(c.env.citavers_db, { schema });

const parseJson = (value, fallback) => {
    if (typeof value !== 'string') return value ?? fallback;
    try { return JSON.parse(value); } catch { return fallback; }
};

const G = schema.networkGraphs;
const GRAPH_COLUMNS = {
    id: G.id, name: G.name, description: G.description, isAuto: G.isAuto,
    nodeCount: G.nodeCount, edgeCount: G.edgeCount, createdAt: G.createdAt, updatedAt: G.updatedAt,
};

/**
 * Generate (or regenerate) the auto network
 * POST /api/networks/auto-generate
 */
network.post('/auto-generate', async (c) => {
    const user = c.get('user');
    // The personal library for now; groups will name the library to map
    const library = personalLibrary(user);
    if (!allowsIn(user, WRITE, library)) {
        return c.json({ success: false, error: { message: 'Not allowed' } }, 403);
    }
    try {
        const result = await generateNetwork(getDb(c), library);
        return c.json({ success: true, data: result });
    } catch (err) {
        console.error('[Network generate]', err);
        return c.json({ success: false, error: { message: 'Failed to generate network' } }, 500);
    }
});

/**
 * List networks
 * GET /api/networks
 */
network.get('/', async (c) => {
    const rows = await getDb(c).select(GRAPH_COLUMNS).from(G)
        .where(accessible(G, c.get('user'), READ))
        .orderBy(desc(G.updatedAt));
    return c.json({ success: true, data: rows });
});

/**
 * Why a paper is connected to others: one entry per connected paper, with
 * its reasons ({ type: 'cites' | 'cited_by' } or { type: 'same_author', names }),
 * citations first.
 * GET /api/networks/papers/:paperId/connections
 */
network.get('/papers/:paperId/connections', async (c) => {
    const db = getDb(c);
    const user = c.get('user');
    const P = schema.papers;
    const PC = schema.paperConnections;
    const id = Number(c.req.param('paperId'));
    const paper = Number.isInteger(id) && id > 0 && await findAccessible(db.query.papers, P, user, id, READ,
        { id: true, userId: true, groupId: true, authors: true, deletedAt: true });
    if (!paper || paper.deletedAt) {
        return c.json({ success: false, error: { message: 'Paper not found' } }, 404);
    }

    const library = libraryOf(paper);
    const other = alias(P, 'other');
    const otherId = sql`CASE WHEN ${PC.fromPaperId} = ${id} THEN ${PC.toPaperId} ELSE ${PC.fromPaperId} END`;
    const rows = await db.select({
        fromPaperId: PC.fromPaperId, type: PC.connectionType,
        id: other.id, title: other.title, year: other.year, authors: other.authors,
    })
        .from(PC)
        .innerJoin(other, and(eq(other.id, otherId), accessible(other, user, READ), inLibrary(other, library)))
        .where(and(or(eq(PC.fromPaperId, id), eq(PC.toPaperId, id)), ne(PC.connectionType, 'common_tag')));

    const byPaper = new Map();
    for (const row of rows) {
        if (row.id === id) continue;
        let reason = null;
        if (row.type === 'cites') reason = { type: row.fromPaperId === id ? 'cites' : 'cited_by' };
        else if (row.type === 'common_author') {
            const names = sharedAuthors(paper.authors, row.authors);
            if (names.length) reason = { type: 'same_author', names };
        }
        if (!reason) continue;
        const entry = byPaper.get(row.id) ?? { paper: { id: row.id, title: row.title, year: row.year ?? null }, reasons: [] };
        if (!entry.reasons.some((r) => r.type === reason.type)) entry.reasons.push(reason);
        byPaper.set(row.id, entry);
    }
    const cited = (e) => e.reasons.some((r) => r.type !== 'same_author');
    const connections = [...byPaper.values()].sort((a, b) =>
        Number(cited(b)) - Number(cited(a)) || String(a.paper.title).localeCompare(String(b.paper.title)));
    return c.json({ success: true, data: { connections } });
});

/**
 * Network nodes and edges
 * GET /api/networks/:id
 */
network.get('/:id', async (c) => {
    const db = getDb(c);
    const user = c.get('user');

    const graph = await findAccessible(db.query.networkGraphs, G, user, c.req.param('id'), READ);
    if (!graph) {
        return c.json({ success: false, error: { message: 'Network not found' } }, 404);
    }
    const library = libraryOf(graph);
    const P = schema.papers;
    // A graph shows the papers of its own library that the caller can see
    const visiblePaper = (table) => and(accessible(table, user, READ), inLibrary(table, library));

    const papers = await db.select({
        id: P.id, title: P.title, doi: P.doi, status: P.status, year: P.year, authors: P.authors, tags: P.tags,
    }).from(P).where(visiblePaper(P));

    // Only edges whose both ends are visible papers of this library. Shared-tag
    // links are no longer made; ones from older runs stay hidden until regenerated.
    const PC = schema.paperConnections;
    const from = alias(P, 'from_paper');
    const to = alias(P, 'to_paper');
    const edges = await db.select({ id: PC.id, fromPaperId: PC.fromPaperId, toPaperId: PC.toPaperId, connectionType: PC.connectionType })
        .from(PC)
        .innerJoin(from, and(eq(from.id, PC.fromPaperId), visiblePaper(from)))
        .innerJoin(to, and(eq(to.id, PC.toPaperId), visiblePaper(to)))
        .where(ne(PC.connectionType, 'common_tag'));

    const { userId, layout, ...graphFields } = graph;
    return c.json({
        success: true,
        data: {
            graph: graphFields,
            nodes: papers.map(p => ({
                id: String(p.id),
                label: p.title,
                data: { ...p, authors: parseJson(p.authors, []), tags: parseJson(p.tags, []) },
            })),
            edges: edges.map(e => ({
                id: e.id,
                source: String(e.fromPaperId),
                target: String(e.toPaperId),
                type: e.connectionType,
            })),
        },
    });
});

export default network;
