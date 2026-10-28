/**
 * Paper discussion: a comment thread on a group paper, with one level of
 * replies (backend/src/routes/comments.js).
 *
 * Self-contained: mountComments(root, paperId) renders the whole thing into
 * `root` and returns unmount(). The page only decides where `root` sits.
 *
 * Built to need no clicks: the comment box is always open (Enter posts,
 * Shift+Enter adds a line), comments show at once and are confirmed in the
 * background, a failed post stays with a Retry, and Delete asks with a second
 * tap on the same spot instead of a dialog. On narrow screens a bar at the bottom of the
 * screen takes comments whenever the thread is scrolled out of view.
 *
 * Live: the group's sync room names the paper whose comments changed
 * (`citavers:comments-changed`); only a thread showing that paper refetches.
 *
 * Typing "@" in any comment box lists the group's members
 * (components/mentionPicker.js); the people named are sent with the comment
 * and the server tells them.
 */
import { addComment, deleteComment, editComment, listComments } from '../api/comments.js';
import { listMembers } from '../api/groups.js';
import { getUser } from '../api/auth.js';
import { currentGroupId, currentLibrary } from '../core/library.js';
import { confirmedBySecondTap, escapeHtml, formatRelativeTime, showToast } from '../ui.js';
import { attachMentions, highlightMentions, mentionIdsIn } from './mentionPicker.js';

export const COMMENTS_CHANGED = 'citavers:comments-changed';
const NARROW = '(max-width: 1279px)'; // below Tailwind's xl, where the thread is not a side column

// --- Pure helpers -------------------------------------------------------------

/**
 * A page reference at the start of a comment: "p. 12 …", "pp. 12 …",
 * "page 12 …" or "pg 12 …". Plain "p53" is left alone (it may be a protein).
 * @returns {{ content: string, pageNumber: number|null }}
 */
export function parsePageRef(text) {
    const value = String(text ?? '').trim();
    const match = /^(?:pp?\.|page|pg\.?)\s*(\d{1,5})\b[\s:,.–-]*/i.exec(value);
    if (!match || !Number(match[1])) return { content: value, pageNumber: null };
    const rest = value.slice(match[0].length).trim();
    return { content: rest || value, pageNumber: Number(match[1]) };
}

/** Top-level comments in order, each with its replies. */
export function threadify(comments) {
    const tops = [];
    const byId = new Map();
    for (const c of comments) {
        if (!c.parentId) {
            const top = { ...c, replies: [] };
            tops.push(top);
            byId.set(c.id, top);
        }
    }
    for (const c of comments) {
        if (c.parentId) byId.get(c.parentId)?.replies.push(c);
    }
    return tops;
}

// --- "Seen" marks (per device; a convenience, not a record) ---------------------

const seenKey = (paperId) => `citavers:commentsSeen:${currentLibrary()}:${paperId}`;

export function lastSeen(paperId) {
    try {
        return localStorage.getItem(seenKey(paperId)) || '';
    } catch {
        return '';
    }
}

function markSeen(paperId, at = new Date().toISOString()) {
    try {
        if (at > lastSeen(paperId)) localStorage.setItem(seenKey(paperId), at);
    } catch { /* storage unavailable */ }
}

/** Whether someone else commented after this device last showed the thread. */
export const hasUnread = (paperId, lastOtherAt) => Boolean(lastOtherAt) && lastOtherAt > lastSeen(paperId);

// --- Rendering ---------------------------------------------------------------------

const initial = (name) => escapeHtml((String(name || '?').trim()[0] || '?').toUpperCase());

const AVATAR_COLORS = ['bg-blue-500/80', 'bg-emerald-500/80', 'bg-amber-500/80', 'bg-rose-500/80', 'bg-violet-500/80', 'bg-cyan-500/80'];
const avatarColor = (name) => AVATAR_COLORS[[...String(name || '')].reduce((n, ch) => n + ch.charCodeAt(0), 0) % AVATAR_COLORS.length];

function composerHtml({ placeholder, parentId = '', compact = false }) {
    return `
        <form data-composer data-parent="${parentId}" class="flex items-end gap-2 ${compact ? 'mt-2' : ''}">
            <textarea data-input rows="1" maxlength="5000" enterkeyhint="send"
                class="flex-1 resize-none max-h-40 rounded-xl border border-white/10 bg-slate-900/70 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/40"
                placeholder="${placeholder}" aria-label="${placeholder}"></textarea>
            <button type="submit" class="shrink-0 rounded-xl bg-primary p-2 text-white hover:bg-primary-dark disabled:opacity-40" aria-label="Post comment">
                <span class="material-symbols-outlined text-lg leading-none">send</span>
            </button>
        </form>`;
}

/** The signed-in person's id, to tell their own mentions apart. */
function myId() {
    try {
        return getUser()?.id ?? null;
    } catch {
        return null;
    }
}

/** Members as the picker lists them, without me; names as the server shows them. */
export const pickableMembers = (members, me) => members
    .filter((m) => m.userId !== me)
    .map((m) => ({ userId: m.userId, email: m.email, name: m.name?.trim() || String(m.email || '').split('@')[0] || 'Someone' }));

function commentHtml(c, { unreadAfter, isReply }) {
    if (c.deleted) {
        return `<div class="py-1 text-xs italic text-slate-500">Comment deleted</div>`;
    }
    const unread = !c.mine && !c.pending && c.createdAt > unreadAfter;
    const status = c.failed
        ? `<span class="text-red-400">Not sent ·</span> <button type="button" data-retry="${c.clientId}" class="font-semibold text-red-300 hover:underline">Retry</button>`
        : c.pending ? '<span class="text-slate-500">sending…</span>'
            : `<span title="${escapeHtml(new Date(c.createdAt).toLocaleString())}">${formatRelativeTime(c.createdAt)}</span>${c.edited ? ' · edited' : ''}`;
    const actions = c.pending || c.failed ? '' : [
        !isReply ? `<button type="button" data-reply="${c.id}" class="hover:text-white">Reply</button>` : '',
        c.canEdit ? `<button type="button" data-edit="${c.id}" class="hover:text-white">Edit</button>` : '',
        c.canDelete ? `<button type="button" data-delete="${c.id}" class="hover:text-red-300">Delete</button>` : '',
    ].filter(Boolean).join('');

    return `
        <div class="group flex gap-2.5 rounded-lg transition-colors duration-700" data-comment="${c.id ?? ''}" ${unread ? 'data-unread' : ''}>
            <div class="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${avatarColor(c.author?.name)} text-xs font-bold text-white">${initial(c.author?.name)}</div>
            <div class="min-w-0 flex-1">
                <div class="flex flex-wrap items-baseline gap-x-2 text-xs text-slate-400">
                    <span class="font-semibold text-slate-200">${escapeHtml(c.author?.name || 'You')}</span>
                    ${status}
                    ${unread ? '<span class="h-2 w-2 self-center rounded-full bg-primary" title="New"></span>' : ''}
                </div>
                <div data-body class="mt-0.5 whitespace-pre-wrap break-words text-sm leading-relaxed text-slate-200">${c.pageNumber ? `<span class="mr-1 inline-block rounded-md bg-white/10 px-1.5 py-0.5 text-[11px] font-semibold text-slate-300">p. ${Number(c.pageNumber)}</span>` : ''}${highlightMentions(escapeHtml(c.content), c.mentions, myId())}</div>
                ${actions ? `<div class="mt-1 flex gap-3 text-xs font-medium text-slate-500 xl:opacity-0 xl:group-hover:opacity-100 xl:focus-within:opacity-100 transition-opacity">${actions}</div>` : ''}
            </div>
        </div>`;
}

function threadHtml(comments, unreadAfter) {
    if (!comments.length) {
        return `<p class="py-8 text-center text-sm text-slate-500">No comments yet — start the discussion.</p>`;
    }
    return threadify(comments).map((top) => `
        <div class="space-y-2" data-top="${top.id ?? ''}">
            ${commentHtml(top, { unreadAfter, isReply: false })}
            ${top.replies.length ? `<div class="ml-9 space-y-2 border-l border-white/10 pl-3">${top.replies.map((r) => commentHtml(r, { unreadAfter, isReply: true })).join('')}</div>` : ''}
            <div data-reply-slot="${top.id ?? ''}" class="ml-9"></div>
        </div>`).join('');
}

// --- Component ---------------------------------------------------------------------

let clientSeq = 0;
const newClientId = () => `${Date.now().toString(36)}-${(clientSeq++).toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

/**
 * Renders the discussion of `paperId` into `root`.
 * @param {HTMLElement} root
 * @param {number} paperId
 * @param {{ onCount?: (info: { count: number, unread: number }) => void, api?: object, focusCommentId?: number }} [options]
 *   focusCommentId: once loaded, scroll to that comment and flash it
 * @returns {{ unmount: () => void, focus: () => void, focusComment: (id: number) => void, refresh: () => Promise<void> }}
 */
export function mountComments(root, paperId, { onCount, api, focusCommentId } = {}) {
    const calls = { listComments, addComment, editComment, deleteComment, listMembers, ...api };
    let members = [];        // whom "@" offers
    const detachers = [];
    let toFocus = focusCommentId ?? null;
    let comments = [];       // from the server
    let pending = [];        // posted here, not yet confirmed (or failed)
    const hidden = new Set(); // deleted here, waiting for the server
    let loaded = false;
    let loadError = null;
    const unreadAfter = lastSeen(paperId); // dots for others' comments newer than the last visit ('' = never)
    let firstRender = true;
    let alive = true;

    root.innerHTML = `
        <section class="flex h-full min-h-0 flex-col rounded-2xl border border-white/5 bg-slate-900/60 shadow-2xl shadow-black/40 backdrop-blur-xl">
            <header class="flex items-center gap-2 border-b border-white/5 px-4 py-3">
                <span class="material-symbols-outlined text-lg text-primary">forum</span>
                <h2 class="text-sm font-semibold uppercase tracking-wide text-white">Discussion</h2>
                <span data-count class="text-xs text-slate-500"></span>
            </header>
            <div data-thread class="min-h-[6rem] flex-1 space-y-4 overflow-y-auto px-4 py-3 max-xl:max-h-[60vh] custom-scrollbar">
                <p class="py-8 text-center text-sm text-slate-500">Loading comments…</p>
            </div>
            <div data-main-composer class="border-t border-white/5 p-3">${composerHtml({ placeholder: 'Add a comment…' })}</div>
        </section>`;
    const thread = root.querySelector('[data-thread]');
    const mainComposer = root.querySelector('[data-main-composer] [data-composer]');

    // Bottom bar for narrow screens, shown while the main composer is out of view
    const bar = document.createElement('div');
    bar.className = 'fixed inset-x-0 bottom-0 z-40 hidden border-t border-white/10 bg-slate-950/95 px-3 pt-2 backdrop-blur xl:hidden';
    bar.style.paddingBottom = 'calc(0.5rem + env(safe-area-inset-bottom))';
    bar.innerHTML = `
        <div class="mx-auto flex max-w-3xl items-end gap-2">
            <button type="button" data-jump class="flex shrink-0 items-center gap-1 rounded-xl border border-white/10 px-2.5 py-2 text-xs font-semibold text-slate-300" aria-label="Show comments">
                <span class="material-symbols-outlined text-base leading-none">forum</span><span data-bar-count>0</span>
                <span data-bar-dot class="hidden h-2 w-2 rounded-full bg-primary"></span>
            </button>
            <div class="flex-1">${composerHtml({ placeholder: 'Add a comment…' })}</div>
        </div>`;
    document.body.appendChild(bar);

    const all = () => [...comments.filter((c) => !hidden.has(c.id)), ...pending];

    function counts() {
        const visible = all().filter((c) => !c.deleted);
        const unread = visible.filter((c) => !c.mine && !c.pending && c.createdAt > unreadAfter).length;
        return { count: visible.length, unread };
    }

    function renderCounts() {
        const { count, unread } = counts();
        root.querySelector('[data-count]').textContent = count ? `${count}${unread ? ` · ${unread} new` : ''}` : '';
        bar.querySelector('[data-bar-count]').textContent = String(count);
        bar.querySelector('[data-bar-dot]').classList.toggle('hidden', !unread);
        onCount?.({ count, unread });
    }

    function render({ keepScroll = false } = {}) {
        if (!alive) return;
        const nearBottom = thread.scrollHeight - thread.scrollTop - thread.clientHeight < 80;
        // Keep open reply boxes and their drafts across re-renders
        const drafts = [...thread.querySelectorAll('[data-reply-slot] [data-composer]')]
            .map((form) => [form.dataset.parent, form.querySelector('[data-input]').value]);

        if (!loaded) {
            thread.innerHTML = loadError
                ? `<div class="py-8 text-center text-sm text-slate-400">Couldn't load comments. <button type="button" data-reload class="font-semibold text-primary hover:underline">Try again</button></div>`
                : thread.innerHTML;
        } else {
            thread.innerHTML = threadHtml(all(), unreadAfter);
        }
        for (const [parentId, value] of drafts) openReply(parentId, value, { focus: false });
        renderCounts();

        if (!loaded) return;
        if (firstRender) {
            firstRender = false;
            const first = thread.querySelector('[data-unread]');
            if (first) first.scrollIntoView?.({ block: 'center' });
            else thread.scrollTop = thread.scrollHeight;
        } else if (!keepScroll && nearBottom) {
            thread.scrollTop = thread.scrollHeight;
        }
    }

    async function load() {
        try {
            comments = await calls.listComments(paperId);
            loaded = true;
            loadError = null;
            // Confirmed elsewhere (e.g. a retry raced the refetch): drop the local copy
            const known = new Set(comments.map((c) => c.clientId).filter(Boolean));
            pending = pending.filter((p) => !known.has(p.clientId));
        } catch (err) {
            loadError = err;
        }
        render();
        if (loaded && threadVisible) markSeen(paperId);
        if (loaded && toFocus) {
            focusComment(toFocus);
            toFocus = null;
        }
    }

    async function loadMembers() {
        const groupId = currentGroupId();
        if (groupId === null) return;
        try {
            members = pickableMembers(await calls.listMembers(groupId), myId());
        } catch {
            members = []; // mentions just aren't offered
        }
    }

    const mentionable = (input) => detachers.push(attachMentions(input, { members: () => members }));

    /** The people a text mentions, as ids for the server and names for showing it at once. */
    const mentionsOf = (content) => mentionIdsIn(content, members)
        .map((userId) => ({ userId, name: members.find((m) => m.userId === userId).name }));

    async function send(entry) {
        entry.pending = true;
        entry.failed = false;
        render();
        try {
            const saved = await calls.addComment(paperId, {
                content: entry.content, pageNumber: entry.pageNumber, parentId: entry.parentId, clientId: entry.clientId,
                mentions: entry.mentions.map((m) => m.userId),
            });
            pending = pending.filter((p) => p !== entry);
            if (!comments.some((c) => c.id === saved.id)) comments = [...comments, saved];
            markSeen(paperId, saved.createdAt);
        } catch (err) {
            entry.pending = false;
            entry.failed = true;
            entry.error = err.message;
        }
        render();
    }

    function post(text, parentId = null) {
        const { content, pageNumber } = parsePageRef(text);
        if (!content) return false;
        const entry = {
            id: null, clientId: newClientId(), parentId, content, pageNumber, mentions: mentionsOf(content),
            author: { name: 'You' }, mine: true, createdAt: new Date().toISOString(),
        };
        pending = [...pending, entry];
        send(entry);
        return true;
    }

    function openReply(parentId, value = '', { focus = true } = {}) {
        const slot = thread.querySelector(`[data-reply-slot="${parentId}"]`);
        if (!slot) return;
        if (!slot.querySelector('[data-composer]')) {
            slot.innerHTML = composerHtml({ placeholder: 'Reply…', parentId, compact: true });
            mentionable(slot.querySelector('[data-input]'));
        }
        const input = slot.querySelector('[data-input]');
        if (value) input.value = value;
        if (focus) input.focus();
    }

    function startEdit(id) {
        const c = comments.find((x) => x.id === id);
        const body = thread.querySelector(`[data-comment="${id}"] [data-body]`);
        if (!c || !body) return;
        const prefix = c.pageNumber ? `p. ${c.pageNumber} ` : '';
        body.innerHTML = `<textarea data-edit-input rows="2" maxlength="5000" class="w-full resize-none rounded-lg border border-primary/50 bg-slate-900/70 px-2 py-1.5 text-sm text-slate-100 focus:outline-none"></textarea>
            <p class="mt-1 text-[11px] text-slate-500">Enter to save · Esc to cancel</p>`;
        const input = body.querySelector('textarea');
        mentionable(input); // first, so a pick's Enter doesn't also save
        input.value = prefix + c.content;
        input.focus();
        input.setSelectionRange(input.value.length, input.value.length);
        input.addEventListener('keydown', async (e) => {
            if (e.key === 'Escape') {
                e.preventDefault();
                render({ keepScroll: true });
            } else if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) {
                e.preventDefault();
                const { content, pageNumber } = parsePageRef(input.value);
                if (!content) return;
                input.disabled = true;
                try {
                    const saved = await calls.editComment(id, { content, pageNumber, mentions: mentionsOf(content).map((m) => m.userId) });
                    comments = comments.map((x) => (x.id === id ? saved : x));
                } catch (err) {
                    showToast(`Couldn't save the edit: ${err.message}`, 'error');
                }
                render({ keepScroll: true });
            }
        });
    }

    async function remove(id) {
        hidden.add(id);
        render({ keepScroll: true });
        try {
            await calls.deleteComment(id);
        } catch (err) {
            hidden.delete(id);
            render({ keepScroll: true });
            showToast(`Couldn't delete the comment: ${err.message}`, 'error');
            return;
        }
        await load();
        hidden.delete(id);
    }

    // Enter posts, Shift+Enter adds a line; the box grows with its text
    const onKeydown = (e) => {
        const input = e.target.closest?.('[data-input]');
        if (!input || e.key !== 'Enter' || e.shiftKey || e.isComposing) return;
        e.preventDefault();
        submit(input.closest('[data-composer]'));
    };
    const onInput = (e) => {
        const input = e.target.closest?.('[data-input]');
        if (!input) return;
        input.style.height = 'auto';
        input.style.height = `${Math.min(input.scrollHeight, 160)}px`;
    };
    const onSubmit = (e) => {
        const form = e.target.closest?.('[data-composer]');
        if (!form) return;
        e.preventDefault();
        submit(form);
    };
    function submit(form) {
        const input = form.querySelector('[data-input]');
        const parentId = form.dataset.parent ? Number(form.dataset.parent) : null;
        const text = input.value;
        if (!parsePageRef(text).content) return;
        // Clear the box first: posting re-renders, and would keep it as a draft
        input.value = '';
        input.style.height = '';
        if (parentId) form.closest('[data-reply-slot]').innerHTML = '';
        post(text, parentId);
        if (bar.contains(form)) input.focus();
    }
    const onClick = (e) => {
        const target = e.target.closest?.('button');
        if (!target) return;
        if (target.dataset.reply) openReply(target.dataset.reply);
        else if (target.dataset.edit) startEdit(Number(target.dataset.edit));
        else if (target.dataset.delete) { if (confirmedBySecondTap(target, 'Delete?')) remove(Number(target.dataset.delete)); }
        else if (target.dataset.retry) {
            const entry = pending.find((p) => p.clientId === target.dataset.retry);
            if (entry) send(entry);
        } else if (target.hasAttribute('data-reload')) load();
        else if (target.hasAttribute('data-jump')) focus();
    };
    for (const el of [root, bar]) {
        el.addEventListener('keydown', onKeydown);
        el.addEventListener('input', onInput);
        el.addEventListener('submit', onSubmit);
        el.addEventListener('click', onClick);
    }

    // Live: refetch when this paper's comments change elsewhere
    const onChanged = (e) => {
        if (Number(e.detail?.paperId) === Number(paperId)) load();
    };
    window.addEventListener(COMMENTS_CHANGED, onChanged);

    // Seen marks while the thread is on screen; bottom bar while the box is not
    let threadVisible = typeof IntersectionObserver === 'undefined';
    const observers = [];
    if (typeof IntersectionObserver !== 'undefined') {
        const seen = new IntersectionObserver(([entry]) => {
            threadVisible = entry.isIntersecting;
            if (threadVisible && loaded) markSeen(paperId);
        });
        seen.observe(thread);
        const narrow = window.matchMedia?.(NARROW);
        const barToggle = new IntersectionObserver(([entry]) => {
            bar.classList.toggle('hidden', entry.isIntersecting || !(narrow?.matches ?? true));
        });
        barToggle.observe(mainComposer);
        observers.push(seen, barToggle);
    }

    function focus() {
        root.scrollIntoView?.({ behavior: 'smooth', block: 'start' });
        mainComposer.querySelector('[data-input]').focus({ preventScroll: true });
    }

    /** Scrolls to a comment and flashes it (e.g. opened from a notification). */
    function focusComment(id) {
        if (!loaded) {
            toFocus = id;
            return;
        }
        const el = thread.querySelector(`[data-comment="${Number(id)}"]`);
        if (!el) return;
        root.scrollIntoView?.({ block: 'start' });
        el.scrollIntoView?.({ block: 'center' });
        el.classList.add('bg-primary/15');
        setTimeout(() => el.classList.remove('bg-primary/15'), 1600);
    }

    mentionable(mainComposer.querySelector('[data-input]'));
    mentionable(bar.querySelector('[data-input]'));
    loadMembers();
    load();

    return {
        focus,
        focusComment,
        refresh: load,
        unmount() {
            alive = false;
            detachers.forEach((detach) => detach());
            observers.forEach((o) => o.disconnect());
            window.removeEventListener(COMMENTS_CHANGED, onChanged);
            bar.remove();
            if (loaded && threadVisible) markSeen(paperId);
        },
    };
}
