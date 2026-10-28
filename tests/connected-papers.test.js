import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderConnected, reasonHtml, forgetConnections, SHOWN } from '../components/connectedPapers.js';

const entry = (id, reasons) => ({ paper: { id, title: `Paper <${id}>`, year: 2020 + id }, reasons });

let root;
beforeEach(() => {
    forgetConnections();
    document.body.innerHTML = '<div id="root" class="hidden"></div>';
    root = document.getElementById('root');
});

describe('connected papers', () => {
    it('says why each paper is connected, and links to it', async () => {
        const api = { getPaperConnections: vi.fn(async () => [
            entry(2, [{ type: 'cites' }]),
            entry(3, [{ type: 'cited_by' }, { type: 'same_author', names: ['Ada <b>L</b>'] }]),
        ]) };
        await renderConnected(root, 1, { api });

        expect(root.classList.contains('hidden')).toBe(false);
        const rows = [...root.querySelectorAll('a')];
        expect(rows.map((a) => a.getAttribute('href'))).toEqual(['#/details/2', '#/details/3']);
        expect(rows[0].textContent.replace(/\s+/g, ' ')).toContain('Paper <2> (2022) Cites');
        expect(rows[1].textContent.replace(/\s+/g, ' ')).toContain('Cited by · Same author: Ada <b>L</b>');
        expect(root.querySelector('b')).toBeNull(); // names are text
    });

    it('shows nothing when there are no connections or the request fails', async () => {
        await renderConnected(root, 1, { api: { getPaperConnections: async () => [] } });
        expect(root.classList.contains('hidden')).toBe(true);
        forgetConnections();
        await renderConnected(root, 1, { api: { getPaperConnections: async () => { throw new Error('offline'); } } });
        expect(root.innerHTML).toBe('');
    });

    it('shows the first few and the rest on request', async () => {
        const many = Array.from({ length: SHOWN + 3 }, (_, i) => entry(i + 2, [{ type: 'same_author', names: ['A'] }]));
        await renderConnected(root, 1, { api: { getPaperConnections: async () => many } });
        expect(root.querySelectorAll('[data-more] a')).toHaveLength(3);
        const more = root.querySelector('[data-show-more]');
        expect(more.textContent).toContain('Show 3 more');
        more.click();
        expect(root.querySelector('[data-more]').classList.contains('hidden')).toBe(false);
    });

    it('asks once a minute per paper, not on every redraw', async () => {
        const api = { getPaperConnections: vi.fn(async () => [entry(2, [{ type: 'cites' }])]) };
        await renderConnected(root, 1, { api });
        await renderConnected(root, 1, { api });
        expect(api.getPaperConnections).toHaveBeenCalledTimes(1);
    });

    it('formats reasons', () => {
        expect(reasonHtml([{ type: 'cites' }, { type: 'same_author', names: ['A', 'B'] }])).toBe('Cites · Same author: A, B');
    });
});
