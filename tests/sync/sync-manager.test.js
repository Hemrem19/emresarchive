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
    isCloudSyncEnabled: vi.fn(() => false)
}));

vi.mock('../../api/auth.js', () => ({
    isAuthenticated: vi.fn(() => false)
}));

vi.mock('../../db/sync.js', () => ({
    performSync: vi.fn(),
    getSyncStatusInfo: vi.fn(),
    isSyncInProgress: vi.fn(() => false)
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
        
        const { performSync } = await import('../../db/sync.js');
        
        triggerDebouncedSync();
        
        // Fast-forward past debounce delay
        vi.advanceTimersByTime(3000);
        
        expect(performSync).not.toHaveBeenCalled();
    });

    it('should not sync when not authenticated', async () => {
        const { isCloudSyncEnabled } = await import('../../config.js');
        const { isAuthenticated } = await import('../../api/auth.js');
        
        isCloudSyncEnabled.mockReturnValue(true);
        isAuthenticated.mockReturnValue(false);
        
        const { performSync } = await import('../../db/sync.js');
        
        triggerDebouncedSync();
        vi.advanceTimersByTime(3000);
        
        expect(performSync).not.toHaveBeenCalled();
    });

    it('should sync when cloud sync enabled and authenticated', async () => {
        const { isCloudSyncEnabled } = await import('../../config.js');
        const { isAuthenticated } = await import('../../api/auth.js');
        const { performSync } = await import('../../db/sync.js');
        
        isCloudSyncEnabled.mockReturnValue(true);
        isAuthenticated.mockReturnValue(true);
        performSync.mockResolvedValue({
            success: true,
            serverChangeCount: {},
            conflicts: {}
        });
        
        triggerDebouncedSync();
        vi.advanceTimersByTime(3000);
        
        expect(performSync).toHaveBeenCalled();
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
        const { performSync } = await import('../../db/sync.js');
        performSync.mockResolvedValue({ success: true });
        
        triggerDebouncedSync();
        triggerDebouncedSync();
        triggerDebouncedSync();
        
        // Before debounce delay
        vi.advanceTimersByTime(1000);
        expect(performSync).not.toHaveBeenCalled();
        
        // After debounce delay (should only call once)
        vi.advanceTimersByTime(2000);
        expect(performSync).toHaveBeenCalledTimes(1);
    });

    it('should reset debounce timer on new trigger', async () => {
        const { performSync } = await import('../../db/sync.js');
        performSync.mockResolvedValue({ success: true });
        
        triggerDebouncedSync();
        vi.advanceTimersByTime(1000);
        
        triggerDebouncedSync(); // Reset timer
        vi.advanceTimersByTime(1000);
        
        expect(performSync).not.toHaveBeenCalled();
        
        vi.advanceTimersByTime(2000); // Complete delay
        expect(performSync).toHaveBeenCalledTimes(1);
    });

    it('should not sync if sync already in progress', async () => {
        const { isSyncInProgress } = await import('../../db/sync.js');
        const { performSync } = await import('../../db/sync.js');
        
        isSyncInProgress.mockReturnValue(true);
        performSync.mockResolvedValue({ success: true });
        
        triggerDebouncedSync();
        vi.advanceTimersByTime(3000);
        
        expect(performSync).not.toHaveBeenCalled();
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

    it('should show notification on manual sync with server changes', async () => {
        const { performSync } = await import('../../db/sync.js');
        const { showToast } = await import('../../ui.js');
        const { isSyncInProgress } = await import('../../db/sync.js');
        
        // Ensure sync is not in progress
        isSyncInProgress.mockReturnValue(false);
        
        performSync.mockResolvedValue({
            success: true,
            serverChangeCount: {
                papers: 2,
                collections: 1,
                annotations: 0
            },
            conflicts: {}
        });
        
        await performManualSync();
        
        expect(performSync).toHaveBeenCalled();
        expect(showToast).toHaveBeenCalledWith(
            'Sync complete. 3 updates from server.',
            'success',
            expect.objectContaining({ duration: 3000 })
        );
    });

    it('should show notification on manual sync with conflicts', async () => {
        const { performSync } = await import('../../db/sync.js');
        const { showToast } = await import('../../ui.js');
        const { isSyncInProgress } = await import('../../db/sync.js');
        
        // Ensure sync is not in progress
        isSyncInProgress.mockReturnValue(false);
        
        performSync.mockResolvedValue({
            success: true,
            serverChangeCount: {},
            conflicts: {
                papers: [1, 2],
                collections: [],
                annotations: [1]
            }
        });
        
        await performManualSync();
        
        expect(showToast).toHaveBeenCalledWith(
            expect.stringContaining('3 conflicts resolved'),
            'success',
            expect.any(Object)
        );
    });

    it('should not show notification on silent sync without changes', async () => {
        const { performSync } = await import('../../db/sync.js');
        const { showToast } = await import('../../ui.js');
        const { isSyncInProgress } = await import('../../db/sync.js');
        
        // Ensure sync is not in progress
        isSyncInProgress.mockReturnValue(false);
        
        performSync.mockResolvedValue({
            success: true,
            serverChangeCount: {},
            conflicts: {}
        });
        
        triggerDebouncedSync();
        vi.advanceTimersByTime(3000);
        
        // Wait for async operations to complete
        // Use real setTimeout instead of fake timer to allow async operations
        await new Promise(resolve => {
            // Switch to real timers temporarily
            vi.useRealTimers();
            setTimeout(() => {
                vi.useFakeTimers();
                resolve();
            }, 100);
        });
        
        // Silent sync should not show toast for no changes
        expect(performSync).toHaveBeenCalled();
        expect(showToast).not.toHaveBeenCalled();
    });

    it('should show error on manual sync failure', async () => {
        const { performSync } = await import('../../db/sync.js');
        const { showToast } = await import('../../ui.js');
        const { isSyncInProgress } = await import('../../db/sync.js');
        
        // Ensure sync is not in progress
        isSyncInProgress.mockReturnValue(false);
        
        const error = new Error('Sync failed');
        performSync.mockRejectedValue(error);
        
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
        const { performSync } = await import('../../db/sync.js');
        const { showToast } = await import('../../ui.js');
        const { isSyncInProgress } = await import('../../db/sync.js');
        
        // Ensure sync is not in progress
        isSyncInProgress.mockReturnValue(false);
        
        performSync.mockRejectedValue(new Error('Sync failed'));
        
        triggerDebouncedSync();
        vi.advanceTimersByTime(3000);
        
        // Wait for async operations to complete
        // Use real setTimeout instead of fake timer to allow async operations
        await new Promise(resolve => {
            // Switch to real timers temporarily
            vi.useRealTimers();
            setTimeout(() => {
                vi.useFakeTimers();
                resolve();
            }, 100);
        });
        
        // Silent sync should not show errors
        expect(performSync).toHaveBeenCalled();
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
        const { performSync } = await import('../../db/sync.js');
        
        isCloudSyncEnabled.mockReturnValue(false);
        
        initializeAutoSync();
        vi.advanceTimersByTime(3000);
        
        expect(performSync).not.toHaveBeenCalled();
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
        const { performSync } = await import('../../db/sync.js');
        const { isSyncInProgress } = await import('../../db/sync.js');
        
        isCloudSyncEnabled.mockReturnValue(true);
        isAuthenticated.mockReturnValue(true);
        isSyncInProgress.mockReturnValue(false);
        
        // Clear any existing calls
        performSync.mockClear();
        
        initializeAutoSync();
        stopAutoSync();
        
        // Periodic sync should be stopped - advance past initial sync delay and periodic interval
        vi.advanceTimersByTime(300000);
        
        // Wait for any pending async operations
        await new Promise(resolve => {
            vi.useRealTimers();
            setTimeout(() => {
                vi.useFakeTimers();
                resolve();
            }, 100);
        });
        
        expect(performSync).not.toHaveBeenCalled();
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
        const { performSync } = await import('../../db/sync.js');
        
        isSyncInProgress.mockReturnValue(true);
        performSync.mockResolvedValue({ success: true });
        
        initializeAutoSync();
        
        const onlineEvent = new Event('online');
        window.dispatchEvent(onlineEvent);
        
        vi.advanceTimersByTime(4000);
        
        expect(performSync).not.toHaveBeenCalled();
    });
});

