/**
 * Tests for api/auth.js - Authentication Service
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
    login,
    register,
    logout,
    refreshToken,
    verifyEmail,
    resendVerificationEmail,
    getCurrentUser,
    getAccessToken,
    isAuthenticated,
    setAuth,
    clearAuth
} from '../../api/auth.js';

// Mock config
vi.mock('../../config.js', () => ({
    API_CONFIG: {
        BASE_URL: 'https://api.example.com',
        ACCESS_TOKEN_KEY: 'auth_token',
        REFRESH_TOKEN_KEY: 'refresh_token',
        USER_KEY: 'auth_user'
    }
}));

// Mock UI toast
vi.mock('../../ui.js', () => ({
    showToast: vi.fn()
}));

describe('api/auth.js - Authentication Service', () => {
    const mockUser = { id: 1, email: 'test@example.com', name: 'Test User' };
    const mockToken = 'mock-jwt-token';

    beforeEach(() => {
        vi.clearAllMocks();
        localStorage.clear();
        global.fetch = vi.fn();

        // Mock AbortSignal.timeout
        if (!AbortSignal.timeout) {
            AbortSignal.timeout = (ms) => {
                const controller = new AbortController();
                setTimeout(() => controller.abort(), ms);
                return controller.signal;
            };
        }
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    describe('Local Storage Management', () => {
        it('should store and retrieve auth data', () => {
            setAuth(mockToken, mockUser);
            expect(getAccessToken()).toBe(mockToken);
            expect(isAuthenticated()).toBe(true);
            expect(localStorage.getItem('auth_token')).toBe(mockToken);
            expect(JSON.parse(localStorage.getItem('auth_user'))).toEqual(mockUser);
        });

        it('should clear auth data', () => {
            setAuth(mockToken, mockUser);
            clearAuth();
            expect(getAccessToken()).toBeNull();
            expect(isAuthenticated()).toBe(false);
            expect(localStorage.getItem('auth_token')).toBeNull();
        });
    });

    describe('login', () => {
        it('should login successfully', async () => {
            global.fetch.mockResolvedValueOnce({
                ok: true,
                headers: { get: () => 'application/json' },
                json: async () => ({
                    success: true,
                    data: { accessToken: mockToken, user: mockUser }
                })
            });

            const result = await login({ email: 'test@example.com', password: 'password123' });

            expect(result).toEqual({ accessToken: mockToken, user: mockUser });
            expect(getAccessToken()).toBe(mockToken);
            expect(global.fetch).toHaveBeenCalledWith(
                'https://api.example.com/api/auth/login',
                expect.objectContaining({
                    method: 'POST',
                    body: JSON.stringify({ email: 'test@example.com', password: 'password123' })
                })
            );
        });

        it('should throw error on invalid credentials', async () => {
            global.fetch.mockResolvedValueOnce({
                ok: false,
                status: 401,
                headers: { get: () => 'application/json' },
                json: async () => ({
                    success: false,
                    message: 'Invalid email or password'
                })
            });

            await expect(login({ email: 'test@example.com', password: 'wrong' }))
                .rejects.toThrow('Invalid email or password');
        });

        it('should validate input before request', async () => {
            await expect(login({ email: '', password: '' })).rejects.toThrow('Email and password are required');
            await expect(login({ email: 'invalid-email', password: '123' })).rejects.toThrow('Please enter a valid email address');
        });

        it('should handle network errors', async () => {
            global.fetch.mockRejectedValueOnce(new Error('NetworkError'));
            await expect(login({ email: 'test@example.com', password: 'password123' }))
                .rejects.toThrow('Network error');
        });
    });

    describe('register', () => {
        it('should register successfully', async () => {
            global.fetch.mockResolvedValueOnce({
                ok: true,
                headers: { get: () => 'application/json' },
                json: async () => ({
                    success: true,
                    data: { accessToken: mockToken, user: mockUser }
                })
            });

            const result = await register({ email: 'test@example.com', password: 'password123', name: 'Test' });

            expect(result).toEqual({ accessToken: mockToken, user: mockUser });
            expect(isAuthenticated()).toBe(true);
        });

        it('should validate password length', async () => {
            await expect(register({ email: 'test@example.com', password: 'short' }))
                .rejects.toThrow('Password must be at least 8 characters long');
        });

        it('should handle existing user error', async () => {
            global.fetch.mockResolvedValueOnce({
                ok: false,
                status: 409,
                headers: { get: () => 'application/json' },
                json: async () => ({ success: false, message: 'User already exists' })
            });

            await expect(register({ email: 'test@example.com', password: 'password123' }))
                .rejects.toThrow('User already exists');
        });
    });

    describe('logout', () => {
        it('should call logout endpoint and clear local storage', async () => {
            setAuth(mockToken, mockUser);
            global.fetch.mockResolvedValueOnce({ ok: true });

            await logout();

            expect(global.fetch).toHaveBeenCalledWith(
                'https://api.example.com/api/auth/logout',
                expect.any(Object)
            );
            expect(isAuthenticated()).toBe(false);
        });

        it('should clear local storage even if API fails', async () => {
            setAuth(mockToken, mockUser);
            global.fetch.mockRejectedValueOnce(new Error('Network error'));

            await logout();

            expect(isAuthenticated()).toBe(false);
        });
    });

    describe('refreshToken', () => {
        it('should refresh token successfully', async () => {
            const newToken = 'new-mock-token';
            setAuth(mockToken, mockUser);

            global.fetch.mockResolvedValueOnce({
                ok: true,
                headers: { get: () => 'application/json' },
                json: async () => ({
                    success: true,
                    data: { accessToken: newToken }
                })
            });

            const result = await refreshToken();

            expect(result).toBe(newToken);
            expect(getAccessToken()).toBe(newToken);
        });

        it('should clear auth on refresh failure (401)', async () => {
            setAuth(mockToken, mockUser);
            global.fetch.mockResolvedValueOnce({
                ok: false,
                status: 401,
                headers: { get: () => 'application/json' },
                json: async () => ({ success: false })
            });

            await expect(refreshToken()).rejects.toThrow('Session expired');
            expect(isAuthenticated()).toBe(false);
        });
    });

    describe('getCurrentUser', () => {
        it('should fetch user profile', async () => {
            setAuth(mockToken, mockUser);
            global.fetch.mockResolvedValueOnce({
                ok: true,
                headers: { get: () => 'application/json' },
                json: async () => ({
                    success: true,
                    data: { user: { ...mockUser, name: 'Updated Name' } }
                })
            });

            const user = await getCurrentUser();

            expect(user.name).toBe('Updated Name');
            expect(JSON.parse(localStorage.getItem('auth_user')).name).toBe('Updated Name');
        });

        it('should try to refresh token on 401', async () => {
            setAuth(mockToken, mockUser);

            // First call fails with 401
            global.fetch.mockResolvedValueOnce({
                ok: false,
                status: 401,
                headers: { get: () => 'application/json' },
                json: async () => ({ success: false })
            });

            // Refresh call succeeds
            global.fetch.mockResolvedValueOnce({
                ok: true,
                headers: { get: () => 'application/json' },
                json: async () => ({
                    success: true,
                    data: { accessToken: 'new-token' }
                })
            });

            // Retry call succeeds
            global.fetch.mockResolvedValueOnce({
                ok: true,
                headers: { get: () => 'application/json' },
                json: async () => ({
                    success: true,
                    data: { user: mockUser }
                })
            });

            const user = await getCurrentUser();
            expect(user).toEqual(mockUser);
            expect(getAccessToken()).toBe('new-token');
        });
    });

    describe('verifyEmail', () => {
        it('should verify email successfully', async () => {
            global.fetch.mockResolvedValueOnce({
                ok: true,
                headers: { get: () => 'application/json' },
                json: async () => ({ success: true })
            });

            await verifyEmail('valid-token');
            expect(global.fetch).toHaveBeenCalledWith(
                expect.stringContaining('/verify-email'),
                expect.any(Object)
            );
        });

        it('should throw error if token is missing', async () => {
            await expect(verifyEmail('')).rejects.toThrow('Verification token is required');
        });
    });

    describe('resendVerificationEmail', () => {
        it('should resend email successfully', async () => {
            setAuth(mockToken, mockUser);
            global.fetch.mockResolvedValueOnce({
                ok: true,
                headers: { get: () => 'application/json' },
                json: async () => ({ success: true })
            });

            await resendVerificationEmail();
            expect(global.fetch).toHaveBeenCalled();
        });

        it('should require authentication', async () => {
            clearAuth();
            await expect(resendVerificationEmail()).rejects.toThrow('Please log in');
        });
    });
});
