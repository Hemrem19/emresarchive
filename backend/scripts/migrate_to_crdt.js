/**
 * NeonDB (PostgreSQL/Prisma) → Cloudflare D1 (SQLite/Drizzle) Migration
 *
 * Reads all user data from the old NeonDB and outputs INSERT SQL for D1.
 *
 * Usage:
 *   export DATABASE_URL="postgresql://user:pass@host/db?sslmode=require"
 *   node scripts/migrate_to_crdt.js > migration.sql
 *   npx wrangler d1 execute citavers_db --file=migration.sql --local    # test first
 *   npx wrangler d1 execute citavers_db --file=migration.sql --remote   # then production
 *
 * What is migrated: users, papers, collections, annotations, paper_connections
 * What is NOT migrated: sessions (invalid after secret rotation), sync_logs,
 *   citation_cache, network_graphs
 */

import pg from 'pg';

const { Client } = pg;

// ---------------------------------------------------------------------------
// SQL helpers
// ---------------------------------------------------------------------------

function sqlStr(val) {
    if (val === null || val === undefined) return 'NULL';
    return `'${String(val).replace(/'/g, "''")}'`;
}

function sqlJson(val) {
    if (val === null || val === undefined) return 'NULL';
    return sqlStr(JSON.stringify(val));
}

function sqlBool(val) {
    return val ? '1' : '0';
}

function sqlInt(val) {
    if (val === null || val === undefined) return 'NULL';
    return String(Number(val));
}

function sqlDate(val) {
    if (!val) return 'NULL';
    return sqlStr(new Date(val).toISOString());
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
        console.error('ERROR: DATABASE_URL environment variable is not set.');
        console.error('Set it to your NeonDB connection string and re-run.');
        process.exit(1);
    }

    const client = new Client({ connectionString });
    await client.connect();
    console.error('[migrate] Connected to NeonDB.');

    const lines = [];
    lines.push('-- citavErs NeonDB → D1 Migration');
    lines.push(`-- Generated: ${new Date().toISOString()}`);
    lines.push('-- Run with: wrangler d1 execute citavers_db --file=migration.sql --remote');
    lines.push('');
    lines.push('PRAGMA foreign_keys = OFF;');
    lines.push('');

    // -----------------------------------------------------------------------
    // Users
    // -----------------------------------------------------------------------
    const usersRes = await client.query('SELECT * FROM users ORDER BY id');
    lines.push(`-- Users (${usersRes.rows.length} rows)`);
    for (const u of usersRes.rows) {
        lines.push(
            `INSERT OR IGNORE INTO users ` +
            `(id, email, password_hash, name, created_at, updated_at, email_verified, ` +
            `verification_token, verification_token_expiry, last_login_at, last_synced_at, ` +
            `storage_used_bytes, storage_limit_bytes, settings) VALUES (` +
            `${sqlInt(u.id)}, ` +
            `${sqlStr(u.email)}, ` +
            `${sqlStr(u.password_hash)}, ` +
            `${sqlStr(u.name)}, ` +
            `${sqlDate(u.created_at)}, ` +
            `${sqlDate(u.updated_at)}, ` +
            `${sqlBool(u.email_verified)}, ` +
            `${sqlStr(u.verification_token)}, ` +
            `${sqlDate(u.verification_token_expiry)}, ` +
            `${sqlDate(u.last_login_at)}, ` +
            `${sqlDate(u.last_synced_at)}, ` +
            `${sqlInt(u.storage_used_bytes || 0)}, ` +
            `${sqlInt(u.storage_limit_bytes || 2147483648)}, ` +
            `${sqlJson(u.settings || {})});`
        );
    }
    lines.push('');
    console.error(`[migrate] Users: ${usersRes.rows.length}`);

    // -----------------------------------------------------------------------
    // Papers
    // -----------------------------------------------------------------------
    const papersRes = await client.query('SELECT * FROM papers ORDER BY id');
    lines.push(`-- Papers (${papersRes.rows.length} rows)`);
    for (const p of papersRes.rows) {
        lines.push(
            `INSERT OR IGNORE INTO papers ` +
            `(id, user_id, title, authors, year, journal, doi, url, abstract, tags, status, ` +
            `related_paper_ids, notes, summary, rating, pdf_url, pdf_size_bytes, reading_progress, ` +
            `created_at, updated_at, client_id, version, deleted_at) VALUES (` +
            `${sqlInt(p.id)}, ` +
            `${sqlInt(p.user_id)}, ` +
            `${sqlStr(p.title)}, ` +
            `${sqlJson(p.authors || [])}, ` +
            `${sqlInt(p.year)}, ` +
            `${sqlStr(p.journal)}, ` +
            `${sqlStr(p.doi)}, ` +
            `${sqlStr(p.url)}, ` +
            `${sqlStr(p.abstract)}, ` +
            `${sqlJson(p.tags || [])}, ` +
            `${sqlStr(p.status || 'To Read')}, ` +
            `${sqlJson(p.related_paper_ids || [])}, ` +
            `${sqlStr(p.notes)}, ` +
            `${sqlStr(p.summary)}, ` +
            `${sqlInt(p.rating)}, ` +
            `${sqlStr(p.pdf_url)}, ` +
            `${sqlInt(p.pdf_size_bytes)}, ` +
            `${sqlJson(p.reading_progress)}, ` +
            `${sqlDate(p.created_at)}, ` +
            `${sqlDate(p.updated_at)}, ` +
            `${sqlStr(p.client_id)}, ` +
            `${sqlInt(p.version || 1)}, ` +
            `${sqlDate(p.deleted_at)});`
        );
    }
    lines.push('');
    console.error(`[migrate] Papers: ${papersRes.rows.length}`);

    // -----------------------------------------------------------------------
    // Collections
    // -----------------------------------------------------------------------
    const collectionsRes = await client.query('SELECT * FROM collections ORDER BY id');
    lines.push(`-- Collections (${collectionsRes.rows.length} rows)`);
    for (const col of collectionsRes.rows) {
        lines.push(
            `INSERT OR IGNORE INTO collections ` +
            `(id, user_id, name, icon, color, filters, created_at, updated_at, deleted_at, version) VALUES (` +
            `${sqlInt(col.id)}, ` +
            `${sqlInt(col.user_id)}, ` +
            `${sqlStr(col.name)}, ` +
            `${sqlStr(col.icon || 'folder')}, ` +
            `${sqlStr(col.color || 'text-primary')}, ` +
            `${sqlJson(col.filters || {})}, ` +
            `${sqlDate(col.created_at)}, ` +
            `${sqlDate(col.updated_at)}, ` +
            `${sqlDate(col.deleted_at)}, ` +
            `${sqlInt(col.version || 1)});`
        );
    }
    lines.push('');
    console.error(`[migrate] Collections: ${collectionsRes.rows.length}`);

    // -----------------------------------------------------------------------
    // Annotations
    // -----------------------------------------------------------------------
    const annotationsRes = await client.query('SELECT * FROM annotations ORDER BY id');
    lines.push(`-- Annotations (${annotationsRes.rows.length} rows)`);
    for (const a of annotationsRes.rows) {
        lines.push(
            `INSERT OR IGNORE INTO annotations ` +
            `(id, paper_id, user_id, type, page_number, position, content, color, ` +
            `created_at, updated_at, deleted_at, version) VALUES (` +
            `${sqlInt(a.id)}, ` +
            `${sqlInt(a.paper_id)}, ` +
            `${sqlInt(a.user_id)}, ` +
            `${sqlStr(a.type)}, ` +
            `${sqlInt(a.page_number)}, ` +
            `${sqlJson(a.position)}, ` +
            `${sqlStr(a.content)}, ` +
            `${sqlStr(a.color)}, ` +
            `${sqlDate(a.created_at)}, ` +
            `${sqlDate(a.updated_at)}, ` +
            `${sqlDate(a.deleted_at)}, ` +
            `${sqlInt(a.version || 1)});`
        );
    }
    lines.push('');
    console.error(`[migrate] Annotations: ${annotationsRes.rows.length}`);

    // -----------------------------------------------------------------------
    // Paper Connections (citation graph)
    // -----------------------------------------------------------------------
    let paperConnectionsCount = 0;
    try {
        const pcRes = await client.query('SELECT * FROM paper_connections ORDER BY created_at');
        lines.push(`-- Paper Connections (${pcRes.rows.length} rows)`);
        for (const pc of pcRes.rows) {
            lines.push(
                `INSERT OR IGNORE INTO paper_connections ` +
                `(id, from_paper_id, to_paper_id, connection_type, source, confidence, created_at) VALUES (` +
                `${sqlStr(pc.id)}, ` +
                `${sqlInt(pc.from_paper_id)}, ` +
                `${sqlInt(pc.to_paper_id)}, ` +
                `${sqlStr(pc.connection_type)}, ` +
                `${sqlStr(pc.source)}, ` +
                `${pc.confidence !== null && pc.confidence !== undefined ? pc.confidence : 1.0}, ` +
                `${sqlDate(pc.created_at)});`
            );
        }
        lines.push('');
        paperConnectionsCount = pcRes.rows.length;
    } catch (e) {
        lines.push('-- Paper connections table not found or empty, skipping.');
        lines.push('');
    }
    console.error(`[migrate] Paper connections: ${paperConnectionsCount}`);

    // -----------------------------------------------------------------------
    // Done
    // -----------------------------------------------------------------------
    lines.push('PRAGMA foreign_keys = ON;');
    lines.push('');
    lines.push(`-- Migration complete: ${usersRes.rows.length} users, ${papersRes.rows.length} papers, ` +
        `${collectionsRes.rows.length} collections, ${annotationsRes.rows.length} annotations, ` +
        `${paperConnectionsCount} paper connections`);

    console.log(lines.join('\n'));

    await client.end();
    console.error('[migrate] Done. Pipe this output into a .sql file and apply with wrangler.');
}

main().catch(err => {
    console.error('[migrate] Fatal error:', err.message);
    process.exit(1);
});
