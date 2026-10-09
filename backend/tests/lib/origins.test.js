import { describe, it, expect } from 'vitest';
import { isAllowedOrigin } from '../../src/lib/origins.js';

describe('isAllowedOrigin', () => {
    it.each([
        'https://citavers.com',
        'https://www.citavers.com',
        'https://emresarchive.pages.dev',
        'https://abc123.emresarchive.pages.dev',
        'http://localhost:8080',
        'http://127.0.0.1:5500',
        'https://localhost',
        'capacitor://localhost',
    ])('allows %s', (origin) => {
        expect(isAllowedOrigin(origin)).toBe(true);
    });

    it.each([
        undefined,
        '',
        'null',
        'https://citavers.evil.com',
        'https://evilcitavers.com',
        'https://citavers.com.evil.com',
        'http://citavers.com',
        'https://attacker.pages.dev',
        'https://emresarchive.pages.dev.evil.com',
        'https://localhost.evil.com',
        'file://localhost',
    ])('rejects %s', (origin) => {
        expect(isAllowedOrigin(origin)).toBe(false);
    });
});
