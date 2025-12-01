/**
 * Unit Tests for JWT Token Utilities
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import jwt from 'jsonwebtoken';
import {
    generateAccessToken,
    generateRefreshToken,
    verifyAccessToken,
    verifyRefreshToken
} from '../../src/lib/jwt.js';

describe('JWT Token Utilities', () => {
    const userId = 1;
    const email = 'test@example.com';
    const sessionId = 'test-session-id';

    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('generateAccessToken', () => {
        it('should generate a valid access token', () => {
            const token = generateAccessToken(userId, email);

            expect(token).toBeDefined();
            expect(typeof token).toBe('string');

            // Verify the token structure (JWT has 3 parts separated by dots)
            const parts = token.split('.');
            expect(parts).toHaveLength(3);
        });

        it('should include userId and email in token payload', () => {
            const token = generateAccessToken(userId, email);
            const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET);

            expect(decoded.userId).toBe(userId);
            expect(decoded.email).toBe(email);
            expect(decoded.type).toBe('access');
        });

        it('should set expiration time', () => {
            const token = generateAccessToken(userId, email);
            const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET);

            expect(decoded.exp).toBeDefined();
            expect(decoded.exp).toBeGreaterThan(Math.floor(Date.now() / 1000));
        });
    });

    describe('generateRefreshToken', () => {
        it('should generate a valid refresh token', () => {
            const token = generateRefreshToken(userId, sessionId);

            expect(token).toBeDefined();
            expect(typeof token).toBe('string');

            const parts = token.split('.');
            expect(parts).toHaveLength(3);
        });

        it('should include userId and sessionId in token payload', () => {
            const token = generateRefreshToken(userId, sessionId);
            const decoded = jwt.verify(token, process.env.JWT_REFRESH_SECRET);

            expect(decoded.userId).toBe(userId);
            expect(decoded.sessionId).toBe(sessionId);
            expect(decoded.type).toBe('refresh');
        });

        it('should set longer expiration time than access token', () => {
            const accessToken = generateAccessToken(userId, email);
            const refreshToken = generateRefreshToken(userId, sessionId);

            const decodedAccess = jwt.verify(accessToken, process.env.JWT_ACCESS_SECRET);
            const decodedRefresh = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);

            // Refresh token should expire later than access token
            expect(decodedRefresh.exp).toBeGreaterThan(decodedAccess.exp);
        });
    });

    describe('verifyAccessToken', () => {
        it('should verify a valid access token', () => {
            const token = generateAccessToken(userId, email);
            const decoded = verifyAccessToken(token);

            expect(decoded).toBeDefined();
            expect(decoded.userId).toBe(userId);
            expect(decoded.email).toBe(email);
            expect(decoded.type).toBe('access');
        });

        it('should throw error for invalid token', () => {
            const invalidToken = 'invalid.token.here';

            expect(() => verifyAccessToken(invalidToken)).toThrow('Invalid access token');
        });

        it('should throw error for expired token', () => {
            // Create a token that expires immediately
            const expiredToken = jwt.sign(
                { userId, email, type: 'access' },
                process.env.JWT_ACCESS_SECRET,
                { expiresIn: '0s' }
            );

            // Wait a bit to ensure it's expired
            return new Promise((resolve) => {
                setTimeout(() => {
                    expect(() => verifyAccessToken(expiredToken)).toThrow('Access token expired');
                    resolve();
                }, 100);
            });
        });

        it('should throw error for token signed with wrong secret', () => {
            const wrongToken = jwt.sign(
                { userId, email, type: 'access' },
                'wrong-secret',
                { expiresIn: '15m' }
            );

            expect(() => verifyAccessToken(wrongToken)).toThrow('Invalid access token');
        });
    });

    describe('verifyRefreshToken', () => {
        it('should verify a valid refresh token', () => {
            const token = generateRefreshToken(userId, sessionId);
            const decoded = verifyRefreshToken(token);

            expect(decoded).toBeDefined();
            expect(decoded.userId).toBe(userId);
            expect(decoded.sessionId).toBe(sessionId);
            expect(decoded.type).toBe('refresh');
        });

        it('should throw error for invalid token', () => {
            const invalidToken = 'invalid.token.here';

            expect(() => verifyRefreshToken(invalidToken)).toThrow('Invalid refresh token');
        });

        it('should throw error for expired token', () => {
            const expiredToken = jwt.sign(
                { userId, sessionId, type: 'refresh' },
                process.env.JWT_REFRESH_SECRET,
                { expiresIn: '0s' }
            );

            return new Promise((resolve) => {
                setTimeout(() => {
                    expect(() => verifyRefreshToken(expiredToken)).toThrow('Refresh token expired');
                    resolve();
                }, 100);
            });
        });

        it('should throw error for token signed with wrong secret', () => {
            const wrongToken = jwt.sign(
                { userId, sessionId, type: 'refresh' },
                'wrong-secret',
                { expiresIn: '7d' }
            );

            expect(() => verifyRefreshToken(wrongToken)).toThrow('Invalid refresh token');
        });

        it('should not accept access token as refresh token', () => {
            const accessToken = generateAccessToken(userId, email);

            // This should fail because it's signed with the wrong secret
            expect(() => verifyRefreshToken(accessToken)).toThrow();
        });
    });
});
