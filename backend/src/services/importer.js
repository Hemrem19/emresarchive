/**
 * Backup import (restore) on D1.
 *
 * The whole import runs as ONE D1 batch, i.e. one transaction: in "replace"
 * mode the old library is swapped out and the new one written together, so a
 * failure leaves the old library untouched.
 *
 * To stay within Workers' per-request query limits, rows are inserted in bulk
 * through json_each(). New ids are assigned explicitly from the table's
 * AUTOINCREMENT high-water mark (sqlite_sequence): the i-th imported paper gets
 * id = seq_before + i + 1. Links and annotations derive their paper/folder ids
 * from the same formula inside the transaction, and the response returns the
 * client's old ids mapped to the new ones.
 */
import { pdfUrlError, personalLibrary, storagePrefix } from '../lib/access.js';
import { deleteObjects, isStorageConfigured, listObjects } from '../lib/storage.js';

export const MAX_IMPORT_PAPERS = 10000;
const CHUNK_BYTES = 512 * 1024;
const ANNOTATION_TYPES = new Set(['highlight', 'note', 'bookmark']);

const str = (v) => (typeof v === 'string' && v.trim() !== '' ? v : null);
const int = (v) => {
    const n = typeof v === 'string' ? parseInt(v, 10) : v;
    return Number.isInteger(n) ? n : null;
};
const list = (v) => (Array.isArray(v) ? v.filter((x) => typeof x === 'string' || typeof x === 'number').map(String) : []);
const isoDate = (v) => {
    if (!v) return null;
    const d = new Date(v);
    return Number.isNaN(d.getTime()) ? null : d.toISOString();
};
const refOf = (item) => {
    const ref = item?.ref ?? item?.id;
    return ref === undefined || ref === null ? null : String(ref);
};

/**
 * Validates and reshapes a client import payload. Pure: no I/O.
 * Items reference each other by their ids in the backup ("refs"); links and
 * annotations are rewritten to array indexes into papers/folders.
 */
export function normalizeImport(body, user, now = new Date().toISOString()) {
    const warnings = [];
    const droppedPdfRefs = [];
    const papersIn = Array.isArray(body?.papers) ? body.papers : [];
    const foldersIn = Array.isArray(body?.folders) ? body.folders : [];
    const linksIn = Array.isArray(body?.paperFolders) ? body.paperFolders : [];
    const annotationsIn = Array.isArray(body?.annotations) ? body.annotations : [];

    if (papersIn.length > MAX_IMPORT_PAPERS) {
        throw new Error(`Too many papers: ${papersIn.length} (max ${MAX_IMPORT_PAPERS})`);
    }

    const papers = [];
    const paperRefs = [];
    const paperIndex = new Map();
    papersIn.forEach((p, i) => {
        const title = str(p?.title);
        if (!title) {
            warnings.push(`Paper at index ${i} has no title and was skipped`);
            return;
        }
        let pdfUrl = str(p.pdfUrl) ?? str(p.s3Key);
        if (pdfUrl && pdfUrlError(personalLibrary(user), pdfUrl)) {
            droppedPdfRefs.push(refOf(p));
            warnings.push(`PDF reference for "${title}" belongs to another account and was dropped`);
            pdfUrl = null;
        }
        const rating = int(p.rating);
        const ref = refOf(p);
        if (ref !== null) paperIndex.set(ref, papers.length);
        paperRefs.push(ref);
        papers.push({
            title,
            authors: list(p.authors),
            year: int(p.year),
            journal: str(p.journal),
            doi: str(p.doi),
            url: str(p.url),
            abstract: str(p.abstract),
            tags: list(p.tags),
            status: str(p.status) ?? str(p.readingStatus) ?? 'To Read',
            related: Array.isArray(p.relatedPaperIds) ? p.relatedPaperIds : [],
            notes: str(p.notes),
            summary: str(p.summary),
            rating: rating !== null && rating >= 1 && rating <= 5 ? rating : null,
            pdfUrl,
            pdfSize: pdfUrl ? int(p.pdfSizeBytes) : null,
            progress: p.readingProgress && typeof p.readingProgress === 'object' ? p.readingProgress : null,
            createdAt: isoDate(p.createdAt) ?? now,
        });
    });

    const folders = [];
    const folderRefs = [];
    const folderIndex = new Map();
    foldersIn.forEach((f, i) => {
        const name = str(f?.name);
        if (!name) {
            warnings.push(`Folder at index ${i} has no name and was skipped`);
            return;
        }
        const ref = refOf(f);
        if (ref !== null) folderIndex.set(ref, folders.length);
        folderRefs.push(ref);
        folders.push({
            name,
            icon: str(f.icon) ?? 'folder',
            color: str(f.color),
            position: int(f.position) ?? 0,
            createdAt: isoDate(f.createdAt) ?? now,
        });
    });

    const links = [];
    const seenLinks = new Set();
    for (const l of linksIn) {
        const pi = paperIndex.get(String(l?.paperRef ?? l?.paperId));
        const fi = folderIndex.get(String(l?.folderRef ?? l?.folderId));
        if (pi === undefined || fi === undefined) continue;
        const key = `${pi}:${fi}`;
        if (seenLinks.has(key)) continue;
        seenLinks.add(key);
        links.push([pi, fi]);
    }

    const annotations = [];
    for (const a of annotationsIn) {
        const pi = paperIndex.get(String(a?.paperRef ?? a?.paperId));
        if (pi === undefined) continue;
        annotations.push({
            p: pi,
            type: ANNOTATION_TYPES.has(a.type) ? a.type : 'note',
            page: int(a.pageNumber),
            position: a.position && typeof a.position === 'object' ? a.position : null,
            content: str(a.content),
            color: str(a.color),
            createdAt: isoDate(a.createdAt) ?? now,
        });
    }

    return { papers, paperRefs, folders, folderRefs, links, annotations, warnings, droppedPdfRefs };
}

/** Splits rows into chunks whose JSON stays under CHUNK_BYTES. */
export function chunkBySize(rows, maxBytes = CHUNK_BYTES) {
    const chunks = [];
    let current = [];
    let size = 2;
    for (const row of rows) {
        const rowSize = JSON.stringify(row).length + 1;
        if (current.length && size + rowSize > maxBytes) {
            chunks.push(current);
            current = [];
            size = 2;
        }
        current.push(row);
        size += rowSize;
    }
    if (current.length) chunks.push(current);
    return chunks;
}

const SEQ = (table) => `COALESCE((SELECT seq FROM sqlite_sequence WHERE name = '${table}'), 0)`;

/**
 * Runs the import as a single D1 batch.
 * @param {D1Database} d1 raw D1 binding
 * @returns {{ paperIds: Map<string, number>, folderIds: Map<string, number>, counts: object }}
 */
export async function runImport(d1, user, normalized, { mode = 'merge', now = new Date().toISOString() } = {}) {
    const { papers, paperRefs, folders, folderRefs, links, annotations } = normalized;
    const uid = user.id;
    const stmts = [];

    if (mode === 'replace') {
        // Papers and folders become tombstones so other devices' delta sync
        // removes them; dependent rows are deleted outright. Only the personal
        // library is replaced (group_id IS NULL): rows the user added to
        // groups belong to those groups.
        stmts.push(
            d1.prepare('DELETE FROM paper_folders WHERE user_id = ? AND group_id IS NULL').bind(uid),
            d1.prepare('DELETE FROM annotations WHERE user_id = ? AND group_id IS NULL').bind(uid),
            d1.prepare(`DELETE FROM paper_connections
                        WHERE from_paper_id IN (SELECT id FROM papers WHERE user_id = ?1 AND group_id IS NULL)
                           OR to_paper_id IN (SELECT id FROM papers WHERE user_id = ?1 AND group_id IS NULL)`).bind(uid),
            d1.prepare('DELETE FROM network_graphs WHERE user_id = ?').bind(uid),
            d1.prepare(`UPDATE papers SET deleted_at = ?2, updated_at = ?2, version = version + 1
                        WHERE user_id = ?1 AND group_id IS NULL AND deleted_at IS NULL`).bind(uid, now),
            d1.prepare(`UPDATE folders SET deleted_at = ?2, updated_at = ?2, version = version + 1
                        WHERE user_id = ?1 AND group_id IS NULL AND deleted_at IS NULL`).bind(uid, now),
        );
    }

    // Each chunk continues the id sequence where the previous one stopped,
    // because every insert advances sqlite_sequence.
    for (const chunk of chunkBySize(papers)) {
        stmts.push(d1.prepare(`
            INSERT INTO papers (id, user_id, title, authors, year, journal, doi, url, abstract, tags, status,
                                related_paper_ids, notes, summary, rating, pdf_url, pdf_size_bytes,
                                reading_progress, created_at, updated_at, version)
            SELECT ${SEQ('papers')} + key + 1, ?1,
                   json_extract(value, '$.title'), json_extract(value, '$.authors'),
                   json_extract(value, '$.year'), json_extract(value, '$.journal'),
                   json_extract(value, '$.doi'), json_extract(value, '$.url'),
                   json_extract(value, '$.abstract'), json_extract(value, '$.tags'),
                   json_extract(value, '$.status'), json_extract(value, '$.related'),
                   json_extract(value, '$.notes'), json_extract(value, '$.summary'),
                   json_extract(value, '$.rating'), json_extract(value, '$.pdfUrl'),
                   json_extract(value, '$.pdfSize'), json_extract(value, '$.progress'),
                   json_extract(value, '$.createdAt'), ?2, 1
            FROM json_each(?3)`).bind(uid, now, JSON.stringify(chunk)));
    }

    for (const chunk of chunkBySize(folders)) {
        stmts.push(d1.prepare(`
            INSERT INTO folders (id, user_id, name, icon, color, position, created_at, updated_at, version)
            SELECT ${SEQ('folders')} + key + 1, ?1,
                   json_extract(value, '$.name'), json_extract(value, '$.icon'),
                   json_extract(value, '$.color'), json_extract(value, '$.position'),
                   json_extract(value, '$.createdAt'), ?2, 1
            FROM json_each(?3)`).bind(uid, now, JSON.stringify(chunk)));
    }

    // After the inserts above, imported paper i has id = seq - nPapers + i + 1.
    const paperBase = `(${SEQ('papers')} - ${papers.length})`;
    const folderBase = `(${SEQ('folders')} - ${folders.length})`;

    for (const chunk of chunkBySize(links)) {
        stmts.push(d1.prepare(`
            INSERT INTO paper_folders (paper_id, folder_id, user_id, added_at)
            SELECT ${paperBase} + json_extract(value, '$[0]') + 1,
                   ${folderBase} + json_extract(value, '$[1]') + 1, ?1, ?2
            FROM json_each(?3)`).bind(uid, now, JSON.stringify(chunk)));
    }

    for (const chunk of chunkBySize(annotations)) {
        stmts.push(d1.prepare(`
            INSERT INTO annotations (paper_id, user_id, type, page_number, position, content, color,
                                     created_at, updated_at, version)
            SELECT ${paperBase} + json_extract(value, '$.p') + 1, ?1,
                   json_extract(value, '$.type'), json_extract(value, '$.page'),
                   json_extract(value, '$.position'), json_extract(value, '$.content'),
                   json_extract(value, '$.color'), json_extract(value, '$.createdAt'), ?2, 1
            FROM json_each(?3)`).bind(uid, now, JSON.stringify(chunk)));
    }

    // Read the high-water marks inside the same transaction to derive new ids.
    stmts.push(d1.prepare(`SELECT ${SEQ('papers')} AS papers, ${SEQ('folders')} AS folders`));

    const results = await d1.batch(stmts);
    const seq = results.at(-1).results[0];
    const firstPaperId = seq.papers - papers.length + 1;
    const firstFolderId = seq.folders - folders.length + 1;

    const paperIds = {};
    paperRefs.forEach((ref, i) => { if (ref !== null) paperIds[ref] = firstPaperId + i; });
    const folderIds = {};
    folderRefs.forEach((ref, i) => { if (ref !== null) folderIds[ref] = firstFolderId + i; });

    return {
        paperIds,
        folderIds,
        counts: {
            papers: papers.length,
            folders: folders.length,
            paperFolders: links.length,
            annotations: annotations.length,
        },
    };
}

/**
 * After a replace: removes the user's R2 objects that no live paper references.
 * Only objects uploaded before the import started are considered, so an
 * upload racing with the import is never deleted.
 */
export async function sweepUnreferencedPdfs(env, d1, user, startedAt) {
    if (!isStorageConfigured(env)) return 0;
    const { results } = await d1.prepare(
        `SELECT pdf_url FROM papers WHERE user_id = ? AND group_id IS NULL AND deleted_at IS NULL AND pdf_url LIKE 'papers/%'`
    ).bind(user.id).all();
    const keep = new Set(results.map((r) => r.pdf_url));

    const stale = [];
    for await (const object of listObjects(env, storagePrefix(personalLibrary(user)))) {
        if (!keep.has(object.key) && object.uploaded < new Date(startedAt)) stale.push(object.key);
    }
    for (let i = 0; i < stale.length; i += 1000) await deleteObjects(env, stale.slice(i, i + 1000));
    return stale.length;
}
