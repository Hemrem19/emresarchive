
const fs = require('fs');
const path = require('path');

const rootDir = path.join(__dirname, 'dist');
const entryPoint = path.join(rootDir, 'app.js');

function checkImports(filePath, visited = new Set()) {
    if (visited.has(filePath)) return;
    visited.add(filePath);

    if (!fs.existsSync(filePath)) {
        console.error(`MISSING FILE: ${filePath}`);
        return;
    }

    const content = fs.readFileSync(filePath, 'utf8');
    // Regex to find import ... from '...'
    const importRegex = /import\s+(?:[\s\S]*?from\s+)?['"]([^'"]+)['"]/g;
    let match;

    while ((match = importRegex.exec(content)) !== null) {
        let importPath = match[1];

        // Resolve path
        let resolvedPath;
        if (importPath.startsWith('.')) {
            resolvedPath = path.resolve(path.dirname(filePath), importPath);
        } else if (importPath.startsWith('/')) {
            resolvedPath = path.join(rootDir, importPath.substring(1));
        } else {
            // Node modules or bare imports - skip for now as we know we don't use them
            // But wait, if we DO use them, that's the bug!
            console.log(`Checking bare import: ${importPath} in ${filePath}`);
            continue;
        }

        // Add .js extension if missing and it's not a directory
        if (!path.extname(resolvedPath) && !fs.existsSync(resolvedPath)) {
            if (fs.existsSync(resolvedPath + '.js')) {
                resolvedPath += '.js';
            }
        }

        // Check existence
        if (!fs.existsSync(resolvedPath)) {
            console.error(`BROKEN LINK: ${importPath}`);
            console.error(`  In file: ${filePath}`);
            console.error(`  Resolved to: ${resolvedPath}`);
        } else {
            // Recurse
            checkImports(resolvedPath, visited);
        }
    }
}

console.log('Starting import check...');
if (!fs.existsSync(rootDir)) {
    console.error('Dist folder not found!');
} else {
    checkImports(entryPoint);
}
console.log('Check complete.');
