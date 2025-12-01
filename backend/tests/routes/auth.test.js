import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import { prisma } from '../../src/lib/prisma.js';
import bcrypt from 'bcrypt';

// Mock dependencies
vi.mock('../../src/lib/prisma.js');
vi.mock('bcrypt');
vi.mock('resend'); // Mock email service

// Import app (no need to mock auth middleware for these tests as we want to test the actual auth flow)
import app from '../../src/server.js';

describe('Auth Routes', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('POST /api/auth/register', () => {
        it('should register a new user', async () => {
            const userData = {
                email: 'new@example.com',
                password: 'password123',
                name: 'New User'
            };

            // Mock existing user check
            prisma.user.findUnique.mockResolvedValue(null);

            // Mock password hashing
            bcrypt.hash.mockResolvedValue('hashed_password');

            // Mock user creation
            prisma.user.create.mockResolvedValue({
                id: 1,
                email: userData.email,
                name: userData.name,
                role: 'USER'
            });

            // Mock session creation
            prisma.session.create.mockResolvedValue({
                id: 1,
                token: 'session_token',
                userId: 1,
                expiresAt: new Date(Date.now() + 3600000)
            });

            const res = await request(app)
                .post('/api/auth/register')
                .send(userData)
                .expect(201);

            expect(res.body.success).toBe(true);
            expect(res.body.data.user.email).toBe(userData.email);
            expect(prisma.user.create).toHaveBeenCalled();
        });

        it('should fail if email already exists', async () => {
            prisma.user.findUnique.mockResolvedValue({ id: 1, email: 'existing@example.com' });

            const res = await request(app)
                .post('/api/auth/register')
                .send({
                    email: 'existing@example.com',
                    password: 'password123',
                    name: 'Existing User'
                })
                .expect(409);

            expect(res.body.success).toBe(false);
            expect(res.body.error.message).toContain('already exists');
        });
    });

    describe('POST /api/auth/login', () => {
        it('should login successfully with correct credentials', async () => {
            const credentials = {
                email: 'test@example.com',
                password: 'password123'
            };

            // Mock user lookup
            prisma.user.findUnique.mockResolvedValue({
                id: 1,
                email: credentials.email,
                password: 'hashed_password',
                role: 'USER'
            });

            // Mock password verification
            bcrypt.compare.mockResolvedValue(true);

            // Mock session creation
            prisma.session.create.mockResolvedValue({
                id: 1,
                token: 'session_token',
                userId: 1,
                expiresAt: new Date(Date.now() + 3600000)
            });

            const res = await request(app)
                .post('/api/auth/login')
                .send(credentials)
                .expect(200);

            expect(res.body.success).toBe(true);
            expect(res.body.data.accessToken).toBeDefined();
            expect(res.headers['set-cookie']).toBeDefined();
        });

        it('should fail with incorrect password', async () => {
            prisma.user.findUnique.mockResolvedValue({
                id: 1,
                email: 'test@example.com',
                password: 'hashed_password'
            });

            bcrypt.compare.mockResolvedValue(false);

            await request(app)
                .post('/api/auth/login')
                .send({
                    email: 'test@example.com',
                    password: 'wrong_password'
                })
                .expect(401);
        });
    });
});
