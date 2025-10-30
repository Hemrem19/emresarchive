import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node', // Using node environment (happy-dom had issues)
    setupFiles: ['./tests/setup.js'], // Re-enabled setup
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

