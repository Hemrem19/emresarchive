/**
 * This file centralizes application-wide configurations, such as reading statuses.
 */

export const DEFAULT_STATUSES = ['Reading', 'To Read', 'Finished', 'Archived'];
const STATUS_STORAGE_KEY = 'readingStatusOrder';

// Backend API Configuration
export const API_CONFIG = {
    // API URL - defaults to localhost for development, can be overridden
    BASE_URL: localStorage.getItem('apiBaseUrl') || 'http://localhost:3000',
    // Storage keys for auth tokens
    ACCESS_TOKEN_KEY: 'citaversa_access_token',
    REFRESH_TOKEN_KEY: 'citaversa_refresh_token',
    USER_KEY: 'citaversa_user',
    // Sync mode
    SYNC_MODE_KEY: 'citaversa_sync_mode' // 'local' | 'cloud'
};

/**
 * Updates the API base URL and stores it in localStorage.
 * @param {string} url - The new API base URL.
 */
export function setApiBaseUrl(url) {
    if (!url || typeof url !== 'string') {
        throw new Error('Invalid API URL: URL must be a non-empty string.');
    }
    // Remove trailing slash
    const cleanUrl = url.trim().replace(/\/$/, '');
    API_CONFIG.BASE_URL = cleanUrl;
    localStorage.setItem('apiBaseUrl', cleanUrl);
}

/**
 * Gets the current API base URL.
 * @returns {string} The current API base URL.
 */
export function getApiBaseUrl() {
    return API_CONFIG.BASE_URL;
}

/**
 * Checks if cloud sync is enabled.
 * @returns {boolean} True if cloud sync is enabled, false otherwise.
 */
export function isCloudSyncEnabled() {
    const mode = localStorage.getItem(API_CONFIG.SYNC_MODE_KEY);
    return mode === 'cloud';
}

/**
 * Enables or disables cloud sync mode.
 * @param {boolean} enabled - True to enable cloud sync, false for local-only.
 */
export function setCloudSyncEnabled(enabled) {
    localStorage.setItem(API_CONFIG.SYNC_MODE_KEY, enabled ? 'cloud' : 'local');
}

/**
 * Retrieves the user-defined status order from localStorage, or returns the default.
 * @returns {string[]} An array of status strings in the correct order.
 */
export function getStatusOrder() {
    const storedOrder = localStorage.getItem(STATUS_STORAGE_KEY);
    return storedOrder ? JSON.parse(storedOrder) : [...DEFAULT_STATUSES];
}

/**
 * Saves the new status order to localStorage.
 * @param {string[]} newOrder - The new array of status strings to save.
 */
export function saveStatusOrder(newOrder) {
    localStorage.setItem(STATUS_STORAGE_KEY, JSON.stringify(newOrder));
}

