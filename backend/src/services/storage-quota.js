/**
 * Storage quota. Usage is measured from the objects actually stored under a
 * library's prefix, never from sizes clients report (pdfSizeBytes is client
 * writable), so it cannot drift or be under-reported.
 *
 * Today every library is a personal one and its limit is the owner's
 * storage_limit_bytes. A group library will carry its own limit, so members'
 * uploads count against the group, not against whoever happens to upload.
 */
import { eq } from 'drizzle-orm';
import * as schema from '../../drizzle/schema.js';
import { listObjects } from '../lib/storage.js';
import { storagePrefix } from '../lib/access.js';

/** Largest single PDF accepted; matches the limit the app enforces (form.view.js). */
export const MAX_PDF_BYTES = 10 * 1024 * 1024;

const MB = 1024 * 1024;
const formatMb = (bytes) => `${(bytes / MB).toFixed(bytes < 10 * MB ? 1 : 0)} MB`;

/** Bytes stored in `library`, leaving out `exceptKey` (an object about to be replaced). */
export async function measureLibrary(env, library, exceptKey = null) {
    let bytes = 0;
    for await (const object of listObjects(env, storagePrefix(library))) {
        if (object.key !== exceptKey) bytes += object.size;
    }
    return bytes;
}

/**
 * Whether `size` more bytes fit in `library`, whose limit is `limitBytes`.
 * `key` is where they will be written; an object already there is replaced,
 * so its size does not count. Returns { error, used }.
 */
export async function checkQuota(env, library, limitBytes, key, size) {
    if (size > MAX_PDF_BYTES) {
        return { error: `PDF is larger than the ${formatMb(MAX_PDF_BYTES)} limit`, used: null };
    }
    const used = await measureLibrary(env, library, key);
    if (used + size > limitBytes) {
        return {
            error: `Not enough cloud storage: ${formatMb(used)} of ${formatMb(limitBytes)} used, this PDF needs ${formatMb(size)}`,
            used,
        };
    }
    return { error: null, used };
}

/** Caches a personal library's measured usage on the owner's row (for stats and admin views). */
export function recordUsage(db, user, bytes) {
    return db.update(schema.users).set({ storageUsedBytes: bytes }).where(eq(schema.users.id, user.id));
}
