import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DIST_DIR = path.join(__dirname, 'dist');

// Files to copy directly to root of dist
const FILES_TO_COPY = [
    'index.html',
    'app.js',
    'style.css',
    'config.js',
    'db.js',
    'ui.js',
    'service-worker.js',
    'debug.js',
    'auth.view.js',
    'dashboard.view.js',
    'form.view.js',
    'settings.view.js',
    'graph.view.js',
    'docs.view.js',
    'landing.view.js',
    'terms.view.js',
    'privacy.view.js',
    'citation.js',
    'api.js',
    'tailwind.js',
    '_headers' // Pages response headers (cache rules)
];

// Directories to copy recursively
const DIRS_TO_COPY = [
    'assets',
    'api',
    'core',
    'db', // db folder (contains sync.js etc)
    'views',
    'dashboard',
    'import',
    'details',
    'components'
];

console.log('Building for production...');

// Clean and create dist directory
if (fs.existsSync(DIST_DIR)) {
    fs.rmSync(DIST_DIR, { recursive: true, force: true });
}
fs.mkdirSync(DIST_DIR);

// Copy individual files
FILES_TO_COPY.forEach(file => {
    const srcPath = path.join(__dirname, file);
    const destPath = path.join(DIST_DIR, file);
    if (fs.existsSync(srcPath)) {
        fs.copyFileSync(srcPath, destPath);
        console.log(`Copied ${file}`);
    } else {
        console.warn(`Warning: ${file} not found`);
    }
});

// Copy directories
DIRS_TO_COPY.forEach(dir => {
    const srcPath = path.join(__dirname, dir);
    const destPath = path.join(DIST_DIR, dir);
    if (fs.existsSync(srcPath)) {
        fs.cpSync(srcPath, destPath, { recursive: true });
        console.log(`Copied ${dir}/`);
    } else {
        console.warn(`Warning: ${dir}/ not found`);
    }
});

// Every file the app can load must be in dist: follow references from the
// entry points and fail the build on a missing one, so Pages keeps serving
// the previous deploy instead of publishing a broken site.
const missing = findMissingFiles(['index.html', 'service-worker.js']);
if (missing.length) {
    console.error('Build failed: files referenced by the app are missing from dist:');
    missing.forEach(({ file, from }) => console.error(`  ${file} (referenced by ${from})`));
    process.exit(1);
}

console.log('Build complete! Output directory: /dist');

function findMissingFiles(entries) {
    const seen = new Set();
    const missing = [];
    const queue = entries.map((file) => ({ file, from: 'entry point' }));
    while (queue.length) {
        const { file, from } = queue.pop();
        if (seen.has(file)) continue;
        seen.add(file);
        const abs = path.join(DIST_DIR, file);
        if (!fs.existsSync(abs) || fs.statSync(abs).isDirectory()) {
            if (file !== '') missing.push({ file, from });
            continue;
        }
        for (const ref of referencesIn(file, fs.readFileSync(abs, 'utf8'))) {
            const resolved = resolveLocal(file, ref);
            if (resolved !== null) queue.push({ file: resolved, from: file });
        }
    }
    return missing;
}

function referencesIn(file, text) {
    const all = (re) => [...text.matchAll(re)].map((m) => m[1]);
    if (file.endsWith('.html')) return all(/(?:src|href)=["']([^"']+)["']/g);
    if (file.endsWith('.css')) return all(/url\(\s*["']?([^"')]+)["']?\s*\)/g);
    if (file.endsWith('.webmanifest') || file.endsWith('.json')) {
        try { return (JSON.parse(text).icons || []).map((icon) => icon.src); } catch { return []; }
    }
    if (file.endsWith('.js')) {
        const code = text.replace(/\/\*[\s\S]*?\*\//g, ''); // JSDoc types like import('yjs') are not imports
        const inCode = (re) => [...code.matchAll(re)].map((m) => m[1]);
        const modules = [
            ...inCode(/^\s*(?:import|export)\b[^;'"]*?\bfrom\s*["']([^"'\n]+)["']/gm),
            ...inCode(/^\s*import\s*["']([^"'\n]+)["']/gm),
            ...inCode(/\bimport\(\s*["']([^"'\n]+)["']\s*\)/g),
        ].filter((spec) => /^\.{0,2}\//.test(spec)); // bare specifiers are not files
        // Assets in HTML templates load relative to the page, i.e. the site root
        const assets = inCode(/(?:src|href)=["'](?:\.\/)?(assets\/[^"'$\n]+)["']/g).map((a) => `/${a}`);
        const precache = file === 'service-worker.js' ? inCode(/["'](\.\/[^"'\n]*)["']/g) : [];
        return [...modules, ...assets, ...precache];
    }
    return [];
}

/** Path inside dist that `ref` (seen in `fromFile`) points to, or null for external refs. */
function resolveLocal(fromFile, ref) {
    if (/^(?:[a-z]+:|\/\/|#)/i.test(ref)) return null; // http:, data:, mailto:, //cdn, #/route
    const clean = ref.split(/[?#]/)[0];
    const base = clean.startsWith('/') ? '' : path.posix.dirname(fromFile);
    return path.posix.normalize(path.posix.join(base, clean)).replace(/^\.?\/?/, '').replace(/^\.$/, '');
}
