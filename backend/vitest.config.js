import { defineConfig } from 'vitest/config';

export default defineConfig({
    test: {
        // Test environment
        environment: 'node',

        // Global setup and teardown
        setupFiles: ['tests/setup.js'],

        // Coverage configuration
        coverage: {
            provider: 'v8',
            reporter: ['text', 'json', 'html', 'lcov'],
            exclude: [
                'node_modules/**',
                'tests/**',
                'test-*.js',
                'prisma/**',
                '*.config.js',
                'dist/**',
                'coverage/**'
            ],
            include: [
                'src/**/*.js'
            ],
            all: true,
            lines: 70,
            functions: 70,
            branches: 70,
            statements: 70
        },

        // Test patterns
        include: ['tests/**/*.test.js'],

        // Test timeout
        testTimeout: 10000,

        // Global test variables
        globals: true,

        // Mock reset between tests
        mockReset: true,
        clearMocks: true,
        restoreMocks: true,

        // Concurrent tests
        pool: 'forks',
        poolOptions: {
            forks: {
                singleFork: false
            }
        }
    }
});
