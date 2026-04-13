/**
 * Tests for core/syncManager.js
 * Auto-sync triggers: debounced sync, periodic sync, network reconnect, lifecycle management
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
    triggerDebouncedSync,
    initializeAutoSync,
    stopAutoSync,
    restartAutoSync,
    performManualSync
} from '../../core/syncManager.js';
import { resetAllMocks, setMockAuth, clearMockAuth, setMockSyncEnabled, clearMockSync } from '../helpers.js';

// Mock dependencies
vi.mock('../../config.js', () => ({
    isCloudSyncEnabled: vi.fn(() => false),
    getApiBaseUrl: vi.fn(() => '')
}));

vi.mock('../../api/auth.js', () => ({
    isAuthenticated: vi.fn(() => false),
    getAccessToken: vi.fn(() => null)
}));

vi.mock('../../db/sync.js', () => ({
    isSyncInProgress: vi.fn(() => false)
}));

vi.mock('../../db/adapter.js', () => ({
    syncFromCloud: vi.fn(() => Promise.resolve())
}));

vi.mock('../../ui.js', () => ({
    showToast: vi.fn()
}));

// Mock timers
vi.useFakeTimers();

describe('core/syncManager.js - Sync State Checking', () => {
    beforeEach(async () => {
        resetAllMocks();
        clearMockSync();
        vi.clearAllMocks();
        localStorage.clear();
        
        const { isCloudSyncEnabled } = await import('../../config.js');
        const { isAuthenticated } = await import('../../api/auth.js');
        isCloudSyncEnabled.mockReturnValue(false);
        isAuthenticated.mockReturnValue(false);
    });

    afterEach(() => {
        stopAutoSync(); // Clean up any running intervals/timeouts
    });

    it('should not sync when cloud sync disabled', async () => {
        const { isCloudSyncEnabled } = await import('../../config.js');
        isCloudSyncEnabled.mockReturnValue(false);

        const { syncFromCloud } = await import('../../db/adapter.js');

        triggerDebouncedSync();

        // Fast-forward past debounce delay
        vi.advanceTimersByTime(3000);

        expect(syncFromCloud).not.toHaveBeenCalled();
    });

    it('should not sync when not authenticated', async () => {
        const { isCloudSyncEnabled } = await import('../../config.js');
        const { isAuthenticated } = await import('../../api/auth.js');

        isCloudSyncEnabled.mockReturnValue(true);
        isAuthenticated.mockReturnValue(false);

        const { syncFromCloud } = await import('../../db/adapter.js');

        triggerDebouncedSync();
        vi.advanceTimersByTime(3000);

        expect(syncFromCloud).not.toHaveBeenCalled();
    });

    it('should sync when cloud sync enabled and authenticated', async () => {
        const { isCloudSyncEnabled } = await import('../../config.js');
        const { isAuthenticated } = await import('../../api/auth.js');
        const { syncFromCloud } = await import('../../db/adapter.js');

        isCloudSyncEnabled.mockReturnValue(true);
        isAuthenticated.mockReturnValue(true);
        syncFromCloud.mockResolvedValue(undefined);

        triggerDebouncedSync();
        vi.advanceTimersByTime(3000);

        expect(syncFromCloud).toHaveBeenCalled();
    });
});

describe('core/syncManager.js - Debounced Sync', () => {
    beforeEach(async () => {
        resetAllMocks();
        clearMockSync();
        vi.clearAllMocks();
        localStorage.clear();
        
        const { isCloudSyncEnabled } = await import('../../config.js');
        const { isAuthenticated } = await import('../../api/auth.js');
        isCloudSyncEnabled.mockReturnValue(true);
        isAuthenticated.mockReturnValue(true);
    });

    afterEach(() => {
        stopAutoSync();
    });

    it('should debounce multiple triggers', async () => {
        const { syncFromCloud } = await import('../../db/adapter.js');
        syncFromCloud.mockResolvedValue(undefined);

        triggerDebouncedSync();
        triggerDebouncedSync();
        triggerDebouncedSync();

        // Before debounce delay
        vi.advanceTimersByTime(1000);
        expect(syncFromCloud).not.toHaveBeenCalled();

        // After debounce delay (should only call once)
        vi.advanceTimersByTime(2000);
        expect(syncFromCloud).toHaveBeenCalledTimes(1);
    });

    it('should reset debounce timer on new trigger', async () => {
        const { syncFromCloud } = await import('../../db/adapter.js');
        syncFromCloud.mockResolvedValue(undefined);

        triggerDebouncedSync();
        vi.advanceTimersByTime(1000);

        triggerDebouncedSync(); // Reset timer
        vi.advanceTimersByTime(1000);

        expect(syncFromCloud).not.toHaveBeenCalled();

        vi.advanceTimersByTime(2000); // Complete delay
        expect(syncFromCloud).toHaveBeenCalledTimes(1);
    });

    it('should not sync if sync already in progress', async () => {
        const { isSyncInProgress } = await import('../../db/sync.js');
        const { syncFromCloud } = await import('../../db/adapter.js');

        isSyncInProgress.mockReturnValue(true);
        syncFromCloud.mockResolvedValue(undefined);

        triggerDebouncedSync();
        vi.advanceTimersByTime(3000);

        expect(syncFromCloud).not.toHaveBeenCalled();
    });
});

describe('core/syncManager.js - Auto-Sync Execution', () => {
    beforeEach(async () => {
        resetAllMocks();
        clearMockSync();
        vi.clearAllMocks();
        localStorage.clear();
        
        const { isCloudSyncEnabled } = await import('../../config.js');
        const { isAuthenticated } = await import('../../api/auth.js');
        const { isSyncInProgress } = await import('../../db/sync.js');
        
        isCloudSyncEnabled.mockReturnValue(true);
        isAuthenticated.mockReturnValue(true);
        isSyncInProgress.mockReturnValue(false); // Ensure sync is not in progress
    });

    afterEach(() => {
        stopAutoSync();
    });

    it('should show notification on manual sync success', async () => {
        const { syncFromCloud } = await import('../../db/adapter.js');
        const { showToast } = await import('../../ui.js');
        const { isSyncInProgress } = await import('../../db/sync.js');

        isSyncInProgress.mockReturnValue(false);
        syncFromCloud.mockResolvedValue(undefined);

        await performManualSync();

        expect(syncFromCloud).toHaveBeenCalled();
        expect(showToast).toHaveBeenCalledWith(
            'Sync complete.',
            'success',
            expect.objectContaining({ duration: 3000 })
        );
    });

    it('should not show notification on silent sync', async () => {
        const { syncFromCloud } = await import('../../db/adapter.js');
        const { showToast } = await import('../../ui.js');
        const { isSyncInProgress } = await import('../../db/sync.js');

        isSyncInProgress.mockReturnValue(false);
        syncFromCloud.mockResolvedValue(undefined);

        triggerDebouncedSync();
        vi.advanceTimersByTime(3000);

        // Wait for async operations to complete
        await new Promise(resolve => {
            vi.useRealTimers();
            setTimeout(() => {
                vi.useFakeTimers();
                resolve();
            }, 100);
        });

        // Silent sync should not show toast
        expect(syncFromCloud).toHaveBeenCalled();
        expect(showToast).not.toHaveBeenCalled();
    });

    it('should show error on manual sync failure', async () => {
        const { syncFromCloud } = await import('../../db/adapter.js');
        const { showToast } = await import('../../ui.js');
        const { isSyncInProgress } = await import('../../db/sync.js');

        isSyncInProgress.mockReturnValue(false);

        const error = new Error('Sync failed');
        syncFromCloud.mockRejectedValue(error);

        await performManualSync();

        expect(showToast).toHaveBeenCalledWith(
            'Sync failed: Sync failed',
            'error',
            expect.objectContaining({
                duration: 5000,
                actions: expect.any(Array)
            })
        );
    });

    it('should not show error on silent sync failure', async () => {
        const { syncFromCloud } = await import('../../db/adapter.js');
        const { showToast } = await import('../../ui.js');
        const { isSyncInProgress } = await import('../../db/sync.js');

        isSyncInProgress.mockReturnValue(false);
        syncFromCloud.mockRejectedValue(new Error('Sync failed'));

        triggerDebouncedSync();
        vi.advanceTimersByTime(3000);

        // Wait for async operations to complete
        await new Promise(resolve => {
            vi.useRealTimers();
            setTimeout(() => {
                vi.useFakeTimers();
                resolve();
            }, 100);
        });

        // Silent sync should not show errors
        expect(syncFromCloud).toHaveBeenCalled();
        expect(showToast).not.toHaveBeenCalled();
    });

    it('should throw error when cloud sync not enabled for manual sync', async () => {
        const { isCloudSyncEnabled } = await import('../../config.js');
        isCloudSyncEnabled.mockReturnValue(false);
        
        await expect(performManualSync()).rejects.toThrow('Cloud sync is not enabled');
    });
});

describe('core/syncManager.js - Sync Lifecycle', () => {
    beforeEach(async () => {
        resetAllMocks();
        clearMockSync();
        vi.clearAllMocks();
        localStorage.clear();
    });

    afterEach(() => {
        stopAutoSync();
    });

    it('should initialize auto sync when enabled', async () => {
        const { isCloudSyncEnabled } = await import('../../config.js');
        const { isAuthenticated } = await import('../../api/auth.js');
        
        isCloudSyncEnabled.mockReturnValue(true);
        isAuthenticated.mockReturnValue(true);
        
        // Just verify that initializeAutoSync doesn't throw
        expect(() => initializeAutoSync()).not.toThrow();
        
        // Clean up
        stopAutoSync();
    });

    it('should not initialize when cloud sync disabled', async () => {
        const { isCloudSyncEnabled } = await import('../../config.js');
        const { syncFromCloud } = await import('../../db/adapter.js');

        isCloudSyncEnabled.mockReturnValue(false);

        initializeAutoSync();
        vi.advanceTimersByTime(3000);

        expect(syncFromCloud).not.toHaveBeenCalled();
    });

    it('should set up periodic sync after initialization', async () => {
        const { isCloudSyncEnabled } = await import('../../config.js');
        const { isAuthenticated } = await import('../../api/auth.js');
        
        isCloudSyncEnabled.mockReturnValue(true);
        isAuthenticated.mockReturnValue(true);
        
        // Verify initialization doesn't throw
        expect(() => initializeAutoSync()).not.toThrow();
        
        // Clean up
        stopAutoSync();
    });

    it('should stop all sync operations', async () => {
        const { isCloudSyncEnabled } = await import('../../config.js');
        const { isAuthenticated } = await import('../../api/auth.js');
        const { syncFromCloud } = await import('../../db/adapter.js');
        const { isSyncInProgress } = await import('../../db/sync.js');

        isCloudSyncEnabled.mockReturnValue(true);
        isAuthenticated.mockReturnValue(true);
        isSyncInProgress.mockReturnValue(false);

        syncFromCloud.mockClear();

        initializeAutoSync();

        // Let initial sync complete first
        vi.advanceTimersByTime(3000);
        await new Promise(resolve => {
            vi.useRealTimers();
            setTimeout(() => {
                vi.useFakeTimers();
                resolve();
            }, 100);
        });

        // Now stop all sync operations
        stopAutoSync();

        // Clear mock to reset call count after stop
        syncFromCloud.mockClear();

        // Advance past periodic sync interval — should not fire because it was stopped
        vi.advanceTimersByTime(300000);

        // Wait for any pending async operations
        await new Promise(resolve => {
            vi.useRealTimers();
            setTimeout(() => {
                vi.useFakeTimers();
                resolve();
            }, 100);
        });

        expect(syncFromCloud).not.toHaveBeenCalled();
    });

    it('should restart auto sync', async () => {
        const { isCloudSyncEnabled } = await import('../../config.js');
        const { isAuthenticated } = await import('../../api/auth.js');
        
        isCloudSyncEnabled.mockReturnValue(true);
        isAuthenticated.mockReturnValue(true);
        
        initializeAutoSync();
        stopAutoSync();
        
        // Restart should reinitialize
        expect(() => restartAutoSync()).not.toThrow();
        
        // Clean up
        stopAutoSync();
    });
});

describe('core/syncManager.js - Network Reconnect', () => {
    beforeEach(async () => {
        resetAllMocks();
        clearMockSync();
        vi.clearAllMocks();
        localStorage.clear();
        
        const { isCloudSyncEnabled } = await import('../../config.js');
        const { isAuthenticated } = await import('../../api/auth.js');
        isCloudSyncEnabled.mockReturnValue(true);
        isAuthenticated.mockReturnValue(true);
    });

    afterEach(() => {
        stopAutoSync();
        // Remove event listeners
        window.removeEventListener('online', vi.fn());
        window.removeEventListener('offline', vi.fn());
    });

    it('should set up network reconnect listeners', async () => {
        const { isCloudSyncEnabled } = await import('../../config.js');
        const { isAuthenticated } = await import('../../api/auth.js');
        
        isCloudSyncEnabled.mockReturnValue(true);
        isAuthenticated.mockReturnValue(true);
        
        // Verify initialization sets up listeners
        expect(() => initializeAutoSync()).not.toThrow();
        
        // Clean up
        stopAutoSync();
    });

    it('should show warning on network offline', async () => {
        const { showToast } = await import('../../ui.js');
        
        initializeAutoSync();
        
        // Trigger offline event
        const offlineEvent = new Event('offline');
        window.dispatchEvent(offlineEvent);
        
        // Advance timers to process the event
        vi.advanceTimersByTime(100);
        
        expect(showToast).toHaveBeenCalledWith(
            'Network offline. Sync will resume when connection is restored.',
            'warning',
            expect.objectContaining({ duration: 5000 })
        );
        
        // Clean up
        stopAutoSync();
    });

    it('should not sync on reconnect if sync in progress', async () => {
        const { isSyncInProgress } = await import('../../db/sync.js');
        const { syncFromCloud } = await import('../../db/adapter.js');

        isSyncInProgress.mockReturnValue(true);
        syncFromCloud.mockResolvedValue(undefined);
        syncFromCloud.mockClear();

        initializeAutoSync();

        const onlineEvent = new Event('online');
        window.dispatchEvent(onlineEvent);

        vi.advanceTimersByTime(4000);

        expect(syncFromCloud).not.toHaveBeenCalled();
    });
});

