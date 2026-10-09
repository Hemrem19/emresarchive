import { Hono } from 'hono';
import { drizzle } from 'drizzle-orm/d1';
import { sql } from 'drizzle-orm';
import * as schema from '../../drizzle/schema.js';
import { authenticate } from '../middleware/auth.js';
import { generateNetwork } from '../services/citation.js';

const network = new Hono();
network.use('*', authenticate);

const getDb = (c) => drizzle(c.env.citavers_db, { schema });

const parseJson = (value, fallback) => {
    if (typeof value !== 'string') return value ?? fallback;
    try { return JSON.parse(value); } catch { return fallback; }
};

/**
 * Generate (or regenerate) the auto network
 * POST /api/networks/auto-generate
 */
network.post('/auto-generate', async (c) => {
    try {
        const result = await generateNetwork(getDb(c), c.get('user').id);
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
    const rows = await getDb(c).all(sql`
        SELECT id, name, description, is_auto AS isAuto, node_count AS nodeCount,
               edge_count AS edgeCount, created_at AS createdAt, updated_at AS updatedAt
        FROM network_graphs
        WHERE user_id = ${c.get('user').id}
        ORDER BY updated_at DESC
    `);
    return c.json({ success: true, data: rows.map(r => ({ ...r, isAuto: !!r.isAuto })) });
});

/**
 * Network nodes and edges
 * GET /api/networks/:id
 */
network.get('/:id', async (c) => {
    const db = getDb(c);
    const userId = c.get('user').id;

    const [graph] = await db.all(sql`
        SELECT id, name, description, is_auto AS isAuto, node_count AS nodeCount,
               edge_count AS edgeCount, created_at AS createdAt, updated_at AS updatedAt
        FROM network_graphs
        WHERE id = ${c.req.param('id')} AND user_id = ${userId}
    `);
    if (!graph) {
        return c.json({ success: false, error: { message: 'Network not found' } }, 404);
    }

    const papers = await db.all(sql`
        SELECT id, title, doi, status, year, authors, tags
        FROM papers
        WHERE user_id = ${userId} AND deleted_at IS NULL
    `);
    // Only edges between live papers of this user
    const edges = await db.all(sql`
        SELECT pc.id, pc.from_paper_id AS fromPaperId, pc.to_paper_id AS toPaperId,
               pc.connection_type AS connectionType
        FROM paper_connections pc
        JOIN papers f ON f.id = pc.from_paper_id AND f.user_id = ${userId} AND f.deleted_at IS NULL
        JOIN papers t ON t.id = pc.to_paper_id AND t.user_id = ${userId} AND t.deleted_at IS NULL
    `);

    return c.json({
        success: true,
        data: {
            graph: { ...graph, isAuto: !!graph.isAuto },
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
