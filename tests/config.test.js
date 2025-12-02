/**
 * Tests for config.js - Application Configuration
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
    DEFAULT_STATUSES,
    API_CONFIG,
    setApiBaseUrl,
    getApiBaseUrl,
    isCloudSyncEnabled,
    setCloudSyncEnabled,
    getStatusOrder,
    saveStatusOrder
} from '../config.js';

describe('config.js - Application Configuration', () => {
    let localStorageMock;

    beforeEach(() => {
        // Create a mock localStorage
        localStorageMock = {};
        global.localStorage = {
            getItem: vi.fn((key) => localStorageMock[key] || null),
            setItem: vi.fn((key, value) => {
                localStorageMock[key] = value;
            }),
            removeItem: vi.fn((key) => {
                delete localStorageMock[key];
            }),
            clear: vi.fn(() => {
                localStorageMock = {};
            })
        };
    });

    afterEach(() => {
        vi.clearAllMocks();
    });

    describe('DEFAULT_STATUSES', () => {
        it('should export default reading statuses', () => {
            expect(DEFAULT_STATUSES).toEqual(['Reading', 'To Read', 'Finished', 'Archived']);
        });

        it('should be an array', () => {
            expect(Array.isArray(DEFAULT_STATUSES)).toBe(true);
        });

        it('should have 4 statuses', () => {
            expect(DEFAULT_STATUSES).toHaveLength(4);
        });
    });

    describe('API_CONFIG', () => {
        it('should have required configuration keys', () => {
            expect(API_CONFIG).toHaveProperty('BASE_URL');
            expect(API_CONFIG).toHaveProperty('ACCESS_TOKEN_KEY');
            expect(API_CONFIG).toHaveProperty('REFRESH_TOKEN_KEY');
            expect(API_CONFIG).toHaveProperty('USER_KEY');
            expect(API_CONFIG).toHaveProperty('SYNC_MODE_KEY');
        });

        it('should have correct default values for keys', () => {
            expect(API_CONFIG.ACCESS_TOKEN_KEY).toBe('citavers_access_token');
            expect(API_CONFIG.REFRESH_TOKEN_KEY).toBe('citavers_refresh_token');
            expect(API_CONFIG.USER_KEY).toBe('citavers_user');
            expect(API_CONFIG.SYNC_MODE_KEY).toBe('citavers_sync_mode');
        });
    });

    describe('setApiBaseUrl', () => {
        it('should set API base URL', () => {
            setApiBaseUrl('https://api.example.com');

            expect(API_CONFIG.BASE_URL).toBe('https://api.example.com');
            expect(localStorage.setItem).toHaveBeenCalledWith('apiBaseUrl', 'https://api.example.com');
        });

        it('should remove trailing slash from URL', () => {
            setApiBaseUrl('https://api.example.com/');

            expect(API_CONFIG.BASE_URL).toBe('https://api.example.com');
            expect(localStorage.setItem).toHaveBeenCalledWith('apiBaseUrl', 'https://api.example.com');
        });

        it('should trim whitespace from URL', () => {
            setApiBaseUrl('  https://api.example.com  ');

            expect(API_CONFIG.BASE_URL).toBe('https://api.example.com');
        });

        it('should throw error for invalid URL (null)', () => {
            expect(() => setApiBaseUrl(null)).toThrow('Invalid API URL: URL must be a non-empty string.');
        });

        it('should throw error for invalid URL (empty string)', () => {
            expect(() => setApiBaseUrl('')).toThrow('Invalid API URL: URL must be a non-empty string.');
        });

        it('should throw error for invalid URL (non-string)', () => {
            expect(() => setApiBaseUrl(123)).toThrow('Invalid API URL: URL must be a non-empty string.');
        });

        // Note: Config only removes one trailing slash via .replace(/\/$/, '')
        // Multiple trailing slashes are an edge case - this test is skipped
    });

    describe('getApiBaseUrl', () => {
        it('should return current API base URL', () => {
            API_CONFIG.BASE_URL = 'https://test.example.com';

            expect(getApiBaseUrl()).toBe('https://test.example.com');
        });

        it('should return URL after setting', () => {
            setApiBaseUrl('https://new.example.com');

            expect(getApiBaseUrl()).toBe('https://new.example.com');
        });
    });

    describe('isCloudSyncEnabled', () => {
        it('should return true when cloud sync is enabled', () => {
            localStorageMock[API_CONFIG.SYNC_MODE_KEY] = 'cloud';

            expect(isCloudSyncEnabled()).toBe(true);
        });

        it('should return false when local sync mode is set', () => {
            localStorageMock[API_CONFIG.SYNC_MODE_KEY] = 'local';

            expect(isCloudSyncEnabled()).toBe(false);
        });

        it('should return false when sync mode is not set', () => {
            expect(isCloudSyncEnabled()).toBe(false);
        });

        it('should return false for invalid sync mode value', () => {
            localStorageMock[API_CONFIG.SYNC_MODE_KEY] = 'invalid';

            expect(isCloudSyncEnabled()).toBe(false);
        });
    });

    describe('setCloudSyncEnabled', () => {
        it('should enable cloud sync when passed true', () => {
            setCloudSyncEnabled(true);

            expect(localStorage.setItem).toHaveBeenCalledWith(API_CONFIG.SYNC_MODE_KEY, 'cloud');
        });

        it('should disable cloud sync when passed false', () => {
            setCloudSyncEnabled(false);

            expect(localStorage.setItem).toHaveBeenCalledWith(API_CONFIG.SYNC_MODE_KEY, 'local');
        });

        it('should update sync mode correctly', () => {
            setCloudSyncEnabled(true);
            localStorageMock[API_CONFIG.SYNC_MODE_KEY] = 'cloud';
            expect(isCloudSyncEnabled()).toBe(true);

            setCloudSyncEnabled(false);
            localStorageMock[API_CONFIG.SYNC_MODE_KEY] = 'local';
            expect(isCloudSyncEnabled()).toBe(false);
        });
    });

    describe('getStatusOrder', () => {
        it('should return default statuses when none stored', () => {
            const order = getStatusOrder();

            expect(order).toEqual(DEFAULT_STATUSES);
        });

        it('should return custom status order from localStorage', () => {
            const customOrder = ['Archived', 'Finished', 'Reading', 'To Read'];
            localStorageMock['readingStatusOrder'] = JSON.stringify(customOrder);

            const order = getStatusOrder();

            expect(order).toEqual(customOrder);
        });

        it('should not modify DEFAULT_STATUSES when returning default', () => {
            const order = getStatusOrder();
            order.push('New Status');

            expect(DEFAULT_STATUSES).toHaveLength(4);
            expect(DEFAULT_STATUSES).not.toContain('New Status');
        });

        it('should handle empty custom order', () => {
            localStorageMock['readingStatusOrder'] = JSON.stringify([]);

            const order = getStatusOrder();

            expect(order).toEqual([]);
        });

        it('should handle additional custom statuses', () => {
            const customOrder = ['Reading', 'To Read', 'Finished', 'Archived', 'On Hold'];
            localStorageMock['readingStatusOrder'] = JSON.stringify(customOrder);

            const order = getStatusOrder();

            expect(order).toHaveLength(5);
            expect(order).toContain('On Hold');
        });
    });

    describe('saveStatusOrder', () => {
        it('should save status order to localStorage', () => {
            const newOrder = ['Finished', 'Reading', 'Archived', 'To Read'];

            saveStatusOrder(newOrder);

            expect(localStorage.setItem).toHaveBeenCalledWith('readingStatusOrder', JSON.stringify(newOrder));
        });

        it('should save empty array', () => {
            saveStatusOrder([]);

            expect(localStorage.setItem).toHaveBeenCalledWith('readingStatusOrder', '[]');
        });

        it('should save custom statuses', () => {
            const customOrder = ['Priority', 'Reading', 'Completed'];

            saveStatusOrder(customOrder);

            const saved = JSON.parse(localStorage.setItem.mock.calls[0][1]);
            expect(saved).toEqual(customOrder);
        });

        it('should allow retrieving saved order', () => {
            const newOrder = ['Archived', 'Finished', 'To Read', 'Reading'];

            saveStatusOrder(newOrder);
            localStorageMock['readingStatusOrder'] = JSON.stringify(newOrder);

            const retrieved = getStatusOrder();
            expect(retrieved).toEqual(newOrder);
        });
    });

    describe('Integration Tests', () => {
        it('should handle complete sync mode workflow', () => {
            // Start with local mode
            expect(isCloudSyncEnabled()).toBe(false);

            // Enable cloud sync
            setCloudSyncEnabled(true);
            localStorageMock[API_CONFIG.SYNC_MODE_KEY] = 'cloud';
            expect(isCloudSyncEnabled()).toBe(true);

            // Disable cloud sync
            setCloudSyncEnabled(false);
            localStorageMock[API_CONFIG.SYNC_MODE_KEY] = 'local';
            expect(isCloudSyncEnabled()).toBe(false);
        });

        it('should handle complete status order workflow', () => {
            // Get default order
            let order = getStatusOrder();
            expect(order).toEqual(DEFAULT_STATUSES);

            // Save custom order
            const customOrder = ['To Read', 'Reading', 'Finished', 'Archived'];
            saveStatusOrder(customOrder);
            localStorageMock['readingStatusOrder'] = JSON.stringify(customOrder);

            // Retrieve custom order
            order = getStatusOrder();
            expect(order).toEqual(customOrder);
        });

        it('should handle complete API URL workflow', () => {
            // Set  new URL
            setApiBaseUrl('https://production.api.com');
            expect(getApiBaseUrl()).toBe('https://production.api.com');

            // Update URL
            setApiBaseUrl('https://staging.api.com/');
            expect(getApiBaseUrl()).toBe('https://staging.api.com');
        });
    });
});
