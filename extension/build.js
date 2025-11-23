import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import AdmZip from 'adm-zip';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const EXT_DIR = __dirname;
const DIST_DIR = path.join(EXT_DIR, 'dist');

// Ensure dist directory exists
if (!fs.existsSync(DIST_DIR)) {
    fs.mkdirSync(DIST_DIR);
}

// Common files to copy
const FILES = [
    'popup.html',
    'popup.css',
    'popup.js',
    'content.js',
    'background.js',
    'icons'
];

function copyRecursiveSync(src, dest) {
    const exists = fs.existsSync(src);
    const stats = exists && fs.statSync(src);
    const isDirectory = exists && stats.isDirectory();

    if (isDirectory) {
        if (!fs.existsSync(dest)) {
            fs.mkdirSync(dest);
        }
        fs.readdirSync(src).forEach((childItemName) => {
            copyRecursiveSync(path.join(src, childItemName), path.join(dest, childItemName));
        });
    } else {
        fs.copyFileSync(src, dest);
    }
}

function buildChrome() {
    console.log('Building for Chrome...');
    const chromeDir = path.join(DIST_DIR, 'chrome');

    // Clean
    if (fs.existsSync(chromeDir)) {
        fs.rmSync(chromeDir, { recursive: true, force: true });
    }
    fs.mkdirSync(chromeDir);

    // Copy common files
    FILES.forEach(file => {
        copyRecursiveSync(path.join(EXT_DIR, file), path.join(chromeDir, file));
    });

    // Copy manifest
    fs.copyFileSync(path.join(EXT_DIR, 'manifest.json'), path.join(chromeDir, 'manifest.json'));

    console.log('Chrome build complete: dist/chrome');
}

function buildFirefox() {
    console.log('Building for Firefox...');
    const firefoxDir = path.join(DIST_DIR, 'firefox');

    // Clean
    if (fs.existsSync(firefoxDir)) {
        fs.rmSync(firefoxDir, { recursive: true, force: true });
    }
    fs.mkdirSync(firefoxDir);

    // Copy common files
    FILES.forEach(file => {
        copyRecursiveSync(path.join(EXT_DIR, file), path.join(firefoxDir, file));
    });

    // Copy manifest
    fs.copyFileSync(path.join(EXT_DIR, 'manifest.firefox.json'), path.join(firefoxDir, 'manifest.json'));

    console.log('Firefox build complete: dist/firefox');
}

function zipBuild(target) {
    console.log(`Zipping ${target}...`);
    const zip = new AdmZip();
    const sourceDir = path.join(DIST_DIR, target);
    const zipFile = path.join(DIST_DIR, `${target}.zip`);

    // Add directory contents to zip (adm-zip automatically uses forward slashes)
    zip.addLocalFolder(sourceDir);

    // Write zip file
    zip.writeZip(zipFile);
    console.log(`Created ${target}.zip`);
}

buildChrome();
zipBuild('chrome');

buildFirefox();
zipBuild('firefox');
