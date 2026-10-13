/**
 * Storage quota. Usage is measured from the objects actually stored under a
 * library's prefix, never from sizes clients report (pdfSizeBytes is client
 * writable), so it cannot drift or be under-reported.
 *
 * The limit is configuration, not data: STORAGE_LIMIT in wrangler.toml
 * (e.g. "2GB", "500MB"). Changing it there and redeploying applies to every
 * library at once. A group library has its own limit (STORAGE_LIMIT_GROUP),
 * so members' uploads count against the group, not against whoever uploads.
 */
import { eq } from 'drizzle-orm';
import * as schema from '../../drizzle/schema.js';
import { listObjects } from '../lib/storage.js';
import { isGroupLibrary, storagePrefix } from '../lib/access.js';

/** Largest single PDF accepted; matches the limit the app enforces (form.view.js). */
export const MAX_PDF_BYTES = 10 * 1024 * 1024;

const MB = 1024 * 1024;

/** Used when STORAGE_LIMIT is not set. */
export const DEFAULT_STORAGE_LIMIT = '2GB';

const UNITS = { B: 1, KB: 1024, MB, GB: 1024 * MB, TB: 1024 * 1024 * MB };

/** Parses "2GB", "500 MB", "1.5GB" or "1000B" into bytes. */
export function parseSize(value) {
    const match = /^\s*(\d+(?:\.\d+)?)\s*(B|KB|MB|GB|TB)\s*$/i.exec(String(value));
    if (!match) throw new Error(`Invalid storage size: "${value}" (use e.g. "2GB" or "500MB")`);
    return Math.floor(Number(match[1]) * UNITS[match[2].toUpperCase()]);
}

/**
 * Storage limit of `library` in bytes: STORAGE_LIMIT for personal libraries,
 * STORAGE_LIMIT_GROUP for groups (pooled: every member's uploads count there).
 */
export function libraryLimit(env, library) {
    const configured = isGroupLibrary(library) ? env.STORAGE_LIMIT_GROUP : env.STORAGE_LIMIT;
    return parseSize(configured ?? DEFAULT_STORAGE_LIMIT);
}

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
 * Whether `size` more bytes fit in `library`. `key` is where they will be
 * written; an object already there is replaced, so its size does not count.
 * Returns { error, used }.
 */
export async function checkQuota(env, library, key, size) {
    const limitBytes = libraryLimit(env, library);
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
