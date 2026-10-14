/**
 * Adding papers by uploading PDFs: an "Upload PDFs" button and drag-and-drop
 * on the dashboard, and a progress panel that lists every file as it is
 * identified and added (import/pdf-import.js does the work).
 *
 * An import keeps running if the user leaves the dashboard; the panel stays
 * until closed.
 */
import { importPdfs, isPdfFile, REVIEW_TAG } from '../import/pdf-import.js';
import { escapeHtml } from '../ui.js';

const PANEL_ID = 'pdf-import-panel';
const OVERLAY_ID = 'pdf-drop-overlay';

const STATE_TEXT = {
    queued: 'Waiting…',
    reading: 'Reading…',
    uploading: 'Adding…',
};

/** One finished file's status line: [text, color class]. */
export function describeResult(result) {
    switch (result.status) {
        case 'added': {
            const how = { doi: 'Identified by DOI', arxiv: 'Identified by arXiv id', title: 'Matched by title', none: 'Needs review: not identified' }[result.matchedBy] || 'Added';
            return [result.pdfError ? `${how} · PDF not attached: ${result.pdfError}` : how, result.matchedBy === 'none' || result.pdfError ? 'text-amber-400' : 'text-emerald-400'];
        }
        case 'attached': return ['PDF attached to the paper already in your library', 'text-emerald-400'];
        case 'exists': return ['Already in your library with a PDF', 'text-slate-400'];
        case 'skipped': return [result.error || 'Skipped', 'text-slate-400'];
        default: return [`Failed: ${result.error || 'unknown error'}`, 'text-red-400'];
    }
}

/** "12 added · 2 attached · 3 need review · 1 already there · 1 failed" */
export function summarize(results) {
    const count = (fn) => results.filter(fn).length;
    const parts = [
        [count((r) => r.status === 'added'), 'added'],
        [count((r) => r.status === 'attached'), 'attached to existing papers'],
        [count((r) => r.status === 'added' && r.matchedBy === 'none'), 'need review'],
        [count((r) => r.status === 'exists'), 'already in your library'],
        [count((r) => r.status === 'skipped'), 'skipped'],
        [count((r) => r.status === 'failed'), 'failed'],
    ];
    return parts.filter(([n]) => n > 0).map(([n, label]) => `${n} ${label}`).join(' · ');
}

function panel() {
    let el = document.getElementById(PANEL_ID);
    if (!el) {
        document.body.insertAdjacentHTML('beforeend', `
            <aside id="${PANEL_ID}" role="status" aria-live="polite"
                class="fixed bottom-4 right-4 z-50 w-[min(26rem,calc(100vw-2rem))] max-h-[70vh] flex flex-col rounded-2xl border border-white/10 bg-slate-900/95 shadow-2xl backdrop-blur">
                <div class="flex items-center justify-between gap-2 border-b border-white/5 px-4 py-3">
                    <h2 class="text-sm font-semibold text-slate-100">Adding PDFs</h2>
                    <button type="button" data-close class="hidden rounded-lg p-1 text-slate-400 hover:text-white" aria-label="Close">
                        <span class="material-symbols-outlined text-lg">close</span>
                    </button>
                </div>
                <ul data-rows class="flex-1 overflow-y-auto px-4 py-2 space-y-2 text-xs"></ul>
                <div data-summary class="hidden border-t border-white/5 px-4 py-3 text-xs text-slate-300"></div>
            </aside>`);
        el = document.getElementById(PANEL_ID);
        el.querySelector('[data-close]').addEventListener('click', () => el.remove());
    }
    return el;
}

let running = 0;

/**
 * Imports `files`, showing progress. `onFinished(results)` runs at the end.
 * @returns {Promise<Array<object>>}
 */
export async function startPdfImport(files, { onFinished } = {}) {
    const list = Array.from(files || []);
    if (!list.length) return [];

    const el = panel();
    const rows = el.querySelector('[data-rows]');
    el.querySelector('[data-close]').classList.add('hidden');
    el.querySelector('[data-summary]').classList.add('hidden');
    running++;

    const base = rows.children.length;
    rows.insertAdjacentHTML('beforeend', list.map((file, i) => `
        <li data-row="${base + i}" class="rounded-lg bg-slate-800/50 px-3 py-2">
            <p class="truncate text-slate-200" title="${escapeHtml(file.name)}">${escapeHtml(file.name)}</p>
            <p data-status class="mt-0.5 text-slate-400">${isPdfFile(file) ? STATE_TEXT.queued : 'Not a PDF'}</p>
        </li>`).join(''));

    const setRow = (i, { state, result }) => {
        const row = rows.querySelector(`[data-row="${base + i}"]`);
        if (!row) return;
        const status = row.querySelector('[data-status]');
        if (state !== 'done') {
            status.textContent = STATE_TEXT[state] || state;
            return;
        }
        const [text, color] = describeResult(result);
        status.className = `mt-0.5 ${color}`;
        status.textContent = text;
        if (result.title) {
            const title = row.querySelector('p');
            title.textContent = result.title;
            title.title = list[i].name;
        }
        if (result.paperId) {
            row.insertAdjacentHTML('beforeend', `<a href="#/details/${Number(result.paperId)}" class="mt-1 inline-block text-primary hover:underline">Open</a>`);
        }
    };

    const results = await importPdfs(list, { onProgress: setRow });
    running--;

    const summary = el.querySelector('[data-summary]');
    const needReview = results.some((r) => r.status === 'added' && r.matchedBy === 'none');
    summary.innerHTML = `${escapeHtml(summarize(results))}${needReview
        ? ` · <a href="#/app/tag/${REVIEW_TAG}" class="text-primary hover:underline">Review</a>` : ''}`;
    summary.classList.remove('hidden');
    if (!running) el.querySelector('[data-close]').classList.remove('hidden');

    // The dashboard re-reads the local library on this event (dashboard.view.js)
    window.dispatchEvent(new CustomEvent('citavers:cloud-synced'));
    onFinished?.(results);
    return results;
}

const hasFiles = (event) => Array.from(event.dataTransfer?.types || []).includes('Files');

/**
 * Wires the "Upload PDFs" button and drag-and-drop on the dashboard.
 * @returns {Object} handlers for unregisterPdfImport
 */
export function registerPdfImport() {
    const handlers = {};
    const button = document.getElementById('upload-pdfs-btn');
    const input = document.getElementById('upload-pdfs-input');
    if (button && input) {
        handlers.pdfPickHandler = () => input.click();
        handlers.pdfInputHandler = () => {
            startPdfImport(input.files);
            input.value = '';
        };
        button.addEventListener('click', handlers.pdfPickHandler);
        input.addEventListener('change', handlers.pdfInputHandler);
    }

    let depth = 0;
    const overlay = (show) => {
        let el = document.getElementById(OVERLAY_ID);
        if (show && !el) {
            document.body.insertAdjacentHTML('beforeend', `
                <div id="${OVERLAY_ID}" class="pointer-events-none fixed inset-0 z-40 flex items-center justify-center bg-slate-950/70 backdrop-blur-sm">
                    <div class="rounded-2xl border-2 border-dashed border-primary px-10 py-8 text-center">
                        <span class="material-symbols-outlined text-5xl text-primary">upload_file</span>
                        <p class="mt-2 text-lg font-semibold text-white">Drop PDFs to add them</p>
                        <p class="text-sm text-slate-400">Details are filled in automatically</p>
                    </div>
                </div>`);
        } else if (!show) {
            el?.remove();
        }
    };
    handlers.dragEnterHandler = (event) => {
        if (!hasFiles(event)) return;
        event.preventDefault();
        depth++;
        overlay(true);
    };
    handlers.dragOverHandler = (event) => {
        if (hasFiles(event)) event.preventDefault();
    };
    handlers.dragLeaveHandler = (event) => {
        if (!hasFiles(event)) return;
        depth = Math.max(0, depth - 1);
        if (!depth) overlay(false);
    };
    handlers.dropHandler = (event) => {
        if (!hasFiles(event)) return;
        event.preventDefault();
        depth = 0;
        overlay(false);
        startPdfImport(event.dataTransfer.files);
    };
    window.addEventListener('dragenter', handlers.dragEnterHandler);
    window.addEventListener('dragover', handlers.dragOverHandler);
    window.addEventListener('dragleave', handlers.dragLeaveHandler);
    window.addEventListener('drop', handlers.dropHandler);
    return handlers;
}

export function unregisterPdfImport(handlers = {}) {
    const button = document.getElementById('upload-pdfs-btn');
    const input = document.getElementById('upload-pdfs-input');
    if (handlers.pdfPickHandler) button?.removeEventListener('click', handlers.pdfPickHandler);
    if (handlers.pdfInputHandler) input?.removeEventListener('change', handlers.pdfInputHandler);
    for (const [event, key] of [['dragenter', 'dragEnterHandler'], ['dragover', 'dragOverHandler'], ['dragleave', 'dragLeaveHandler'], ['drop', 'dropHandler']]) {
        if (handlers[key]) window.removeEventListener(event, handlers[key]);
    }
    document.getElementById(OVERLAY_ID)?.remove();
}
