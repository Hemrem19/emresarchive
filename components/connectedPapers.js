/**
 * Connected papers: the papers the network links to this one, and why
 * ("Cites", "Cited by", "Same author · Ada Lovelace").
 *
 * Self-contained: renderConnected(root, paperId) fills `root` and returns a
 * promise. Nothing shows when the paper has no connections. Results are kept
 * for a minute, so a details page redrawn by live sync does not ask again.
 * Links come from the network generated on the Graph page; shared tags are
 * not a link.
 */
import { getPaperConnections } from '../api/network.js';
import { escapeHtml } from '../ui.js';

export const SHOWN = 8;
const KEEP_MS = 60 * 1000;
const cache = new Map(); // paperId -> { at, connections }

const REASONS = {
    cites: { icon: 'arrow_outward', text: 'Cites' },
    cited_by: { icon: 'call_received', text: 'Cited by' },
    same_author: { icon: 'person', text: 'Same author' },
};

/** "Cites · Same author: Ada Lovelace, Alan Turing" (HTML). */
export function reasonHtml(reasons) {
    return reasons.map((r) => {
        const names = r.names?.length ? `: ${escapeHtml(r.names.join(', '))}` : '';
        return `${REASONS[r.type]?.text || escapeHtml(r.type)}${names}`;
    }).join(' · ');
}

function rowHtml({ paper, reasons }) {
    const icon = REASONS[reasons[0]?.type]?.icon || 'link';
    return `
        <a href="#/details/${Number(paper.id)}" class="flex items-start gap-2.5 rounded-lg px-2 py-1.5 -mx-2 hover:bg-white/5">
            <span class="material-symbols-outlined mt-0.5 text-base text-slate-500">${icon}</span>
            <span class="min-w-0">
                <span class="block text-sm leading-snug text-slate-200">${escapeHtml(paper.title || 'Untitled')}${paper.year ? ` <span class="text-slate-500">(${Number(paper.year)})</span>` : ''}</span>
                <span class="block text-xs text-slate-400">${reasonHtml(reasons)}</span>
            </span>
        </a>`;
}

/**
 * @param {HTMLElement} root
 * @param {number} paperId
 * @param {{ api?: { getPaperConnections: Function } }} [options]
 */
export async function renderConnected(root, paperId, { api } = {}) {
    const load = api?.getPaperConnections || getPaperConnections;
    let connections = cache.get(paperId)?.at > Date.now() - KEEP_MS ? cache.get(paperId).connections : null;
    if (!connections) {
        try {
            connections = await load(paperId);
            cache.set(paperId, { at: Date.now(), connections });
        } catch {
            connections = []; // offline or no network yet: nothing to show
        }
    }
    if (!root.isConnected) return; // the page moved on meanwhile
    if (!connections.length) {
        root.innerHTML = '';
        root.classList.add('hidden');
        return;
    }
    root.classList.remove('hidden');
    const rest = connections.length - SHOWN;
    root.innerHTML = `
        <h3 class="mb-2 text-sm font-semibold uppercase tracking-wide text-white">Connected Papers</h3>
        <div class="space-y-0.5">${connections.slice(0, SHOWN).map(rowHtml).join('')}</div>
        ${rest > 0 ? `
            <div data-more class="hidden space-y-0.5">${connections.slice(SHOWN).map(rowHtml).join('')}</div>
            <button type="button" data-show-more class="mt-1 text-xs font-semibold text-blue-300 hover:text-white">Show ${rest} more</button>` : ''}`;
    root.querySelector('[data-show-more]')?.addEventListener('click', (e) => {
        root.querySelector('[data-more]').classList.remove('hidden');
        e.currentTarget.remove();
    });
}

/** Forgets cached connections (e.g. after the network was regenerated). */
export const forgetConnections = () => cache.clear();
