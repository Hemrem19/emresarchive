/**
 * Adding papers from PDF files, one or many, without asking for metadata.
 *
 * Each file is identified (import/identify.js), then:
 *   - already in the open library without a PDF → the file is attached to it
 *     (nothing else about the paper changes);
 *   - already there with a PDF → left alone and reported;
 *   - otherwise → a new paper with the file attached. Papers that could not
 *     be identified are tagged "needs-review", so nothing is lost and they
 *     are easy to find.
 * In cloud mode the PDF goes through the normal upload (size limit, quota,
 * and the open group's storage); in local-only mode it is stored on the
 * device, as the add form does.
 */
import { identify } from './identify.js';
import { normalizeTitle } from './pdf-metadata.js';
import { getAllPapers, addPaper, updatePaper } from '../db.js';
import { uploadPdfViaBackend } from '../api/papers.js';
import { isCloudSyncEnabled } from '../config.js';
import { isAuthenticated } from '../api/auth.js';

export const MAX_PDF_BYTES = 10 * 1024 * 1024; // backend MAX_PDF_BYTES
export const REVIEW_TAG = 'needs-review';
export const CONCURRENCY = 3;

export const isPdfFile = (file) => file?.type === 'application/pdf' || /\.pdf$/i.test(file?.name || '');

const hasPdf = (paper) => !!(paper.hasPdf || paper.s3Key || paper.pdfUrl || paper.pdfData || paper.pdfFile);

/**
 * The open library's papers by DOI and by normalized title. Papers being
 * added in this batch are reserved first, so the same paper dropped twice
 * is added once.
 */
export function createLibraryIndex(papers = []) {
    const byDoi = new Map();
    const byTitle = new Map();
    const keys = (meta) => [
        meta.doi ? [byDoi, String(meta.doi).toLowerCase()] : null,
        meta.title ? [byTitle, normalizeTitle(meta.title)] : null,
    ].filter((k) => k && k[1]);
    const put = (meta, entry) => keys(meta).forEach(([map, key]) => { if (!map.has(key)) map.set(key, entry); });

    papers.forEach((paper) => put(paper, { paper, doi: paper.doi || null }));
    return {
        /** { paper } for a known paper, { pending } for one being added now, or null. */
        find(meta) {
            if (meta.doi) {
                const hit = byDoi.get(String(meta.doi).toLowerCase());
                if (hit) return hit;
            }
            const hit = meta.title ? byTitle.get(normalizeTitle(meta.title)) : null;
            // Two papers with different DOIs are different papers, whatever their titles
            if (!hit || (meta.doi && hit.doi)) return null;
            return hit;
        },
        /** Marks `meta` as being added; call done(paper) or done(null) when finished. */
        reserve(meta) {
            let done;
            const entry = { doi: meta.doi || null, pending: new Promise((resolve) => { done = resolve; }) };
            put(meta, entry);
            return (paper) => {
                if (paper) Object.assign(entry, { paper, pending: null });
                done(paper);
            };
        },
    };
}

/** The fields that attach `file` to a paper, or { error } when it cannot be attached. */
async function pdfFields(file, paperId, cloud, upload) {
    if (!cloud) return { fields: { pdfData: file, hasPdf: true } };
    if (file.size > MAX_PDF_BYTES) return { error: 'PDF is over 10 MB, so it was not attached' };
    try {
        const { s3Key, pdfSizeBytes } = await upload(file, paperId);
        return { fields: { s3Key, pdfSizeBytes, hasPdf: true } };
    } catch (error) {
        return { error: error.message || 'Upload failed' };
    }
}

/**
 * Imports one PDF. `progress(state)` reports 'reading' and 'uploading'.
 * @returns {Promise<{status: 'added'|'attached'|'exists'|'failed', paperId?, title?, matchedBy?, pdfError?, error?}>}
 */
export async function importPdf(file, { index, cloud, progress = () => {}, deps = {} }) {
    const upload = deps.uploadPdf || uploadPdfViaBackend;
    const add = deps.addPaper || addPaper;
    const update = deps.updatePaper || updatePaper;

    progress('reading');
    const { metadata, matchedBy } = await (deps.identify || identify)(file);

    // find and reserve run without awaiting in between, so parallel files cannot both add the same paper
    let found = index.find(metadata);
    const release = found ? null : index.reserve(metadata);
    if (found?.pending) {
        await found.pending;
        found = found.paper ? found : null;
    }

    if (found) {
        const existing = found.paper;
        if (hasPdf(existing)) return { status: 'exists', paperId: existing.id, title: existing.title, matchedBy };
        progress('uploading');
        const { fields, error } = await pdfFields(file, existing.id, cloud, upload);
        if (error) return { status: 'failed', paperId: existing.id, title: existing.title, error };
        await update(existing.id, fields);
        Object.assign(existing, fields);
        return { status: 'attached', paperId: existing.id, title: existing.title, matchedBy };
    }

    try {
        progress('uploading');
        const { fields, error: pdfError } = await pdfFields(file, null, cloud, upload);
        const paper = {
            ...metadata,
            tags: matchedBy === 'none' ? [REVIEW_TAG] : [],
            readingStatus: 'To Read',
            createdAt: new Date(),
            notes: metadata.notes || '',
            hasPdf: false,
            pdfFile: null,
            ...(fields || {}),
        };
        const id = await add(paper);
        release?.({ ...paper, id });
        return { status: 'added', paperId: id, title: paper.title, matchedBy, ...(pdfError ? { pdfError } : {}) };
    } catch (error) {
        release?.(null);
        return { status: 'failed', title: metadata.title, error: error.message || 'Could not add the paper' };
    }
}

/**
 * Imports many files, CONCURRENCY at a time.
 * onProgress(index, update) receives { state } while working and { state: 'done', result } at the end.
 * @returns {Promise<Array<object>>} one result per file, in the given order
 */
export async function importPdfs(files, { onProgress = () => {}, concurrency = CONCURRENCY, deps = {} } = {}) {
    const list = Array.from(files);
    const results = new Array(list.length);
    const cloud = deps.cloud ?? (isCloudSyncEnabled() && isAuthenticated());
    const index = createLibraryIndex(await (deps.getAllPapers || getAllPapers)());

    let next = 0;
    const worker = async () => {
        while (next < list.length) {
            const i = next++;
            const file = list[i];
            let result;
            if (!isPdfFile(file)) {
                result = { status: 'skipped', error: 'Not a PDF' };
            } else {
                try {
                    result = await importPdf(file, { index, cloud, deps, progress: (state) => onProgress(i, { state }) });
                } catch (error) {
                    result = { status: 'failed', error: error.message || 'Import failed' };
                }
            }
            results[i] = result;
            onProgress(i, { state: 'done', result });
        }
    };
    await Promise.all(Array.from({ length: Math.min(concurrency, list.length) }, worker));
    return results;
}
