/**
 * Notification bell in the app header: mentions, replies to my comments and
 * group invitations, in one list.
 *
 * Self-contained: mountBell(slot) renders the button, its unread badge and
 * the panel into `slot` and returns { refresh, unmount }. The panel drops down
 * on wide screens and spans the screen under the header on phones.
 *
 * Opening the panel marks everything read (rows stay marked "new" while it is
 * open). A row opens the paper at that comment, switching library when it is
 * in another one; an invitation is accepted right in its row.
 *
 * Fresh without polling: refreshed on mount, when the app comes back to the
 * foreground (at most once a minute), and on `citavers:notify`, which the
 * sync room fires when the server notified this person (core/syncManager.js).
 * A live notification also shows a toast, unless its comment is on screen.
 */
import { listNotifications, markNotificationsRead } from '../api/notifications.js';
import { acceptInvite, declineInvite } from '../api/groups.js';
import { currentGroupId, openLibrary } from '../core/library.js';
import { escapeHtml, formatRelativeTime, showToast } from '../ui.js';
import { GROUPS_LOADED, renderLibrarySwitcher } from './librarySwitcher.js';

export const NOTIFY = 'citavers:notify';
export const FOCUS_COMMENT = 'citavers:focus-comment';
const REFRESH_AFTER_MS = 60 * 1000;
const SEEN_INVITES_KEY = 'citavers:seenInvites';

// --- Pure helpers -------------------------------------------------------------

/** Where a notification leads: the paper's details, at the comment. */
export const commentHash = (n) => `#/details/${n.paper.id}?c=${n.commentId}`;

/** What happened, as a sentence (HTML). */
export function describe(n) {
    const who = `<b class="text-white">${escapeHtml(n.actor.name)}</b>`;
    const what = n.type === 'reply' ? 'replied to your comment' : 'mentioned you';
    return `${who} ${what} on <span class="text-slate-200">${escapeHtml(n.paper.title || 'a paper')}</span>`;
}

/** The comment of `n` is the one on screen: its paper's details in its library. */
export function isOnScreen(n, hash = window.location.hash, groupId = currentGroupId()) {
    return groupId === n.group.id && new RegExp(`^#/details/${n.paper.id}(\\?|$)`).test(hash);
}

function seenInvites() {
    try {
        return new Set(JSON.parse(localStorage.getItem(SEEN_INVITES_KEY) || '[]'));
    } catch {
        return new Set();
    }
}

function rememberInvitesSeen(invites) {
    try {
        localStorage.setItem(SEEN_INVITES_KEY, JSON.stringify(invites.map((i) => i.id)));
    } catch { /* storage unavailable */ }
}

/** Opens the paper at the comment, switching library if needed. */
export function openNotification(n) {
    const hash = commentHash(n);
    if (currentGroupId() !== n.group.id) {
        openLibrary(n.group.id, { hash });
    } else if (isOnScreen(n)) {
        window.dispatchEvent(new CustomEvent(FOCUS_COMMENT, { detail: { paperId: n.paper.id, commentId: n.commentId } }));
    } else {
        window.location.hash = hash;
    }
}

// --- Rendering ---------------------------------------------------------------------

const rowClass = 'flex w-full gap-3 px-4 py-3 text-left hover:bg-white/5 focus:bg-white/5 focus:outline-none';

function notificationHtml(n, fresh) {
    return `
        <button type="button" data-open="${n.id}" class="${rowClass}">
            <span class="material-symbols-outlined mt-0.5 text-lg ${n.type === 'reply' ? 'text-emerald-400' : 'text-primary'}">${n.type === 'reply' ? 'reply' : 'alternate_email'}</span>
            <span class="min-w-0 flex-1">
                <span class="block text-sm text-slate-300">${describe(n)}</span>
                ${n.snippet ? `<span class="mt-0.5 block truncate text-xs text-slate-400">“${escapeHtml(n.snippet)}”</span>` : ''}
                <span class="mt-0.5 block text-[11px] text-slate-500">${escapeHtml(n.group.name)} · ${formatRelativeTime(n.createdAt)}</span>
            </span>
            ${fresh ? '<span class="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-primary" title="New"></span>' : ''}
        </button>`;
}

function inviteHtml(invite, fresh) {
    const who = invite.invitedBy?.trim() || String(invite.invitedByEmail || '').split('@')[0] || 'Someone';
    return `
        <div class="flex gap-3 px-4 py-3" data-invite-row="${invite.id}">
            <span class="material-symbols-outlined mt-0.5 text-lg text-amber-400">group_add</span>
            <span class="min-w-0 flex-1">
                <span class="block text-sm text-slate-300"><b class="text-white">${escapeHtml(who)}</b> invited you to <b class="text-white">${escapeHtml(invite.groupName)}</b></span>
                <span class="mt-2 flex gap-2">
                    <button type="button" data-accept="${invite.id}" class="rounded-lg bg-primary px-3 py-1 text-xs font-semibold text-white hover:bg-primary-dark">Accept</button>
                    <button type="button" data-decline="${invite.id}" class="rounded-lg px-2 py-1 text-xs font-medium text-slate-400 hover:text-white">Decline</button>
                </span>
            </span>
            ${fresh ? '<span class="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-primary" title="New"></span>' : ''}
        </div>`;
}

// --- Component ---------------------------------------------------------------------

/**
 * @param {HTMLElement} slot
 * @param {{ api?: object }} [options] api: overrides for tests
 * @returns {{ refresh: () => Promise<void>, unmount: () => void }}
 */
export function mountBell(slot, { api } = {}) {
    const calls = { listNotifications, markNotificationsRead, acceptInvite, declineInvite, renderLibrarySwitcher, ...api };
    let items = [];
    let unread = 0;
    let invites = [];
    let open = false;
    let fresh = new Set();    // rows marked "new" while the panel is open
    let newestId = null;      // newest id already known, to toast only what's new
    let lastRefresh = 0;

    slot.classList.add('relative');
    slot.innerHTML = `
        <button type="button" data-bell class="relative flex h-9 w-9 items-center justify-center rounded-lg text-slate-300 hover:bg-white/5 hover:text-white" aria-label="Notifications" aria-expanded="false">
            <span class="material-symbols-outlined text-[22px]">notifications</span>
            <span data-badge class="absolute -right-0.5 -top-0.5 hidden h-[18px] min-w-[18px] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white"></span>
        </button>
        <div data-panel class="fixed inset-x-2 top-16 z-50 hidden max-h-[75vh] overflow-y-auto rounded-2xl border border-white/10 bg-slate-900 shadow-2xl shadow-black/60 sm:absolute sm:inset-x-auto sm:right-0 sm:top-full sm:mt-2 sm:w-96 custom-scrollbar" role="dialog" aria-label="Notifications"></div>`;
    const button = slot.querySelector('[data-bell]');
    const badge = slot.querySelector('[data-badge]');
    const panel = slot.querySelector('[data-panel]');

    const unseenInvites = () => {
        const seen = seenInvites();
        return invites.filter((i) => !seen.has(i.id));
    };

    function renderBadge() {
        const total = unread + unseenInvites().length;
        badge.textContent = total > 99 ? '99+' : String(total);
        badge.classList.toggle('hidden', !total);
        badge.classList.toggle('flex', Boolean(total));
        button.setAttribute('aria-label', total ? `Notifications, ${total} new` : 'Notifications');
    }

    function renderPanel() {
        if (!open) return;
        const rows = [
            ...invites.map((i) => inviteHtml(i, fresh.has(`i${i.id}`))),
            ...items.map((n) => notificationHtml(n, fresh.has(n.id))),
        ];
        panel.innerHTML = `
            <div class="flex items-center justify-between border-b border-white/5 px-4 py-3">
                <h2 class="text-sm font-semibold text-white">Notifications</h2>
            </div>
            ${rows.length ? `<div class="divide-y divide-white/5">${rows.join('')}</div>`
                : '<p class="px-4 py-10 text-center text-sm text-slate-500">You\'re all caught up.</p>'}`;
    }

    /** Toasts the newest new notification; ones about the comments on screen just count as read. */
    function toastNew(previousNewest) {
        if (previousNewest === null) return; // first load: the badge says enough
        const news = items.filter((n) => !n.read && n.id > previousNewest);
        const here = news.filter((n) => isOnScreen(n));
        if (here.length) {
            calls.markNotificationsRead(here.map((n) => n.id)).catch(() => {});
            items = items.map((n) => (here.includes(n) ? { ...n, read: true } : n));
            unread = Math.max(0, unread - here.length);
        }
        const latest = news.find((n) => !here.includes(n));
        if (!latest) return;
        const text = latest.type === 'reply'
            ? `${latest.actor.name} replied to your comment on “${latest.paper.title}”`
            : `${latest.actor.name} mentioned you on “${latest.paper.title}”`;
        showToast(text, 'info', { duration: 8000, actions: [{ label: 'Open', onClick: () => openNotification(latest) }] });
    }

    async function refresh() {
        lastRefresh = Date.now();
        try {
            const data = await calls.listNotifications();
            const previousNewest = newestId;
            items = data.items;
            unread = data.unread;
            newestId = items[0]?.id ?? newestId ?? 0;
            toastNew(previousNewest);
        } catch (error) {
            console.warn('[Notifications] Could not load:', error.message);
        }
        renderBadge();
        renderPanel();
    }

    function setOpen(value) {
        open = value;
        panel.classList.toggle('hidden', !open);
        button.setAttribute('aria-expanded', String(open));
        if (!open) {
            fresh = new Set();
            return;
        }
        fresh = new Set([...items.filter((n) => !n.read).map((n) => n.id), ...unseenInvites().map((i) => `i${i.id}`)]);
        renderPanel();
        if (unread) {
            calls.markNotificationsRead().catch((e) => console.warn('[Notifications] Could not mark read:', e.message));
            items = items.map((n) => ({ ...n, read: true }));
            unread = 0;
        }
        rememberInvitesSeen(invites);
        renderBadge();
    }

    async function answerInvite(id, accept) {
        const invite = invites.find((i) => i.id === id);
        if (!invite) return;
        try {
            if (accept) await calls.acceptInvite(id);
            else await calls.declineInvite(id);
        } catch (error) {
            showToast(error.message, 'error');
            return;
        }
        invites = invites.filter((i) => i.id !== id);
        renderBadge();
        renderPanel();
        calls.renderLibrarySwitcher();
        if (accept) {
            showToast(`You joined ${invite.groupName}`, 'success', {
                duration: 6000,
                actions: [{ label: 'Open', onClick: () => openLibrary(invite.groupId) }],
            });
        }
    }

    const onClick = (e) => {
        const target = e.target.closest('button');
        if (!target) return;
        if (target === button) {
            setOpen(!open);
        } else if (target.dataset.open) {
            const n = items.find((x) => x.id === Number(target.dataset.open));
            setOpen(false);
            if (n) openNotification(n);
        } else if (target.dataset.accept) {
            answerInvite(Number(target.dataset.accept), true);
        } else if (target.dataset.decline) {
            answerInvite(Number(target.dataset.decline), false);
        }
    };
    const onOutside = (e) => {
        if (open && !slot.contains(e.target)) setOpen(false);
    };
    const onKeydown = (e) => {
        if (open && e.key === 'Escape') {
            setOpen(false);
            button.focus();
        }
    };
    const onGroups = (e) => {
        invites = e.detail?.invites || [];
        renderBadge();
        renderPanel();
    };
    const onNotify = () => refresh();
    const onVisible = () => {
        if (document.visibilityState !== 'visible' || Date.now() - lastRefresh < REFRESH_AFTER_MS) return;
        refresh();
        calls.renderLibrarySwitcher(); // invites
    };

    slot.addEventListener('click', onClick);
    document.addEventListener('click', onOutside);
    document.addEventListener('keydown', onKeydown);
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener(GROUPS_LOADED, onGroups);
    window.addEventListener(NOTIFY, onNotify);

    renderBadge();
    refresh();

    return {
        refresh,
        unmount() {
            slot.removeEventListener('click', onClick);
            document.removeEventListener('click', onOutside);
            document.removeEventListener('keydown', onKeydown);
            document.removeEventListener('visibilitychange', onVisible);
            window.removeEventListener(GROUPS_LOADED, onGroups);
            window.removeEventListener(NOTIFY, onNotify);
            slot.innerHTML = '';
        },
    };
}
