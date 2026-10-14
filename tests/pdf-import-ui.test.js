import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../import/pdf-import.js', () => ({
    REVIEW_TAG: 'needs-review',
    isPdfFile: (f) => /\.pdf$/i.test(f.name),
    importPdfs: vi.fn(),
}));

const { startPdfImport, registerPdfImport, unregisterPdfImport, summarize, describeResult } = await import('../components/pdfImport.js');
const { importPdfs } = await import('../import/pdf-import.js');

const files = [{ name: 'a.pdf' }, { name: 'b.pdf' }, { name: 'c.pdf' }];
const RESULTS = [
    { status: 'added', matchedBy: 'doi', paperId: 1, title: 'Paper A' },
    { status: 'added', matchedBy: 'none', paperId: 2, title: 'b' },
    { status: 'attached', paperId: 3, title: 'Paper C' },
];

beforeEach(() => {
    vi.clearAllMocks();
    document.body.innerHTML = `
        <button id="upload-pdfs-btn"></button>
        <input type="file" id="upload-pdfs-input" multiple>`;
    vi.mocked(importPdfs).mockImplementation(async (list, { onProgress }) => {
        list.forEach((_, i) => {
            onProgress(i, { state: 'reading' });
            onProgress(i, { state: 'done', result: RESULTS[i] });
        });
        return RESULTS;
    });
});

describe('PDF import panel', () => {
    it('shows each file\'s outcome, a summary and a Review link', async () => {
        const synced = vi.fn();
        window.addEventListener('citavers:cloud-synced', synced);
        await startPdfImport(files);
        window.removeEventListener('citavers:cloud-synced', synced);

        const panel = document.getElementById('pdf-import-panel');
        const rows = panel.querySelectorAll('[data-row]');
        expect(rows).toHaveLength(3);
        expect(rows[0].textContent).toContain('Paper A');
        expect(rows[0].textContent).toContain('Identified by DOI');
        expect(rows[1].textContent).toContain('Needs review');
        expect(rows[2].textContent).toContain('PDF attached to the paper already in your library');
        expect(rows[0].querySelector('a[href="#/details/1"]')).not.toBeNull();

        const summary = panel.querySelector('[data-summary]');
        expect(summary.textContent).toContain('2 added · 1 attached to existing papers · 1 need review');
        expect(summary.querySelector('a[href="#/app/tag/needs-review"]')).not.toBeNull();
        expect(panel.querySelector('[data-close]').classList.contains('hidden')).toBe(false);
        expect(synced).toHaveBeenCalledTimes(1); // the dashboard reloads its papers
    });

    it('closes when finished', async () => {
        await startPdfImport(files);
        document.querySelector('#pdf-import-panel [data-close]').click();
        expect(document.getElementById('pdf-import-panel')).toBeNull();
    });

    it('starts an import from the Upload PDFs picker', async () => {
        const handlers = registerPdfImport();
        const input = document.getElementById('upload-pdfs-input');
        const click = vi.spyOn(input, 'click');
        document.getElementById('upload-pdfs-btn').click();
        expect(click).toHaveBeenCalled();

        Object.defineProperty(input, 'files', { value: files, configurable: true });
        input.dispatchEvent(new Event('change'));
        await new Promise((r) => setTimeout(r, 0));
        expect(importPdfs).toHaveBeenCalledWith(files, expect.anything());
        unregisterPdfImport(handlers);
    });

    it('starts an import when files are dropped', async () => {
        const handlers = registerPdfImport();
        const drop = new Event('drop', { cancelable: true });
        drop.dataTransfer = { types: ['Files'], files };
        window.dispatchEvent(drop);
        await new Promise((r) => setTimeout(r, 0));
        expect(drop.defaultPrevented).toBe(true);
        expect(importPdfs).toHaveBeenCalledWith(files, expect.anything());
        unregisterPdfImport(handlers);
    });

    it('ignores drags that carry no files, such as text', () => {
        const handlers = registerPdfImport();
        const enter = new Event('dragenter', { cancelable: true });
        enter.dataTransfer = { types: ['text/plain'] };
        window.dispatchEvent(enter);
        expect(document.getElementById('pdf-drop-overlay')).toBeNull();
        unregisterPdfImport(handlers);
    });
});

describe('result text', () => {
    it('explains a PDF that could not be attached', () => {
        expect(describeResult({ status: 'added', matchedBy: 'doi', pdfError: 'Not enough cloud storage' })[0])
            .toBe('Identified by DOI · PDF not attached: Not enough cloud storage');
        expect(summarize([{ status: 'exists' }, { status: 'failed' }])).toBe('1 already in your library · 1 failed');
    });
});
