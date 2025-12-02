/**
 * Coverage Tests for api/auth.js
 * Targets error handling, network edge cases, and retry logic
 * @module tests/api/auth-coverage
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
    login,
    register,
    refreshToken,
    verifyEmail,
    resendVerificationEmail,
    getCurrentUser,
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

describe('api/auth.js - Coverage Expansion', () => {
    const mockUser = { id: 1, email: 'test@example.com' };
    const mockToken = 'mock-token';

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

    describe('Error Parsing (parseApiError)', () => {
        it('should handle validation errors with details array', async () => {
            global.fetch.mockResolvedValueOnce({
                ok: false,
                status: 422,
                headers: { get: () => 'application/json' },
                json: async () => ({
                    error: {
                        details: [
                            { field: 'email', message: 'Invalid format' },
                            { path: ['password'], message: 'Too short' }
                        ]
                    }
                })
            });

            await expect(login({ email: 'test@example.com', password: 'password123' }))
                .rejects.toThrow('Email: Invalid format. Password: Too short');
        });

        it('should handle specific HTTP status codes without response body', async () => {
            const statusCodes = [
                { code: 400, msg: 'Invalid request' },
                { code: 403, msg: 'Access denied' },
                { code: 404, msg: 'Service not found' },
                { code: 429, msg: 'Too many requests' },
                { code: 500, msg: 'Server error' },
                { code: 503, msg: 'Server error' }
            ];

            for (const { code, msg } of statusCodes) {
                global.fetch.mockResolvedValueOnce({
                    ok: false,
                    status: code,
                    headers: { get: () => 'application/json' },
                    json: async () => ({}) // Empty body
                });

                await expect(login({ email: 'test@example.com', password: 'password123' }))
                    .rejects.toThrow(msg);
            }
        });
    });

    describe('Network Error Handling (handleNetworkError)', () => {
        it('should handle TimeoutError', async () => {
            const error = new Error('Timeout');
            error.name = 'TimeoutError';
            global.fetch.mockRejectedValueOnce(error);

            await expect(login({ email: 'test@example.com', password: 'password123' }))
                .rejects.toThrow('Request timed out');
        });

        it('should handle CORS errors', async () => {
            global.fetch.mockRejectedValueOnce(new Error('CORS request did not succeed'));

            await expect(login({ email: 'test@example.com', password: 'password123' }))
                .rejects.toThrow('Connection error');
        });

        it('should handle AbortError as timeout', async () => {
            const error = new Error('Aborted');
            error.name = 'AbortError';
            global.fetch.mockRejectedValueOnce(error);

            await expect(register({ email: 'test@example.com', password: 'password123', name: 'n' }))
                .rejects.toThrow('Request timed out');
        });
    });

    describe('Non-JSON Response Handling', () => {
        it('should throw on non-JSON response for login', async () => {
            global.fetch.mockResolvedValueOnce({
                ok: true,
                headers: { get: () => 'text/html' },
                text: async () => '<html>Bad Gateway</html>'
            });

            await expect(login({ email: 'test@example.com', password: 'password123' }))
                .rejects.toThrow('Server returned invalid response');
        });

        it('should throw on non-JSON response for register', async () => {
            global.fetch.mockResolvedValueOnce({
                ok: true,
                headers: { get: () => 'text/plain' },
                text: async () => 'Internal Error'
            });

            await expect(register({ email: 'test@example.com', password: 'password123', name: 'n' }))
                .rejects.toThrow('Server returned invalid response');
        });

        it('should throw on non-JSON response for refreshToken', async () => {
            global.fetch.mockResolvedValueOnce({
                ok: true,
                headers: { get: () => 'text/html' },
                text: async () => 'Error'
            });

            await expect(refreshToken()).rejects.toThrow('Invalid response from server');
        });
    });

    describe('Token Refresh Retry Logic', () => {
        it('should handle refresh failure during getCurrentUser retry', async () => {
            setAuth(mockToken, mockUser);

            // 1. Initial call fails (401)
            global.fetch.mockResolvedValueOnce({
                ok: false,
                status: 401,
                headers: { get: () => 'application/json' },
                json: async () => ({ success: false })
            });

            // 2. Refresh call fails (403 - e.g. refresh token expired)
            global.fetch.mockResolvedValueOnce({
                ok: false,
                status: 403,
                headers: { get: () => 'application/json' },
                json: async () => ({ success: false })
            });

            await expect(getCurrentUser()).rejects.toThrow('Session expired');
            expect(localStorage.getItem('auth_token')).toBeNull(); // Should clear auth
        });

        it('should handle non-JSON response during retry', async () => {
            setAuth(mockToken, mockUser);

            // 1. Initial call fails (401)
            global.fetch.mockResolvedValueOnce({
                ok: false,
                status: 401,
                headers: { get: () => 'application/json' },
                json: async () => ({ success: false })
            });

            // 2. Refresh succeeds
            global.fetch.mockResolvedValueOnce({
                ok: true,
                headers: { get: () => 'application/json' },
                json: async () => ({ success: true, data: { accessToken: 'new-token' } })
            });

            // 3. Retry call returns non-JSON
            global.fetch.mockResolvedValueOnce({
                ok: true,
                headers: { get: () => 'text/html' },
                text: async () => 'Bad Gateway'
            });

            // getCurrentUser catches refresh errors and throws 'Session expired'
            await expect(getCurrentUser()).rejects.toThrow('Session expired');
        });
    });

    describe('Resend Verification Retry Logic', () => {
        it('should retry resendVerificationEmail on 401', async () => {
            setAuth(mockToken, mockUser);

            // 1. Initial call fails (401)
            global.fetch.mockResolvedValueOnce({
                ok: false,
                status: 401,
                headers: { get: () => 'application/json' },
                json: async () => ({ success: false })
            });

            // 2. Refresh succeeds
            global.fetch.mockResolvedValueOnce({
                ok: true,
                headers: { get: () => 'application/json' },
                json: async () => ({ success: true, data: { accessToken: 'new-token' } })
            });

            // 3. Retry succeeds
            global.fetch.mockResolvedValueOnce({
                ok: true,
                headers: { get: () => 'application/json' },
                json: async () => ({ success: true })
            });

            const result = await resendVerificationEmail();
            expect(result.success).toBe(true);
        });

        it('should handle refresh failure during resendVerificationEmail', async () => {
            setAuth(mockToken, mockUser);

            // 1. Initial call fails (401)
            global.fetch.mockResolvedValueOnce({
                ok: false,
                status: 401,
                headers: { get: () => 'application/json' },
                json: async () => ({ success: false })
            });

            // 2. Refresh fails
            global.fetch.mockResolvedValueOnce({
                ok: false,
                status: 401,
                headers: { get: () => 'application/json' },
                json: async () => ({ success: false })
            });

            await expect(resendVerificationEmail()).rejects.toThrow('Session expired');
        });
    });

    describe('verifyEmail', () => {
        it('should update local user data if authenticated', async () => {
            setAuth(mockToken, { ...mockUser, emailVerified: false });

            global.fetch.mockResolvedValueOnce({
                ok: true,
                headers: { get: () => 'application/json' },
                json: async () => ({ success: true })
            });

            await verifyEmail('token');

            const storedUser = JSON.parse(localStorage.getItem('auth_user'));
            expect(storedUser.emailVerified).toBe(true);
        });

        it('should handle timeout', async () => {
            const error = new Error('Timeout');
            error.name = 'TimeoutError';
            global.fetch.mockRejectedValueOnce(error);

            await expect(verifyEmail('token')).rejects.toThrow('Verification request timed out');
        });
    });
});
