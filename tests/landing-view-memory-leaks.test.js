/**
 * Tests for landing view memory leak fixes
 * Verifies that event listeners and IntersectionObserver are properly cleaned up
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { landingView } from '../landing.view.js';

describe('Landing View Memory Leak Prevention', () => {
    beforeEach(() => {
        // Create mock landing page DOM
        document.body.innerHTML = `
            <div id="landing-page">
                <a href="#features">Features</a>
                <a href="#about">About</a>
                <a href="#/app" data-cta="primary">Start</a>
                <section id="features" class="landing-section">Features Section</section>
                <section id="about">About Section</section>
            </div>
        `;
    });

    afterEach(() => {
        landingView.unmount();
        document.body.innerHTML = '';
    });

    describe('Event Listener Cleanup', () => {
        it('should track and remove anchor link event listeners', () => {
            // Mount the view
            landingView.mount();
            
            // Verify listeners were attached
            expect(landingView.anchorLinkHandlers.length).toBeGreaterThan(0);
            
            // Get a reference to one of the links
            const link = document.querySelector('#landing-page a[href="#features"]');
            const initialHandlerCount = landingView.anchorLinkHandlers.length;
            
            // Unmount
            landingView.unmount();
            
            // Verify listeners were removed
            expect(landingView.anchorLinkHandlers.length).toBe(0);
            
            // Verify the link still exists (DOM wasn't removed)
            expect(link).toBeTruthy();
        });

        it('should track and remove CTA button event listeners', () => {
            // Mount the view
            landingView.mount();
            
            // Verify listeners were attached
            expect(landingView.ctaButtonHandlers.length).toBeGreaterThan(0);
            
            // Unmount
            landingView.unmount();
            
            // Verify listeners were removed
            expect(landingView.ctaButtonHandlers.length).toBe(0);
        });

        it('should not accumulate listeners on remount', () => {
            // First mount
            landingView.mount();
            const firstMountAnchorCount = landingView.anchorLinkHandlers.length;
            const firstMountCtaCount = landingView.ctaButtonHandlers.length;
            
            // Unmount
            landingView.unmount();
            
            // Second mount
            landingView.mount();
            const secondMountAnchorCount = landingView.anchorLinkHandlers.length;
            const secondMountCtaCount = landingView.ctaButtonHandlers.length;
            
            // Should have same number of listeners (not doubled)
            expect(secondMountAnchorCount).toBe(firstMountAnchorCount);
            expect(secondMountCtaCount).toBe(firstMountCtaCount);
        });
    });

    describe('IntersectionObserver Cleanup', () => {
        it('should create and store IntersectionObserver reference', () => {
            // Mock IntersectionObserver if not available
            if (typeof IntersectionObserver === 'undefined') {
                global.IntersectionObserver = class {
                    constructor() {}
                    observe() {}
                    unobserve() {}
                    disconnect() {}
                };
            }
            
            landingView.mount();
            
            // Verify observer was created
            expect(landingView.intersectionObserver).toBeTruthy();
        });

        it('should disconnect IntersectionObserver on unmount', () => {
            // Mock IntersectionObserver if not available
            if (typeof IntersectionObserver === 'undefined') {
                global.IntersectionObserver = class {
                    constructor() {}
                    observe() {}
                    unobserve() {}
                    disconnect() {}
                };
            }
            
            landingView.mount();
            const observer = landingView.intersectionObserver;
            
            // Spy on disconnect method
            const disconnectSpy = vi.spyOn(observer, 'disconnect');
            
            // Unmount
            landingView.unmount();
            
            // Verify disconnect was called
            expect(disconnectSpy).toHaveBeenCalled();
            expect(landingView.intersectionObserver).toBeNull();
        });

        it('should not accumulate observers on remount', () => {
            // Mock IntersectionObserver if not available
            if (typeof IntersectionObserver === 'undefined') {
                global.IntersectionObserver = class {
                    constructor() {}
                    observe() {}
                    unobserve() {}
                    disconnect() {}
                };
            }
            
            // First mount
            landingView.mount();
            const firstObserver = landingView.intersectionObserver;
            
            // Unmount
            landingView.unmount();
            
            // Second mount
            landingView.mount();
            const secondObserver = landingView.intersectionObserver;
            
            // Should be a new observer instance (old one was disconnected)
            expect(secondObserver).toBeTruthy();
            expect(secondObserver).not.toBe(firstObserver);
        });
    });

    describe('Cleanup on Hidden Landing Page', () => {
        it('should not attach listeners when landing page is hidden', () => {
            const landingPage = document.getElementById('landing-page');
            landingPage.classList.add('hidden');
            
            landingView.mount();
            
            // Should not have attached any listeners
            expect(landingView.anchorLinkHandlers.length).toBe(0);
            expect(landingView.ctaButtonHandlers.length).toBe(0);
            expect(landingView.intersectionObserver).toBeNull();
        });
    });
});

