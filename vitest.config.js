import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'happy-dom', // Using happy-dom for DOM APIs in tests
    setupFiles: ['./tests/setup.js'],
    testTimeout: 10000, // 10 second timeout per test
    hookTimeout: 10000, // 10 second timeout for hooks
    teardownTimeout: 10000,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov'],
      exclude: [
        // Standard exclusions
        'node_modules/**',
        'tests/**',
        '**/*.config.js',
        '**/dist/**',
        '**/*.backup',
        'draft_features.md',
        '*.md',

        // Mobile/Platform specific (not unit testable in Vitest)
        '**/android/**',
        '**/ios/**',
        '**/App/App/**',
        '**/mobileApp/**',

        // Browser extension (platform-specific)
        '**/extension/**',

        // Build and utility scripts
        '**/build.js',
        '**/resize-icons.js',
        'service-worker.js',

        // Views/UI layer (better tested with E2E)
        'views/**',

        // Import utilities (low priority)
        'import/**',

        // Documentation
        'docs/**',
        '.agent/**',
        '.cursor/**',
      ],
      include: [
        'api/**/*.js',
        'core/**/*.js',
        'db/**/*.js',
        'dashboard/**/*.js',
        'details/**/*.js',
        'ui.js',
        'config.js',
        'debug.js',
      ]
    },
    include: ['tests/**/*.test.js'],
    exclude: ['node_modules', 'dist']
  }
});
