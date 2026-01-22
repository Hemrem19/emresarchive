import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { refreshToken, setAuth, getAccessToken } from '../api/auth.js';

// Mock dependencies
vi.mock('../config.js', () => ({
    API_CONFIG: {
        BASE_URL: 'http://test-api.com',
        ACCESS_TOKEN_KEY: 'access_token',
        USER_KEY: 'user_data'
    }
}));

vi.mock('../ui.js', () => ({
    showToast: vi.fn()
}));

// Mock global fetch
global.fetch = vi.fn();

describe('Auth Service - Deduplication', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        localStorage.clear();
        // Setup initial auth state
        localStorage.setItem('access_token', 'old_token');
        localStorage.setItem('user_data', JSON.stringify({ id: 1 }));

        // Mock AbortSignal.timeout if missing (likely due to happy-dom)
        if (!AbortSignal.timeout) {
            AbortSignal.timeout = (ms) => {
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), ms);
                // Clean up timeout to prevent open handles, though controller.abort() is enough for logic
                return controller.signal;
            };
        }
    });

    it('should deduplicate concurrent refresh requests', async () => {
        // Mock slow fetch response
        global.fetch.mockImplementation(() => new Promise(resolve => {
            setTimeout(() => {
                resolve({
                    ok: true,
                    headers: { get: () => 'application/json' },
                    json: () => Promise.resolve({
                        success: true,
                        data: { accessToken: 'new_token_123', user: { id: 1 } }
                    })
                });
            }, 50); // Small delay to allow concurrent calls
        }));

        // Call refreshToken multiple times concurrently
        const p1 = refreshToken();
        const p2 = refreshToken();
        const p3 = refreshToken();

        // Wait for all to resolve
        const results = await Promise.all([p1, p2, p3]);

        // Assert fetch was called only once
        expect(global.fetch).toHaveBeenCalledTimes(1);
        expect(global.fetch).toHaveBeenCalledWith(
            expect.stringContaining('/refresh'),
            expect.anything()
        );

        // Assert all promises returned the same token
        expect(results[0]).toBe('new_token_123');
        expect(results[1]).toBe('new_token_123');
        expect(results[2]).toBe('new_token_123');

        // Assert token was updated in storage
        expect(getAccessToken()).toBe('new_token_123');
    });

    it('should allow new request after previous one completes', async () => {
        // Mock immediate response
        global.fetch.mockResolvedValue({
            ok: true,
            headers: { get: () => 'application/json' },
            json: () => Promise.resolve({
                success: true,
                data: { accessToken: 'token_A', user: { id: 1 } }
            })
        });

        // First call
        await refreshToken();
        expect(global.fetch).toHaveBeenCalledTimes(1);

        // Mock second response
        global.fetch.mockResolvedValue({
            ok: true,
            headers: { get: () => 'application/json' },
            json: () => Promise.resolve({
                success: true,
                data: { accessToken: 'token_B', user: { id: 1 } }
            })
        });

        // Second call (sequential)
        const token = await refreshToken();

        expect(global.fetch).toHaveBeenCalledTimes(2);
        expect(token).toBe('token_B');
    });

    it('should clear promise on error', async () => {
        // Mock error response
        global.fetch.mockRejectedValue(new Error('Network error'));

        // First call fails
        await expect(refreshToken()).rejects.toThrow('Network error');

        // Reset mock for success
        global.fetch.mockResolvedValue({
            ok: true,
            headers: { get: () => 'application/json' },
            json: () => Promise.resolve({
                success: true,
                data: { accessToken: 'token_retry', user: { id: 1 } }
            })
        });

        // Second call should try again (not be blocked by previous promise)
        const token = await refreshToken();
        expect(token).toBe('token_retry');
        expect(global.fetch).toHaveBeenCalledTimes(2);
    });
});
