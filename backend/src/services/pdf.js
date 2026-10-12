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

/** External PDFs are streamed through the Worker; bound what one request may pull. */
export const MAX_EXTERNAL_PDF_BYTES = 100 * 1024 * 1024;
export const EXTERNAL_FETCH_TIMEOUT_MS = 20_000;

/** Passes bytes through until `limit`, then fails the stream (the client sees a cut-off download). */
function capBytes(body, limit) {
    let seen = 0;
    return body.pipeThrough(new TransformStream({
        transform(chunk, controller) {
            seen += chunk.byteLength;
            if (seen > limit) controller.error(new Error('External PDF exceeds the size limit'));
            else controller.enqueue(chunk);
        },
    }));
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

        // The link is user-supplied: time-box the request and cap the size
        const upstream = await fetch(source.url, {
            signal: AbortSignal.timeout(EXTERNAL_FETCH_TIMEOUT_MS),
            headers: { Accept: 'application/pdf' },
        });
        if (!upstream.ok) throw new Error(`Upstream responded ${upstream.status}`);
        const declared = Number(upstream.headers.get('content-length'));
        if (declared > MAX_EXTERNAL_PDF_BYTES) {
            upstream.body?.cancel();
            return c.json({ success: false, error: { message: 'External PDF is too large to proxy' } }, 413);
        }
        if (declared) headers['Content-Length'] = String(declared);
        return new Response(upstream.body && capBytes(upstream.body, MAX_EXTERNAL_PDF_BYTES), { headers });
    } catch (err) {
        console.error('[PDF]', err);
        return c.json({ success: false, error: { message: 'Failed to fetch PDF' } }, 500);
    }
}
