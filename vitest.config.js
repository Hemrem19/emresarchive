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
        '*.backup',  // Root-level backup files
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
        'check_imports.cjs',  // Import checker utility
        'test_*.js',          // Test helper scripts

        // Views/UI layer (better tested with E2E)
        'views/**',
        '**/*.view.js',       // Root-level view files

        // Generated/Vendor files
        'tailwind.js',        // Generated Tailwind CSS

        // Import utilities (low priority)
        'import/**',

        // Marketing & Planning
        'marketing/**',
        'plans/**',

        // Documentation & Tooling
        'docs/**',
        '.agent/**',
        '.cursor/**',
        '.github/**',         // GitHub workflows

        // Deprecated/Old files
        '**/*.deprecated.js',
        '**/*.old.js',
      ],
      include: [
        'api/**/*.js',
        'backend/**/*.js',  // Backend server code
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
