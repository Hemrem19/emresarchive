/**
 * Test Setup
 * Global configuration for all backend tests
 */

import { beforeAll, afterAll, beforeEach, afterEach, vi } from 'vitest';

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.JWT_ACCESS_SECRET = 'test-access-secret-key-for-testing-only';
process.env.JWT_REFRESH_SECRET = 'test-refresh-secret-key-for-testing-only';
process.env.FRONTEND_URL = 'http://localhost:8080';
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test';

// Mock external services
vi.mock('node-fetch', () => ({
    default: vi.fn()
}));

// Mock Resend email service
vi.mock('resend', () => {
    return {
        Resend: vi.fn().mockImplementation(() => ({
            emails: {
                send: vi.fn().mockResolvedValue({ id: 'test-email-id' })
            }
        }))
    };
});

// Mock nodemailer
vi.mock('nodemailer', () => ({
    createTransport: vi.fn().mockReturnValue({
        sendMail: vi.fn().mockResolvedValue({ messageId: 'test-message-id' })
    })
}));

// Global test hooks
beforeAll(() => {
    // Global setup before all tests
    console.log('Starting backend unit tests...');
});

afterAll(() => {
    // Global cleanup after all tests
    console.log('Backend unit tests completed.');
});

beforeEach(() => {
    // Reset mocks before each test
    vi.clearAllMocks();
});

afterEach(() => {
    // Cleanup after each test
    vi.restoreAllMocks();
});
