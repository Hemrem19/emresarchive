import { describe, it, expect, vi, beforeEach } from 'vitest';
import { register, login, logout, refresh } from '../../src/controllers/auth.js';
import { prisma } from '../../src/lib/prisma.js';
import * as passwordLib from '../../src/lib/password.js';
import * as jwtLib from '../../src/lib/jwt.js';
import * as emailLib from '../../src/lib/email.js';
import crypto from 'crypto';

// Mock dependencies using __mocks__
vi.mock('../../src/lib/prisma.js');
vi.mock('../../src/lib/email.js');

// Mock other dependencies manually
vi.mock('../../src/lib/password.js', () => ({
    hashPassword: vi.fn(),
    verifyPassword: vi.fn()
}));

vi.mock('../../src/lib/jwt.js', () => ({
    generateAccessToken: vi.fn(),
    generateRefreshToken: vi.fn(),
    verifyRefreshToken: vi.fn()
}));

describe('Auth Controller', () => {
    let req, res, next;

    beforeEach(() => {
        req = {
            body: {},
            cookies: {},
            headers: {},
            ip: '127.0.0.1'
        };
        res = {
            status: vi.fn().mockReturnThis(),
            json: vi.fn(),
            cookie: vi.fn(),
            clearCookie: vi.fn()
        };
        next = vi.fn();
        vi.clearAllMocks();
    });

    describe('register', () => {
        it('should register a new user successfully', async () => {
            req.body = { email: 'test@example.com', password: 'password123', name: 'Test User' };
            req.headers['user-agent'] = 'TestAgent';

            prisma.user.findUnique.mockResolvedValue(null);
            passwordLib.hashPassword.mockResolvedValue('hashed_password');
            emailLib.generateVerificationToken.mockReturnValue('token');
            emailLib.getVerificationTokenExpiry.mockReturnValue(new Date(Date.now() + 3600000));

            prisma.user.create.mockResolvedValue({
                id: 1,
                email: 'test@example.com',
                name: 'Test User',
                verificationToken: 'token',
                verificationTokenExpiry: new Date(Date.now() + 3600000)
            });

            jwtLib.generateAccessToken.mockReturnValue('access_token');
            prisma.session.create.mockResolvedValue({ id: 1 });
            jwtLib.generateRefreshToken.mockReturnValue('refresh_token');
            prisma.session.update.mockResolvedValue({ id: 1 });

            await register(req, res, next);

            if (next.mock.calls.length > 0) {
                console.error('Register failed with error:', next.mock.calls[0][0]);
            }

            expect(prisma.user.create).toHaveBeenCalled();
            expect(emailLib.sendVerificationEmail).toHaveBeenCalled();
            expect(res.cookie).toHaveBeenCalledWith('refreshToken', 'refresh_token', expect.any(Object));
            expect(res.status).toHaveBeenCalledWith(201);
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
                success: true,
                data: expect.objectContaining({ accessToken: 'access_token' })
            }));
        });

        it('should return 400 if email is missing', async () => {
            req.body = { password: 'password123' };
            await register(req, res, next);
            expect(res.status).toHaveBeenCalledWith(400);
        });

        it('should return 409 if user already exists', async () => {
            req.body = { email: 'existing@example.com', password: 'password123' };
            prisma.user.findUnique.mockResolvedValue({ id: 1 });

            await register(req, res, next);

            expect(res.status).toHaveBeenCalledWith(409);
        });

        it('should handle database schema error (P2022) gracefully', async () => {
            req.body = { email: 'test@example.com', password: 'password123' };
            const error = new Error('Column not found');
            error.code = 'P2022';
            prisma.user.findUnique.mockRejectedValue(error);

            await register(req, res, next);

            expect(res.status).toHaveBeenCalledWith(503);
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
                error: expect.objectContaining({ message: expect.stringContaining('Database configuration error') })
            }));
        });

        it('should succeed even if email sending fails', async () => {
            req.body = { email: 'test@example.com', password: 'password123' };

            // Mock helpers
            emailLib.generateVerificationToken.mockReturnValue('token');
            emailLib.getVerificationTokenExpiry.mockReturnValue(new Date());
            passwordLib.hashPassword.mockResolvedValue('hashed');
            jwtLib.generateAccessToken.mockReturnValue('access_token');
            jwtLib.generateRefreshToken.mockReturnValue('refresh_token');

            prisma.user.findUnique.mockResolvedValue(null);
            prisma.user.create.mockResolvedValue({
                id: 1,
                email: 'test@example.com',
                verificationToken: 'token',
                verificationTokenExpiry: new Date()
            });
            emailLib.sendVerificationEmail.mockRejectedValue(new Error('Email failed'));

            // Mock session creation to succeed
            prisma.session.create.mockResolvedValue({ id: 1 });
            prisma.session.update.mockResolvedValue({ id: 1 });

            await register(req, res, next);

            expect(res.status).toHaveBeenCalledWith(201);
        });
    });

    describe('login', () => {
        it('should login successfully with correct credentials', async () => {
            req.body = { email: 'test@example.com', password: 'password123' };
            const user = { id: 1, email: 'test@example.com', passwordHash: 'hashed' };

            prisma.user.findUnique.mockResolvedValue(user);
            passwordLib.verifyPassword.mockResolvedValue(true);
            jwtLib.generateAccessToken.mockReturnValue('access_token');
            prisma.session.create.mockResolvedValue({ id: 1 });
            jwtLib.generateRefreshToken.mockReturnValue('refresh_token');
            prisma.session.update.mockResolvedValue({ id: 1 });

            await login(req, res, next);

            expect(prisma.user.update).toHaveBeenCalledWith(expect.objectContaining({
                where: { id: 1 },
                data: expect.objectContaining({ lastLoginAt: expect.any(Date) })
            }));
            expect(res.cookie).toHaveBeenCalledWith('refreshToken', 'refresh_token', expect.any(Object));
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
                success: true,
                data: expect.objectContaining({ accessToken: 'access_token' })
            }));
        });

        it('should return 401 for invalid password', async () => {
            req.body = { email: 'test@example.com', password: 'wrong' };
            prisma.user.findUnique.mockResolvedValue({ id: 1, passwordHash: 'hashed' });
            passwordLib.verifyPassword.mockResolvedValue(false);

            await login(req, res, next);

            expect(res.status).toHaveBeenCalledWith(401);
        });

        it('should return 401 if user not found', async () => {
            req.body = { email: 'unknown@example.com', password: 'password' };
            prisma.user.findUnique.mockResolvedValue(null);

            await login(req, res, next);

            expect(res.status).toHaveBeenCalledWith(401);
        });
    });

    describe('logout', () => {
        it('should logout successfully', async () => {
            req.cookies.refreshToken = 'refresh_token';

            await logout(req, res, next);

            expect(prisma.session.deleteMany).toHaveBeenCalled();
            expect(res.clearCookie).toHaveBeenCalledWith('refreshToken', expect.any(Object));
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
        });

        it('should clear cookie even if no token provided', async () => {
            await logout(req, res, next);
            expect(res.clearCookie).toHaveBeenCalled();
        });

        it('should clear cookie even if DB deletion fails', async () => {
            req.cookies.refreshToken = 'refresh_token';
            prisma.session.deleteMany.mockRejectedValue(new Error('DB Error'));

            await logout(req, res, next);

            expect(res.clearCookie).toHaveBeenCalled();
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
        });
    });

    describe('refresh', () => {
        it('should refresh token successfully', async () => {
            req.cookies.refreshToken = 'valid_refresh_token';
            const session = { id: 1, user: { id: 1, email: 'test@example.com' }, expiresAt: new Date(Date.now() + 10000) };

            jwtLib.verifyRefreshToken.mockReturnValue({ userId: 1 });
            prisma.session.findUnique.mockResolvedValue(session);
            jwtLib.generateAccessToken.mockReturnValue('new_access_token');

            await refresh(req, res, next);

            expect(prisma.session.update).toHaveBeenCalled();
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
                success: true,
                data: { accessToken: 'new_access_token' }
            }));
        });

        it('should return 401 if refresh token is missing', async () => {
            await refresh(req, res, next);
            expect(res.status).toHaveBeenCalledWith(401);
        });

        it('should return 401 if session expired', async () => {
            req.cookies.refreshToken = 'valid_token';
            const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
            const session = { id: 1, expiresAt: oneDayAgo };

            jwtLib.verifyRefreshToken.mockReturnValue({ userId: 1 });
            prisma.session.findUnique.mockResolvedValue(session);
            prisma.session.delete.mockResolvedValue({}); // Ensure it returns a promise

            await refresh(req, res, next);

            expect(prisma.session.delete).toHaveBeenCalled();
            expect(res.status).toHaveBeenCalledWith(401);
        });

        it('should return 401 if session not found', async () => {
            req.cookies.refreshToken = 'valid_token';
            jwtLib.verifyRefreshToken.mockReturnValue({ userId: 1 });
            prisma.session.findUnique.mockResolvedValue(null);

            await refresh(req, res, next);

            expect(res.status).toHaveBeenCalledWith(401);
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
                error: expect.objectContaining({ message: expect.stringContaining('Session not found') })
            }));
        });
    });

    describe('getMe', () => {
        it('should return current user', async () => {
            req.user = { id: 1, email: 'test@example.com' };
            await import('../../src/controllers/auth.js').then(module => module.getMe(req, res, next));
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
                success: true,
                data: { user: req.user }
            }));
        });
    });

    describe('verifyEmail', () => {
        it('should verify email successfully', async () => {
            req.body = { token: 'valid_token' };
            const user = {
                id: 1,
                emailVerified: false,
                verificationTokenExpiry: new Date(Date.now() + 3600000)
            };
            prisma.user.findUnique.mockResolvedValue(user);
            prisma.user.update.mockResolvedValue({});

            await import('../../src/controllers/auth.js').then(module => module.verifyEmail(req, res, next));

            expect(prisma.user.update).toHaveBeenCalledWith(expect.objectContaining({
                where: { id: 1 },
                data: expect.objectContaining({ emailVerified: true })
            }));
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
        });

        it('should return 400 if token is missing', async () => {
            await import('../../src/controllers/auth.js').then(module => module.verifyEmail(req, res, next));
            expect(res.status).toHaveBeenCalledWith(400);
        });

        it('should return 400 if token is invalid', async () => {
            req.body = { token: 'invalid' };
            prisma.user.findUnique.mockResolvedValue(null);
            await import('../../src/controllers/auth.js').then(module => module.verifyEmail(req, res, next));
            expect(res.status).toHaveBeenCalledWith(400);
        });

        it('should return 400 if token expired', async () => {
            req.body = { token: 'expired' };
            const user = {
                id: 1,
                verificationTokenExpiry: new Date(Date.now() - 3600000)
            };
            prisma.user.findUnique.mockResolvedValue(user);
            await import('../../src/controllers/auth.js').then(module => module.verifyEmail(req, res, next));
            expect(res.status).toHaveBeenCalledWith(400);
        });
    });

    describe('resendVerificationEmail', () => {
        it('should resend verification email', async () => {
            req.user = { id: 1, email: 'test@example.com', emailVerified: false, name: 'Test' };
            emailLib.generateVerificationToken.mockReturnValue('new_token');
            emailLib.getVerificationTokenExpiry.mockReturnValue(new Date());
            prisma.user.update.mockResolvedValue({});
            emailLib.sendVerificationEmail.mockResolvedValue({});

            await import('../../src/controllers/auth.js').then(module => module.resendVerificationEmail(req, res, next));

            expect(prisma.user.update).toHaveBeenCalled();
            expect(emailLib.sendVerificationEmail).toHaveBeenCalled();
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
        });

        it('should return 400 if already verified', async () => {
            req.user = { emailVerified: true };
            await import('../../src/controllers/auth.js').then(module => module.resendVerificationEmail(req, res, next));
            expect(res.status).toHaveBeenCalledWith(400);
        });
    });

    describe('forgotPassword', () => {
        it('should return 501 (not implemented)', async () => {
            await import('../../src/controllers/auth.js').then(module => module.forgotPassword(req, res, next));
            expect(res.status).toHaveBeenCalledWith(501);
        });
    });

    describe('resetPassword', () => {
        it('should return 501 (not implemented)', async () => {
            await import('../../src/controllers/auth.js').then(module => module.resetPassword(req, res, next));
            expect(res.status).toHaveBeenCalledWith(501);
        });
    });
});
