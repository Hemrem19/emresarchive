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
    'citation.js',
    'api.js',
    'tailwind.js'
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
    'details'
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

console.log('Build complete! Output directory: /dist');
