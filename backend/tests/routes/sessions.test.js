/**
 * Logins: logout ends the login on the server, devices can be listed and
 * signed out, and ending a login rejects its tokens and closes its sync sockets.
 */
import { describe, it, expect, beforeAll, beforeEach, vi } from 'vitest';
import jwt from 'jsonwebtoken';
import { createTestApp } from '../support/app.js';
import { hashPassword } from '../../src/lib/password.js';
import {
    CLOSE_SOCKETS_PATH, SESSION_ENDED_CODE, deleteExpiredSessions, describeDevice,
} from '../../src/services/sessions.js';
import { WorkspaceDurableObject } from '../../src/WorkspaceDurableObject.js';

const PASSWORD = 'correct horse';
const CHROME_WINDOWS = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36';
const FIREFOX_LINUX = 'Mozilla/5.0 (X11; Linux x86_64; rv:128.0) Gecko/20100101 Firefox/128.0';

let passwordHash, t, alice, socketCalls;

beforeAll(async () => { passwordHash = await hashPassword(PASSWORD); });

beforeEach(() => {
    t = createTestApp();
    alice = t.addUser(1, 'alice@test.dev');
    t.addUser(2, 'bob@test.dev');
    t.db.sqlite.prepare('UPDATE users SET password_hash = ?').run(passwordHash);

    socketCalls = [];
    t.env.WORKSPACE_DO = {
        idFromName: (name) => name,
        get: (room) => ({
            fetch: async (url, init) => {
                socketCalls.push({ room, path: new URL(url).pathname, ...JSON.parse(init.body) });
                return Response.json({ closed: 0 });
            },
        }),
    };
});

const json = async (res) => ({ status: res.status, body: await res.json().catch(() => null) });

/** Signs in like a browser; returns the device's tokens. */
async function signIn(email = 'alice@test.dev', userAgent = CHROME_WINDOWS) {
    const res = await t.request('/api/auth/login', {
        method: 'POST', body: { email, password: PASSWORD }, headers: { 'User-Agent': userAgent },
    });
    expect(res.status).toBe(200);
    const cookie = res.headers.get('set-cookie').match(/refreshToken=[^;]+/)[0];
    const { data } = await res.json();
    return { token: data.accessToken, cookie, sid: jwt.decode(data.accessToken).sid, body: data };
}

const me = (device) => t.request('/api/auth/me', { token: device.token });
const refresh = (device) => t.request('/api/auth/refresh', { method: 'POST', headers: { Cookie: device.cookie } });
const sessions = async (device) => (await json(await t.request('/api/user/sessions', { token: device.token }))).body.data.sessions;

describe('login', () => {
    it('names the login in the access token and keeps the refresh token out of the body', async () => {
        const device = await signIn();
        expect(device.sid).toEqual(expect.any(Number));
        expect(device.body.refreshToken).toBeUndefined();
        expect((await me(device)).status).toBe(200);
    });

    it('refresh issues a token for the same login and records activity', async () => {
        const device = await signIn();
        t.db.sqlite.prepare("UPDATE sessions SET last_activity_at = '2020-01-01 00:00:00'").run();

        const { body } = await json(await refresh(device));
        expect(jwt.decode(body.data.accessToken).sid).toBe(device.sid);
        expect(t.row('SELECT last_activity_at AS at FROM sessions WHERE id = ?', device.sid).at).toMatch(/^20[2-9]\d-.*Z$/);
    });
});

describe('logout', () => {
    it('ends the login: its access token and refresh cookie stop working', async () => {
        const device = await signIn();
        const res = await t.request('/api/auth/logout', { method: 'POST', token: device.token, headers: { Cookie: device.cookie } });
        expect(res.status).toBe(200);

        const after = await json(await me(device));
        expect(after.status).toBe(401);
        expect(after.body.error.message).toBe('Session ended');
        expect((await refresh(device)).status).toBe(401);
        expect(socketCalls).toEqual([{ room: 'user:1', path: CLOSE_SOCKETS_PATH, sessionIds: [device.sid] }]);
    });

    it('works with only the access token', async () => {
        const device = await signIn();
        await t.request('/api/auth/logout', { method: 'POST', token: device.token });
        expect((await me(device)).status).toBe(401);
    });

    it('leaves the user\'s other devices signed in', async () => {
        const laptop = await signIn();
        const phone = await signIn('alice@test.dev', FIREFOX_LINUX);
        await t.request('/api/auth/logout', { method: 'POST', token: laptop.token, headers: { Cookie: laptop.cookie } });
        expect((await me(phone)).status).toBe(200);
    });
});

describe('devices', () => {
    it('lists the user\'s logins with the current one marked', async () => {
        const laptop = await signIn();
        await signIn('alice@test.dev', FIREFOX_LINUX);
        await signIn('bob@test.dev');

        const list = await sessions(laptop);
        expect(list).toHaveLength(2);
        expect(list.find((s) => s.current)).toMatchObject({ id: laptop.sid, device: 'Chrome on Windows' });
        expect(list.find((s) => !s.current).device).toBe('Firefox on Linux');
        expect(list.every((s) => s.createdAt.endsWith('Z'))).toBe(true);
    });

    it('hides expired logins', async () => {
        const laptop = await signIn();
        const phone = await signIn('alice@test.dev', FIREFOX_LINUX);
        t.db.sqlite.prepare("UPDATE sessions SET expires_at = '2020-01-01T00:00:00.000Z' WHERE id = ?").run(phone.sid);
        expect((await sessions(laptop)).map((s) => s.id)).toEqual([laptop.sid]);
    });

    it('signs out one other device', async () => {
        const laptop = await signIn();
        const phone = await signIn('alice@test.dev', FIREFOX_LINUX);

        const res = await json(await t.request(`/api/user/sessions/${phone.sid}`, { method: 'DELETE', token: laptop.token }));
        expect(res.body.data).toEqual({ ended: 1, current: false });
        expect((await me(phone)).status).toBe(401);
        expect((await me(laptop)).status).toBe(200);
        expect(socketCalls.at(-1).sessionIds).toEqual([phone.sid]);
    });

    it('cannot sign out another user\'s login', async () => {
        const laptop = await signIn();
        const bob = await signIn('bob@test.dev');
        const res = await t.request(`/api/user/sessions/${bob.sid}`, { method: 'DELETE', token: laptop.token });
        expect(res.status).toBe(404);
        expect((await me(bob)).status).toBe(200);
    });

    it('signs out every other device and keeps this one', async () => {
        const laptop = await signIn();
        const phone = await signIn('alice@test.dev', FIREFOX_LINUX);
        const tablet = await signIn('alice@test.dev', FIREFOX_LINUX);
        const bob = await signIn('bob@test.dev');

        const res = await json(await t.request('/api/user/sessions', { method: 'DELETE', token: laptop.token }));
        expect(res.body.data.ended).toBe(2);
        expect((await me(phone)).status).toBe(401);
        expect((await me(tablet)).status).toBe(401);
        expect((await me(laptop)).status).toBe(200);
        expect((await me(bob)).status).toBe(200);
        expect(socketCalls.at(-1).sessionIds.sort()).toEqual([phone.sid, tablet.sid].sort());
    });

    it('refuses "sign out others" for a token that names no login', async () => {
        await signIn();
        const res = await t.request('/api/user/sessions', { method: 'DELETE', user: alice });
        expect(res.status).toBe(409);
        expect(t.rows('SELECT id FROM sessions WHERE user_id = 1')).toHaveLength(1);
    });
});

describe('cleanup', () => {
    it('removes expired logins only', async () => {
        const kept = await signIn();
        const old = await signIn('alice@test.dev', FIREFOX_LINUX);
        t.db.sqlite.prepare("UPDATE sessions SET expires_at = '2020-01-01T00:00:00.000Z' WHERE id = ?").run(old.sid);

        expect(await deleteExpiredSessions(t.env)).toBe(1);
        expect(t.rows('SELECT id FROM sessions').map((r) => r.id)).toEqual([kept.sid]);
    });

    it.each([
        [CHROME_WINDOWS, 'Chrome on Windows'],
        [FIREFOX_LINUX, 'Firefox on Linux'],
        ['Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Version/17.0 Mobile/15E148 Safari/604.1', 'Safari on iOS'],
        ['Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/126.0 Safari/537.36 Edg/126.0', 'Edge on macOS'],
        [null, 'Unknown device'],
    ])('describes %s', (ua, expected) => expect(describeDevice(ua)).toBe(expected));
});

describe('sync room', () => {
    function room() {
        const state = {
            blockConcurrencyWhile: (fn) => fn(),
            storage: { get: async () => null, put: async () => {} },
            getWebSockets: () => [],
            acceptWebSocket: () => {},
        };
        return new WorkspaceDurableObject(state, {});
    }
    const socket = () => ({ close: vi.fn(), send: vi.fn() });

    it('closes only the sockets of the ended logins', async () => {
        const doc = room();
        const ended = socket(), other = socket(), legacy = socket();
        doc.sessions.set(ended, { sessionId: 7 });
        doc.sessions.set(other, { sessionId: 8 });
        doc.sessions.set(legacy, { sessionId: null });

        const res = await doc.fetch(new Request(`https://sync${CLOSE_SOCKETS_PATH}`, {
            method: 'POST', body: JSON.stringify({ sessionIds: [7] }),
        }));
        expect(await res.json()).toEqual({ closed: 1 });
        expect(ended.close).toHaveBeenCalledWith(SESSION_ENDED_CODE, 'Session ended');
        expect(other.close).not.toHaveBeenCalled();
        expect(legacy.close).not.toHaveBeenCalled();
        expect([...doc.sessions.keys()]).toEqual([other, legacy]);
    });
});
