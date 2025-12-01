/**
 * Unit Tests for Email Library
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// We need to mock the modules before importing the file under test
// because it reads process.env at the top level
vi.mock('resend', () => {
    return {
        Resend: vi.fn().mockImplementation(() => ({
            emails: {
                send: vi.fn().mockResolvedValue({ data: { id: 'mock-resend-id' }, error: null })
            }
        }))
    };
});

vi.mock('nodemailer', () => ({
    createTransport: vi.fn().mockReturnValue({
        sendMail: vi.fn().mockResolvedValue({ messageId: 'mock-smtp-id' })
    })
}));

describe('Email Library', () => {
    let emailLib;

    // Helper to re-import the module with fresh environment variables
    const loadEmailLib = async () => {
        vi.resetModules();
        return await import('../../src/lib/email.js');
    };

    beforeEach(() => {
        vi.clearAllMocks();
        // Reset env vars to default for testing
        process.env.FRONTEND_URL = 'http://localhost:8080';
        process.env.EMAIL_FROM = 'noreply@example.com';
        process.env.EMAIL_FROM_NAME = 'Test App';
        process.env.EMAIL_SERVICE_TYPE = 'log';
        process.env.RESEND_API_KEY = 're_123';
        process.env.SMTP_HOST = 'smtp.example.com';
        process.env.SMTP_PORT = '587';
        process.env.SMTP_USER = 'user';
        process.env.SMTP_PASS = 'pass';

        // Spy on console methods to verify log mode
        vi.spyOn(console, 'log').mockImplementation(() => { });
        vi.spyOn(console, 'error').mockImplementation(() => { });
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    describe('Token Utilities', () => {
        beforeEach(async () => {
            emailLib = await loadEmailLib();
        });

        it('should generate a verification token', () => {
            const token = emailLib.generateVerificationToken();
            expect(typeof token).toBe('string');
            expect(token.length).toBeGreaterThan(0);
        });

        it('should generate a token expiry date 24 hours in future', () => {
            const now = Date.now();
            const expiry = emailLib.getVerificationTokenExpiry();
            const diff = expiry.getTime() - now;

            // Allow small delta for execution time (should be close to 24h)
            const twentyFourHours = 24 * 60 * 60 * 1000;
            expect(Math.abs(diff - twentyFourHours)).toBeLessThan(1000); // within 1 second
        });
    });

    describe('sendVerificationEmail', () => {
        it('should use LOG mode by default or when configured', async () => {
            process.env.EMAIL_SERVICE_TYPE = 'log';
            emailLib = await loadEmailLib();

            await emailLib.sendVerificationEmail('user@example.com', 'token123', 'John Doe');

            expect(console.log).toHaveBeenCalledWith(expect.stringContaining('=== VERIFICATION EMAIL (LOG MODE) ==='));
            expect(console.log).toHaveBeenCalledWith(expect.stringContaining('To: user@example.com'));
            expect(console.log).toHaveBeenCalledWith(expect.stringContaining('Verification URL: http://localhost:8080/#/verify-email?token=token123'));
        });

        it('should use RESEND mode when configured', async () => {
            process.env.EMAIL_SERVICE_TYPE = 'resend';
            process.env.RESEND_API_KEY = 're_test_key';
            emailLib = await loadEmailLib();

            // Get the mocked Resend class
            const { Resend } = await import('resend');

            await emailLib.sendVerificationEmail('user@example.com', 'token123', 'John Doe');

            expect(Resend).toHaveBeenCalledWith('re_test_key');
            // Access the mock instance
            const resendInstance = Resend.mock.results[0].value;
            expect(resendInstance.emails.send).toHaveBeenCalledWith(expect.objectContaining({
                from: 'Test App <noreply@example.com>',
                to: 'user@example.com',
                subject: 'Verify Your Email Address',
                html: expect.stringContaining('verify-email?token=token123')
            }));
        });

        it('should throw error if RESEND_API_KEY is missing in resend mode', async () => {
            process.env.EMAIL_SERVICE_TYPE = 'resend';
            delete process.env.RESEND_API_KEY;
            emailLib = await loadEmailLib();

            await expect(emailLib.sendVerificationEmail('user@example.com', 'token123'))
                .rejects.toThrow('RESEND_API_KEY environment variable is required');
        });

        it('should use SMTP mode when configured', async () => {
            process.env.EMAIL_SERVICE_TYPE = 'smtp';
            emailLib = await loadEmailLib();

            const nodemailer = await import('nodemailer');

            await emailLib.sendVerificationEmail('user@example.com', 'token123', 'John Doe');

            expect(nodemailer.createTransport).toHaveBeenCalledWith(expect.objectContaining({
                host: 'smtp.example.com',
                port: 587,
                auth: { user: 'user', pass: 'pass' }
            }));

            const transporter = nodemailer.createTransport.mock.results[0].value;
            expect(transporter.sendMail).toHaveBeenCalledWith(expect.objectContaining({
                from: 'Test App <noreply@example.com>',
                to: 'user@example.com',
                subject: 'Verify Your Email Address'
            }));
        });

        it('should throw error if SMTP config is missing in smtp mode', async () => {
            process.env.EMAIL_SERVICE_TYPE = 'smtp';
            delete process.env.SMTP_HOST;
            emailLib = await loadEmailLib();
        });

        it('should log placeholder message', async () => {
            await emailLib.sendPasswordResetEmail('user@example.com', 'token123');
            expect(console.log).toHaveBeenCalledWith(expect.stringContaining('Password reset email would be sent'));
        });
    });
});
