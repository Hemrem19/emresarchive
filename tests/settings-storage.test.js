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
vi.mock('../api/user.js', () => ({ getStorageUsage: vi.fn() }));

const { settingsView } = await import('../settings.view.js');
const { getStorageUsage } = await import('../api/user.js');
const { isAuthenticated } = await import('../api/auth.js');

let list;
beforeEach(() => {
    document.body.innerHTML = '<dl id="stats-list"></dl>';
    list = document.getElementById('stats-list');
    vi.mocked(isAuthenticated).mockReturnValue(true);
});

describe('settings cloud storage usage', () => {
    it('shows used and total storage with a proportional bar', async () => {
        vi.mocked(getStorageUsage).mockResolvedValue({ usedBytes: 512 * 1024 ** 2, limitBytes: 2 * 1024 ** 3 });
        await settingsView.renderStorageUsage(list);

        expect(list.textContent).toContain('512.0 MB of 2.00 GB used');
        expect(list.querySelector('[role="progressbar"]').getAttribute('aria-valuenow')).toBe('25');
    });

    it('warns in red when nearly full', async () => {
        vi.mocked(getStorageUsage).mockResolvedValue({ usedBytes: 95, limitBytes: 100 });
        await settingsView.renderStorageUsage(list);
        expect(list.querySelector('.bg-red-500')).not.toBeNull();
    });

    it('shows nothing when signed out or when the request fails', async () => {
        vi.mocked(isAuthenticated).mockReturnValue(false);
        await settingsView.renderStorageUsage(list);
        expect(list.innerHTML).toBe('');

        vi.mocked(isAuthenticated).mockReturnValue(true);
        vi.mocked(getStorageUsage).mockRejectedValue(new Error('offline'));
        await settingsView.renderStorageUsage(list);
        expect(list.innerHTML).toBe('');
    });
});
