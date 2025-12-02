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
        // Smooth scroll for anchor links
        const anchorLinks = document.querySelectorAll('a[href^="#"]');
        anchorLinks.forEach(link => {
            link.addEventListener('click', (e) => {
                const href = link.getAttribute('href');
                if (href.startsWith('#') && href !== '#/app' && href !== '#/') {
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
        const ctaButtons = document.querySelectorAll('[data-cta="primary"], [data-cta="secondary"]');
        ctaButtons.forEach(button => {
            button.addEventListener('click', () => {
                // Could add analytics tracking here
                console.log('CTA clicked:', button.textContent);
            });
        });

        // Intersection Observer for fade-in animations on scroll
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
        const sections = document.querySelectorAll('.landing-section');
        sections.forEach(section => {
            observer.observe(section);
        });
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

