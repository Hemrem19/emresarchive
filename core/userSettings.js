/**
 * Preferences that follow the user across devices.
 *
 * They stay in localStorage as before. When the user changes one while signed
 * in, the change is sent to the account (debounced, one small request). Other
 * devices receive the account's preferences with login and token-refresh
 * responses, which they make anyway, so syncing adds no polling.
 */
import { API_CONFIG } from '../config.js';

/** localStorage key → how it is stored there (account values are typed). */
const SYNCED = {
    readingStatusOrder: {
        read: (raw) => JSON.parse(raw),
        write: (value) => JSON.stringify(value),
        valid: (v) => Array.isArray(v) && v.length > 0 && v.every((s) => typeof s === 'string' && s.trim()),
    },
    currentSortBy: {
        read: (raw) => raw,
        write: String,
        valid: (v) => typeof v === 'string' && /^[\w-]{1,40}$/.test(v),
    },
    itemsPerPage: {
        read: (raw) => Number(raw),
        write: String,
        valid: (v) => Number.isInteger(v) && v >= 1 && v <= 500,
    },
};

export const SETTINGS_APPLIED = 'citavers:settings-applied';
const PENDING_KEY = 'citavers_settings_pending';
const PUSH_DELAY_MS = 1500;
let pushTimer = null;

const signedIn = () => !!localStorage.getItem(API_CONFIG.ACCESS_TOKEN_KEY);

/** The synced preferences this device has set. */
export function localSettings() {
    const settings = {};
    for (const [key, { read, valid }] of Object.entries(SYNCED)) {
        const raw = localStorage.getItem(key);
        if (raw === null) continue;
        try {
            const value = read(raw);
            if (valid(value)) settings[key] = value;
        } catch { /* unreadable: leave it out */ }
    }
    return settings;
}

/** Call after the user changes a synced preference. */
export function settingsChanged() {
    if (!signedIn()) return;
    localStorage.setItem(PENDING_KEY, '1');
    clearTimeout(pushTimer);
    pushTimer = setTimeout(pushSettings, PUSH_DELAY_MS);
}

async function pushSettings() {
    pushTimer = null;
    if (!signedIn()) return;
    try {
        // Loaded on use: api/user.js → api/sync.js → api/auth.js imports this module
        const { saveSettings } = await import('../api/user.js');
        await saveSettings(localSettings());
        localStorage.removeItem(PENDING_KEY);
    } catch (error) {
        // Stays pending; the next login or refresh sends it instead of overwriting it
        console.warn('[Settings] Could not save preferences to the account:', error.message);
    }
}

/** On sign-out: an unsaved change must not reach the next account signed in here. */
export function forgetPendingSettings() {
    clearTimeout(pushTimer);
    pushTimer = null;
    localStorage.removeItem(PENDING_KEY);
}

/**
 * Takes the account's preferences from a login or refresh response. A local
 * change not yet saved (offline) wins and is sent instead.
 * @returns {string[]} The keys that changed on this device
 */
export function applyAccountSettings(settings) {
    if (!settings || typeof settings !== 'object') return [];
    if (localStorage.getItem(PENDING_KEY)) {
        if (!pushTimer) pushSettings();
        return [];
    }
    const changed = [];
    for (const [key, { write, valid }] of Object.entries(SYNCED)) {
        if (!Object.hasOwn(settings, key) || !valid(settings[key])) continue;
        const value = write(settings[key]);
        if (localStorage.getItem(key) === value) continue;
        localStorage.setItem(key, value);
        changed.push(key);
    }
    if (changed.length) window.dispatchEvent(new CustomEvent(SETTINGS_APPLIED, { detail: { settings, changed } }));
    return changed;
}
