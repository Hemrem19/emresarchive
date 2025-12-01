import { defineConfig } from 'vitest/config';

export default defineConfig({
    // Explicitly disable workspace mode to prevent searching parent directories
    workspace: false,
    test: {
        // Test environment
        environment: 'node',

        // Global setup and teardown
        setupFiles: ['tests/setup.js'],

        // Coverage configuration
        // Coverage configuration
        coverage: {
            provider: 'v8',
            reporter: ['text', 'json', 'html', 'lcov'],
            reportsDirectory: './tests/coverage', // Output to backend/tests/coverage
            clean: true, // Clean independent of frontend
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
            all: true
        },

        // Test patterns
        include: ['tests/**/*.test.js'],

        // Test timeout
        testTimeout: 10000,

        // Global test variables
        globals: true,

        // Mock reset between tests
        mockReset: false,
        clearMocks: true,
        restoreMocks: false,

        // Concurrent tests
        pool: 'forks',
        poolOptions: {
            forks: {
                singleFork: false
            }
        }
    }
});
