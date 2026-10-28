import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../core/library.js', async (importOriginal) => ({ ...(await importOriginal()), openLibrary: vi.fn() }));

const { mountBell, NOTIFY, FOCUS_COMMENT, isOnScreen, commentHash } = await import('../components/notificationBell.js');
const { GROUPS_LOADED } = await import('../components/librarySwitcher.js');
const { openLibrary } = await import('../core/library.js');

const flush = () => new Promise((r) => setTimeout(r, 0));

const note = (id, fields = {}) => ({
    id, type: 'mention', createdAt: new Date().toISOString(), read: false,
    actor: { name: 'Ayşe' }, group: { id: 7, name: 'Lab' }, paper: { id: 12, title: 'Deep <b>nets</b>' },
    commentId: 300 + id, snippet: 'see @Me', ...fields,
});

function fakeApi(items = []) {
    let rows = items;
    return {
        set: (next) => { rows = next; },
        listNotifications: vi.fn(async () => ({ items: rows, unread: rows.filter((n) => !n.read).length })),
        markNotificationsRead: vi.fn(async () => { rows = rows.map((n) => ({ ...n, read: true })); }),
        acceptInvite: vi.fn(async () => {}),
        declineInvite: vi.fn(async () => {}),
        renderLibrarySwitcher: vi.fn(),
    };
}

let slot;
beforeEach(() => {
    localStorage.clear();
    window.location.hash = '#/app';
    openLibrary.mockClear();
    document.body.innerHTML = '<div id="toast-container"></div><div id="slot"></div>';
    slot = document.getElementById('slot');
});

const badge = () => slot.querySelector('[data-badge]');
const bell = () => slot.querySelector('[data-bell]');
const invites = (list) => window.dispatchEvent(new CustomEvent(GROUPS_LOADED, { detail: { groups: [], invites: list } }));
const invite = { id: 4, groupId: 9, groupName: 'Reading club', invitedBy: 'Olivia', role: 'member' };

describe('helpers', () => {
    it('links to the comment and knows when it is on screen', () => {
        expect(commentHash(note(1))).toBe('#/details/12?c=301');
        expect(isOnScreen(note(1), '#/details/12?c=1', 7)).toBe(true);
        expect(isOnScreen(note(1), '#/details/12', 7)).toBe(true);
        expect(isOnScreen(note(1), '#/details/123', 7)).toBe(false);
        expect(isOnScreen(note(1), '#/details/12', null)).toBe(false);
    });
});

describe('bell', () => {
    it('counts unread notifications and new invites, and clears on open', async () => {
        const api = fakeApi([note(2), note(1, { read: true })]);
        mountBell(slot, { api });
        await flush();
        invites([invite]);
        expect(badge().textContent).toBe('2');

        bell().click();
        expect(api.markNotificationsRead).toHaveBeenCalledWith();
        expect(badge().classList.contains('hidden')).toBe(true);
        const text = slot.querySelector('[data-panel]').textContent.replace(/\s+/g, ' ');
        expect(text).toContain('Olivia invited you to Reading club');
        expect(text).toContain('Ayşe mentioned you on Deep <b>nets</b>'); // escaped, shown as text
        expect(slot.querySelectorAll('[title="New"]')).toHaveLength(2);

        bell().click(); // close; the invite stays listed but counts as seen
        invites([invite]);
        expect(badge().classList.contains('hidden')).toBe(true);
    });

    it('opens a notification in its library, at the comment', async () => {
        const api = fakeApi([note(1)]);
        mountBell(slot, { api });
        await flush();
        bell().click();
        slot.querySelector('[data-open="1"]').click();
        expect(openLibrary).toHaveBeenCalledWith(7, { hash: '#/details/12?c=301' });
    });

    it('navigates in place when the group is already open, or focuses the comment on screen', async () => {
        localStorage.setItem('citavers:library', 'group:7');
        const api = fakeApi([note(1)]);
        mountBell(slot, { api });
        await flush();
        bell().click();
        slot.querySelector('[data-open="1"]').click();
        expect(openLibrary).not.toHaveBeenCalled();
        expect(window.location.hash).toBe('#/details/12?c=301');

        const focus = vi.fn();
        window.addEventListener(FOCUS_COMMENT, focus);
        bell().click();
        slot.querySelector('[data-open="1"]').click();
        expect(focus.mock.calls[0][0].detail).toEqual({ paperId: 12, commentId: 301 });
        window.removeEventListener(FOCUS_COMMENT, focus);
    });

    it('refreshes on a signal and toasts what is new', async () => {
        const api = fakeApi([note(1, { read: true })]);
        mountBell(slot, { api });
        await flush();
        expect(document.getElementById('toast-container').textContent).toBe('');

        api.set([note(2, { type: 'reply', actor: { name: 'Olivia' } }), note(1, { read: true })]);
        window.dispatchEvent(new CustomEvent(NOTIFY));
        await flush();
        expect(badge().textContent).toBe('1');
        expect(document.getElementById('toast-container').textContent).toContain('Olivia replied to your comment');
    });

    it('does not toast a comment already on screen, and counts it read', async () => {
        localStorage.setItem('citavers:library', 'group:7');
        window.location.hash = '#/details/12';
        const api = fakeApi([]);
        mountBell(slot, { api });
        await flush();
        api.set([note(3)]);
        window.dispatchEvent(new CustomEvent(NOTIFY));
        await flush();
        expect(api.markNotificationsRead).toHaveBeenCalledWith([3]);
        expect(badge().classList.contains('hidden')).toBe(true);
        expect(document.getElementById('toast-container').textContent).toBe('');
    });

    it('accepts an invitation in its row', async () => {
        const api = fakeApi([]);
        mountBell(slot, { api });
        await flush();
        invites([invite]);
        bell().click();
        slot.querySelector('[data-accept="4"]').click();
        await flush();
        expect(api.acceptInvite).toHaveBeenCalledWith(4);
        expect(api.renderLibrarySwitcher).toHaveBeenCalled();
        expect(slot.querySelector('[data-invite-row]')).toBeNull();
        expect(document.getElementById('toast-container').textContent).toContain('You joined Reading club');
    });

    it('shows an empty state', async () => {
        mountBell(slot, { api: fakeApi([]) });
        await flush();
        bell().click();
        expect(slot.textContent).toContain("You're all caught up.");
    });
});
