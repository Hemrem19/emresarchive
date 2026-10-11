import { describe, it, expect } from 'vitest';
import {
    READ, WRITE_FILES, allows, accessible, keyInLibrary, libraryOf, pdfKey, pdfUrlError, personalLibrary, storagePrefix,
} from '../../src/lib/access.js';
import * as schema from '../../drizzle/schema.js';

const alice = { id: 1 };
const lib = personalLibrary(alice);

describe('keyInLibrary', () => {
    it('accepts keys under the library prefix only', () => {
        expect(keyInLibrary(lib, 'papers/1/10/a.pdf')).toBe(true);
        expect(keyInLibrary(lib, 'papers/2/10/a.pdf')).toBe(false);
        expect(keyInLibrary(lib, 'papers/11/10/a.pdf')).toBe(false);
        expect(keyInLibrary(lib, 'papers/1/../2/10/a.pdf')).toBe(false);
        expect(keyInLibrary(lib, 'users/1/a.pdf')).toBe(false);
    });
});

describe('pdfUrlError', () => {
    it.each([undefined, null, '', 'papers/1/10/a.pdf', 'https://arxiv.org/pdf/2506.02255v1', 'http://example.com/a.pdf'])(
        'accepts %s', (value) => expect(pdfUrlError(lib, value)).toBeNull());

    it('rejects a key from another library', () => {
        expect(pdfUrlError(lib, 'papers/2/10/thesis.pdf')).toMatch(/do not own/);
    });

    it.each(['javascript:alert(1)', 'file:///etc/passwd', 'ftp://x/a.pdf', 'not a url', 42])(
        'rejects %s', (value) => expect(pdfUrlError(lib, value)).not.toBeNull());
});

describe('pdfKey', () => {
    it('keeps numeric paper ids and turns anything else into a temp id', () => {
        expect(pdfKey(lib, 42, 'My Paper.pdf', 7)).toBe('papers/1/42/My_Paper.pdf');
        expect(pdfKey(lib, '../../2/10', 'a.pdf', 7)).toBe('papers/1/temp-7/a.pdf');
        expect(pdfKey(lib, undefined, 'a.pdf', 7)).toBe('papers/1/temp-7/a.pdf');
    });

    it('produces keys that stay inside the library', () => {
        const key = pdfKey(lib, 1, '../../2/1/x.pdf', 7);
        expect(key).not.toContain('..');
        expect(keyInLibrary(lib, key)).toBe(true);
    });
});

describe('libraries', () => {
    it('refuses to build a storage prefix from something that is not a library', () => {
        expect(() => storagePrefix(alice)).toThrow();
        expect(() => libraryOf({ id: 5 })).toThrow(/userId/);
    });

    it('rejects unknown actions instead of allowing them', () => {
        expect(() => accessible(schema.papers, alice, 'admin')).toThrow(/Unknown access action/);
        expect(() => allows(alice, 'delete', { userId: 1 })).toThrow(/Unknown access action/);
    });

    it('allows actions on rows of the caller\'s library only', () => {
        expect(allows(alice, WRITE_FILES, { userId: 1 })).toBe(true);
        expect(allows(alice, READ, { userId: 2 })).toBe(false);
    });
});
