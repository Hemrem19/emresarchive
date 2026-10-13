/**
 * Copying papers between libraries (personal ↔ group, group ↔ group).
 *
 * A copy is an independent paper in the target library: later edits on
 * either side never reach the other. Stored PDFs are copied too, into the
 * target library's storage, so the target pays for them (checkQuota).
 * Reading-state fields (status, rating, progress) start fresh, and
 * relatedPaperIds are dropped because they name papers in the source.
 */
import { and, eq, inArray } from 'drizzle-orm';
import * as schema from '../../drizzle/schema.js';
import {
    READ, READ_FILES, WRITE_FILES, accessible, allows, allowsIn, libraryFields, libraryOf, pdfKey, sameLibrary,
} from '../lib/access.js';
import { getObject, isStorageConfigured, putObject } from '../lib/storage.js';
import { resolvePdfSource } from './pdf.js';
import { checkQuota } from './storage-quota.js';

export const MAX_COPY = 100;

const P = schema.papers;
const COPIED_FIELDS = ['title', 'authors', 'year', 'journal', 'doi', 'url', 'abstract', 'tags', 'notes', 'summary'];

const fileName = (key) => key.split('/').pop() || 'paper.pdf';

/** Copies a stored PDF into `target`; returns { pdfUrl, pdfSizeBytes } or { skipped }. */
async function copyStoredPdf(env, target, key, newPaperId) {
    if (!isStorageConfigured(env)) return { skipped: 'PDF storage is not configured' };
    const object = await getObject(env, key);
    if (!object) return { skipped: 'The PDF file is missing' };
    const bytes = await new Response(object.body).arrayBuffer();
    const newKey = pdfKey(target, newPaperId, fileName(key));
    const { error } = await checkQuota(env, target, newKey, bytes.byteLength);
    if (error) return { skipped: error };
    await putObject(env, newKey, bytes);
    return { pdfUrl: newKey, pdfSizeBytes: bytes.byteLength };
}

/**
 * Copies the papers in `ids` that `user` can read into `target`.
 * Returns one result per requested id.
 */
export async function copyPapers(env, db, user, ids, target) {
    const sources = await db.query.papers.findMany({
        where: and(inArray(P.id, ids), accessible(P, user, READ)),
    });
    const byId = new Map(sources.map((p) => [p.id, p]));
    const canAttach = allowsIn(user, WRITE_FILES, target);
    const now = new Date().toISOString();
    const results = [];

    for (const sourceId of ids) {
        const source = byId.get(sourceId);
        if (!source) {
            results.push({ sourceId, success: false, error: 'Paper not found' });
            continue;
        }
        if (sameLibrary(libraryOf(source), target)) {
            results.push({ sourceId, success: false, error: 'The paper is already in that library' });
            continue;
        }

        const fields = Object.fromEntries(COPIED_FIELDS.map((f) => [f, source[f]]));
        const [copy] = await db.insert(P).values({
            ...libraryFields(target, user),
            ...fields,
            relatedPaperIds: [],
            status: 'To Read',
            version: 1,
            createdAt: now,
            updatedAt: now,
        }).returning({ id: P.id });

        // The PDF follows only when the caller may read the source's files and add files to the target
        const result = { sourceId, id: copy.id, success: true, pdfCopied: false };
        const pdf = allows(user, READ_FILES, source) && canAttach ? resolvePdfSource(source) : null;
        let attached = null;
        if (pdf?.kind === 'external') {
            attached = { pdfUrl: pdf.url, pdfSizeBytes: null };
        } else if (pdf?.kind === 'storage') {
            const copied = await copyStoredPdf(env, target, pdf.key, copy.id);
            if (copied.skipped) result.pdfSkipped = copied.skipped;
            else attached = copied;
        }
        if (attached) {
            await db.update(P).set(attached).where(eq(P.id, copy.id));
            result.pdfCopied = true;
        }
        results.push(result);
    }
    return results;
}
