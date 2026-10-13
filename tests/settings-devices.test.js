import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../config.js', async (importOriginal) => ({
    ...(await importOriginal()),
    isCloudSyncEnabled: vi.fn(() => true),
}));
vi.mock('../api/auth.js', () => ({
    isAuthenticated: vi.fn(() => true),
    getUser: vi.fn(),
    resendVerificationEmail: vi.fn(),
}));
vi.mock('../api/user.js', () => ({
    getStorageUsage: vi.fn(),
    listSessions: vi.fn(),
    endSession: vi.fn(async () => ({ ended: 1 })),
    endOtherSessions: vi.fn(async () => ({ ended: 1 })),
}));

const { settingsView } = await import('../settings.view.js');
const { listSessions, endSession, endOtherSessions } = await import('../api/user.js');
const { isAuthenticated } = await import('../api/auth.js');

const ago = (minutes) => new Date(Date.now() - minutes * 60_000).toISOString();
const THIS = { id: 1, device: 'Chrome on Windows', ipAddress: '1.2.3.4', createdAt: ago(600), lastActivityAt: ago(0), current: true };
const PHONE = { id: 2, device: 'Safari on iOS', ipAddress: null, createdAt: ago(3000), lastActivityAt: ago(90), current: false };

const flush = () => new Promise((r) => setTimeout(r, 0));
const section = () => document.getElementById('devices-section');

beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(isAuthenticated).mockReturnValue(true);
    document.body.innerHTML = `
        <section id="devices-section" class="hidden">
            <ul id="devices-list"></ul>
            <button id="sign-out-others-btn" class="hidden"></button>
        </section>`;
});

describe('settings signed-in devices', () => {
    it('lists devices, marks this one and offers sign-out for the others only', async () => {
        vi.mocked(listSessions).mockResolvedValue([THIS, PHONE]);
        await settingsView.setupDevices();

        expect(section().classList.contains('hidden')).toBe(false);
        const items = document.querySelectorAll('#devices-list li');
        expect(items[0].textContent).toContain('This device');
        expect(items[0].querySelector('button')).toBeNull();
        expect(items[1].textContent).toContain('Safari on iOS');
        expect(items[1].textContent).toMatch(/2 hours ago|90 minutes ago/);
        expect(document.getElementById('sign-out-others-btn').classList.contains('hidden')).toBe(false);
    });

    it('signs a device out and reloads the list', async () => {
        vi.mocked(listSessions).mockResolvedValueOnce([THIS, PHONE]).mockResolvedValueOnce([THIS]);
        await settingsView.setupDevices();

        document.querySelector('button[data-session-id="2"]').click();
        await flush(); await flush();
        expect(endSession).toHaveBeenCalledWith('2');
        expect(document.querySelectorAll('#devices-list li')).toHaveLength(1);
        expect(document.getElementById('sign-out-others-btn').classList.contains('hidden')).toBe(true);
    });

    it('signs out all other devices after confirmation', async () => {
        vi.mocked(listSessions).mockResolvedValue([THIS, PHONE]);
        vi.stubGlobal('confirm', vi.fn(() => true));
        await settingsView.setupDevices();

        document.getElementById('sign-out-others-btn').click();
        await flush();
        expect(endOtherSessions).toHaveBeenCalledTimes(1);
        vi.unstubAllGlobals();
    });

    it('escapes device text', async () => {
        vi.mocked(listSessions).mockResolvedValue([{ ...PHONE, device: '<img src=x onerror=alert(1)>' }]);
        await settingsView.setupDevices();
        expect(document.querySelector('#devices-list img')).toBeNull();
    });

    it('stays hidden when signed out or when the request fails', async () => {
        vi.mocked(isAuthenticated).mockReturnValue(false);
        await settingsView.setupDevices();
        expect(listSessions).not.toHaveBeenCalled();
        expect(section().classList.contains('hidden')).toBe(true);

        vi.mocked(isAuthenticated).mockReturnValue(true);
        vi.mocked(listSessions).mockRejectedValue(new Error('offline'));
        await settingsView.setupDevices();
        expect(section().classList.contains('hidden')).toBe(true);
    });
});
