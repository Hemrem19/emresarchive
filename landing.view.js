/**
 * Landing Page View Module
 * Handles the marketing landing page lifecycle and interactions
 */

export const landingView = {
    // Store references for cleanup
    anchorLinkHandlers: [],
    ctaButtonHandlers: [],
    intersectionObserver: null,

    /**
     * Mount the landing page view
     * Sets up smooth scroll animations and CTA tracking
     */
    mount() {
        // Clean up any existing listeners/observers before mounting (prevents accumulation on remount)
        this.unmount();

        // Only initialize if we're on the landing page (hardcoded in index.html)
        // The router doesn't render the template for '/', so this works with the hardcoded version
        const landingPage = document.getElementById('landing-page');
        if (!landingPage || landingPage.classList.contains('hidden')) {
            return; // Not on landing page, skip initialization
        }

        // Smooth scroll for anchor links (works with any anchor links on the page)
        const anchorLinks = document.querySelectorAll('#landing-page a[href^="#"]');
        anchorLinks.forEach(link => {
            const handler = (e) => {
                const href = link.getAttribute('href');
                if (href.startsWith('#') && href !== '#/app' && href !== '#/' && href !== '#' && href !== '#/privacy' && href !== '#/terms') {
                    e.preventDefault();
                    const targetId = href.substring(1);
                    const targetElement = document.getElementById(targetId);
                    if (targetElement) {
                        targetElement.scrollIntoView({
                            behavior: 'smooth',
                            block: 'start'
                        });
                    }
                }
            };
            link.addEventListener('click', handler);
            // Store reference for cleanup
            this.anchorLinkHandlers.push({ element: link, handler });
        });

        // Track CTA button clicks (for analytics if needed)
        // Works with or without data-cta attributes - just tracks buttons with specific classes or text
        const ctaButtons = document.querySelectorAll('#landing-page [data-cta="primary"], #landing-page [data-cta="secondary"], #landing-page a[href="#/app"]');
        ctaButtons.forEach(button => {
            const handler = () => {
                // Could add analytics tracking here
                console.log('CTA clicked:', button.textContent?.trim() || 'CTA button');
            };
            button.addEventListener('click', handler);
            // Store reference for cleanup
            this.ctaButtonHandlers.push({ element: button, handler });
        });

        // Intersection Observer for fade-in animations on scroll
        // Guard against test environments where IntersectionObserver may not be available
        if (typeof IntersectionObserver !== 'undefined') {
            const observerOptions = {
                threshold: 0.1,
                rootMargin: '0px 0px -50px 0px'
            };

            this.intersectionObserver = new IntersectionObserver((entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        entry.target.classList.add('animate-fade-in');
                        this.intersectionObserver.unobserve(entry.target);
                    }
                });
            }, observerOptions);

            // Observe all sections for fade-in animation
            // Works with .landing-section class if present, or can be extended to other selectors
            const sections = document.querySelectorAll('#landing-page .landing-section, #landing-page section');
            sections.forEach(section => {
                this.intersectionObserver.observe(section);
            });
        }
    },

    /**
     * Unmount the landing page view
     * Clean up event listeners and observers to prevent memory leaks
     */
    unmount() {
        // Remove all anchor link event listeners
        this.anchorLinkHandlers.forEach(({ element, handler }) => {
            if (element && typeof element.removeEventListener === 'function') {
                element.removeEventListener('click', handler);
            }
        });
        this.anchorLinkHandlers = [];

        // Remove all CTA button event listeners
        this.ctaButtonHandlers.forEach(({ element, handler }) => {
            if (element && typeof element.removeEventListener === 'function') {
                element.removeEventListener('click', handler);
            }
        });
        this.ctaButtonHandlers = [];

        // Disconnect IntersectionObserver if it exists
        if (this.intersectionObserver) {
            this.intersectionObserver.disconnect();
            this.intersectionObserver = null;
        }
    }
};
