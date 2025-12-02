/**
 * Landing Page Template
 * Marketing-focused landing page with all 8 sections
 */

export const landingView = `
    <!-- Hero Section (Above the Fold) -->
    <section id="hero" class="landing-section min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/10 via-background-light to-primary/5 dark:from-primary/20 dark:via-background-dark dark:to-primary/10">
        <div class="container mx-auto px-4 sm:px-6 lg:px-8 py-20">
            <div class="max-w-6xl mx-auto">
                <div class="grid lg:grid-cols-2 gap-12 items-center">
                    <!-- Left: Content -->
                    <div class="text-center lg:text-left">
                        <h1 class="text-4xl sm:text-5xl lg:text-6xl font-bold text-stone-900 dark:text-stone-100 mb-6 leading-tight">
                            Your Research, Fully Under Your Control
                        </h1>
                        <p class="text-xl sm:text-2xl text-stone-600 dark:text-stone-400 mb-8 leading-relaxed">
                            A local-first, offline-capable research paper manager that runs entirely in your browser. No servers, no tracking, just you and your data.
                        </p>
                        <div class="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
                            <a href="#/app" data-cta="primary" class="inline-flex items-center justify-center px-8 py-4 bg-primary text-white text-lg font-semibold rounded-lg hover:bg-primary/90 transition-colors shadow-lg hover:shadow-xl">
                                Start Organizing - No Sign-up Required
                                <span class="material-symbols-outlined ml-2">arrow_forward</span>
                            </a>
                            <a href="#features" class="inline-flex items-center justify-center px-8 py-4 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 text-lg font-semibold rounded-lg border-2 border-stone-300 dark:border-stone-700 hover:border-primary dark:hover:border-primary transition-colors">
                                Explore Features
                            </a>
                        </div>
                    </div>
                    <!-- Right: Visual -->
                    <div class="relative">
                        <div class="bg-white dark:bg-stone-800 rounded-xl shadow-2xl p-4 border border-stone-200 dark:border-stone-700">
                            <div class="aspect-video bg-gradient-to-br from-primary/20 to-primary/5 dark:from-primary/30 dark:to-primary/10 rounded-lg flex items-center justify-center">
                                <span class="material-symbols-outlined text-6xl text-primary opacity-50">description</span>
                                <p class="text-stone-500 dark:text-stone-400 text-sm mt-4">Dashboard Preview</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </section>

    <!-- Value Proposition Section -->
    <section id="value-proposition" class="landing-section py-20 bg-white dark:bg-stone-900">
        <div class="container mx-auto px-4 sm:px-6 lg:px-8">
            <div class="max-w-6xl mx-auto">
                <h2 class="text-3xl sm:text-4xl font-bold text-center text-stone-900 dark:text-stone-100 mb-12">
                    Why Choose citavErs?
                </h2>
                <div class="grid md:grid-cols-3 gap-8">
                    <!-- True Data Ownership -->
                    <div class="text-center p-6 rounded-xl bg-stone-50 dark:bg-stone-800/50 hover:shadow-lg transition-shadow">
                        <div class="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 dark:bg-primary/20 mb-4">
                            <span class="material-symbols-outlined text-3xl text-primary">storage</span>
                        </div>
                        <h3 class="text-xl font-semibold text-stone-900 dark:text-stone-100 mb-3">True Data Ownership</h3>
                        <p class="text-stone-600 dark:text-stone-400">
                            All data stored locally in IndexedDB; export JSON anytime. Your research stays with you, always.
                        </p>
                    </div>
                    <!-- Works Completely Offline -->
                    <div class="text-center p-6 rounded-xl bg-stone-50 dark:bg-stone-800/50 hover:shadow-lg transition-shadow">
                        <div class="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 dark:bg-primary/20 mb-4">
                            <span class="material-symbols-outlined text-3xl text-primary">wifi_off</span>
                        </div>
                        <h3 class="text-xl font-semibold text-stone-900 dark:text-stone-100 mb-3">Works Completely Offline</h3>
                        <p class="text-stone-600 dark:text-stone-400">
                            PWA architecture ensures core features work without internet. Research anywhere, anytime.
                        </p>
                    </div>
                    <!-- Privacy First -->
                    <div class="text-center p-6 rounded-xl bg-stone-50 dark:bg-stone-800/50 hover:shadow-lg transition-shadow">
                        <div class="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 dark:bg-primary/20 mb-4">
                            <span class="material-symbols-outlined text-3xl text-primary">lock</span>
                        </div>
                        <h3 class="text-xl font-semibold text-stone-900 dark:text-stone-100 mb-3">Privacy First</h3>
                        <p class="text-stone-600 dark:text-stone-400">
                            No server-side storage unless you explicitly enable cloud sync. Your reading stays private.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    </section>

    <!-- Key Features Section -->
    <section id="features" class="landing-section py-20 bg-background-light dark:bg-background-dark">
        <div class="container mx-auto px-4 sm:px-6 lg:px-8">
            <div class="max-w-6xl mx-auto">
                <h2 class="text-3xl sm:text-4xl font-bold text-center text-stone-900 dark:text-stone-100 mb-12">
                    Powerful Features for Researchers
                </h2>
                <div class="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
                    <!-- Smart Management -->
                    <div class="p-6 bg-white dark:bg-stone-800 rounded-xl border border-stone-200 dark:border-stone-700 hover:border-primary dark:hover:border-primary transition-colors">
                        <div class="inline-flex items-center justify-center w-12 h-12 rounded-lg bg-primary/10 dark:bg-primary/20 mb-4">
                            <span class="material-symbols-outlined text-2xl text-primary">auto_awesome</span>
                        </div>
                        <h3 class="text-lg font-semibold text-stone-900 dark:text-stone-100 mb-2">Smart Management</h3>
                        <p class="text-sm text-stone-600 dark:text-stone-400">
                            Add papers via DOI lookup, organize with tags, and track reading status (Reading, To Read, Finished).
                        </p>
                    </div>
                    <!-- Rich Annotations -->
                    <div class="p-6 bg-white dark:bg-stone-800 rounded-xl border border-stone-200 dark:border-stone-700 hover:border-primary dark:hover:border-primary transition-colors">
                        <div class="inline-flex items-center justify-center w-12 h-12 rounded-lg bg-primary/10 dark:bg-primary/20 mb-4">
                            <span class="material-symbols-outlined text-2xl text-primary">edit_note</span>
                        </div>
                        <h3 class="text-lg font-semibold text-stone-900 dark:text-stone-100 mb-2">Rich Notes & Summaries</h3>
                        <p class="text-sm text-stone-600 dark:text-stone-400">
                            Write rich-text notes with formatting, add paper summaries, and track reading progress. All searchable and organized.
                        </p>
                    </div>
                    <!-- Visual Discovery -->
                    <div class="p-6 bg-white dark:bg-stone-800 rounded-xl border border-stone-200 dark:border-stone-700 hover:border-primary dark:hover:border-primary transition-colors">
                        <div class="inline-flex items-center justify-center w-12 h-12 rounded-lg bg-primary/10 dark:bg-primary/20 mb-4">
                            <span class="material-symbols-outlined text-2xl text-primary">device_hub</span>
                        </div>
                        <h3 class="text-lg font-semibold text-stone-900 dark:text-stone-100 mb-2">Visual Discovery</h3>
                        <p class="text-sm text-stone-600 dark:text-stone-400">
                            Utilize the Paper Network Graph to visualize relationships and links between different academic papers.
                        </p>
                    </div>
                    <!-- Citation Ready -->
                    <div class="p-6 bg-white dark:bg-stone-800 rounded-xl border border-stone-200 dark:border-stone-700 hover:border-primary dark:hover:border-primary transition-colors">
                        <div class="inline-flex items-center justify-center w-12 h-12 rounded-lg bg-primary/10 dark:bg-primary/20 mb-4">
                            <span class="material-symbols-outlined text-2xl text-primary">format_quote</span>
                        </div>
                        <h3 class="text-lg font-semibold text-stone-900 dark:text-stone-100 mb-2">Citation Ready</h3>
                        <p class="text-sm text-stone-600 dark:text-stone-400">
                            Generate citations instantly in APA, MLA, Chicago, or BibTeX formats for your writing.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    </section>

    <!-- Technical Trust Signals -->
    <section id="trust-signals" class="landing-section py-20 bg-white dark:bg-stone-900">
        <div class="container mx-auto px-4 sm:px-6 lg:px-8">
            <div class="max-w-6xl mx-auto">
                <h2 class="text-3xl sm:text-4xl font-bold text-center text-stone-900 dark:text-stone-100 mb-12">
                    Built for Reliability
                </h2>
                <div class="grid md:grid-cols-3 gap-6">
                    <!-- Open Source -->
                    <div class="p-6 bg-stone-50 dark:bg-stone-800/50 rounded-xl border border-stone-200 dark:border-stone-700 text-center">
                        <span class="material-symbols-outlined text-4xl text-primary mb-3">code</span>
                        <h3 class="text-lg font-semibold text-stone-900 dark:text-stone-100 mb-2">Open Source</h3>
                        <p class="text-sm text-stone-600 dark:text-stone-400 mb-4">
                            Fully open source on GitHub. Inspect, modify, and contribute.
                        </p>
                        <a href="https://github.com/Hemrem19/citavers" target="_blank" rel="noopener noreferrer" class="inline-flex items-center text-primary hover:underline">
                            View on GitHub
                            <span class="material-symbols-outlined text-sm ml-1">open_in_new</span>
                        </a>
                    </div>
                    <!-- No Build Tools -->
                    <div class="p-6 bg-stone-50 dark:bg-stone-800/50 rounded-xl border border-stone-200 dark:border-stone-700 text-center">
                        <span class="material-symbols-outlined text-4xl text-primary mb-3">speed</span>
                        <h3 class="text-lg font-semibold text-stone-900 dark:text-stone-100 mb-2">No Build Tools</h3>
                        <p class="text-sm text-stone-600 dark:text-stone-400">
                            Built with pure Vanilla JavaScript for speed. No compilation, no bundling, just fast loading.
                        </p>
                    </div>
                    <!-- Test Coverage -->
                    <div class="p-6 bg-stone-50 dark:bg-stone-800/50 rounded-xl border border-stone-200 dark:border-stone-700 text-center">
                        <span class="material-symbols-outlined text-4xl text-primary mb-3">verified</span>
                        <h3 class="text-lg font-semibold text-stone-900 dark:text-stone-100 mb-2">Test Coverage</h3>
                        <p class="text-sm text-stone-600 dark:text-stone-400">
                            100% test pass rate with 1600+ automated tests ensuring stability and reliability.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    </section>

    <!-- Social Proof Section -->
    <section id="social-proof" class="landing-section py-20 bg-background-light dark:bg-background-dark">
        <div class="container mx-auto px-4 sm:px-6 lg:px-8">
            <div class="max-w-4xl mx-auto text-center">
                <h2 class="text-3xl sm:text-4xl font-bold text-stone-900 dark:text-stone-100 mb-8">
                    Trusted by Researchers
                </h2>
                <div class="grid sm:grid-cols-2 gap-6 mb-8">
                    <div class="p-6 bg-white dark:bg-stone-800 rounded-xl border border-stone-200 dark:border-stone-700">
                        <div class="flex items-center justify-center mb-4">
                            <span class="material-symbols-outlined text-4xl text-primary">verified</span>
                        </div>
                        <p class="text-lg font-semibold text-stone-900 dark:text-stone-100 mb-2">1600+ Tests Passing</p>
                        <p class="text-sm text-stone-600 dark:text-stone-400">Verified against comprehensive test suite</p>
                    </div>
                    <div class="p-6 bg-white dark:bg-stone-800 rounded-xl border border-stone-200 dark:border-stone-700">
                        <div class="flex items-center justify-center mb-4">
                            <span class="material-symbols-outlined text-4xl text-primary">update</span>
                        </div>
                        <p class="text-lg font-semibold text-stone-900 dark:text-stone-100 mb-2">Active Development</p>
                        <p class="text-sm text-stone-600 dark:text-stone-400">Regular updates and improvements</p>
                    </div>
                </div>
            </div>
        </div>
    </section>

    <!-- How It Works Section -->
    <section id="how-it-works" class="landing-section py-20 bg-white dark:bg-stone-900">
        <div class="container mx-auto px-4 sm:px-6 lg:px-8">
            <div class="max-w-4xl mx-auto">
                <h2 class="text-3xl sm:text-4xl font-bold text-center text-stone-900 dark:text-stone-100 mb-12">
                    How It Works
                </h2>
                <div class="grid md:grid-cols-3 gap-8">
                    <!-- Step 1 -->
                    <div class="text-center">
                        <div class="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary text-white text-2xl font-bold mb-4">
                            1
                        </div>
                        <h3 class="text-xl font-semibold text-stone-900 dark:text-stone-100 mb-3">Open in Browser</h3>
                        <p class="text-stone-600 dark:text-stone-400">
                            No installation required. Just open citavErs in your browser and start organizing.
                        </p>
                    </div>
                    <!-- Step 2 -->
                    <div class="text-center">
                        <div class="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary text-white text-2xl font-bold mb-4">
                            2
                        </div>
                        <h3 class="text-xl font-semibold text-stone-900 dark:text-stone-100 mb-3">Add Papers</h3>
                        <p class="text-stone-600 dark:text-stone-400">
                            Drag and drop PDFs or paste a DOI. Metadata is automatically fetched for you.
                        </p>
                    </div>
                    <!-- Step 3 -->
                    <div class="text-center">
                        <div class="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary text-white text-2xl font-bold mb-4">
                            3
                        </div>
                        <h3 class="text-xl font-semibold text-stone-900 dark:text-stone-100 mb-3">Sync Optional</h3>
                        <p class="text-stone-600 dark:text-stone-400">
                            Enable cloud sync only if you need multi-device access. Otherwise, everything stays local.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    </section>

    <!-- Secondary CTA Section -->
    <section id="cta" class="landing-section py-20 bg-gradient-to-r from-primary to-primary/80 dark:from-primary dark:to-primary/90">
        <div class="container mx-auto px-4 sm:px-6 lg:px-8">
            <div class="max-w-3xl mx-auto text-center">
                <h2 class="text-3xl sm:text-4xl font-bold text-white mb-6">
                    Ready to take control of your research?
                </h2>
                <p class="text-xl text-white/90 mb-8">
                    Start organizing your papers today. No sign-up required, no credit card needed.
                </p>
                <div class="flex flex-col sm:flex-row gap-4 justify-center">
                    <a href="#/app" data-cta="secondary" class="inline-flex items-center justify-center px-8 py-4 bg-white text-primary text-lg font-semibold rounded-lg hover:bg-stone-50 transition-colors shadow-lg">
                        Launch citavErs Now
                        <span class="material-symbols-outlined ml-2">rocket_launch</span>
                    </a>
                    <a href="#features" class="inline-flex items-center justify-center px-8 py-4 bg-transparent text-white text-lg font-semibold rounded-lg border-2 border-white hover:bg-white/10 transition-colors">
                        Explore Features
                    </a>
                </div>
            </div>
        </div>
    </section>

    <!-- Footer -->
    <footer class="bg-stone-900 dark:bg-black text-stone-400 py-12">
        <div class="container mx-auto px-4 sm:px-6 lg:px-8">
            <div class="max-w-6xl mx-auto">
                <div class="grid md:grid-cols-3 gap-8 mb-8">
                    <div>
                        <div class="flex items-center gap-3 mb-4">
                            <img src="assets/logos/logo-mark.png" alt="citavErs logo" class="h-10 w-10" style="background: transparent;" onerror="this.style.display='none';">
                            <h3 class="text-xl font-bold text-white">citavErs</h3>
                        </div>
                        <p class="text-sm text-stone-500">
                            Local-first research paper management. Your data, your control.
                        </p>
                    </div>
                    <div>
                        <h4 class="text-sm font-semibold text-white uppercase tracking-wider mb-4">Resources</h4>
                        <ul class="space-y-2">
                            <li><a href="https://github.com/Hemrem19/citavers" target="_blank" rel="noopener noreferrer" class="text-sm hover:text-white transition-colors">GitHub Repository</a></li>
                            <li><a href="#/docs" class="text-sm hover:text-white transition-colors">Documentation</a></li>
                            <li><a href="#/app" class="text-sm hover:text-white transition-colors">Launch App</a></li>
                        </ul>
                    </div>
                    <div>
                        <h4 class="text-sm font-semibold text-white uppercase tracking-wider mb-4">Legal</h4>
                        <ul class="space-y-2">
                            <li><span class="text-sm text-stone-500">MIT License</span></li>
                            <li><span class="text-sm text-stone-500">© ${new Date().getFullYear()} citavErs</span></li>
                        </ul>
                    </div>
                </div>
                <div class="border-t border-stone-800 pt-8 text-center text-sm text-stone-500">
                    <p>Made with vanilla JS 🍦 | Local-first 💾 | Privacy-focused 🔒</p>
                </div>
            </div>
        </div>
    </footer>
`;

