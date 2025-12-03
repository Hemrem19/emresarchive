export const privacyView = `
<div class="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
    <div class="mb-12 text-center">
        <div class="inline-flex items-center justify-center w-16 h-16 mb-6 rounded-2xl bg-gradient-to-br from-blue-500/20 to-blue-600/10 border border-blue-500/20">
            <span class="material-symbols-outlined text-blue-400 text-4xl">shield_lock</span>
        </div>
        <h1 class="text-4xl sm:text-5xl font-bold text-white mb-6">Privacy Policy</h1>
        <p class="text-xl text-slate-400 max-w-2xl mx-auto">
            Your research is personal. We believe your data should be too.
        </p>
    </div>

    <div class="space-y-8">
        <!-- Core Principle -->
        <div class="glass-panel p-8 rounded-2xl border border-slate-700/50">
            <h2 class="text-2xl font-bold text-white mb-4 flex items-center gap-3">
                <span class="material-symbols-outlined text-blue-400">lock</span>
                Local-First by Design
            </h2>
            <p class="text-slate-300 leading-relaxed mb-4">
                citavers is built on a "Local-First" architecture. This means:
            </p>
            <ul class="space-y-3 text-slate-400 ml-2">
                <li class="flex items-start gap-3">
                    <span class="material-symbols-outlined text-green-400 mt-1 text-lg">check_circle</span>
                    <span><strong>Your Data Stays on Your Device:</strong> All your papers, notes, and metadata are stored in your browser's IndexedDB database.</span>
                </li>
                <li class="flex items-start gap-3">
                    <span class="material-symbols-outlined text-green-400 mt-1 text-lg">check_circle</span>
                    <span><strong>No Tracking:</strong> We do not track your reading habits, search queries, or the content of your notes.</span>
                </li>
                <li class="flex items-start gap-3">
                    <span class="material-symbols-outlined text-green-400 mt-1 text-lg">check_circle</span>
                    <span><strong>Offline Capable:</strong> The application works entirely offline because it doesn't rely on constant server communication.</span>
                </li>
            </ul>
        </div>

        <!-- Cloud Sync -->
        <div class="glass-panel p-8 rounded-2xl border border-slate-700/50">
            <h2 class="text-2xl font-bold text-white mb-4 flex items-center gap-3">
                <span class="material-symbols-outlined text-purple-400">cloud_sync</span>
                Optional Cloud Sync
            </h2>
            <p class="text-slate-300 leading-relaxed mb-4">
                If you choose to enable Cloud Sync to access your library across multiple devices:
            </p>
            <ul class="space-y-3 text-slate-400 ml-2">
                <li class="flex items-start gap-3">
                    <span class="material-symbols-outlined text-blue-400 mt-1 text-lg">info</span>
                    <span><strong>Encrypted Transmission:</strong> All data is transmitted securely over HTTPS.</span>
                </li>
                <li class="flex items-start gap-3">
                    <span class="material-symbols-outlined text-blue-400 mt-1 text-lg">info</span>
                    <span><strong>Minimal Data Collection:</strong> We only store the data necessary to sync your library (papers, notes, collections) and your account information (email).</span>
                </li>
                <li class="flex items-start gap-3">
                    <span class="material-symbols-outlined text-blue-400 mt-1 text-lg">info</span>
                    <span><strong>PDF Storage:</strong> If you upload PDFs, they are stored in a secure S3-compatible storage bucket.</span>
                </li>
            </ul>
        </div>

        <!-- Data Rights -->
        <div class="glass-panel p-8 rounded-2xl border border-slate-700/50">
            <h2 class="text-2xl font-bold text-white mb-4 flex items-center gap-3">
                <span class="material-symbols-outlined text-amber-400">manage_accounts</span>
                Your Data Rights
            </h2>
            <div class="grid md:grid-cols-2 gap-6">
                <div>
                    <h3 class="text-lg font-semibold text-white mb-2">Export Anytime</h3>
                    <p class="text-slate-400 text-sm">
                        You can export your entire library to JSON format at any time. You are not locked into our platform.
                    </p>
                </div>
                <div>
                    <h3 class="text-lg font-semibold text-white mb-2">Complete Deletion</h3>
                    <p class="text-slate-400 text-sm">
                        You can delete your account and all associated cloud data permanently. Local data can be cleared from your browser settings.
                    </p>
                </div>
            </div>
        </div>

        <!-- Contact -->
        <div class="text-center pt-8 border-t border-slate-800">
            <p class="text-slate-500">
                Questions about privacy? Contact us at <a href="mailto:privacy@citavers.com" class="text-blue-400 hover:text-blue-300 transition-colors">privacy@citavers.com</a>
            </p>
            <p class="text-slate-600 text-sm mt-4">
                Last Updated: December 2025
            </p>
        </div>
    </div>
</div>
`;
