import { describe, it, expect } from 'vitest';
import { normalizeImport, chunkBySize, MAX_IMPORT_PAPERS } from '../../src/services/importer.js';

const user = { id: 2 };
const NOW = '2026-10-11T00:00:00.000Z';

describe('normalizeImport', () => {
    it('maps legacy field names and keeps refs in order', () => {
        const out = normalizeImport({
            papers: [
                { id: 683, title: 'A', readingStatus: 'Reading', s3Key: 'papers/2/683/a.pdf', pdfSizeBytes: 10, authors: ['X'] },
                { ref: 'r2', title: 'B', status: 'Finished', rating: 9 },
            ],
        }, user, NOW);

        expect(out.paperRefs).toEqual(['683', 'r2']);
        expect(out.papers[0]).toMatchObject({ title: 'A', status: 'Reading', pdfUrl: 'papers/2/683/a.pdf', pdfSize: 10, authors: ['X'], createdAt: NOW });
        expect(out.papers[1]).toMatchObject({ status: 'Finished', rating: null });
    });

    it('drops PDF references to other accounts and skips untitled papers', () => {
        const out = normalizeImport({
            papers: [{ id: 1, title: 'Stolen', pdfUrl: 'papers/1/10/x.pdf', pdfSizeBytes: 5 }, { id: 2, title: '  ' }],
        }, user, NOW);

        expect(out.papers).toHaveLength(1);
        expect(out.papers[0]).toMatchObject({ pdfUrl: null, pdfSize: null });
        expect(out.droppedPdfRefs).toEqual(['1']);
        expect(out.warnings).toHaveLength(2);
    });

    it('rewrites links and annotations to indexes, dropping unknown and duplicate refs', () => {
        const out = normalizeImport({
            papers: [{ id: 10, title: 'A' }, { id: 11, title: 'B' }],
            folders: [{ id: 5, name: 'F' }, { name: '' }],
            paperFolders: [
                { paperId: 11, folderId: 5 },
                { paperRef: '11', folderRef: '5' },
                { paperId: 99, folderId: 5 },
            ],
            annotations: [
                { paperId: 10, type: 'highlight', content: 'x' },
                { paperId: 10, type: 'weird' },
                { paperId: 99, type: 'note' },
            ],
        }, user, NOW);

        expect(out.folders).toHaveLength(1);
        expect(out.links).toEqual([[1, 0]]);
        expect(out.annotations.map((a) => [a.p, a.type])).toEqual([[0, 'highlight'], [0, 'note']]);
    });

    it('rejects oversized imports', () => {
        const papers = Array.from({ length: MAX_IMPORT_PAPERS + 1 }, (_, i) => ({ title: `P${i}` }));
        expect(() => normalizeImport({ papers }, user, NOW)).toThrow('Too many papers');
    });
});

describe('chunkBySize', () => {
    it('splits on the byte budget and keeps every row once, in order', () => {
        const rows = Array.from({ length: 10 }, (_, i) => ({ i, pad: 'x'.repeat(40) }));
        const chunks = chunkBySize(rows, 200);

        expect(chunks.length).toBeGreaterThan(1);
        expect(chunks.flat()).toEqual(rows);
        for (const c of chunks) expect(JSON.stringify(c).length).toBeLessThanOrEqual(200);
    });
});
