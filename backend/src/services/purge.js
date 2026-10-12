/**
 * Nightly storage cleanup (Cron Trigger, see worker.js `scheduled`).
 *
 * Stored PDFs count against the library's quota, so files nobody can reach
 * any more must not linger:
 *   1. Expired trash: a paper deleted more than TRASH_DAYS ago loses its
 *      stored PDF. The paper row stays as a tombstone so devices that sync
 *      late still learn it was deleted; only its pdfUrl is cleared.
 *   2. Orphans: objects under papers/ that no paper row references (live or
 *      in trash), older than ORPHAN_GRACE_DAYS. The grace period covers an
 *      upload whose paper reaches the server later (e.g. created offline).
 *
 * STORAGE_PURGE selects the mode: "delete" removes files; anything else
 * (the default) only reports what would be removed.
 */
import { drizzle } from 'drizzle-orm/d1';
import { and, inArray, isNotNull, lt } from 'drizzle-orm';
import * as schema from '../../drizzle/schema.js';
import { deleteObjects, extractKey, isStoredObject, listObjects } from '../lib/storage.js';

export const TRASH_DAYS = 30;
export const ORPHAN_GRACE_DAYS = 7;
/** Objects deleted per run at most; the rest go on the next nights. */
export const MAX_DELETES_PER_RUN = 1000;

const DAY_MS = 24 * 60 * 60 * 1000;
const ID_CHUNK = 90; // D1 allows 100 bound parameters per statement

/** Keys a pdfUrl may refer to. Legacy full URLs are matched raw and decoded, to err on keeping. */
function keysOf(pdfUrl) {
    const key = extractKey(pdfUrl);
    try {
        return [key, decodeURIComponent(key)];
    } catch {
        return [key];
    }
}

export async function purgeStorage(env, { now = new Date(), mode = env.STORAGE_PURGE } = {}) {
    const dryRun = mode !== 'delete';
    const db = drizzle(env.citavers_db, { schema });
    const P = schema.papers;

    // 1. Expired trash
    const trashCutoff = new Date(now.getTime() - TRASH_DAYS * DAY_MS).toISOString();
    const expired = (await db.select({ id: P.id, pdfUrl: P.pdfUrl }).from(P)
        .where(and(isNotNull(P.deletedAt), lt(P.deletedAt, trashCutoff), isNotNull(P.pdfUrl))))
        .filter((p) => isStoredObject(p.pdfUrl));
    const expiredIds = new Set(expired.map((p) => p.id));

    if (!dryRun) {
        const ids = [...expiredIds];
        for (let i = 0; i < ids.length; i += ID_CHUNK) {
            await db.update(P).set({ pdfUrl: null, pdfSizeBytes: null })
                .where(inArray(P.id, ids.slice(i, i + ID_CHUNK)));
        }
    }

    // 2. What is still referenced (expired trash no longer counts)
    const refs = await db.select({ id: P.id, pdfUrl: P.pdfUrl }).from(P).where(isNotNull(P.pdfUrl));
    const keep = new Set();
    for (const ref of refs) {
        if (!expiredIds.has(ref.id) && isStoredObject(ref.pdfUrl)) keysOf(ref.pdfUrl).forEach((k) => keep.add(k));
    }

    // 3. Unreferenced objects past the grace period
    const graceCutoff = new Date(now.getTime() - ORPHAN_GRACE_DAYS * DAY_MS);
    const doomed = [];
    let objects = 0;
    for await (const object of listObjects(env, 'papers/')) {
        objects++;
        if (!keep.has(object.key) && object.uploaded < graceCutoff) doomed.push(object);
    }

    const summary = {
        mode: dryRun ? 'report' : 'delete',
        objects,
        expiredTrashPapers: expiredIds.size,
        unreferenced: doomed.length,
        unreferencedBytes: doomed.reduce((sum, o) => sum + o.size, 0),
        deleted: 0,
    };

    // A failed or empty reference query must never turn into "delete everything"
    if (keep.size === 0 && objects > 0) {
        return { ...summary, aborted: 'no stored file is referenced by any paper; refusing to delete' };
    }

    if (dryRun) return { ...summary, sample: doomed.slice(0, 50).map((o) => o.key) };

    const batch = doomed.slice(0, MAX_DELETES_PER_RUN).map((o) => o.key);
    for (let i = 0; i < batch.length; i += 1000) await deleteObjects(env, batch.slice(i, i + 1000));
    return { ...summary, deleted: batch.length };
}
