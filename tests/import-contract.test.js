/**
 * Every name a frontend module imports from a local file must be exported by
 * that file. Unit tests mock whole modules, so a missing export only fails in
 * the browser ("doesn't provide an export named ..."); this test reads the
 * sources instead.
 */
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(__dirname, '..');
const SKIP_DIRS = new Set(['node_modules', 'tests', 'backend', 'coverage', 'android', 'ios', 'extension', 'dist', '.git', 'marketing']);

function frontendFiles(dir = ROOT) {
    const out = [];
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        if (entry.name.startsWith('.') || SKIP_DIRS.has(entry.name)) continue;
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) out.push(...frontendFiles(full));
        else if (entry.name.endsWith('.js')) out.push(full);
    }
    return out;
}

const stripComments = (src) => src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:'"`])\/\/.*$/gm, '$1');

function exportsOf(file) {
    const src = stripComments(fs.readFileSync(file, 'utf8'));
    const names = new Set();
    let reexportsAll = false;
    for (const m of src.matchAll(/export\s+(?:async\s+)?(?:function\*?|const|let|var|class)\s+([A-Za-z_$][\w$]*)/g)) names.add(m[1]);
    for (const m of src.matchAll(/export\s*\{([^}]*)\}/g)) {
        for (const part of m[1].split(',')) {
            const name = part.trim().split(/\s+as\s+/).pop().trim();
            if (name) names.add(name);
        }
    }
    if (/export\s+default/.test(src)) names.add('default');
    if (/export\s*\*\s*from/.test(src)) reexportsAll = true;
    return { names, reexportsAll };
}

function namedImports(file) {
    const src = stripComments(fs.readFileSync(file, 'utf8'));
    const found = [];
    const patterns = [
        /import\s*(?:[A-Za-z_$][\w$]*\s*,\s*)?\{([^}]*)\}\s*from\s*['"](\.[^'"]+)['"]/g,
        /(?:const|let|var)\s*\{([^{}]*)\}\s*=\s*await\s+import\(\s*['"](\.[^'"]+)['"]\s*\)/g,
    ];
    for (const re of patterns) {
        for (const m of src.matchAll(re)) {
            const names = m[1].split(',')
                .map((p) => p.trim().split(/\s+as\s+|\s*:\s*/)[0].trim())
                .filter(Boolean);
            found.push({ names, spec: m[2] });
        }
    }
    return found;
}

describe('frontend import contract', () => {
    it('every named import from a local module is exported by it', () => {
        const problems = [];
        for (const file of frontendFiles()) {
            for (const { names, spec } of namedImports(file)) {
                const target = path.resolve(path.dirname(file), spec);
                if (!fs.existsSync(target)) {
                    problems.push(`${path.relative(ROOT, file)}: ${spec} does not exist`);
                    continue;
                }
                const { names: exported, reexportsAll } = exportsOf(target);
                if (reexportsAll) continue;
                for (const name of names) {
                    if (!exported.has(name)) {
                        problems.push(`${path.relative(ROOT, file)}: '${name}' is not exported by ${spec}`);
                    }
                }
            }
        }
        expect(problems).toEqual([]);
    });
});
