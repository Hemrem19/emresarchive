/**
 * "Copy to…" dialog: copies papers into another library (personal or a
 * group). A copy is independent; its PDF is copied into the target library.
 */
import { listGroups, copyPapers } from '../api/groups.js';
import { isAuthenticated } from '../api/auth.js';
import { isCloudSyncEnabled } from '../config.js';
import { currentGroupId } from '../core/library.js';
import { showToast, escapeHtml } from '../ui.js';

const DIALOG_ID = 'copy-to-library-dialog';

/** Copying needs the cloud: libraries other than this device's live there. */
export const canCopyBetweenLibraries = () => isCloudSyncEnabled() && isAuthenticated();

/** Libraries the papers can be copied into: every one the user is in except the open one. */
export async function copyTargets() {
    const { groups } = await listGroups();
    const here = currentGroupId();
    const targets = groups.filter((g) => g.id !== here).map((g) => ({ value: `group:${g.id}`, label: g.name, hint: g.role }));
    if (here !== null) targets.unshift({ value: 'personal', label: 'My Library', hint: 'personal' });
    return targets;
}

/** Summary toast text for copy results. */
export function describeResults(results, label) {
    const copied = results.filter((r) => r.success);
    const failed = results.length - copied.length;
    const skipped = copied.filter((r) => r.pdfSkipped);
    const parts = [`Copied ${copied.length} paper${copied.length === 1 ? '' : 's'} to ${label}.`];
    if (skipped.length) parts.push(`${skipped.length} PDF${skipped.length === 1 ? ' was' : 's were'} not copied: ${skipped[0].pdfSkipped}`);
    if (failed) parts.push(`${failed} could not be copied.`);
    return parts.join(' ');
}

function close() {
    document.getElementById(DIALOG_ID)?.remove();
}

/** Opens the dialog for `paperIds` (numbers). */
export async function openCopyDialog(paperIds) {
    if (!paperIds.length) return;
    close();
    let targets;
    try {
        targets = await copyTargets();
    } catch (error) {
        showToast(`Could not load your libraries: ${error.message}`, 'error');
        return;
    }
    if (!targets.length) {
        showToast('Create or join a group first; then you can copy papers into it.', 'info', { duration: 5000 });
        return;
    }

    document.body.insertAdjacentHTML('beforeend', `
        <div id="${DIALOG_ID}" class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" role="dialog" aria-modal="true" aria-labelledby="${DIALOG_ID}-title">
            <div class="w-full max-w-sm rounded-2xl border border-white/10 bg-slate-900 p-5 shadow-2xl">
                <h2 id="${DIALOG_ID}-title" class="text-lg font-semibold text-slate-100">Copy ${paperIds.length} paper${paperIds.length === 1 ? '' : 's'} to…</h2>
                <p class="mt-1 text-xs text-slate-400">Each copy is independent: later changes stay in the library where they are made. PDFs are copied too and count toward the target's storage.</p>
                <ul class="mt-4 flex flex-col gap-2">
                    ${targets.map((t) => `
                    <li>
                        <button data-target="${escapeHtml(t.value)}" data-label="${escapeHtml(t.label)}" class="w-full flex items-center justify-between rounded-xl border border-white/5 bg-slate-800/60 px-4 py-3 text-left text-sm text-slate-200 hover:border-primary/50 hover:bg-slate-800 disabled:opacity-50">
                            <span class="truncate">${escapeHtml(t.label)}</span>
                            <span class="ml-3 text-xs text-slate-500">${escapeHtml(t.hint)}</span>
                        </button>
                    </li>`).join('')}
                </ul>
                <div class="mt-4 flex justify-end">
                    <button data-cancel class="rounded-lg px-4 py-2 text-sm text-slate-400 hover:text-white">Cancel</button>
                </div>
            </div>
        </div>`);

    const dialog = document.getElementById(DIALOG_ID);
    dialog.addEventListener('click', async (event) => {
        if (event.target === dialog || event.target.closest('[data-cancel]')) {
            close();
            return;
        }
        const button = event.target.closest('button[data-target]');
        if (!button) return;
        dialog.querySelectorAll('button').forEach((b) => { b.disabled = true; });
        button.textContent = 'Copying…';
        try {
            const results = await copyPapers(paperIds, button.dataset.target);
            const allFailed = results.every((r) => !r.success);
            showToast(describeResults(results, button.dataset.label), allFailed ? 'error' : 'success', { duration: 6000 });
        } catch (error) {
            showToast(`Copy failed: ${error.message}`, 'error');
        }
        close();
    });
}
