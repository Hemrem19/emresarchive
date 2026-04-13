/**
 * Module Import Integrity Tests
 *
 * These tests guard against "phantom import" regressions — where a source file
 * imports a name that no longer exists in the module it points to.
 * This was the root cause of the production blank-screen bugs (api/sync.js,
 * db/sync.js deletions during the CRDT migration).
 *
 * Strategy: statically parse each source file's import declarations and verify:
 *   1. The imported module file actually exists on disk
 *   2. The named exports the caller requests are actually exported by that file
 */

import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Parse all import statements from a JS source file.
 * Returns array of { names: string[], from: string }
 */
function parseImports(filePath) {
    const src = readFileSync(filePath, 'utf8');
    const results = [];

    // Match: import { a, b, c } from './foo.js'
    // and:   import defaultExport from './foo.js'
    const re = /import\s+(?:\{([^}]*)\}|(\w+))\s+from\s+['"]([^'"]+)['"]/g;
    let m;
    while ((m = re.exec(src)) !== null) {
        const named = m[1] ? m[1].split(',').map(n => n.trim().replace(/\s+as\s+\w+/, '').trim()).filter(Boolean) : [];
        const def = m[2] ? [m[2]] : [];
        const from = m[3];
        results.push({ names: [...named, ...def], from });
    }
    return results;
}

/**
 * Parse all export names from a JS source file (static exports only).
 */
function parseExports(filePath) {
    const src = readFileSync(filePath, 'utf8');
    const names = new Set();

    // export function foo / export const foo / export async function foo
    const directRe = /^export\s+(?:async\s+)?(?:function|const|let|var|class)\s+(\w+)/gm;
    let m;
    while ((m = directRe.exec(src)) !== null) names.add(m[1]);

    // export { foo, bar as baz }
    const namedRe = /^export\s+\{([^}]*)\}/gm;
    while ((m = namedRe.exec(src)) !== null) {
        m[1].split(',').forEach(n => {
            const alias = n.trim().match(/(\w+)\s+as\s+(\w+)/);
            names.add(alias ? alias[2] : n.trim());
        });
    }

    // export { foo } from './bar.js'  — re-exports (track forwarded names)
    const reExportRe = /^export\s+\{([^}]*)\}\s+from\s+['"][^'"]+['"]/gm;
    while ((m = reExportRe.exec(src)) !== null) {
        m[1].split(',').forEach(n => {
            const alias = n.trim().match(/(\w+)\s+as\s+(\w+)/);
            names.add(alias ? alias[2] : n.trim());
        });
    }

    return names;
}

/**
 * Resolve a relative import path against a source file's directory.
 * Returns null if the import is not a local file (npm package, https, etc.)
 */
function resolveLocalImport(fromFile, importPath) {
    if (!importPath.startsWith('.')) return null; // npm package or absolute
    if (importPath.startsWith('https://') || importPath.startsWith('http://')) return null;
    const dir = dirname(fromFile);
    // Try exact, then .js extension
    for (const candidate of [importPath, `${importPath}.js`]) {
        const abs = resolve(dir, candidate);
        if (existsSync(abs)) return abs;
    }
    return null;
}

// ---------------------------------------------------------------------------
// Files to audit — every file whose broken imports caused production issues
// ---------------------------------------------------------------------------
const FILES_TO_AUDIT = [
    'db.js',
    'db/adapter.js',
    'api/user.js',
    'details/related.manager.js',
    'settings.view.js',
    'dashboard.view.js',
    'form.view.js',
    'graph.view.js',
    'app.js',
    'core/syncManager.js',
    'db/data.js',
].map(f => resolve(ROOT, f));

// ---------------------------------------------------------------------------
// Test 1: all local imports resolve to existing files
// ---------------------------------------------------------------------------
describe('All local module paths resolve to existing files', () => {
    for (const file of FILES_TO_AUDIT) {
        const rel = file.replace(ROOT + '/', '');
        it(rel, () => {
            const imports = parseImports(file);
            for (const { from } of imports) {
                const resolved = resolveLocalImport(file, from);
                if (resolved === null) continue; // skip npm/https imports
                expect(
                    existsSync(resolved),
                    `"${rel}" imports from "${from}" but the file does not exist (resolved: ${resolved})`
                ).toBe(true);
            }
        });
    }
});

// ---------------------------------------------------------------------------
// Test 2: named imports match actual exports in the target module
// ---------------------------------------------------------------------------
describe('Named imports match exported names in target modules', () => {
    for (const file of FILES_TO_AUDIT) {
        const rel = file.replace(ROOT + '/', '');
        it(rel, () => {
            const imports = parseImports(file);
            for (const { names, from } of imports) {
                const resolved = resolveLocalImport(file, from);
                if (resolved === null) continue; // skip npm/https imports
                if (!existsSync(resolved)) continue; // already caught by test 1

                const exported = parseExports(resolved);
                const fromRel = resolved.replace(ROOT + '/', '');

                for (const name of names) {
                    // 'default' is a special keyword — skip
                    if (name === 'default' || name === 'type') continue;
                    expect(
                        exported.has(name),
                        `"${rel}" imports "${name}" from "${fromRel}" but "${fromRel}" does not export it.\n` +
                        `Exported names: ${[...exported].join(', ')}`
                    ).toBe(true);
                }
            }
        });
    }
});

// ---------------------------------------------------------------------------
// Test 3: db.js must NOT re-export the deleted sync functions (regression guard)
// ---------------------------------------------------------------------------
describe('db.js regression guard — deleted sync exports must not exist', () => {
    const DELETED = [
        'performSync',
        'performFullSync',
        'performIncrementalSync',
        'getSyncStatusInfo',
        'getPendingChanges',
        'deduplicateLocalPapers',
        'trackPaperCreated',
        'trackPaperUpdated',
        'trackPaperDeleted',
    ];

    it('does not export deleted sync functions', () => {
        const exported = parseExports(resolve(ROOT, 'db.js'));
        for (const name of DELETED) {
            expect(
                exported.has(name),
                `"db.js" must NOT export "${name}" — it was deleted in the CRDT migration`
            ).toBe(false);
        }
    });
});
