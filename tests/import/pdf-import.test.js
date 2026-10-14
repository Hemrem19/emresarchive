import { describe, it, expect, vi } from 'vitest';
import { importPdfs, createLibraryIndex, REVIEW_TAG, MAX_PDF_BYTES } from '../../import/pdf-import.js';

const pdf = (name, size = 1000) => ({ name, size, type: 'application/pdf' });

/** Runs importPdfs with fakes; `identities` maps file name → { metadata, matchedBy }. */
async function run(files, { library = [], identities = {}, cloud = true, upload } = {}) {
    let nextId = 100;
    const added = [];
    const updated = [];
    const deps = {
        cloud,
        getAllPapers: async () => library,
        identify: async (file) => identities[file.name] || { metadata: { title: file.name, authors: [] }, matchedBy: 'none' },
        uploadPdf: vi.fn(upload || (async (file, paperId) => ({ s3Key: `papers/1/${paperId ?? 'temp'}/${file.name}`, pdfSizeBytes: file.size }))),
        addPaper: vi.fn(async (paper) => { added.push(paper); return nextId++; }),
        updatePaper: vi.fn(async (id, fields) => { updated.push({ id, fields }); }),
    };
    const results = await importPdfs(files, { deps });
    return { results, added, updated, deps };
}

const byDoi = (doi, title = 'T') => ({ metadata: { title, doi, authors: ['A'] }, matchedBy: 'doi' });

describe('importPdfs', () => {
    it('adds identified papers with their PDF, tagging only the unidentified for review', async () => {
        const { results, added } = await run([pdf('a.pdf'), pdf('b.pdf')], {
            identities: { 'a.pdf': byDoi('10.1/aaaa', 'Paper A') },
        });
        expect(results.map((r) => [r.status, r.matchedBy])).toEqual([['added', 'doi'], ['added', 'none']]);
        expect(added[0]).toMatchObject({ title: 'Paper A', doi: '10.1/aaaa', tags: [], readingStatus: 'To Read', hasPdf: true, s3Key: 'papers/1/temp/a.pdf' });
        expect(added[1].tags).toEqual([REVIEW_TAG]);
    });

    it('attaches the PDF to a paper already in the library without one, and changes nothing else', async () => {
        const existing = { id: 7, title: 'Paper A', doi: '10.1/AAAA', notes: 'mine', tags: ['x'], hasPdf: false };
        const { results, added, updated, deps } = await run([pdf('a.pdf')], {
            library: [existing], identities: { 'a.pdf': byDoi('10.1/aaaa') },
        });
        expect(results[0]).toMatchObject({ status: 'attached', paperId: 7 });
        expect(added).toEqual([]);
        expect(deps.uploadPdf).toHaveBeenCalledWith(expect.anything(), 7);
        expect(updated).toEqual([{ id: 7, fields: { s3Key: 'papers/1/7/a.pdf', pdfSizeBytes: 1000, hasPdf: true } }]);
    });

    it('matches by title when there is no DOI', async () => {
        const existing = { id: 8, title: 'Thesis: Reactor Design', hasPdf: false };
        const { results } = await run([pdf('t.pdf')], {
            library: [existing],
            identities: { 't.pdf': { metadata: { title: 'thesis reactor design', authors: [] }, matchedBy: 'none' } },
        });
        expect(results[0]).toMatchObject({ status: 'attached', paperId: 8 });
    });

    it('never matches papers with different DOIs by title', async () => {
        const existing = { id: 9, title: 'Introduction', doi: '10.1/one', hasPdf: false };
        const { results } = await run([pdf('i.pdf')], {
            library: [existing], identities: { 'i.pdf': byDoi('10.1/two', 'Introduction') },
        });
        expect(results[0].status).toBe('added');
    });

    it('leaves a paper that already has a PDF alone', async () => {
        const existing = { id: 7, title: 'Paper A', doi: '10.1/aaaa', hasPdf: true, s3Key: 'papers/1/7/old.pdf' };
        const { results, added, updated, deps } = await run([pdf('a.pdf')], {
            library: [existing], identities: { 'a.pdf': byDoi('10.1/aaaa') },
        });
        expect(results[0]).toMatchObject({ status: 'exists', paperId: 7 });
        expect(added).toEqual([]);
        expect(updated).toEqual([]);
        expect(deps.uploadPdf).not.toHaveBeenCalled();
    });

    it('adds the same paper once when it is dropped twice in one batch', async () => {
        const { results, added } = await run([pdf('a.pdf'), pdf('a-copy.pdf')], {
            identities: { 'a.pdf': byDoi('10.1/aaaa'), 'a-copy.pdf': byDoi('10.1/aaaa') },
        });
        expect(added).toHaveLength(1);
        expect(results.map((r) => r.status).sort()).toEqual(['added', 'exists']);
    });

    it('still adds the paper when its PDF cannot be uploaded', async () => {
        const { results, added } = await run([pdf('a.pdf')], {
            identities: { 'a.pdf': byDoi('10.1/aaaa') },
            upload: async () => { throw new Error('Not enough cloud storage'); },
        });
        expect(results[0]).toMatchObject({ status: 'added', pdfError: 'Not enough cloud storage' });
        expect(added[0].hasPdf).toBe(false);
    });

    it('adds papers whose PDF is over the limit without the file', async () => {
        const { results, deps } = await run([pdf('big.pdf', MAX_PDF_BYTES + 1)], {
            identities: { 'big.pdf': byDoi('10.1/bbbb') },
        });
        expect(results[0].pdfError).toMatch(/over 10 MB/);
        expect(deps.uploadPdf).not.toHaveBeenCalled();
    });

    it('keeps the file on the device in local-only mode', async () => {
        const file = pdf('a.pdf');
        const { added, deps } = await run([file], { cloud: false, identities: { 'a.pdf': byDoi('10.1/aaaa') } });
        expect(added[0]).toMatchObject({ pdfData: file, hasPdf: true });
        expect(deps.uploadPdf).not.toHaveBeenCalled();
    });

    it('skips files that are not PDFs', async () => {
        const { results } = await run([{ name: 'notes.txt', size: 5, type: 'text/plain' }]);
        expect(results[0]).toEqual({ status: 'skipped', error: 'Not a PDF' });
    });

    it('reports progress for every file', async () => {
        const seen = [];
        const deps = {
            cloud: true, getAllPapers: async () => [],
            identify: async (f) => ({ metadata: { title: f.name, authors: [] }, matchedBy: 'none' }),
            uploadPdf: async () => ({ s3Key: 'k', pdfSizeBytes: 1 }), addPaper: async () => 1, updatePaper: async () => {},
        };
        await importPdfs([pdf('a.pdf')], { deps, onProgress: (i, u) => seen.push(u.state) });
        expect(seen).toEqual(['reading', 'uploading', 'done']);
    });
});

describe('createLibraryIndex', () => {
    it('finds by DOI case-insensitively', () => {
        const index = createLibraryIndex([{ id: 1, title: 'X', doi: '10.1/ABC' }]);
        expect(index.find({ doi: '10.1/abc' }).paper.id).toBe(1);
    });
});
