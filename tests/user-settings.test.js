/**
 * core/userSettings.js: preferences follow the user across devices.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { API_CONFIG } from '../config.js';

const saveSettings = vi.fn(async (s) => s);
vi.mock('../api/user.js', () => ({ saveSettings: (...a) => saveSettings(...a) }));

const {
    applyAccountSettings, forgetPendingSettings, localSettings, settingsChanged, SETTINGS_APPLIED,
} = await import('../core/userSettings.js');

const signIn = () => localStorage.setItem(API_CONFIG.ACCESS_TOKEN_KEY, 'token');

beforeEach(() => {
    localStorage.clear();
    saveSettings.mockClear();
    vi.useFakeTimers();
});
afterEach(() => {
    forgetPendingSettings();
    vi.useRealTimers();
});

describe('localSettings', () => {
    it('reads the synced preferences in their account form, skipping invalid ones', () => {
        localStorage.setItem('readingStatusOrder', JSON.stringify(['Reading', 'To Read']));
        localStorage.setItem('itemsPerPage', '50');
        localStorage.setItem('currentSortBy', '<bad>');
        localStorage.setItem('searchTerm', 'not synced');
        expect(localSettings()).toEqual({ readingStatusOrder: ['Reading', 'To Read'], itemsPerPage: 50 });
    });
});

describe('settingsChanged', () => {
    it('sends one debounced request with the current preferences', async () => {
        signIn();
        localStorage.setItem('itemsPerPage', '10');
        settingsChanged();
        localStorage.setItem('currentSortBy', 'title');
        settingsChanged();
        await vi.runAllTimersAsync();

        expect(saveSettings).toHaveBeenCalledTimes(1);
        expect(saveSettings).toHaveBeenCalledWith({ itemsPerPage: 10, currentSortBy: 'title' });
    });

    it('does nothing when signed out', async () => {
        settingsChanged();
        await vi.runAllTimersAsync();
        expect(saveSettings).not.toHaveBeenCalled();
    });
});

describe('applyAccountSettings', () => {
    it('stores the account preferences and reports what changed', () => {
        localStorage.setItem('itemsPerPage', '25');
        const seen = vi.fn();
        window.addEventListener(SETTINGS_APPLIED, seen);

        const changed = applyAccountSettings({ itemsPerPage: 25, currentSortBy: 'title', readingStatusOrder: ['Finished', 'Reading'] });

        expect(changed).toEqual(['readingStatusOrder', 'currentSortBy']);
        expect(localStorage.getItem('currentSortBy')).toBe('title');
        expect(JSON.parse(localStorage.getItem('readingStatusOrder'))).toEqual(['Finished', 'Reading']);
        expect(seen.mock.calls[0][0].detail.changed).toEqual(changed);
        window.removeEventListener(SETTINGS_APPLIED, seen);
    });

    it('ignores unknown and malformed values', () => {
        expect(applyAccountSettings({ theme: 'light', itemsPerPage: 'lots' })).toEqual([]);
        expect(applyAccountSettings(null)).toEqual([]);
        expect(localStorage.getItem('itemsPerPage')).toBeNull();
    });

    it('keeps an unsaved local change and sends it instead', async () => {
        signIn();
        saveSettings.mockRejectedValueOnce(new Error('offline'));
        localStorage.setItem('itemsPerPage', '10');
        settingsChanged();
        await vi.runAllTimersAsync();

        expect(applyAccountSettings({ itemsPerPage: 50 })).toEqual([]);
        await vi.runAllTimersAsync();
        expect(localStorage.getItem('itemsPerPage')).toBe('10');
        expect(saveSettings).toHaveBeenLastCalledWith({ itemsPerPage: 10 });

        // Saved now: the account's values apply again
        expect(applyAccountSettings({ itemsPerPage: 50 })).toEqual(['itemsPerPage']);
    });

    it('drops an unsaved change on sign-out', () => {
        signIn();
        settingsChanged();
        forgetPendingSettings();
        expect(applyAccountSettings({ itemsPerPage: 50 })).toEqual(['itemsPerPage']);
    });
});
