/**
 * What citavers.com serves: build.js copies an explicit list into dist/, and
 * Cloudflare Pages publishes all of it. This keeps sources that must stay
 * private (contract, backend, tests, env files, git data) out of it, however
 * the list grows. Bots probe sites for exactly these files.
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const ROOT = path.join(__dirname, '..');
let out;

function walk(dir, rel = '') {
    return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
        const relPath = rel ? `${rel}/${e.name}` : e.name;
        return e.isDirectory() ? [relPath + '/', ...walk(path.join(dir, e.name), relPath)] : [relPath];
    });
}

beforeAll(() => {
    out = fs.mkdtempSync(path.join(os.tmpdir(), 'citavers-build-'));
    fs.rmSync(out, { recursive: true });
    execFileSync(process.execPath, ['build.js'], { cwd: ROOT, env: { ...process.env, BUILD_OUT: out }, stdio: 'pipe' });
}, 60000);

afterAll(() => fs.rmSync(out, { recursive: true, force: true }));

describe('build output', () => {
    it('holds the app', () => {
        expect(fs.existsSync(path.join(out, 'index.html'))).toBe(true);
        expect(fs.existsSync(path.join(out, 'app.js'))).toBe(true);
    });

    it('never holds private sources, env files or git data', () => {
        const FORBIDDEN = [
            /^contract\//, /^backend\//, /^tests?\//, /^extension\//, /^node_modules\//, /^android\//, /^ios\//,
            /(^|\/)\.git(\/|$)/, /(^|\/)\.env(\.|$)/, /(^|\/)\.dev\.vars$/, /(^|\/)wrangler\.toml$/,
            /(^|\/)test_[^/]*\.js$/, /(^|\/)[^/]*\.(pem|key|sql|bak)$/, /(^|\/)package(-lock)?\.json$/, /(^|\/)pnpm-lock\.yaml$/,
        ];
        const leaked = walk(out).filter((f) => FORBIDDEN.some((re) => re.test(f)));
        expect(leaked, 'these would be public on citavers.com: take them out of build.js').toEqual([]);
    });
});
