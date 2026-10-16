/**
 * Comment counts on dashboard paper cards (group libraries): "💬 3", with a
 * dot when someone else commented since this device last showed the thread.
 * A badge opens the paper at its discussion.
 *
 * One summary request per dashboard visit, plus one (at most every 10 s)
 * when the group's sync room says some paper's comments changed.
 */
import { commentSummary } from '../api/comments.js';
import { inGroupLibrary } from '../core/library.js';
import { isCloudSyncEnabled } from '../config.js';
import { isAuthenticated } from '../api/auth.js';
import { COMMENTS_CHANGED, hasUnread } from './paperComments.js';
import { PAPER_LIST_RENDERED } from '../ui.js';

const REFRESH_GAP_MS = 10_000;

let summary = new Map(); // paperId → { count, lastOtherAt }
let lastFetch = 0;
let timer = null;

const enabled = () => inGroupLibrary() && isCloudSyncEnabled() && isAuthenticated();

/** The badge for a card; empty when the paper has no comments. */
export function commentBadgeHtml(paperId) {
    const info = enabled() ? summary.get(Number(paperId)) : null;
    if (!info?.count) return '';
    const unread = hasUnread(paperId, info.lastOtherAt);
    return `<a href="#/details/${Number(paperId)}?c" class="comment-badge flex items-center gap-1 px-2 py-1 rounded text-slate-400 hover:text-blue-400 hover:bg-white/5 transition-colors"
            title="${info.count} comment${info.count === 1 ? '' : 's'}${unread ? ', new since your last visit' : ''}">
            <span class="material-symbols-outlined text-[16px]">forum</span><span>${info.count}</span>
            ${unread ? '<span class="h-2 w-2 rounded-full bg-primary" aria-label="new"></span>' : ''}
        </a>`;
}

/** Fills every card's badge slot from the current summary. */
function paint() {
    document.querySelectorAll('.comment-badge-slot[data-paper-id]').forEach((slot) => {
        slot.innerHTML = commentBadgeHtml(slot.dataset.paperId);
    });
}

async function refresh() {
    if (!enabled()) return;
    lastFetch = Date.now();
    try {
        const rows = await commentSummary();
        summary = new Map(rows.map((r) => [Number(r.paperId), r]));
        paint();
    } catch (err) {
        console.warn('[Comments] Summary failed:', err.message);
    }
}

function refreshSoon() {
    if (timer) return;
    const wait = Math.max(0, lastFetch + REFRESH_GAP_MS - Date.now());
    timer = setTimeout(() => {
        timer = null;
        refresh();
    }, wait);
}

/** Starts badges for the dashboard; returns handlers for unregisterCommentBadges. */
export function registerCommentBadges() {
    if (!enabled()) return {};
    paint();
    refresh();
    const commentBadgesHandler = () => refreshSoon();
    const commentBadgesPaint = () => paint();
    window.addEventListener(COMMENTS_CHANGED, commentBadgesHandler);
    window.addEventListener(PAPER_LIST_RENDERED, commentBadgesPaint);
    return { commentBadgesHandler, commentBadgesPaint };
}

export function unregisterCommentBadges(handlers = {}) {
    if (handlers.commentBadgesHandler) window.removeEventListener(COMMENTS_CHANGED, handlers.commentBadgesHandler);
    if (handlers.commentBadgesPaint) window.removeEventListener(PAPER_LIST_RENDERED, handlers.commentBadgesPaint);
    clearTimeout(timer);
    timer = null;
}
