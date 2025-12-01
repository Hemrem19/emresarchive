import { defineConfig } from 'vitest/config';

export default defineConfig({
    test: {
        globals: true,
        environment: 'happy-dom',
        setupFiles: ['./tests/setup.js'],
        testTimeout: 10000,
        coverage: {
            provider: 'v8',
            reporter: ['text', 'html', 'lcov'],
            reportsDirectory: './tests/coverage',
            clean: true, // Clean handled by npm script, but good to have here too
            exclude: [
                'node_modules/**',
                'tests/**',
                '**/*.config.js',
                '**/dist/**',
                '**/*.backup',
                '*.backup',
                'draft_features.md',
                '*.md',
                '**/android/**',
                '**/ios/**',
                '**/App/App/**',
                '**/mobileApp/**',
                '**/extension/**',
                '**/build.js',
                '**/resize-icons.js',
                'service-worker.js',
                'check_imports.cjs',
                'test_*.js',
                'views/**',
                '**/*.view.js',
                'tailwind.js',
                'import/**',
                'marketing/**',
                'plans/**',
                'docs/**',
                '.agent/**',
                '.cursor/**',
                '.github/**',
                '**/*.deprecated.js',
                '**/*.old.js',
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
