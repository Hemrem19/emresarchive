/**
 * Serving a paper's PDF. Callers decide whether the user may read the paper's
 * files (READ_FILES); this module decides where the bytes come from.
 */
import { extractKey, getObject, isStorageConfigured, isStoredObject } from '../lib/storage.js';
import { isHttpUrl, keyInLibrary, libraryOf } from '../lib/access.js';

/** Columns a paper must be loaded with for the helpers below. */
export const PDF_COLUMNS = { id: true, pdfUrl: true, userId: true };

/**
 * Where a paper's PDF may be read from, or null when its pdfUrl is not
 * readable: a storage key outside the paper's own library, or not http(s).
 */
export function resolvePdfSource(paper) {
    const { pdfUrl } = paper;
    if (!pdfUrl) return null;
    if (isStoredObject(pdfUrl)) {
        const key = extractKey(pdfUrl);
        return keyInLibrary(libraryOf(paper), key) ? { kind: 'storage', key } : null;
    }
    return isHttpUrl(pdfUrl) ? { kind: 'external', url: pdfUrl } : null;
}

const notFound = (c, message = 'PDF not found for this paper') =>
    c.json({ success: false, error: { message } }, 404);

/** Streams the paper's PDF, from storage or the external link. */
export async function pdfResponse(c, paper, disposition = 'inline') {
    const source = resolvePdfSource(paper);
    if (!source) return notFound(c);

    const headers = {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `${disposition}; filename="paper-${paper.id}.pdf"`,
        'Cache-Control': 'private, max-age=3600',
    };

    try {
        if (source.kind === 'storage') {
            if (!isStorageConfigured(c.env)) {
                return c.json({ success: false, error: { message: 'PDF storage is not configured on the server.' } }, 503);
            }
            const obj = await getObject(c.env, source.key);
            if (!obj) return notFound(c, 'PDF file missing from storage');
            if (obj.size) headers['Content-Length'] = String(obj.size);
            return new Response(obj.body, { headers });
        }

        const upstream = await fetch(source.url);
        if (!upstream.ok) throw new Error(`Upstream responded ${upstream.status}`);
        return new Response(upstream.body, { headers });
    } catch (err) {
        console.error('[PDF]', err);
        return c.json({ success: false, error: { message: 'Failed to fetch PDF' } }, 500);
    }
}
