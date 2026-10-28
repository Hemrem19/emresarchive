/**
 * @mentions for any textarea: typing "@" lists people to pick from, and a
 * pick inserts "@Name " as plain text.
 *
 * Self-contained: attachMentions(textarea, { members }) adds the list to the
 * textarea's parent and returns detach(). Keys: ↑/↓ move, Enter or Tab pick,
 * Esc closes; on touch screens a tap picks. While the list is open those keys
 * belong to it, so a comment box's Enter-to-post waits for the pick.
 *
 * Members are { userId, name, email }; the text stores names only, and
 * mentionIdsIn() finds whose names it mentions when the text is sent.
 */
import { escapeHtml } from '../ui.js';

const MAX_SHOWN = 6;
const MAX_QUERY = 40;
const AFTER_NAME = '(?![\\p{L}\\p{N}_])';

const escapeRegExp = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * The "@…" being typed at the caret: { start, query } (start = index of the
 * "@"), or null when the caret is not in a mention.
 */
export function activeQuery(text, caret) {
    const before = String(text).slice(0, caret);
    const at = before.lastIndexOf('@');
    if (at < 0) return null;
    if (at > 0 && /[\p{L}\p{N}_.]/u.test(before[at - 1])) return null; // an email address, not a mention
    const query = before.slice(at + 1);
    if (query.length > MAX_QUERY || /[\n@]/.test(query) || /^\s/.test(query)) return null;
    return { start: at, query };
}

/** Members whose name (or any word of it) or email starts with the query. */
export function matchMembers(members, query) {
    const q = query.toLowerCase();
    const starts = (m) => {
        const name = m.name.toLowerCase();
        return name.startsWith(q) || name.split(/\s+/).some((w) => w.startsWith(q)) || String(m.email || '').toLowerCase().startsWith(q);
    };
    return members.filter((m) => !q || starts(m)).slice(0, MAX_SHOWN);
}

/** The text with the mention at `start…caret` replaced by "@Name ", and the caret after it. */
export function insertMention(text, start, caret, name) {
    const mention = `@${name} `;
    const rest = text.slice(caret).replace(/^ /, '');
    return { text: text.slice(0, start) + mention + rest, caret: start + mention.length };
}

/** Ids of the members whose "@Name" is in the text (not just a prefix of a longer name). */
export function mentionIdsIn(text, members) {
    return members
        .filter((m) => new RegExp(`@${escapeRegExp(m.name)}${AFTER_NAME}`, 'iu').test(text))
        .map((m) => m.userId);
}

/**
 * Wraps each "@Name" of `mentions` ([{ userId, name }]) in already escaped
 * HTML in a highlight; mentions of `myId` stand out more.
 */
export function highlightMentions(html, mentions, myId) {
    const named = (mentions || []).filter((m) => typeof m?.name === 'string' && m.name);
    if (!named.length) return html;
    const byName = new Map(named.map((m) => [escapeHtml(m.name).toLowerCase(), m.userId]));
    const names = [...byName.keys()].sort((a, b) => b.length - a.length).map(escapeRegExp);
    return html.replace(new RegExp(`@(${names.join('|')})${AFTER_NAME}`, 'giu'), (match, name) => {
        const me = byName.get(name.toLowerCase()) === myId;
        return `<span class="rounded px-0.5 font-semibold ${me ? 'bg-amber-400/20 text-amber-200' : 'bg-primary/15 text-blue-300'}" data-mention>${match}</span>`;
    });
}

/**
 * Adds mention picking to `textarea`.
 * @param {HTMLTextAreaElement} textarea
 * @param {{ members: () => Array<{ userId: number, name: string, email?: string }> }} options
 * @returns {() => void} detach
 */
export function attachMentions(textarea, { members }) {
    const host = textarea.parentElement;
    // Not via getComputedStyle: a box not yet on the page reports no position at all
    if (!host.style.position) host.style.position = 'relative';
    const list = document.createElement('div');
    list.setAttribute('role', 'listbox');
    list.className = 'absolute left-0 z-50 hidden w-64 max-w-[calc(100vw-2rem)] overflow-hidden rounded-xl border border-white/10 bg-slate-900 py-1 shadow-2xl shadow-black/50';
    host.appendChild(list);

    let shown = [];
    let active = 0;
    let query = null;
    let picking = false;

    const close = () => {
        shown = [];
        query = null;
        list.classList.add('hidden');
    };

    function render() {
        const names = shown.map((m) => m.name.toLowerCase());
        list.innerHTML = shown.map((m, i) => {
            const clash = names.indexOf(m.name.toLowerCase()) !== names.lastIndexOf(m.name.toLowerCase());
            return `<button type="button" role="option" data-pick="${i}" aria-selected="${i === active}"
                class="flex w-full items-center gap-2 px-3 py-2 text-left text-sm ${i === active ? 'bg-primary/20 text-white' : 'text-slate-200 hover:bg-white/5'}">
                <span class="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-700 text-[11px] font-bold">${escapeHtml(m.name[0]?.toUpperCase() || '?')}</span>
                <span class="truncate">${escapeHtml(m.name)}</span>
                ${clash && m.email ? `<span class="ml-auto truncate text-[11px] text-slate-500">${escapeHtml(m.email)}</span>` : ''}
            </button>`;
        }).join('');
        list.classList.toggle('hidden', !shown.length);
        // Above the box, unless too close to the top of the screen (or of a scrolling thread)
        const below = host.getBoundingClientRect().top < 280;
        list.classList.toggle('bottom-full', !below);
        list.classList.toggle('mb-1', !below);
        list.classList.toggle('top-full', below);
        list.classList.toggle('mt-1', below);
    }

    function update() {
        if (picking) return;
        const previous = query?.query;
        query = activeQuery(textarea.value, textarea.selectionStart);
        if (!query) return close();
        // Typing on past a name that matches nobody ends the mention
        const found = matchMembers(members() || [], query.query);
        if (!found.length) return close();
        if (query.query !== previous) active = 0;
        shown = found;
        render();
    }

    function pick(member) {
        if (!query || !member) return;
        const { text, caret } = insertMention(textarea.value, query.start, textarea.selectionStart, member.name);
        textarea.value = text;
        textarea.setSelectionRange(caret, caret);
        close();
        picking = true; // the box grows to fit, without reopening the list
        textarea.dispatchEvent(new Event('input', { bubbles: true }));
        picking = false;
        textarea.focus();
    }

    const onKeydown = (e) => {
        if (!shown.length || e.isComposing) return;
        const keys = { ArrowDown: 1, ArrowUp: -1 };
        if (e.key in keys) {
            active = (active + keys[e.key] + shown.length) % shown.length;
            render();
        } else if (e.key === 'Enter' || e.key === 'Tab') {
            pick(shown[active]);
        } else if (e.key === 'Escape') {
            close();
        } else {
            return;
        }
        e.preventDefault();
        e.stopImmediatePropagation();
    };
    const onInput = () => update();
    const onBlur = () => setTimeout(() => { if (document.activeElement !== textarea) close(); }, 150);
    // Keep the box focused (and the phone keyboard open) while tapping a name
    const onPointerDown = (e) => e.preventDefault();
    const onClick = (e) => {
        const button = e.target.closest('[data-pick]');
        if (button) pick(shown[Number(button.dataset.pick)]);
    };

    textarea.addEventListener('keydown', onKeydown);
    textarea.addEventListener('input', onInput);
    textarea.addEventListener('blur', onBlur);
    list.addEventListener('mousedown', onPointerDown);
    list.addEventListener('click', onClick);

    return () => {
        textarea.removeEventListener('keydown', onKeydown);
        textarea.removeEventListener('input', onInput);
        textarea.removeEventListener('blur', onBlur);
        list.remove();
    };
}
