/**
 * Test Helpers
 * Reusable utilities for backend tests
 */

import { vi } from 'vitest';

/**
 * Create a mock Express request object
 */
export const mockRequest = (overrides = {}) => {
    return {
        body: {},
        params: {},
        query: {},
        headers: {},
        user: null,
        ...overrides
    };
};

/**
 * Create a mock Express response object
 */
export const mockResponse = () => {
    const res = {};
    res.status = vi.fn().mockReturnValue(res);
    res.json = vi.fn().mockReturnValue(res);
    res.send = vi.fn().mockReturnValue(res);
    res.setHeader = vi.fn().mockReturnValue(res);
    res.cookie = vi.fn().mockReturnValue(res);
    res.clearCookie = vi.fn().mockReturnValue(res);
    res.headersSent = false;
    return res;
};

/**
 * Create a mock Express next function
 */
export const mockNext = () => vi.fn();

/**
 * Mock Prisma client factory
 */
export const createMockPrisma = () => {
    return {
        user: {
            create: vi.fn(),
            findUnique: vi.fn(),
            findMany: vi.fn(),
            update: vi.fn(),
            delete: vi.fn(),
            count: vi.fn()
        },
        paper: {
            create: vi.fn(),
            findUnique: vi.fn(),
            findMany: vi.fn(),
            update: vi.fn(),
            delete: vi.fn(),
            count: vi.fn()
        },
        collection: {
            create: vi.fn(),
            findUnique: vi.fn(),
            findMany: vi.fn(),
            update: vi.fn(),
            delete: vi.fn(),
            count: vi.fn()
        },
        annotation: {
            create: vi.fn(),
            findUnique: vi.fn(),
            findMany: vi.fn(),
            update: vi.fn(),
            delete: vi.fn(),
            count: vi.fn()
        },
        refreshToken: {
            create: vi.fn(),
            findUnique: vi.fn(),
            findMany: vi.fn(),
            update: vi.fn(),
            delete: vi.fn(),
            deleteMany: vi.fn()
        },
        citationCache: {
            create: vi.fn(),
            findUnique: vi.fn(),
            upsert: vi.fn()
        },
        $transaction: vi.fn((callback) => callback({
            user: { create: vi.fn(), findUnique: vi.fn(), update: vi.fn() },
            paper: { create: vi.fn(), findUnique: vi.fn(), update: vi.fn(), deleteMany: vi.fn() },
            collection: { create: vi.fn(), update: vi.fn(), deleteMany: vi.fn() },
            annotation: { create: vi.fn(), update: vi.fn(), deleteMany: vi.fn() }
        }))
    };
};

/**
 * Sample test data generators
 */
export const sampleData = {
    user: (overrides = {}) => ({
        id: 1,
        email: 'test@example.com',
        name: 'Test User',
        passwordHash: '$2b$10$abcdefghijklmnopqrstuvwxyz',
        emailVerified: false,
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01'),
        ...overrides
    }),

    paper: (overrides = {}) => ({
        id: 1,
        userId: 1,
        title: 'Test Research Paper',
        authors: ['John Doe', 'Jane Smith'],
        year: 2024,
        journal: 'Test Journal',
        doi: '10.1234/example',
        abstract: 'This is a test abstract.',
        tags: ['machine-learning', 'ai'],
        status: 'To Read',
        notes: 'Test notes',
        summary: null,
        rating: null,
        readingProgress: null,
        pdfUrl: null,
        s3Key: null,
        pdfSizeBytes: null,
        relatedPaperIds: [],
        version: 1,
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01'),
        deletedAt: null,
        ...overrides
    }),

    collection: (overrides = {}) => ({
        id: 1,
        userId: 1,
        name: 'Test Collection',
        icon: 'folder',
        color: 'text-primary',
        filters: {
            status: null,
            tags: [],
            searchTerm: null
        },
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01'),
        ...overrides
    }),

    annotation: (overrides = {}) => ({
        id: 1,
        paperId: 1,
        userId: 1,
        type: 'highlight',
        pageNumber: 1,
        position: { x: 100, y: 200, width: 300, height: 50 },
        content: 'Test annotation content',
        color: '#ffff00',
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01'),
        ...overrides
    }),

    refreshToken: (overrides = {}) => ({
        id: 1,
        userId: 1,
        token: 'test-refresh-token',
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        createdAt: new Date('2024-01-01'),
        ...overrides
    })
};

/**
 * Generate a valid JWT token for testing
 */
export const generateTestToken = (payload = { userId: 1, email: 'test@example.com' }) => {
    // Simple base64 encoding for testing (not a real JWT)
    const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64');
    const body = Buffer.from(JSON.stringify(payload)).toString('base64');
    const signature = 'test-signature';
    return `${header}.${body}.${signature}`;
};

/**
 * Wait for a specified time (for async tests)
 */
export const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Mock fetch response helper
 */
export const mockFetchResponse = (data, status = 200, ok = true) => {
    return Promise.resolve({
        ok,
        status,
        json: async () => data,
        text: async () => JSON.stringify(data)
    });
};
