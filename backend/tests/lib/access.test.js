import { describe, it, expect } from 'vitest';
import { ownsStorageKey, pdfUrlError } from '../../src/lib/access.js';

const alice = { id: 1 };

describe('ownsStorageKey', () => {
    it('accepts keys under the user prefix only', () => {
        expect(ownsStorageKey(alice, 'papers/1/10/a.pdf')).toBe(true);
        expect(ownsStorageKey(alice, 'papers/2/10/a.pdf')).toBe(false);
        expect(ownsStorageKey(alice, 'papers/11/10/a.pdf')).toBe(false);
        expect(ownsStorageKey(alice, 'papers/1/../2/10/a.pdf')).toBe(false);
        expect(ownsStorageKey(alice, 'users/1/a.pdf')).toBe(false);
    });
});

describe('pdfUrlError', () => {
    it.each([undefined, null, '', 'papers/1/10/a.pdf', 'https://arxiv.org/pdf/2506.02255v1', 'http://example.com/a.pdf'])(
        'accepts %s', (value) => expect(pdfUrlError(alice, value)).toBeNull());

    it('rejects another user\'s key', () => {
        expect(pdfUrlError(alice, 'papers/2/10/thesis.pdf')).toMatch(/do not own/);
    });

    it.each(['javascript:alert(1)', 'file:///etc/passwd', 'ftp://x/a.pdf', 'not a url', 42])(
        'rejects %s', (value) => expect(pdfUrlError(alice, value)).not.toBeNull());
});
