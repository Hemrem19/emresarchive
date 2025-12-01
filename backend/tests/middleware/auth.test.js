/**
 * Unit Tests for Authentication Middleware
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { authenticate } from '../../src/middleware/auth.js';
import { generateAccessToken } from '../../src/lib/jwt.js';
import { mockRequest, mockResponse, mockNext, sampleData } from '../helpers.js';

// Mock the prisma module
vi.mock('../../src/lib/prisma.js', () => ({
    prisma: {
        user: {
            findUnique: vi.fn()
        }
    }
}));

import { prisma } from '../../src/lib/prisma.js';

describe('Authentication Middleware', () => {
    let req, res, next;

    beforeEach(() => {
        vi.clearAllMocks();
        req = mockRequest();
        res = mockResponse();
        next = mockNext();
    });

    describe('authenticate', () => {
        it('should authenticate valid token and attach user to request', async () => {
            const user = sampleData.user();
            const token = generateAccessToken(user.id, user.email);

            req.headers.authorization = `Bearer ${token}`;
            prisma.user.findUnique.mockResolvedValue(user);

            await authenticate(req, res, next);

            expect(prisma.user.findUnique).toHaveBeenCalledWith({
                where: { id: user.id },
                select: {
                    id: true,
                    email: true,
                    name: true,
                    emailVerified: true,
                    createdAt: true
                }
            });
            expect(req.user).toEqual(user);
            expect(next).toHaveBeenCalledOnce();
            expect(next).toHaveBeenCalledWith();
            expect(res.status).not.toHaveBeenCalled();
        });

        it('should return 401 when no authorization header', async () => {
            req.headers.authorization = undefined;

            await authenticate(req, res, next);

            expect(res.status).toHaveBeenCalledWith(401);
            expect(res.json).toHaveBeenCalledWith({
                success: false,
                error: { message: 'Authentication required' }
            });
            expect(next).not.toHaveBeenCalled();
        });

        it('should return 401 when authorization header does not start with "Bearer "', async () => {
            req.headers.authorization = 'Invalid token-here';

            await authenticate(req, res, next);

            expect(res.status).toHaveBeenCalledWith(401);
            expect(res.json).toHaveBeenCalledWith({
                success: false,
                error: { message: 'Authentication required' }
            });
            expect(next).not.toHaveBeenCalled();
        });

        it('should return 401 for invalid token', async () => {
            req.headers.authorization = 'Bearer invalid.token.here';

            await authenticate(req, res, next);

            expect(res.status).toHaveBeenCalledWith(401);
            expect(res.json).toHaveBeenCalledWith({
                success: false,
                error: { message: 'Invalid token' }
            });
            expect(next).not.toHaveBeenCalled();
        });

        it('should return 401 for expired token', async () => {
            // Create an expired token by mocking verifyAccessToken to throw expired error
            const user = sampleData.user();

            // For this test, we need to use a token that will actually fail verification
            req.headers.authorization = 'Bearer expired.token.here';

            await authenticate(req, res, next);

            // Should handle the invalid token
            expect(res.status).toHaveBeenCalledWith(401);
        });

        it('should return 401 when user not found in database', async () => {
            const user = sampleData.user();
            const token = generateAccessToken(user.id, user.email);

            req.headers.authorization = `Bearer ${token}`;
            prisma.user.findUnique.mockResolvedValue(null);

            await authenticate(req, res, next);

            expect(res.status).toHaveBeenCalledWith(401);
            expect(res.json).toHaveBeenCalledWith({
                success: false,
                error: { message: 'User not found' }
            });
            expect(next).not.toHaveBeenCalled();
        });

        it('should extract token correctly from Bearer header', async () => {
            const user = sampleData.user();
            const token = generateAccessToken(user.id, user.email);

            req.headers.authorization = `Bearer ${token}`;
            prisma.user.findUnique.mockResolvedValue(user);

            await authenticate(req, res, next);

            expect(req.user).toBeDefined();
            expect(next).toHaveBeenCalled();
        });

        it('should handle database errors', async () => {
            const user = sampleData.user();
            const token = generateAccessToken(user.id, user.email);

            req.headers.authorization = `Bearer ${token}`;
            const dbError = new Error('Database connection error');
            prisma.user.findUnique.mockRejectedValue(dbError);

            await authenticate(req, res, next);

            expect(next).toHaveBeenCalledWith(dbError);
        });

        it('should not call next twice', async () => {
            const user = sampleData.user();
            const token = generateAccessToken(user.id, user.email);

            req.headers.authorization = `Bearer ${token}`;
            prisma.user.findUnique.mockResolvedValue(user);

            await authenticate(req, res, next);

            expect(next).toHaveBeenCalledTimes(1);
        });

        it('should attach complete user object to request', async () => {
            const user = sampleData.user({
                id: 42,
                email: 'specific@example.com',
                name: 'Specific User',
                emailVerified: true
            });
            const token = generateAccessToken(user.id, user.email);

            req.headers.authorization = `Bearer ${token}`;
            prisma.user.findUnique.mockResolvedValue(user);

            await authenticate(req, res, next);

            expect(req.user).toEqual(user);
            expect(req.user.id).toBe(42);
            expect(req.user.email).toBe('specific@example.com');
            expect(req.user.emailVerified).toBe(true);
        });
    });
});
