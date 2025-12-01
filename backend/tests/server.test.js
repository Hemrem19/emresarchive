import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';

// Mock Prisma to avoid DB connection during server tests
vi.mock('../src/lib/prisma.js', () => ({
    prisma: {
        $connect: vi.fn(),
        $disconnect: vi.fn(),
        $queryRaw: vi.fn(),
        $executeRaw: vi.fn(),
    }
}));

// Import app
import app from '../src/server.js';

describe('Server Configuration', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('GET /health', () => {
        it('should return 200 OK with status info', async () => {
            const res = await request(app)
                .get('/health')
                .expect(200);

            expect(res.body.status).toBe('ok');
            expect(res.body.timestamp).toBeDefined();
            expect(res.body.environment).toBeDefined();
        });
    });

    describe('Global Middleware', () => {
        it('should parse JSON bodies', async () => {
            // We can test this by hitting an endpoint that echoes data or expects JSON
            // Since we don't have a dedicated echo endpoint, we'll use a mocked auth route
            // or just rely on the fact that other route tests cover this.
            // Alternatively, we can check if the middleware is applied by checking 400 on malformed JSON

            await request(app)
                .post('/api/auth/login')
                .set('Content-Type', 'application/json')
                .send('invalid-json')
                .expect(400); // Express body-parser throws 400 on invalid JSON
        });

        it('should handle CORS headers', async () => {
            const res = await request(app)
                .get('/health')
                .set('Origin', 'http://localhost:8080')
                .expect(200);

            expect(res.headers['access-control-allow-origin']).toBe('http://localhost:8080');
        });
    });

    describe('Error Handling', () => {
        it('should return 404 for unknown routes', async () => {
            const res = await request(app)
                .get('/api/unknown-route-123')
                .expect(404);

            expect(res.body.success).toBe(false);
            expect(res.body.error.message).toContain('not found');
        });
    });
});



describe('BigInt Middleware', () => {
    it('should serialize BigInt as string', async () => {
        const { bigIntJson } = await import('../src/middleware/bigIntJson.js');

        const req = {};
        const res = {
            json: vi.fn(),
            setHeader: vi.fn(),
            send: vi.fn()
        };
        const next = vi.fn();

        // Call middleware to override res.json
        bigIntJson(req, res, next);

        // Call the overridden res.json
        res.json({ value: BigInt(9007199254740991) + BigInt(1) });

        expect(res.send).toHaveBeenCalledWith(expect.stringContaining('"value":"9007199254740992"'));
        expect(res.setHeader).toHaveBeenCalledWith('Content-Type', 'application/json');
    });
});

describe('CORS Configuration', () => {
    it('should block disallowed origins in production', async () => {
        // Mock NODE_ENV to production for this test
        const originalEnv = process.env.NODE_ENV;
        process.env.NODE_ENV = 'production';

        try {
            await request(app)
                .get('/health')
                .set('Origin', 'http://evil.com')
                .expect(500); // cors middleware throws error which becomes 500
        } finally {
            process.env.NODE_ENV = originalEnv;
        }
    });
});


describe('Server Startup Logic', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('testDatabaseConnection should log success on connection', async () => {
        const { testDatabaseConnection } = await import('../src/server.js');
        const consoleSpy = vi.spyOn(console, 'log');

        await testDatabaseConnection();

        expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Database: Connected'));
    });

    it('testDatabaseConnection should log error on failure', async () => {
        const { testDatabaseConnection } = await import('../src/server.js');
        const consoleSpy = vi.spyOn(console, 'error');

        // Mock connection failure
        const { prisma } = await import('../src/lib/prisma.js');
        prisma.$connect.mockRejectedValueOnce(new Error('Connection failed'));

        await testDatabaseConnection();

        expect(consoleSpy).toHaveBeenCalledWith(
            expect.stringContaining('Database: Connection failed'),
            expect.any(String)
        );
    });
});
