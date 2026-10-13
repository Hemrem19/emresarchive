/**
 * Routes and services must decide access through src/lib/access.js, never by
 * comparing user ids themselves: shared libraries will widen access there,
 * and any check written elsewhere would silently stay "owner only" or, worse,
 * be forgotten when a new kind of access is added.
 */
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const SRC = path.join(__dirname, '../../src');
const DIRS = ['routes', 'services'];

// Raw D1 statements on the caller's own library, reviewed by hand.
const ALLOWED = {
    'services/importer.js': 'replace-mode restore and PDF sweep act on the personal library only',
    'services/sessions.js': 'logins belong to a person, not a library',
    'services/groups.js': 'stores memberships; access.js decides what they allow',
};

const FORBIDDEN = [
    // Ownership columns: schema.papers.userId, aliases like P.userId, table.userId.
    // Identity lookups (session.userId, a token's userId) are fine.
    /(\bschema\.\w+|\b[A-Z]\w{0,2}|\btable)\.userId\b/,
    /\buser_id\s*(=|IN\b)/i, // raw SQL ownership checks
];

describe('access guard', () => {
    it('no route or service checks ownership by hand', () => {
        const offenders = [];
        for (const dir of DIRS) {
            for (const name of fs.readdirSync(path.join(SRC, dir))) {
                const rel = `${dir}/${name}`;
                if (!name.endsWith('.js') || ALLOWED[rel]) continue;
                fs.readFileSync(path.join(SRC, rel), 'utf8').split('\n').forEach((line, i) => {
                    if (FORBIDDEN.some((re) => re.test(line))) offenders.push(`${rel}:${i + 1}: ${line.trim()}`);
                });
            }
        }
        expect(offenders).toEqual([]);
    });
});
