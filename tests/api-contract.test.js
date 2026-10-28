/**
 * The app side of the app–Worker contract (contract/api.js): every exported
 * api/*.js function is listed, each listed call really requests that method
 * and path, and raw /api/ URLs elsewhere in the app are listed too.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { API_CONFIG } from '../config.js';
import { ENDPOINTS, NOT_REQUESTS, KNOWN_DRIFT } from '../contract/api.js';

const ROOT = path.join(__dirname, '..');
const API_DIR = path.join(ROOT, 'api');

/** A Hono route path as a regular expression for concrete request paths. */
export function pathPattern(routePath) {
    const source = routePath.split('/').map((segment) => {
        const param = /^:\w+(?:\{(.+)\})?$/.exec(segment);
        if (!param) return segment.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        return param[1] ? `(?:${param[1]})` : '[^/]+';
    }).join('/');
    return new RegExp(`^${source}$`);
}

const clients = [...ENDPOINTS, ...KNOWN_DRIFT].map((e) => e.client).filter(Boolean);
const covered = (id) => clients.includes(id) || NOT_REQUESTS.includes(id) || NOT_REQUESTS.includes(`${id.split('#')[0]}#*`);

describe('contract: api/ functions', () => {
    it('every exported api/*.js function is in the contract', async () => {
        const missing = [];
        for (const file of fs.readdirSync(API_DIR).filter((f) => f.endsWith('.js'))) {
            const mod = await import(`../api/${file}`);
            for (const [name, value] of Object.entries(mod)) {
                if (typeof value === 'function' && !covered(`api/${file}#${name}`)) missing.push(`api/${file}#${name}`);
            }
        }
        expect(missing, 'add these to contract/api.js (ENDPOINTS, or NOT_REQUESTS if they make no request)').toEqual([]);
    });

    it('every contract client still exists', async () => {
        const gone = [];
        for (const id of [...new Set(clients)]) {
            const [file, name] = id.split('#');
            if (!fs.existsSync(path.join(ROOT, file))) gone.push(id);
            else if (name && file.startsWith('api/') && typeof (await import(`../${file}`))[name] !== 'function') gone.push(id);
        }
        expect(gone, 'renamed or removed: update contract/api.js').toEqual([]);
    });
});

describe('contract: requests', () => {
    let requests;
    beforeEach(() => {
        requests = [];
        // The client modules log freely; their output is noise here
        for (const level of ['log', 'warn', 'error']) vi.spyOn(console, level).mockImplementation(() => {});
        global.fetch = vi.fn(async (url, init = {}) => {
            requests.push({ method: String(init.method || 'GET').toUpperCase(), url: String(url) });
            return new Response(JSON.stringify({ success: true, data: {} }), { status: 200, headers: { 'Content-Type': 'application/json' } });
        });
        if (!AbortSignal.timeout) AbortSignal.timeout = () => new AbortController().signal;
        localStorage.setItem(API_CONFIG.ACCESS_TOKEN_KEY, 'test-token');
    });
    afterEach(() => {
        localStorage.clear();
        vi.restoreAllMocks();
    });

    const ownPath = (url) => {
        const parsed = new URL(url, API_CONFIG.BASE_URL);
        return parsed.origin === new URL(API_CONFIG.BASE_URL).origin ? parsed.pathname : null;
    };

    const callable = ENDPOINTS.filter((e) => e.call);
    it.each(callable.map((e) => [`${e.client} → ${e.method} ${e.path}`, e]))('%s', async (_, e) => {
        const [file, name] = e.client.split('#');
        const fn = (await import(`../${file}`))[name];
        let result;
        try {
            result = await Promise.race([fn(...e.call), new Promise((r) => setTimeout(r, 500))]);
        } catch { /* the fake response may not satisfy the function; the request is what counts */ }

        const pattern = pathPattern(e.path);
        if (e.returnsUrl) {
            const url = typeof result === 'string' ? result : result?.url;
            expect(url && ownPath(url), `${e.client} should return a URL for ${e.path}`).toMatch(pattern);
            return;
        }
        const hit = requests.some((r) => r.method === e.method && pattern.test(ownPath(r.url) || ''));
        expect(hit, `${e.client} made ${JSON.stringify(requests.map((r) => `${r.method} ${ownPath(r.url) ?? r.url}`))}, not ${e.method} ${e.path}`).toBe(true);
    });
});

describe('contract: raw /api/ URLs outside api/', () => {
    // App code that is shipped (build.js) and could talk to the Worker directly
    const SKIP = /^(node_modules|dist|backend|tests|api|contract|android|ios|assets|extension\/dist|\.git)(\/|$)|^test_.*\.js$|^(tailwind|build|vitest\.config|vitest\.workspace)\.js$/;

    function sources(dir = ROOT, rel = '') {
        return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
            const relPath = rel ? `${rel}/${entry.name}` : entry.name;
            if (SKIP.test(relPath)) return [];
            if (entry.isDirectory()) return sources(path.join(dir, entry.name), relPath);
            return entry.name.endsWith('.js') ? [relPath] : [];
        });
    }

    it('are listed with their file as client', () => {
        const unlisted = [];
        for (const file of sources()) {
            // Comments may mention old paths; only code counts
            const text = fs.readFileSync(path.join(ROOT, file), 'utf8')
                .replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:'"`])\/\/.*$/gm, '$1');
            // An API path, not an import of the api/ client modules ('./api/papers.js')
            const found = text.match(/['"`/]api\/(?!\w+\.js)[a-z][\w-]*(?:\/[\w${}.-]*)*/g) || [];
            if (found.length && !ENDPOINTS.some((e) => e.client === file)) unlisted.push(`${file}: ${[...new Set(found)].join(', ')}`);
        }
        expect(unlisted, 'add these requests to contract/api.js with the file as client').toEqual([]);
    });
});
