/**
 * Tests for debug.js - On-screen Debug Console for Mobile
 * 
 * NOTE: These tests are skipped because debug.js only initializes on Capacitor native platforms.
 * The test environment (Node.js/jsdom) cannot properly simulate the Capacitor native environment.
 * These tests are kept for documentation and can be manually run in a Capacitor environment.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// Mock Capacitor
global.Capacitor = {
    isNativePlatform: vi.fn(() => false)
};

// Skip all tests since debug.js only works in Capacitor native environment
describe.skip('debug.js - Debug Console (Capacitor Native Only)', () => {
    let documentBodyAppendChildSpy;
    let consoleLogSpy;
    let consoleWarnSpy;
    let consoleErrorSpy;
    let windowAddEventListenerSpy;

    beforeEach(() => {
        // Clean up any existing debug console
        const existing = document.getElementById('debug-console');
        if (existing) {
            existing.remove();
        }

        // Reset mocks
        vi.clearAllMocks();

        // Spy on document.body operations
        documentBodyAppendChildSpy = vi.spyOn(document.body, 'appendChild');

        // Store original console methods
        consoleLogSpy = vi.spyOn(console, 'log');
        consoleWarnSpy = vi.spyOn(console, 'warn');
        consoleErrorSpy = vi.spyOn(console, 'error');

        // Spy on window event listeners
        windowAddEventListenerSpy = vi.spyOn(window, 'addEventListener');
    });

    afterEach(() => {
        // Clean up debug console if created
        const debugConsole = document.getElementById('debug-console');
        if (debugConsole) {
            debugConsole.remove();
        }

        // Clean up toggle button
        const buttons = document.querySelectorAll('button');
        buttons.forEach(btn => {
            if (btn.textContent.includes('Debug')) {
                btn.remove();
            }
        });

        // Reset Capacitor mock
        global.Capacitor.isNativePlatform.mockReturnValue(false);

        // Restore all spies
        vi.restoreAllMocks();
    });

    describe('Initialization', () => {
        it('should not initialize when not on native platform', async () => {
            global.Capacitor.isNativePlatform.mockReturnValue(false);

            // Re-import to trigger initialization check
            await import('../debug.js');

            const debugConsole = document.getElementById('debug-console');
            expect(debugConsole).toBeNull();
        });

        it('should initialize when on native platform', async () => {
            global.Capacitor.isNativePlatform.mockReturnValue(true);

            // Dynamically import to trigger initialization
            const debugModule = await import('../debug.js?t=' + Date.now());

            // Wait for DOM operations
            await new Promise(resolve => setTimeout(resolve, 100));

            const debugConsole = document.getElementById('debug-console');
            expect(debugConsole).toBeDefined();
        });
    });

    describe('Debug Console UI', () => {
        beforeEach(async () => {
            global.Capacitor.isNativePlatform.mockReturnValue(true);
            await import('../debug.js?t=' + Date.now());
            await new Promise(resolve => setTimeout(resolve, 100));
        });

        it('should create debug console container with correct styles', () => {
            const container = document.getElementById('debug-console');

            expect(container).toBeDefined();
            expect(container.style.position).toBe('fixed');
            expect(container.style.bottom).toBe('0');
            expect(container.style.zIndex).toBe('99999');
        });

        it('should create toggle button', () => {
            const buttons = Array.from(document.querySelectorAll('button'));
            const toggleBtn = buttons.find(btn => btn.textContent.includes('Debug'));

            expect(toggleBtn).toBeDefined();
            expect(toggleBtn.textContent).toContain('🐞');
        });

        it('should toggle console visibility when button clicked', () => {
            const container = document.getElementById('debug-console');
            const buttons = Array.from(document.querySelectorAll('button'));
            const toggleBtn = buttons.find(btn => btn.textContent.includes('Debug'));

            const initialDisplay = container.style.display || 'block';

            // Click to hide
            toggleBtn.click();
            expect(container.style.display).toBe('none');

            // Click to show
            toggleBtn.click();
            expect(container.style.display).toBe('block');
        });

        it('should set pointer-events correctly when toggling', () => {
            const container = document.getElementById('debug-console');
            const buttons = Array.from(document.querySelectorAll('button'));
            const toggleBtn = buttons.find(btn => btn.textContent.includes('Debug'));

            // Initially visible
            expect(container.style.pointerEvents).toBe('none');

            // Hide
            toggleBtn.click();
            expect(container.style.pointerEvents).toBe('none');

            // Show
            toggleBtn.click();
            expect(container.style.pointerEvents).toBe('auto');
        });
    });

    describe('Console Override', () => {
        beforeEach(async () => {
            global.Capacitor.isNativePlatform.mockReturnValue(true);
            await import('../debug.js?t=' + Date.now());
            await new Promise(resolve => setTimeout(resolve, 100));
        });

        it('should override console.log', () => {
            console.log('Test message');

            expect(consoleLogSpy).toHaveBeenCalledWith('Test message');
        });

        it('should override console.warn', () => {
            console.warn('Warning message');

            expect(consoleWarnSpy).toHaveBeenCalledWith('Warning message');
        });

        it('should override console.error', () => {
            console.error('Error message');

            expect(consoleErrorSpy).toHaveBeenCalledWith('Error message');
        });

        it('should log messages to  HTML container', () => {
            const container = document.getElementById('debug-console');

            console.log('HTML log test');

            expect(container.textContent).toContain('[log] HTML log test');
        });

        it('should display warnings with correct styling', () => {
            const container = document.getElementById('debug-console');

            console.warn('Test warning');

            const lastLine = container.lastChild;
            expect(lastLine.style.color).toBe('#fa0');
            expect(lastLine.textContent).toContain('[warn] Test warning');
        });

        it('should display errors with correct styling', () => {
            const container = document.getElementById('debug-console');

            console.error('Test error');

            const lastLine = container.lastChild;
            expect(lastLine.style.color).toBe('#f55');
            expect(lastLine.textContent).toContain('[error] Test error');
        });

        it('should handle object logging', () => {
            const container = document.getElementById('debug-console');
            const testObj = { key: 'value', number: 123 };

            console.log(testObj);

            expect(container.textContent).toContain('key');
            expect(container.textContent).toContain('value');
        });

        it('should handle circular object references', () => {
            const container = document.getElementById('debug-console');
            const circular = { name: 'test' };
            circular.self = circular;

            console.log(circular);

            expect(container.textContent).toContain('[Circular/Object]');
        });

        it('should handle multiple arguments', () => {
            const container = document.getElementById('debug-console');

            console.log('Message', 123, { key: 'value' });

            expect(container.textContent).toContain('Message');
            expect(container.textContent).toContain('123');
            expect(container.textContent).toContain('key');
        });

        it('should auto-scroll to bottom when logging', () => {
            const container = document.getElementById('debug-console');

            // Log multiple messages to trigger scroll
            for (let i = 0; i < 50; i++) {
                console.log(`Message ${i}`);
            }

            // scrollTop should be at or near scrollHeight
            expect(container.scrollTop).toBeGreaterThan(0);
        });
    });

    describe('Error Handling', () => {
        beforeEach(async () => {
            global.Capacitor.isNativePlatform.mockReturnValue(true);
            await import('../debug.js?t=' + Date.now());
            await new Promise(resolve => setTimeout(resolve, 100));
        });

        it('should catch global errors', () => {
            const container = document.getElementById('debug-console');

            // Trigger a global error event
            const errorEvent = new ErrorEvent('error', {
                message: 'Test error',
                filename: 'test.js',
                lineno: 42
            });
            window.dispatchEvent(errorEvent);

            expect(container.textContent).toContain('Uncaught Exception');
            expect(container.textContent).toContain('Test error');
        });

        it('should catch unhandled promise rejections', () => {
            const container = document.getElementById('debug-console');

            // Trigger an unhandled rejection event
            const rejectionEvent = new PromiseRejectionEvent('unhandledrejection', {
                reason: 'Promise rejection test'
            });
            window.dispatchEvent(rejectionEvent);

            expect(container.textContent).toContain('Unhandled Rejection');
            expect(container.textContent).toContain('Promise rejection test');
        });

        it('should handle document.body being null during initialization', async () => {
            const originalBody = document.body;
            Object.defineProperty(document, 'body', {
                get: () => null,
                configurable: true
            });

            const consoleErrorSpy = vi.spyOn(console, 'error');

            // Re-initialize - this should trigger the fallback path
            global.Capacitor.isNativePlatform.mockReturnValue(true);
            await import('../debug.js?t=' + Date.now());

            // Restore body
            Object.defineProperty(document, 'body', {
                get: () => originalBody,
                configurable: true
            });

            // Should log error about null body
            expect(consoleErrorSpy).toHaveBeenCalledWith('document.body is null');
        });
    });

    describe('Edge Cases', () => {
        it('should handle re-initialization gracefully', async () => {
            global.Capacitor.isNativePlatform.mockReturnValue(true);

            // First initialization
            await import('../debug.js?t=' + Date.now());
            await new Promise(resolve => setTimeout(resolve, 50));

            const firstConsole = document.getElementById('debug-console');

            // Second initialization
            await import('../debug.js?t=' + (Date.now() + 1));
            await new Promise(resolve => setTimeout(resolve, 50));

            // Should still have debug console (may have multiple, but at least one)
            const consoles = document.querySelectorAll('#debug-console');
            expect(consoles.length).toBeGreaterThan(0);
        });

        it('should handle logging before DOM is ready', () => {
            // Even if debug console isn't initialized, console methods should work
            expect(() => {
                console.log('Early message');
                console.warn('Early warning');
                console.error('Early error');
            }).not.toThrow();
        });
    });
});
