/**
 * Landing Page View Module
 * Handles the marketing landing page lifecycle and interactions
 */

export const landingView = {
    /**
     * Mount the landing page view
     * Sets up smooth scroll animations and CTA tracking
     */
    mount() {
        // Only initialize if we're on the landing page (hardcoded in index.html)
        // The router doesn't render the template for '/', so this works with the hardcoded version
        const landingPage = document.getElementById('landing-page');
        if (!landingPage || landingPage.classList.contains('hidden')) {
            return; // Not on landing page, skip initialization
        }

        // Smooth scroll for anchor links (works with any anchor links on the page)
        const anchorLinks = document.querySelectorAll('#landing-page a[href^="#"]');
        anchorLinks.forEach(link => {
            link.addEventListener('click', (e) => {
                const href = link.getAttribute('href');
                if (href.startsWith('#') && href !== '#/app' && href !== '#/' && href !== '#') {
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
            });
        });

        // Track CTA button clicks (for analytics if needed)
        // Works with or without data-cta attributes - just tracks buttons with specific classes or text
        const ctaButtons = document.querySelectorAll('#landing-page [data-cta="primary"], #landing-page [data-cta="secondary"], #landing-page a[href="#/app"]');
        ctaButtons.forEach(button => {
            button.addEventListener('click', () => {
                // Could add analytics tracking here
                console.log('CTA clicked:', button.textContent?.trim() || 'CTA button');
            });
        });

        // Intersection Observer for fade-in animations on scroll
        // Guard against test environments where IntersectionObserver may not be available
        if (typeof IntersectionObserver !== 'undefined') {
            const observerOptions = {
                threshold: 0.1,
                rootMargin: '0px 0px -50px 0px'
            };

            const observer = new IntersectionObserver((entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        entry.target.classList.add('animate-fade-in');
                        observer.unobserve(entry.target);
                    }
                });
            }, observerOptions);

            // Observe all sections for fade-in animation
            // Works with .landing-section class if present, or can be extended to other selectors
            const sections = document.querySelectorAll('#landing-page .landing-section, #landing-page section');
            sections.forEach(section => {
                observer.observe(section);
            });
        }
    },

    /**
     * Unmount the landing page view
     * Clean up event listeners and observers
     */
    unmount() {
        // Cleanup is handled by removing the DOM elements
        // No persistent listeners that need cleanup
    }
};

