/**
 * Preferences that follow the user across devices: saved with
 * PUT /api/user/settings (validated, merged), handed back on login and refresh.
 */
import { describe, it, expect, beforeAll, beforeEach } from 'vitest';
import { createTestApp } from '../support/app.js';
import { hashPassword } from '../../src/lib/password.js';

const PASSWORD = 'correct horse';
let passwordHash, t, alice;

beforeAll(async () => { passwordHash = await hashPassword(PASSWORD); });

beforeEach(() => {
    t = createTestApp();
    alice = t.addUser(1, 'alice@test.dev');
    t.db.sqlite.prepare('UPDATE users SET password_hash = ?').run(passwordHash);
});

const save = (body, user = alice) => t.request('/api/user/settings', { method: 'PUT', user, body });
const stored = () => JSON.parse(t.row('SELECT settings FROM users WHERE id = ?', alice.id).settings);

describe('PUT /api/user/settings', () => {
    it('saves known preferences and merges later ones into them', async () => {
        expect((await save({ settings: { readingStatusOrder: ['Reading', 'To Read'], itemsPerPage: 50 } })).status).toBe(200);
        const res = await save({ settings: { currentSortBy: 'title' } });

        expect((await res.json()).data.settings).toEqual({ readingStatusOrder: ['Reading', 'To Read'], itemsPerPage: 50, currentSortBy: 'title' });
        expect(stored()).toEqual({ readingStatusOrder: ['Reading', 'To Read'], itemsPerPage: 50, currentSortBy: 'title' });
    });

    it.each([
        ['an unknown key', { theme: 'light' }],
        ['a wrong type', { itemsPerPage: '50' }],
        ['an out-of-range number', { itemsPerPage: 100000 }],
        ['an oversized list', { readingStatusOrder: Array.from({ length: 50 }, (_, i) => `S${i}`) }],
        ['markup in a sort key', { currentSortBy: '<img src=x>' }],
        ['a list instead of an object', ['itemsPerPage']],
    ])('refuses %s and stores nothing', async (_, settings) => {
        const res = await save({ settings });
        expect(res.status).toBe(400);
        expect(stored()).toEqual({});
    });

    it('validates the display name', async () => {
        expect((await save({ name: '   ' })).status).toBe(400);
        expect((await save({ name: 'x'.repeat(101) })).status).toBe(400);
        expect((await save({ name: '  Alice  ' })).status).toBe(200);
        expect(t.row('SELECT name FROM users WHERE id = ?', alice.id).name).toBe('Alice');
    });

    it('refuses an empty update', async () => {
        expect((await save({})).status).toBe(400);
    });

    it('changes only the caller', async () => {
        const bob = t.addUser(2, 'bob@test.dev');
        await save({ settings: { itemsPerPage: 10 } }, bob);
        expect(stored()).toEqual({});
    });
});

describe('settings reach other devices', () => {
    beforeEach(async () => { await save({ settings: { itemsPerPage: 50 } }); });

    it('on login', async () => {
        const res = await t.request('/api/auth/login', { method: 'POST', body: { email: 'alice@test.dev', password: PASSWORD } });
        expect((await res.json()).data.user.settings).toEqual({ itemsPerPage: 50 });
    });

    it('on token refresh', async () => {
        const login = await t.request('/api/auth/login', { method: 'POST', body: { email: 'alice@test.dev', password: PASSWORD } });
        const cookie = login.headers.get('set-cookie').match(/refreshToken=[^;]+/)[0];
        const res = await t.request('/api/auth/refresh', { method: 'POST', headers: { Cookie: cookie } });
        const { data } = await res.json();
        expect(data.settings).toEqual({ itemsPerPage: 50 });
        expect(Object.keys(data).sort()).toEqual(['accessToken', 'settings']);
    });
});
