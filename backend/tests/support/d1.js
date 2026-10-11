/**
 * In-memory stand-in for a Cloudflare D1 binding, backed by better-sqlite3 and
 * loaded with the production schema (tests/fixtures/schema.sql). Route tests
 * run the real SQL the Worker sends, so access checks are exercised for real.
 */
import Database from 'better-sqlite3';
import fs from 'node:fs';
import path from 'node:path';

const SCHEMA = fs.readFileSync(path.join(__dirname, '../fixtures/schema.sql'), 'utf8');

const toSqlite = (v) => (v === undefined ? null : typeof v === 'boolean' ? Number(v) : v);

// D1 accepts numbered parameters (?1 reused several times); better-sqlite3
// binds positionally, so rewrite them to plain ? with the values repeated.
function expandParams(sql, params) {
    if (!/\?\d/.test(sql)) return { sql, params };
    const expanded = [];
    const text = sql.replace(/\?(\d+)/g, (_, n) => {
        expanded.push(params[Number(n) - 1]);
        return '?';
    });
    return { sql: text, params: expanded };
}

class Statement {
    constructor(db, sql, params = []) {
        this.db = db;
        this.sql = sql;
        this.params = params;
    }

    bind(...params) {
        return new Statement(this.db, this.sql, params);
    }

    prepared() {
        const { sql, params } = expandParams(this.sql, this.params.map(toSqlite));
        return { stmt: this.db.prepare(sql), params };
    }

    execute() {
        const { stmt, params } = this.prepared();
        if (stmt.reader) return { results: stmt.all(...params), success: true, meta: {} };
        const info = stmt.run(...params);
        return { results: [], success: true, meta: { changes: info.changes, last_row_id: Number(info.lastInsertRowid) } };
    }

    async all() { return this.execute(); }

    async run() { return this.execute(); }

    async first(column) {
        const [row] = this.execute().results;
        if (row === undefined) return null;
        return column ? row[column] : row;
    }

    async raw() {
        const { stmt, params } = this.prepared();
        if (!stmt.reader) {
            stmt.run(...params);
            return [];
        }
        return stmt.raw(true).all(...params);
    }
}

export function createD1() {
    const db = new Database(':memory:');
    db.pragma('foreign_keys = ON'); // D1 enforces foreign keys
    db.exec(SCHEMA);
    return {
        prepare: (sql) => new Statement(db, sql),
        // D1 runs a batch as one transaction
        batch: async (statements) => db.transaction(() => statements.map((s) => s.execute()))(),
        exec: async (sql) => db.exec(sql),
        sqlite: db,
    };
}

/** Minimal in-memory R2 bucket (put/get/head/list/delete). */
export function createR2() {
    const objects = new Map();
    return {
        objects,
        async put(key, body) {
            const bytes = body instanceof ArrayBuffer ? new Uint8Array(body) : new TextEncoder().encode(String(body));
            objects.set(key, { bytes, uploaded: new Date() });
        },
        async get(key) {
            const o = objects.get(key);
            if (!o) return null;
            return { body: new Response(o.bytes).body, size: o.bytes.length };
        },
        async head(key) {
            const o = objects.get(key);
            return o ? { key, size: o.bytes.length, uploaded: o.uploaded } : null;
        },
        async list({ prefix = '' } = {}) {
            const list = [...objects.entries()]
                .filter(([k]) => k.startsWith(prefix))
                .map(([key, o]) => ({ key, size: o.bytes.length, uploaded: o.uploaded }));
            return { objects: list, truncated: false };
        },
        async delete(keys) {
            for (const k of [].concat(keys)) objects.delete(k);
        },
    };
}
