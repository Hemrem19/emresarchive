import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mountComments, parsePageRef, threadify, lastSeen, hasUnread, COMMENTS_CHANGED } from '../components/paperComments.js';

const flush = () => new Promise((r) => setTimeout(r, 0));
const at = (min) => new Date(Date.UTC(2020, 0, 1, 10, min)).toISOString();

const comment = (id, fields = {}) => ({
    id, paperId: 5, parentId: null, author: { name: 'Ayse' }, content: `c${id}`, pageNumber: null,
    createdAt: at(id), edited: false, deleted: false, mine: false, canEdit: false, canDelete: false, ...fields,
});

function fakeApi(initial = []) {
    let rows = [...initial];
    let nextId = 100;
    return {
        rows: () => rows,
        listComments: vi.fn(async () => rows),
        addComment: vi.fn(async (paperId, c) => {
            const saved = comment(nextId++, { ...c, author: { name: 'Me' }, mine: true, canEdit: true, canDelete: true, createdAt: new Date().toISOString() });
            rows = [...rows, saved];
            return saved;
        }),
        editComment: vi.fn(async (id, fields) => {
            rows = rows.map((r) => (r.id === id ? { ...r, ...fields, edited: true } : r));
            return rows.find((r) => r.id === id);
        }),
        deleteComment: vi.fn(async (id) => { rows = rows.filter((r) => r.id !== id); }),
    };
}

let root;
beforeEach(() => {
    localStorage.clear();
    document.body.innerHTML = '<div id="toast-container"></div><div id="root"></div>';
    root = document.getElementById('root');
});

const type = (input, text) => {
    input.value = text;
    input.dispatchEvent(new Event('input', { bubbles: true }));
};
const press = (input, key, opts = {}) => input.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true, ...opts }));
const mainInput = () => root.querySelector('[data-main-composer] [data-input]');

describe('helpers', () => {
    it.each([
        ['p. 12 Fig 3 is off', { content: 'Fig 3 is off', pageNumber: 12 }],
        ['page 4: see eq 2', { content: 'see eq 2', pageNumber: 4 }],
        ['pp. 7 range', { content: 'range', pageNumber: 7 }],
        ['p53 regulates this', { content: 'p53 regulates this', pageNumber: null }],
        ['p. 3', { content: 'p. 3', pageNumber: 3 }],
    ])('reads the page in "%s"', (text, expected) => expect(parsePageRef(text)).toEqual(expected));

    it('nests replies under their comment', () => {
        const tops = threadify([comment(1), comment(2, { parentId: 1 }), comment(3)]);
        expect(tops.map((t) => [t.id, t.replies.map((r) => r.id)])).toEqual([[1, [2]], [3, []]]);
    });
});

describe('thread', () => {
    it('shows comments with replies and only the allowed actions', async () => {
        const api = fakeApi([comment(1, { pageNumber: 4 }), comment(2, { parentId: 1, mine: true, canEdit: true, canDelete: true })]);
        mountComments(root, 5, { api });
        await flush();

        const first = root.querySelector('[data-comment="1"]');
        expect(first.textContent).toContain('p. 4');
        expect(first.querySelector('[data-reply]')).not.toBeNull();
        expect(first.querySelector('[data-edit]')).toBeNull();
        const reply = root.querySelector('[data-comment="2"]');
        expect(reply.querySelector('[data-reply]')).toBeNull(); // one level deep
        expect(reply.querySelector('[data-edit]')).not.toBeNull();
    });

    it('says when there is nothing yet', async () => {
        mountComments(root, 5, { api: fakeApi() });
        await flush();
        expect(root.textContent).toContain('No comments yet');
    });

    it('offers a retry when the thread cannot load', async () => {
        const api = fakeApi([comment(1)]);
        api.listComments.mockRejectedValueOnce(new Error('offline'));
        mountComments(root, 5, { api });
        await flush();
        root.querySelector('[data-reload]').click();
        await flush();
        expect(root.querySelector('[data-comment="1"]')).not.toBeNull();
    });
});

describe('writing', () => {
    it('posts on Enter, keeps Shift+Enter for new lines, and shows the comment at once', async () => {
        const api = fakeApi();
        mountComments(root, 5, { api });
        await flush();

        const input = mainInput();
        type(input, 'p. 9 Nice result');
        press(input, 'Enter', { shiftKey: true });
        expect(api.addComment).not.toHaveBeenCalled();

        press(input, 'Enter');
        expect(root.textContent).toContain('sending…');
        expect(input.value).toBe('');
        await flush();
        expect(api.addComment).toHaveBeenCalledWith(5, expect.objectContaining({ content: 'Nice result', pageNumber: 9, parentId: null, clientId: expect.any(String) }));
        expect(root.textContent).not.toContain('sending…');
        expect(root.textContent).toContain('Nice result');
    });

    it('keeps a failed comment with a Retry that sends the same clientId', async () => {
        const api = fakeApi();
        api.addComment.mockRejectedValueOnce(new Error('offline'));
        mountComments(root, 5, { api });
        await flush();
        type(mainInput(), 'Hello');
        press(mainInput(), 'Enter');
        await flush();
        expect(root.textContent).toContain('Not sent');

        root.querySelector('[data-retry]').click();
        await flush();
        const [first, second] = api.addComment.mock.calls;
        expect(second[1].clientId).toBe(first[1].clientId);
        expect(root.textContent).not.toContain('Not sent');
    });

    it('replies inline under a comment', async () => {
        const api = fakeApi([comment(1)]);
        mountComments(root, 5, { api });
        await flush();
        root.querySelector('[data-reply="1"]').click();
        const input = root.querySelector('[data-reply-slot="1"] [data-input]');
        expect(document.activeElement).toBe(input);
        type(input, 'Agreed');
        press(input, 'Enter');
        await flush();
        expect(api.addComment).toHaveBeenCalledWith(5, expect.objectContaining({ content: 'Agreed', parentId: 1 }));
        expect(root.querySelector('[data-reply-slot="1"] [data-input]')).toBeNull(); // the box closes
    });

    it('edits in place: Enter saves, Escape cancels', async () => {
        const api = fakeApi([comment(1, { mine: true, canEdit: true, canDelete: true, content: 'Typo' })]);
        mountComments(root, 5, { api });
        await flush();
        root.querySelector('[data-edit="1"]').click();
        const input = root.querySelector('[data-edit-input]');
        expect(input.value).toBe('Typo');
        input.value = 'Fixed';
        press(input, 'Enter');
        await flush();
        expect(api.editComment).toHaveBeenCalledWith(1, { content: 'Fixed', pageNumber: null, mentions: [] });
        expect(root.querySelector('[data-comment="1"]').textContent).toContain('edited');
    });

    it('deletes on a second tap of Delete', async () => {
        const api = fakeApi([comment(1, { mine: true, canEdit: true, canDelete: true })]);
        mountComments(root, 5, { api });
        await flush();
        const button = root.querySelector('[data-delete="1"]');
        button.click();
        expect(button.textContent).toBe('Delete?');
        expect(api.deleteComment).not.toHaveBeenCalled();

        button.click();
        expect(root.querySelector('[data-comment="1"]')).toBeNull();
        await flush();
        expect(api.deleteComment).toHaveBeenCalledWith(1);
        expect(root.querySelector('[data-comment="1"]')).toBeNull();
    });

    it('forgets the first tap after a few seconds', async () => {
        vi.useFakeTimers();
        const api = fakeApi([comment(1, { mine: true, canEdit: true, canDelete: true })]);
        mountComments(root, 5, { api });
        await vi.runAllTimersAsync();
        const button = root.querySelector('[data-delete="1"]');
        button.click();
        await vi.advanceTimersByTimeAsync(3000);
        expect(button.textContent).toBe('Delete');
        button.click();
        expect(api.deleteComment).not.toHaveBeenCalled();
        vi.useRealTimers();
    });
});

describe('live and unread', () => {
    it('refetches only for its own paper', async () => {
        const api = fakeApi();
        mountComments(root, 5, { api });
        await flush();
        window.dispatchEvent(new CustomEvent(COMMENTS_CHANGED, { detail: { paperId: 6 } }));
        window.dispatchEvent(new CustomEvent(COMMENTS_CHANGED, { detail: { paperId: 5 } }));
        await flush();
        expect(api.listComments).toHaveBeenCalledTimes(2);
    });

    it('marks others\' comments since the last visit as new, then remembers they were seen', async () => {
        vi.stubGlobal('IntersectionObserver', undefined); // the thread counts as on screen
        localStorage.setItem('citavers:commentsSeen:personal:5', at(2));
        const counts = vi.fn();
        const view = mountComments(root, 5, { api: fakeApi([comment(1), comment(3), comment(4, { mine: true })]), onCount: counts });
        await flush();
        expect([...root.querySelectorAll('[data-unread]')].map((el) => el.dataset.comment)).toEqual(['3']);
        expect(counts).toHaveBeenLastCalledWith({ count: 3, unread: 1 });
        expect(lastSeen(5) > at(4)).toBe(true);
        expect(hasUnread(5, at(4))).toBe(false);
        view.unmount();
        vi.unstubAllGlobals();
    });

    it('takes comments from the bottom bar on narrow screens and removes it on unmount', async () => {
        const api = fakeApi();
        const view = mountComments(root, 5, { api });
        await flush();
        const bar = document.body.lastElementChild;
        const input = bar.querySelector('[data-input]');
        type(input, 'From the bar');
        press(input, 'Enter');
        await flush();
        expect(api.addComment).toHaveBeenCalledWith(5, expect.objectContaining({ content: 'From the bar' }));
        view.unmount();
        expect(document.body.contains(bar)).toBe(false);
    });
});

describe('mentions', () => {
    const members = [
        { userId: 1, name: 'Me', email: 'me@x.dev', role: 'owner' },
        { userId: 2, name: 'Olivia Owner', email: 'olivia@x.dev', role: 'admin' },
    ];
    beforeEach(() => {
        localStorage.setItem('citavers:library', 'group:7');
        localStorage.setItem('citavers_user', JSON.stringify({ id: 1 }));
    });

    it('offers the group members but not me, and sends who was mentioned', async () => {
        const api = { ...fakeApi(), listMembers: vi.fn(async () => members) };
        mountComments(root, 5, { api });
        await flush();
        expect(api.listMembers).toHaveBeenCalledWith(7);

        const input = mainInput();
        input.focus();
        input.value = 'what do you think @ol';
        input.setSelectionRange(input.value.length, input.value.length);
        input.dispatchEvent(new Event('input', { bubbles: true }));
        expect([...root.querySelectorAll('[data-pick]')].map((b) => b.textContent.replace(/\s+/g, ' ').trim())).toEqual(['O Olivia Owner']);

        press(input, 'Enter'); // picks
        expect(input.value).toBe('what do you think @Olivia Owner ');
        expect(api.addComment).not.toHaveBeenCalled();
        press(input, 'Enter'); // posts
        await flush();
        expect(api.addComment).toHaveBeenCalledWith(5, expect.objectContaining({ content: 'what do you think @Olivia Owner', mentions: [2] }));
    });

    it('highlights mentions, mine more strongly', async () => {
        const api = fakeApi([comment(1, { content: '@Me and @Olivia Owner', mentions: [{ userId: 1, name: 'Me' }, { userId: 2, name: 'Olivia Owner' }] })]);
        mountComments(root, 5, { api: { ...api, listMembers: async () => members } });
        await flush();
        const chips = [...root.querySelectorAll('[data-mention]')];
        expect(chips.map((c) => c.textContent)).toEqual(['@Me', '@Olivia Owner']);
        expect(chips[0].className).toContain('amber');
        expect(chips[1].className).not.toContain('amber');
    });

    it('scrolls to and flashes a comment opened from a notification', async () => {
        const api = fakeApi([comment(1), comment(2)]);
        mountComments(root, 5, { api: { ...api, listMembers: async () => [] }, focusCommentId: 2 });
        await flush();
        expect(root.querySelector('[data-comment="2"]').classList.contains('bg-primary/15')).toBe(true);
        expect(root.querySelector('[data-comment="1"]').classList.contains('bg-primary/15')).toBe(false);
    });
});
