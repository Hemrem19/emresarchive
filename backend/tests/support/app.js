/**
 * Runs the real Worker app (src/worker.js) against an in-memory D1 and R2.
 */
import worker from '../../src/worker.js';
import { generateAccessToken } from '../../src/lib/jwt.js';
import { createD1, createR2 } from './d1.js';

export function createTestApp() {
    const db = createD1();
    const bucket = createR2();
    const env = {
        citavers_db: db,
        PDF_BUCKET: bucket,
        JWT_ACCESS_SECRET: 'test-access-secret',
        JWT_REFRESH_SECRET: 'test-refresh-secret',
        ENVIRONMENT: 'test',
    };

    const insert = (table, row) => {
        const cols = Object.keys(row);
        const values = cols.map((c) => (row[c] !== null && typeof row[c] === 'object' ? JSON.stringify(row[c]) : row[c]));
        const info = db.sqlite
            .prepare(`INSERT INTO ${table} (${cols.join(', ')}) VALUES (${cols.map(() => '?').join(', ')})`)
            .run(...values);
        return Number(info.lastInsertRowid);
    };

    return {
        env,
        db,
        bucket,
        insert,
        row: (sql, ...params) => db.sqlite.prepare(sql).get(...params),
        rows: (sql, ...params) => db.sqlite.prepare(sql).all(...params),

        addUser(id, email = `user${id}@test.dev`) {
            insert('users', { id, email, password_hash: 'x', email_verified: 1 });
            return { id, email, token: generateAccessToken(id, email, env) };
        },

        addPaper(user, fields = {}) {
            return insert('papers', { user_id: user.id, title: `Paper of ${user.id}`, ...fields });
        },

        /** A group owned by `owner`; `members` is a list of [user, role]. */
        addGroup(owner, members = [], name = `Group of ${owner.id}`) {
            const id = insert('groups', { name, owner_id: owner.id });
            insert('group_members', { group_id: id, user_id: owner.id, role: 'owner' });
            for (const [user, role] of members) insert('group_members', { group_id: id, user_id: user.id, role });
            return id;
        },

        addFolder(user, fields = {}) {
            return insert('folders', { user_id: user.id, name: `Folder of ${user.id}`, ...fields });
        },

        request(path, { user, token, method = 'GET', body, headers = {}, library } = {}) {
            const h = new Headers(headers);
            if (library) h.set('X-Library', library);
            const bearer = token ?? user?.token;
            if (bearer) h.set('Authorization', `Bearer ${bearer}`);
            let payload = body;
            if (body !== undefined && !(body instanceof FormData)) {
                h.set('Content-Type', 'application/json');
                payload = JSON.stringify(body);
            }
            const req = new Request(`https://api.test${path}`, { method, headers: h, body: payload });
            return worker.fetch(req, env, { waitUntil() {}, passThroughOnException() {} });
        },
    };
}
