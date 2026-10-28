/**
 * The Worker side of the app–Worker contract (../../contract/api.js):
 * every route is listed with who may call it, every listed call has a route,
 * routes without public access refuse anonymous callers, scanner probes find
 * nothing, and CLAUDE.md names every route module.
 */
import { describe, it, expect, beforeAll } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { app } from '../src/worker.js';
import { createTestApp } from './support/app.js';
import { ENDPOINTS, SERVER_ONLY, KNOWN_DRIFT } from '../../contract/api.js';

const ROOT = path.join(__dirname, '../..');
const ACCESS = ['public', 'user', 'file-token', 'socket'];
const key = (e) => `${e.method} ${e.path}`;

const routes = [...new Set(app.routes
    .filter((r) => r.method !== 'ALL' && !r.path.endsWith('*'))
    .map(key))];
const listed = new Map([...ENDPOINTS, ...SERVER_ONLY, ...KNOWN_DRIFT.filter((d) => d.access)].map((e) => [key(e), e]));

beforeAll(() => {
    if (KNOWN_DRIFT.length) {
        console.warn(`[contract] ${KNOWN_DRIFT.length} known mismatch(es), see KNOWN_DRIFT in contract/api.js:\n${
            KNOWN_DRIFT.map((d) => `  ${key(d)}: ${d.problem}`).join('\n')}`);
    }
});

describe('contract: routes', () => {
    it('every call the app makes has a Worker route', () => {
        const missing = ENDPOINTS.map(key).filter((k) => !routes.includes(k));
        expect(missing, 'the app calls these but the Worker has no such route').toEqual([]);
    });

    it('every Worker route is in the contract', () => {
        const unlisted = routes.filter((k) => !listed.has(k));
        expect(unlisted, 'new or orphaned route: add it to contract/api.js (ENDPOINTS or SERVER_ONLY)').toEqual([]);
    });

    it('every route says who may call it', () => {
        const bad = [...listed.values()].filter((e) => !ACCESS.includes(e.access)).map(key);
        expect(bad, `access must be one of ${ACCESS.join(', ')}`).toEqual([]);
    });

    it('known drift is still drift (remove fixed items)', () => {
        const fixed = KNOWN_DRIFT.filter((d) => (d.access ? !routes.includes(key(d)) : routes.includes(key(d)))).map(key);
        expect(fixed, 'these are no longer mismatched: take them out of KNOWN_DRIFT').toEqual([]);
    });
});

describe('contract: access', () => {
    let t;
    beforeAll(() => { t = createTestApp(); });

    // Fill path parameters so the request reaches the route's own checks
    const concrete = (p) => p.replace(/:\w+\{([^}|]+)[^}]*\}/g, '$1').replace(/:\w+/g, '1');

    const guarded = [...listed.values()].filter((e) => e.access !== 'public');
    it.each(guarded.map((e) => [key(e), e]))('%s refuses anonymous callers', async (_, e) => {
        const res = await t.request(concrete(e.path), { method: e.method, ...(e.method === 'GET' || e.method === 'DELETE' ? {} : { body: {} }) });
        expect(res.status, `${key(e)} answered ${res.status} without credentials`).toBeGreaterThanOrEqual(400);
        expect(res.status).toBeLessThan(500);
        expect([401, 403, 404, 426]).toContain(res.status);
    });
});

describe('contract: scanner probes', () => {
    const PROBES = ['/.env', '/.env.local', '/.env.production', '/.git/config', '/.git/HEAD', '/.dev.vars',
        '/backend/.dev.vars', '/config.json', '/wp-login.php', '/phpinfo.php', '/server.js', '/wrangler.toml', '/api/.env'];

    it.each(PROBES)('%s finds nothing', async (probe) => {
        const t = createTestApp();
        const res = await t.request(probe);
        const text = await res.text();
        expect(res.status).toBe(404);
        expect(text).not.toMatch(/at \w+ \(|node_modules|src\/|SECRET|PASSWORD|BEGIN [A-Z ]*KEY/i);
        expect(text.length).toBeLessThan(300);
    });
});

describe('contract: the file itself', () => {
    it('holds no secrets', () => {
        const text = fs.readFileSync(path.join(ROOT, 'contract/api.js'), 'utf8');
        const patterns = [
            /eyJ[\w-]{10,}\.[\w-]{10,}\.[\w-]{10,}/, // JWT
            /\b(sk|re|pk|rk)_[A-Za-z0-9]{16,}/, // API keys
            /AKIA[0-9A-Z]{16}/, // AWS-style access keys
            /password\s*[=:]\s*['"](?!long-enough-1)[^'"]+/i,
            /[\w.+-]+@(?!example\.test\b)[\w-]+\.[\w.]+/, // real email addresses
        ];
        expect(patterns.filter((p) => p.test(text)).map(String)).toEqual([]);
    });
});

describe('contract: route modules in CLAUDE.md', () => {
    it('lists exactly the route files the Worker mounts', () => {
        const claude = fs.readFileSync(path.join(ROOT, 'CLAUDE.md'), 'utf8');
        const match = /Route handlers \(([^)]+)\)/.exec(claude);
        expect(match, 'CLAUDE.md needs its "Route handlers (…)" list').toBeTruthy();
        const documented = match[1].split(',').map((s) => s.trim()).sort();

        const files = fs.readdirSync(path.join(ROOT, 'backend/src/routes')).filter((f) => f.endsWith('.js')).map((f) => f.replace(/\.js$/, ''));
        const worker = fs.readFileSync(path.join(ROOT, 'backend/src/worker.js'), 'utf8');
        const mounted = files.filter((f) => worker.includes(`from './routes/${f}.js'`));
        expect(mounted.sort(), 'every route file is mounted in worker.js').toEqual(files.sort());
        expect(documented, 'update the "Route handlers (…)" list in CLAUDE.md').toEqual(files.sort());
    });
});
