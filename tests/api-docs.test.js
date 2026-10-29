/**
 * The API reference's route tables (docs Volume 4, §4.8) match contract/api.js,
 * so the docs cannot fall behind the routes the tests already enforce.
 */
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import { DOC_PATH, END, START, documentedTables, routeTables } from '../contract/docs.js';
import { ENDPOINTS, SERVER_ONLY } from '../contract/api.js';

const doc = fs.readFileSync(DOC_PATH, 'utf8');

describe('API reference', () => {
    it('keeps its generated route tables between the markers', () => {
        expect(doc).toContain(START);
        expect(doc).toContain(END);
    });

    it('lists the routes exactly as the contract does (fix: npm run docs:api)', () => {
        expect(documentedTables(doc), 'docs/COMPREHENSIVE_DOCUMENTATION_VOLUME_4.md is out of date: run `npm run docs:api`')
            .toBe(routeTables().trim());
    });

    it('has a row for every route in the contract', () => {
        const tables = routeTables();
        for (const route of [...ENDPOINTS, ...SERVER_ONLY]) {
            expect(tables).toContain(`| ${route.method} | \`${route.path.replace(/\|/g, '\\|')}\` | ${route.access} |`);
        }
    });

    it('notices a route missing from the doc', () => {
        const stale = doc.replace(/\| GET \| `\/api\/networks` \|[^\n]*\n/, '');
        expect(documentedTables(stale)).not.toBe(routeTables().trim());
    });
});
