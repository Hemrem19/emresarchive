import { describe, it, expect, beforeEach } from 'vitest';
import { activeQuery, attachMentions, highlightMentions, insertMention, matchMembers, mentionIdsIn } from '../components/mentionPicker.js';
import { escapeHtml } from '../ui.js';

const members = [
    { userId: 1, name: 'Ali', email: 'ali@x.dev' },
    { userId: 2, name: 'Alice Smith', email: 'alice@x.dev' },
    { userId: 3, name: 'Ayşe Yılmaz', email: 'ayse@x.dev' },
];

describe('helpers', () => {
    it.each([
        ['hi @Al', 6, { start: 3, query: 'Al' }],
        ['@', 1, { start: 0, query: '' }],
        ['see @Ayşe Y', 11, { start: 4, query: 'Ayşe Y' }],
        ['mail me at a@b.c', 16, null],
        ['@ ', 2, null],
        ['@Al\nnext', 8, null],
        ['no mention', 10, null],
    ])('reads the mention being typed in %j', (text, caret, expected) => expect(activeQuery(text, caret)).toEqual(expected));

    it('matches names, words of names and emails', () => {
        expect(matchMembers(members, 'al').map((m) => m.userId)).toEqual([1, 2]);
        expect(matchMembers(members, 'smi').map((m) => m.userId)).toEqual([2]);
        expect(matchMembers(members, 'ayse').map((m) => m.userId)).toEqual([3]);
        expect(matchMembers(members, '').length).toBe(3);
    });

    it('inserts the name and puts the caret after it', () => {
        expect(insertMention('hi @Al there', 3, 6, 'Alice Smith')).toEqual({ text: 'hi @Alice Smith there', caret: 16 });
    });

    it('finds whole names only, so @Alice is not also @Ali', () => {
        expect(mentionIdsIn('thanks @alice smith!', members)).toEqual([2]);
        expect(mentionIdsIn('@Ali and @Ayşe Yılmaz', members)).toEqual([1, 3]);
        expect(mentionIdsIn('email ali@x.dev', members)).toEqual([]);
    });

    it('highlights mentions in escaped text without letting markup in', () => {
        const evil = [{ userId: 9, name: '<img src=x onerror=alert(1)>' }];
        const html = highlightMentions(escapeHtml('hey @<img src=x onerror=alert(1)> and @Ali'), [...evil, { userId: 1, name: 'Ali' }], 1);
        expect(html).not.toContain('<img');
        expect(html).toContain('<span class="rounded px-0.5 font-semibold bg-primary/15 text-blue-300" data-mention>@&lt;img');
        expect(html).toMatch(/bg-amber-400\/20[^>]*>@Ali<\/span>/);
    });
});

describe('picking', () => {
    let input;
    beforeEach(() => {
        document.body.innerHTML = '<form><textarea></textarea></form>';
        input = document.querySelector('textarea');
        attachMentions(input, { members: () => members });
    });
    const type = (text) => {
        input.value = text;
        input.setSelectionRange(text.length, text.length);
        input.dispatchEvent(new Event('input', { bubbles: true }));
    };
    const press = (key) => {
        const e = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true });
        input.dispatchEvent(e);
        return e;
    };
    const options = () => [...document.querySelectorAll('[data-pick]')].map((b) => b.textContent.trim().split(/\s+/)[1]);

    it('lists matches on "@" and picks with the keyboard, keeping Enter from the form', () => {
        type('ping @a');
        expect(options()).toEqual(['Ali', 'Alice', 'Ayşe']);
        type('ping @ali');
        expect(document.querySelectorAll('[data-pick]')).toHaveLength(2);
        press('ArrowDown');
        const enter = press('Enter');
        expect(enter.defaultPrevented).toBe(true);
        expect(input.value).toBe('ping @Alice Smith ');
        expect(document.querySelector('[role="listbox"]').classList.contains('hidden')).toBe(true);
        expect(press('Enter').defaultPrevented).toBe(false); // closed: Enter is the form's again
    });

    it('picks with a tap', () => {
        type('@ay');
        document.querySelector('[data-pick="0"]').click();
        expect(input.value).toBe('@Ayşe Yılmaz ');
    });

    it('closes on Escape and when the text matches nobody', () => {
        type('@al');
        press('Escape');
        expect(document.querySelectorAll('[role="listbox"]:not(.hidden)')).toHaveLength(0);
        type('@zed');
        expect(document.querySelectorAll('[role="listbox"]:not(.hidden)')).toHaveLength(0);
    });
});
