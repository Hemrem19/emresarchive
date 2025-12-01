/**
 * API Auth Tests
 * Tests for api/auth.js - Critical security module
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
    getAccessToken,
    getUser,
    setAuth,
    clearAuth,
    isAuthenticated,
    register,
    login,
    logout,
    refreshToken
} from '../api/auth.js';

// Mock dependencies
vi.mock('../ui.js', () => ({
    showToast: vi.fn()
}));

describe('api/auth.js - Token Management', () => {
    let mockLocalStorage;

    beforeEach(() => {
        mockLocalStorage = {};
        global.localStorage = {
            getItem: vi.fn((key) => mockLocalStorage[key] || null),
            setItem: vi.fn((key, value) => { mockLocalStorage[key] = value; }),
            removeItem: vi.fn((key) => { delete mockLocalStorage[key]; }),
            clear: vi.fn(() => { mockLocalStorage = {}; })
        };
    });

    afterEach(() => {
        vi.clearAllMocks();
    });

    describe('getAccessToken', () => {
        it('should return token from localStorage', () => {
            mockLocalStorage['citavers_access_token'] = 'test-token-123';
            expect(getAccessToken()).toBe('test-token-123');
        });

        it('should return null if no token exists', () => {
            expect(getAccessToken()).toBe(null);
        });
    });

    describe('getUser', () => {
        it('should return parsed user data from localStorage', () => {
            const user = { id: 1, email: 'test@example.com', name: 'Test User' };
            mockLocalStorage['citavers_user'] = JSON.stringify(user);

            const result = getUser();
            expect(result).toEqual(user);
            expect(result.email).toBe('test@example.com');
        });

        it('should return null if no user data exists', () => {
            expect(getUser()).toBe(null);
        });
    });

    describe('setAuth', () => {
        it('should store access token in localStorage', () => {
            const token = 'new-access-token';
            const user = { id: 1, email: 'test@example.com' };

            setAuth(token, user);

            expect(localStorage.setItem).toHaveBeenCalledWith('citavers_access_token', token);
        });

        it('should store user data as JSON string', () => {
            const token = 'token-123';
            const user = { id: 42, email: 'user@test.com', name: 'John Doe' };

            setAuth(token, user);

            expect(localStorage.setItem).toHaveBeenCalledWith('citavers_user', JSON.stringify(user));
        });
    });

    describe('clearAuth', () => {
        it('should remove access token from localStorage', () => {
            clearAuth();
            expect(localStorage.removeItem).toHaveBeenCalledWith('citavers_access_token');
        });

        it('should remove refresh token from localStorage', () => {
            clearAuth();
            expect(localStorage.removeItem).toHaveBeenCalledWith('citavers_refresh_token');
        });

        it('should remove user data from localStorage', () => {
            clearAuth();
            expect(localStorage.removeItem).toHaveBeenCalledWith('citavers_user');
        });
    });

    describe('isAuthenticated', () => {
        it('should return true when access token exists', () => {
            mockLocalStorage['citavers_access_token'] = 'valid-token';
            expect(isAuthenticated()).toBe(true);
        });

        it('should return false when no access token exists', () => {
            expect(isAuthenticated()).toBe(false);
        });

        it('should return false for empty string token', () => {
            mockLocalStorage['citavers_access_token'] = '';
            expect(isAuthenticated()).toBe(false);
        });
    });
});

describe('api/auth.js - Registration', () => {
    beforeEach(() => {
        global.localStorage = {
            getItem: vi.fn(() => null),
            setItem: vi.fn(),
            removeItem: vi.fn(),
            clear: vi.fn()
        };
        global.fetch = vi.fn();
        global.AbortSignal = { timeout: vi.fn(() => ({})) };
    });

    afterEach(() => {
        vi.clearAllMocks();
    });

    it('should reject registration without email', async () => {
        await expect(register({ password: 'password123' }))
            .rejects.toThrow('Email and password are required');
    });

    it('should reject registration without password', async () => {
        await expect(register({ email: 'test@example.com' }))
            .rejects.toThrow('Email and password are required');
    });

    it('should validate email contains @ symbol', async () => {
        await expect(register({ email: 'invalid-email', password: 'password123' }))
            .rejects.toThrow('valid email');
    });

    it('should enforce minimum password length of 8 characters', async () => {
        await expect(register({ email: 'test@example.com', password: 'short' }))
            .rejects.toThrow('at least 8 characters');
    });

    it('should accept valid registration data', async () => {
        const mockResponse = {
            ok: true,
            headers: { get: () => 'application/json' },
            json: async () => ({
                success: true,
                data: {
                    accessToken: 'jwt-token-here',
                    user: { id: 1, email: 'test@example.com' }
                }
            })
        };
        global.fetch.mockResolvedValue(mockResponse);

        const result = await register({
            email: 'test@example.com',
            password: 'password123',
            name: 'Test User'
        });

        expect(result.accessToken).toBe('jwt-token-here');
        expect(result.user.email).toBe('test@example.com');
    });
});

describe('api/auth.js - Login', () => {
    beforeEach(() => {
        global.localStorage = {
            getItem: vi.fn(() => null),
            setItem: vi.fn(),
            removeItem: vi.fn(),
            clear: vi.fn()
        };
        global.fetch = vi.fn();
        global.AbortSignal = { timeout: vi.fn(() => ({})) };
    });

    afterEach(() => {
        vi.clearAllMocks();
    });

    it('should require email and password', async () => {
        await expect(login({})).rejects.toThrow('Email and password are required');
        await expect(login({ email: 'test@example.com' })).rejects.toThrow('required');
        await expect(login({ password: 'password' })).rejects.toThrow('required');
    });

    it('should validate email format', async () => {
        await expect(login({ email: 'notanemail', password: 'password123' }))
            .rejects.toThrow('valid email');
    });

    it('should successfully login with valid credentials', async () => {
        const mockResponse = {
            ok: true,
            headers: { get: () => 'application/json' },
            json: async () => ({
                success: true,
                data: {
                    accessToken: 'login-jwt-token',
                    user: { id: 1, email: 'test@example.com', name: 'Test' }
                }
            })
        };
        global.fetch.mockResolvedValue(mockResponse);

        const result = await login({ email: 'test@example.com', password: 'correct-password' });

        expect(result.accessToken).toBe('login-jwt-token');
        expect(result.user.id).toBe(1);
        expect(fetch).toHaveBeenCalledWith(
            expect.stringContaining('/login'),
            expect.objectContaining({ method: 'POST' })
        );
    });

    it('should store auth data after successful login', async () => {
        const mockResponse = {
            ok: true,
            headers: { get: () => 'application/json' },
            json: async () => ({
                success: true,
                data: {
                    accessToken: 'stored-token',
                    user: { id: 5, email: 'user@test.com' }
                }
            })
        };
        global.fetch.mockResolvedValue(mockResponse);

        await login({ email: 'user@test.com', password: 'password123' });

        expect(localStorage.setItem).toHaveBeenCalledWith('citavers_access_token', 'stored-token');
        expect(localStorage.setItem).toHaveBeenCalledWith(
            'citavers_user',
            expect.stringContaining('user@test.com')
        );
    });
});

describe('api/auth.js - Logout', () => {
    beforeEach(() => {
        global.localStorage = {
            getItem: vi.fn(() => null),
            setItem: vi.fn(),
            removeItem: vi.fn(),
            clear: vi.fn()
        };
        global.fetch = vi.fn();
    });

    afterEach(() => {
        vi.clearAllMocks();
    });

    it('should call logout endpoint when token exists', async () => {
        global.localStorage.getItem = vi.fn(() => 'existing-token');
        global.fetch.mockResolvedValue({ ok: true });

        await logout();

        expect(fetch).toHaveBeenCalledWith(
            expect.stringContaining('/logout'),
            expect.objectContaining({
                method: 'POST',
                headers: expect.objectContaining({
                    'Authorization': 'Bearer existing-token'
                })
            })
        );
    });

    it('should clear local auth data even if API call fails', async () => {
        global.localStorage.getItem = vi.fn(() => 'token-123');
        global.fetch.mockRejectedValue(new Error('Network error'));

        await logout();

        expect(localStorage.removeItem).toHaveBeenCalledWith('citavers_access_token');
        expect(localStorage.removeItem).toHaveBeenCalledWith('citavers_refresh_token');
        expect(localStorage.removeItem).toHaveBeenCalledWith('citavers_user');
    });

    it('should handle logout when no token exists', async () => {
        await logout();

        expect(localStorage.removeItem).toHaveBeenCalled();
    });
});

describe('api/auth.js - Token Refresh', () => {
    beforeEach(() => {
        global.localStorage = {
            getItem: vi.fn((key) => {
                if (key === 'citavers_user') return JSON.stringify({ id: 1, email: 'test@example.com' });
                return null;
            }),
            setItem: vi.fn(),
            removeItem: vi.fn(),
            clear: vi.fn()
        };
        global.fetch = vi.fn();
        global.AbortSignal = { timeout: vi.fn(() => ({})) };
    });

    afterEach(() => {
        vi.clearAllMocks();
    });

    it('should successfully refresh access token', async () => {
        const mockResponse = {
            ok: true,
            headers: { get: () => 'application/json' },
            json: async () => ({
                success: true,
                data: { accessToken: 'new-refreshed-token' }
            })
        };
        global.fetch.mockResolvedValue(mockResponse);

        const token = await refreshToken();

        expect(token).toBe('new-refreshed-token');
        expect(localStorage.setItem).toHaveBeenCalledWith('citavers_access_token', 'new-refreshed-token');
    });

    it('should clear auth data on401 unauthorized error', async () => {
        const mockResponse = {
            ok: false,
            status: 401,
            headers: { get: () => 'application/json' },
            json: async () => ({
                error: { message: 'Invalid refresh token' }
            })
        };
        global.fetch.mockResolvedValue(mockResponse);

        await expect(refreshToken()).rejects.toThrow('Session expired');
        expect(localStorage.removeItem).toHaveBeenCalledWith('citavers_access_token');
    });

    it('should include credentials for refresh token cookie', async () => {
        const mockResponse = {
            ok: true,
            headers: { get: () => 'application/json' },
            json: async () => ({
                success: true,
                data: { accessToken: 'token' }
            })
        };
        global.fetch.mockResolvedValue(mockResponse);

        await refreshToken();

        expect(fetch).toHaveBeenCalledWith(
            expect.stringContaining('/refresh'),
            expect.objectContaining({
                method: 'POST',
                credentials: 'include'
            })
        );
    });
});
