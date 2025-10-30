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
        'node_modules/**',
        'tests/**',
        '**/*.config.js',
        '**/dist/**',
        '**/*.backup',
        'draft_features.md',
        '*.md'
      ]
    },
    include: ['tests/**/*.test.js'],
    exclude: ['node_modules', 'dist']
  }
});

