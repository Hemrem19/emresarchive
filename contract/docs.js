/**
 * The route tables in the API reference (docs Volume 4, §4.8), made from the
 * contract. tests/api-docs.test.js fails when the doc no longer matches;
 * `npm run docs:api` rewrites the tables between the markers.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { ENDPOINTS, SERVER_ONLY } from './api.js';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
export const DOC_PATH = path.join(ROOT, 'docs/COMPREHENSIVE_DOCUMENTATION_VOLUME_4.md');
export const START = '<!-- api-routes:start (generated from contract/api.js: npm run docs:api) -->';
export const END = '<!-- api-routes:end -->';

const TITLES = {
    auth: 'Authentication', user: 'User', folders: 'Folders', papers: 'Papers', networks: 'Paper network',
    import: 'Import', files: 'Files', groups: 'Groups', comments: 'Comments', notifications: 'Notifications',
    sync: 'Live sync', health: 'Health',
};

/** Markdown tables of every route, grouped by its first path segment after /api. */
export function routeTables() {
    const areas = new Map();
    for (const route of [...ENDPOINTS, ...SERVER_ONLY]) {
        const segments = route.path.split('/');
        const area = segments[1] === 'api' ? segments[2] : segments[1];
        if (!areas.has(area)) areas.set(area, new Map());
        const key = `${route.method} ${route.path}`;
        // One function may make several requests and one route have several callers
        const row = areas.get(area).get(key) ?? { ...route, callers: [] };
        if (route.client) row.callers.push(route.client.replace('#', ' → '));
        if (route.why) row.callers.push(`not called by the app (${route.why})`);
        areas.get(area).set(key, row);
    }
    let out = '';
    for (const [area, rows] of areas) {
        out += `### ${TITLES[area] ?? area}\n\n| Method | Path | Access | Called by |\n|---|---|---|---|\n`;
        for (const r of rows.values()) {
            out += `| ${r.method} | \`${r.path.replace(/\|/g, '\\|')}\` | ${r.access} | ${r.callers.map((c) => `\`${c}\``).join('<br>')} |\n`;
        }
        out += '\n';
    }
    return out;
}

/** The doc's generated part, or null when the markers are missing. */
export function documentedTables(doc) {
    const start = doc.indexOf(START);
    const end = doc.indexOf(END);
    if (start === -1 || end < start) return null;
    return doc.slice(start + START.length, end).trim();
}

export function writeDocs() {
    const doc = fs.readFileSync(DOC_PATH, 'utf8');
    if (documentedTables(doc) === null) throw new Error(`${DOC_PATH} has no ${START} … ${END} markers`);
    const start = doc.indexOf(START) + START.length;
    const updated = `${doc.slice(0, start)}\n\n${routeTables().trim()}\n\n${doc.slice(doc.indexOf(END))}`;
    fs.writeFileSync(DOC_PATH, updated);
    return updated !== doc;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
    console.log(writeDocs() ? 'Updated the route tables in the API reference.' : 'The API reference already matches the contract.');
}
