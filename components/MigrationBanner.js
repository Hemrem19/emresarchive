import { isAuthenticated } from '../api/auth.js';
import { getAllPapers } from '../db/papers.js';
import { authView } from '../auth.view.js';

/**
 * Renders the Migration Banner encouraging offline users to sync their data BEFORE the final stage
 * of the CRDT real-time sync deployment.
 */
function renderMigrationBanner() {
    const appShell = document.getElementById('app-shell');
    if (!appShell) return;

    // Remove if already exists
    const existing = document.getElementById('migration-banner');
    if (existing) existing.remove();

    const bannerHtml = `
        <div id="migration-banner" class="bg-gradient-to-r from-blue-700 to-indigo-800 text-white p-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-xl border-b border-white/10 relative z-[100]">
            <div class="flex items-start gap-4">
                <div class="p-2 bg-white/10 rounded-lg shrink-0 border border-white/20 shadow-inner">
                    <span class="material-symbols-outlined text-3xl animate-pulse">cloud_sync</span>
                </div>
                <div>
                    <h4 class="font-extrabold text-lg tracking-tight mb-0.5">Critical Architecture Upgrade</h4>
                    <p class="text-blue-100 text-sm leading-relaxed max-w-2xl font-medium">
                        Citavers is upgrading to a powerful new real-time collaborative sync engine! Because you have offline papers, we highly recommend securely syncing them to the cloud to guarantee seamless migration and prevent data loss. 
                    </p>
                </div>
            </div>
            <div class="flex items-center gap-3 shrink-0 mt-2 sm:mt-0">
                <button id="migration-banner-dismiss" class="text-blue-200 hover:text-white hover:bg-white/10 rounded-md px-3 py-2 text-sm font-semibold transition-all">Dismiss</button>
                <button id="migration-banner-login" class="bg-white text-blue-700 hover:bg-blue-50 px-6 py-2.5 rounded-lg font-bold shadow-lg shadow-black/20 transition-transform active:scale-95 border border-blue-100 flex items-center gap-2">
                    <span class="material-symbols-outlined text-[20px]">login</span>
                    Secure My Data
                </button>
            </div>
        </div>
    `;

    const bannerContainer = document.createElement('div');
    bannerContainer.innerHTML = bannerHtml;
    // Insert at the absolute top of the app shell
    appShell.insertBefore(bannerContainer.firstElementChild, appShell.firstChild);

    // Event Listeners
    document.getElementById('migration-banner-dismiss')?.addEventListener('click', () => {
        localStorage.setItem('citavers_migration_dismissed', 'true');
        document.getElementById('migration-banner')?.remove();
    });

    document.getElementById('migration-banner-login')?.addEventListener('click', () => {
        authView.open('login');
    });
}

/**
 * Checks if the user fits the requirements for seeing the migration banner
 */
export async function checkAndShowMigrationBanner() {
    // Only show if user is strictly offline and hasn't dismissed the banner
    if (isAuthenticated()) return;
    if (localStorage.getItem('citavers_migration_dismissed')) return;

    try {
        const papers = await getAllPapers();
        // Only show if the user actively has data in their IndexedDB that needs rescuing
        if (papers && papers.length > 0) {
            renderMigrationBanner();
        }
    } catch (e) {
        console.error('[Migration Banner] Failed to evaluate local state:', e);
    }
}
