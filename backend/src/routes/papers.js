import { Hono } from 'hono';
import { drizzle } from 'drizzle-orm/d1';
import * as schema from '../../drizzle/schema.js';
import { eq, and, desc, asc, gt, or, sql, count } from 'drizzle-orm';
import { authenticate } from '../middleware/auth.js';
import {
    READ, WRITE, READ_FILES, WRITE_FILES, accessible, accessibleWithDeleted, allows, findAccessible,
    libraryFields, libraryOf, pdfKey, pdfUrlError, personalLibrary,
} from '../lib/access.js';
import {
    PRESIGNED_URL_EXPIRY, isStorageConfigured, canPresign, putObject, presignUpload, presignDownload,
} from '../lib/storage.js';
import { generateFileToken } from '../lib/jwt.js';
import { PDF_COLUMNS, pdfResponse, resolvePdfSource } from '../services/pdf.js';
import { MAX_PDF_BYTES, checkQuota, recordUsage } from '../services/storage-quota.js';

const papers = new Hono();
papers.use('*', authenticate);

const getDb = (c) => drizzle(c.env.citavers_db, { schema });

// Paper columns for findMany/findFirst (excludes userId for privacy)
const PAPER_COLUMNS = {
    id: true,
    title: true,
    authors: true,
    year: true,
    journal: true,
    doi: true,
    url: true,
    abstract: true,
    tags: true,
    status: true,
    relatedPaperIds: true,
    notes: true,
    summary: true,
    rating: true,
    pdfUrl: true,
    pdfSizeBytes: true,
    readingProgress: true,
    createdAt: true,
    updatedAt: true,
    deletedAt: true,
    clientId: true,
    version: true,
};

// Paper columns for .returning() calls (uses schema column references)
const RETURNING_COLUMNS = {
    id: schema.papers.id,
    title: schema.papers.title,
    authors: schema.papers.authors,
    year: schema.papers.year,
    journal: schema.papers.journal,
    doi: schema.papers.doi,
    url: schema.papers.url,
    abstract: schema.papers.abstract,
    tags: schema.papers.tags,
    status: schema.papers.status,
    relatedPaperIds: schema.papers.relatedPaperIds,
    notes: schema.papers.notes,
    summary: schema.papers.summary,
    rating: schema.papers.rating,
    pdfUrl: schema.papers.pdfUrl,
    pdfSizeBytes: schema.papers.pdfSizeBytes,
    readingProgress: schema.papers.readingProgress,
    createdAt: schema.papers.createdAt,
    updatedAt: schema.papers.updatedAt,
    clientId: schema.papers.clientId,
    version: schema.papers.version,
};

/**
 * Batch Operations (update/delete multiple papers)
 * POST /api/papers/batch
 * Body: { operations: [{ type: 'update'|'delete', id, data? }] }
 */
papers.post('/batch', async (c) => {
    const db = getDb(c);
    const authUser = c.get('user');
    const body = await c.req.json().catch(() => ({}));
    const operations = body.operations;

    if (!Array.isArray(operations) || operations.length === 0) {
        return c.json({ success: false, error: { message: 'operations array is required' } }, 400);
    }

    const results = [];
    for (const op of operations) {
        try {
            if (op.type === 'delete') {
                const existing = await findAccessible(db.query.papers, schema.papers, authUser, op.id, WRITE);
                if (!existing) { results.push({ id: op.id, success: false, error: 'Not found', type: 'delete' }); continue; }
                await db.update(schema.papers)
                    .set({ deletedAt: new Date().toISOString(), version: existing.version + 1 })
                    .where(eq(schema.papers.id, op.id));
                results.push({ id: op.id, success: true, type: 'delete' });

            } else if (op.type === 'update' && op.data) {
                const existing = await findAccessible(db.query.papers, schema.papers, authUser, op.id, WRITE);
                if (!existing) { results.push({ id: op.id, success: false, error: 'Not found', type: 'update' }); continue; }
                const pdfError = pdfChangeError(authUser, existing, op.data);
                if (pdfError) { results.push({ id: op.id, success: false, error: pdfError, type: 'update' }); continue; }

                const updateData = { updatedAt: new Date().toISOString(), version: existing.version + 1 };
                const fields = ['title', 'authors', 'year', 'journal', 'doi', 'url', 'abstract',
                    'tags', 'status', 'relatedPaperIds', 'notes', 'summary', 'rating',
                    'pdfUrl', 'pdfSizeBytes', 'readingProgress', 'clientId'];
                for (const field of fields) {
                    if (op.data[field] !== undefined) updateData[field] = op.data[field];
                }
                const [paper] = await db.update(schema.papers)
                    .set(updateData)
                    .where(eq(schema.papers.id, op.id))
                    .returning(RETURNING_COLUMNS);
                results.push({ id: op.id, success: true, type: 'update', data: paper });

            } else {
                results.push({ id: op.id, success: false, error: 'Unknown operation type' });
            }
        } catch (err) {
            results.push({ id: op.id, success: false, error: err.message, type: op.type });
        }
    }

    return c.json({ success: true, data: { results } });
});

/**
 * Get All Papers
 * GET /api/papers
 */
papers.get('/', async (c) => {
    const db = getDb(c);
    const authUser = c.get('user');

    const page = Math.max(1, parseInt(c.req.query('page') || '1', 10));
    const limit = Math.min(1000, Math.max(1, parseInt(c.req.query('limit') || '25', 10)));
    const sortBy = c.req.query('sortBy') || 'updatedAt';
    const sortOrder = c.req.query('sortOrder') || 'desc';
    const since = c.req.query('since') || null;
    const offset = (page - 1) * limit;

    const sortColumn = schema.papers[sortBy] || schema.papers.updatedAt;
    const orderFn = sortOrder === 'asc' ? asc : desc;

    // Delta mode: include tombstones so clients can detect remote deletions.
    // Full mode: exclude deleted rows as before.
    const whereClause = since
        ? and(
            accessibleWithDeleted(schema.papers, authUser, READ),
            or(gt(schema.papers.updatedAt, since), gt(schema.papers.deletedAt, since))
          )
        : accessible(schema.papers, authUser, READ);

    try {
        const allPapers = await db.query.papers.findMany({
            where: whereClause,
            orderBy: [orderFn(sortColumn)],
            columns: PAPER_COLUMNS,
            limit,
            offset,
        });

        // Skip the count query in delta mode — pagination is less useful there.
        let total = allPapers.length;
        if (!since) {
            const allCount = await db.query.papers.findMany({
                where: accessible(schema.papers, authUser, READ),
                columns: { id: true },
            });
            total = allCount.length;
        }

        return c.json({
            success: true,
            data: {
                papers: allPapers,
                pagination: {
                    page,
                    limit,
                    total,
                    totalPages: Math.ceil(total / limit),
                },
            },
        });
    } catch (err) {
        return c.json({ success: false, error: err.message }, 500);
    }
});

/**
 * Search Papers
 * GET /api/papers/search?q=&status=&tag=&page=&limit=
 * Must be registered before GET /:id.
 */
papers.get('/search', async (c) => {
    const db = getDb(c);
    const authUser = c.get('user');

    const q = (c.req.query('q') || '').trim();
    const status = c.req.query('status');
    const tag = c.req.query('tag');
    const page = Math.max(1, parseInt(c.req.query('page') || '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt(c.req.query('limit') || '25', 10)));

    const conditions = [accessible(schema.papers, authUser, READ)];
    if (status) conditions.push(eq(schema.papers.status, status));
    if (tag) {
        conditions.push(sql`EXISTS (SELECT 1 FROM json_each(${schema.papers.tags}) WHERE lower(value) = lower(${tag}))`);
    }
    if (q) {
        // LIKE is case-insensitive for ASCII in SQLite; escape wildcards in user input
        const pattern = `%${q.replace(/[\\%_]/g, (ch) => `\\${ch}`)}%`;
        const fields = [schema.papers.title, schema.papers.abstract, schema.papers.notes, schema.papers.authors, schema.papers.journal];
        conditions.push(or(...fields.map((field) => sql`${field} LIKE ${pattern} ESCAPE '\\'`)));
    }
    const where = and(...conditions);

    try {
        const [{ total }] = await db.select({ total: count() }).from(schema.papers).where(where);
        const results = await db.query.papers.findMany({
            where,
            orderBy: [desc(schema.papers.updatedAt)],
            columns: PAPER_COLUMNS,
            limit,
            offset: (page - 1) * limit,
        });

        return c.json({
            success: true,
            data: {
                papers: results,
                pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
            },
        });
    } catch (err) {
        console.error('[Paper search]', err);
        return c.json({ success: false, error: { message: 'Search failed' } }, 500);
    }
});

/**
 * Get Single Paper
 * GET /api/papers/:id
 */
papers.get('/:id', async (c) => {
    const db = getDb(c);
    const authUser = c.get('user');
    const paperId = parseInt(c.req.param('id'), 10);

    try {
        const paper = await findAccessible(db.query.papers, schema.papers, authUser, paperId, READ, PAPER_COLUMNS);

        if (!paper) {
            return c.json({ success: false, error: { message: 'Paper not found' } }, 404);
        }

        return c.json({ success: true, data: { paper } });
    } catch (err) {
        return c.json({ success: false, error: err.message }, 500);
    }
});

/**
 * Create Paper
 * POST /api/papers
 */
papers.post('/', async (c) => {
    const db = getDb(c);
    const authUser = c.get('user');
    const body = await c.req.json().catch(() => ({}));

    if (!body.title) {
        return c.json({ success: false, error: { message: 'Title is required' } }, 400);
    }
    // New papers go to the caller's personal library (groups will pass a library id)
    const library = personalLibrary(authUser);
    const pdfError = pdfUrlError(library, body.pdfUrl);
    if (pdfError) {
        return c.json({ success: false, error: { message: pdfError } }, 400);
    }

    try {
        const now = new Date().toISOString();
        const [paper] = await db.insert(schema.papers).values({
            ...libraryFields(library),
            title: body.title,
            authors: body.authors || [],
            year: body.year || null,
            journal: body.journal || null,
            doi: body.doi || null,
            url: body.url || null,
            abstract: body.abstract || null,
            tags: body.tags || [],
            status: body.status || 'To Read',
            relatedPaperIds: body.relatedPaperIds || [],
            notes: body.notes || null,
            summary: body.summary || null,
            rating: body.rating || null,
            pdfUrl: body.pdfUrl || null,
            pdfSizeBytes: body.pdfSizeBytes || null,
            readingProgress: body.readingProgress || null,
            clientId: body.clientId || null,
            version: 1,
            createdAt: now,
            updatedAt: now,
        }).returning(RETURNING_COLUMNS);

        return c.json({ success: true, data: { paper } }, 201);
    } catch (err) {
        return c.json({ success: false, error: err.message }, 500);
    }
});

/**
 * Update Paper
 * PUT /api/papers/:id
 */
papers.put('/:id', async (c) => {
    const db = getDb(c);
    const authUser = c.get('user');
    const paperId = parseInt(c.req.param('id'), 10);
    const updates = await c.req.json().catch(() => ({}));

    try {
        const existing = await findAccessible(db.query.papers, schema.papers, authUser, paperId, WRITE);

        if (!existing) {
            return c.json({ success: false, error: { message: 'Paper not found' } }, 404);
        }
        const pdfError = pdfChangeError(authUser, existing, updates);
        if (pdfError) {
            return c.json({ success: false, error: { message: pdfError } }, 400);
        }

        const updateData = { updatedAt: new Date().toISOString(), version: existing.version + 1 };
        const fields = ['title', 'authors', 'year', 'journal', 'doi', 'url', 'abstract',
            'tags', 'status', 'relatedPaperIds', 'notes', 'summary', 'rating',
            'pdfUrl', 'pdfSizeBytes', 'readingProgress', 'clientId'];
        for (const field of fields) {
            if (updates[field] !== undefined) updateData[field] = updates[field];
        }

        const [paper] = await db.update(schema.papers)
            .set(updateData)
            .where(eq(schema.papers.id, paperId))
            .returning(RETURNING_COLUMNS);

        return c.json({ success: true, data: { paper } });
    } catch (err) {
        return c.json({ success: false, error: err.message }, 500);
    }
});

/**
 * Delete Paper (Soft Delete)
 * DELETE /api/papers/:id
 */
papers.delete('/:id', async (c) => {
    const db = getDb(c);
    const authUser = c.get('user');
    const paperId = parseInt(c.req.param('id'), 10);

    try {
        const existing = await findAccessible(db.query.papers, schema.papers, authUser, paperId, WRITE);

        if (!existing) {
            return c.json({ success: false, error: { message: 'Paper not found' } }, 404);
        }

        await db.update(schema.papers)
            .set({ deletedAt: new Date().toISOString(), version: existing.version + 1 })
            .where(eq(schema.papers.id, paperId));

        return c.json({ success: true, message: 'Paper deleted successfully' });
    } catch (err) {
        return c.json({ success: false, error: err.message }, 500);
    }
});

const findPaperFiles = (c, paperId) =>
    findAccessible(getDb(c).query.papers, schema.papers, c.get('user'), paperId, READ_FILES, PDF_COLUMNS);

// Changing a paper's PDF needs file rights on it, and the new key must sit in
// the paper's own library.
function pdfChangeError(user, paper, changes) {
    if (changes.pdfUrl === undefined || changes.pdfUrl === paper.pdfUrl) return null;
    if (!allows(user, WRITE_FILES, paper)) return 'You may not change this paper\'s PDF';
    return pdfUrlError(libraryOf(paper), changes.pdfUrl);
}

const tooLarge = (c, message) => c.json({ success: false, error: { message } }, 413);

const storageNotConfigured = (c) => c.json({
    success: false,
    error: { message: 'PDF storage is not configured on the server.' }
}, 503);

/**
 * Upload PDF through the Worker
 * POST /api/papers/upload?paperId=
 * Body: multipart/form-data with 'file' field
 */
papers.post('/upload', async (c) => {
    if (!isStorageConfigured(c.env)) return storageNotConfigured(c);

    // Refuse oversized bodies before buffering them (multipart adds a little overhead)
    const declared = Number(c.req.header('content-length'));
    if (declared > MAX_PDF_BYTES + 64 * 1024) return tooLarge(c, 'PDF is larger than the upload limit');

    const body = await c.req.parseBody().catch(() => ({}));
    const file = body.file;
    if (!file || typeof file === 'string') {
        return c.json({ success: false, error: { message: 'No file uploaded. Please include a PDF file in the request.' } }, 400);
    }
    if (file.type !== 'application/pdf') {
        return c.json({ success: false, error: { message: 'Only PDF files are allowed' } }, 400);
    }

    try {
        const user = c.get('user');
        const library = personalLibrary(user);
        const s3Key = pdfKey(library, c.req.query('paperId'), file.name);
        const { error, used } = await checkQuota(c.env, library, user.storageLimitBytes, s3Key, file.size);
        if (error) return tooLarge(c, error);

        await putObject(c.env, s3Key, await file.arrayBuffer(), file.type);
        await recordUsage(getDb(c), user, used + file.size);

        return c.json({ success: true, data: { s3Key, pdfSizeBytes: file.size, filename: file.name } });
    } catch (err) {
        console.error('[PDF upload]', err);
        return c.json({ success: false, error: { message: 'Failed to store PDF' } }, 500);
    }
});

/**
 * Presigned PDF upload URL
 * POST /api/papers/upload-url
 * Body: { filename, size, contentType, paperId? }
 */
papers.post('/upload-url', async (c) => {
    const { filename, size, contentType, paperId } = await c.req.json().catch(() => ({}));
    if (!filename || !size || !contentType) {
        return c.json({ success: false, error: { message: 'filename, size, and contentType are required' } }, 400);
    }
    if (contentType !== 'application/pdf') {
        return c.json({ success: false, error: { message: 'Only PDF files are allowed' } }, 400);
    }
    if (!Number.isSafeInteger(size) || size <= 0) {
        return c.json({ success: false, error: { message: 'size must be a positive number of bytes' } }, 400);
    }
    if (!canPresign(c.env)) return storageNotConfigured(c);

    try {
        const user = c.get('user');
        const library = personalLibrary(user);
        const s3Key = pdfKey(library, paperId, filename);
        // The URL only accepts exactly `size` bytes, so the quota check holds
        const { error } = await checkQuota(c.env, library, user.storageLimitBytes, s3Key, size);
        if (error) return tooLarge(c, error);
        const uploadUrl = await presignUpload(c.env, s3Key, size, contentType);
        return c.json({ success: true, data: { uploadUrl, s3Key, expiresIn: PRESIGNED_URL_EXPIRY } });
    } catch (err) {
        console.error('[PDF presign upload]', err);
        return c.json({ success: false, error: { message: 'Failed to generate upload URL' } }, 500);
    }
});

/**
 * PDF download info
 * GET /api/papers/:id/pdf
 */
papers.get('/:id/pdf', async (c) => {
    const paperId = parseInt(c.req.param('id'), 10);
    const paper = await findPaperFiles(c, paperId);
    if (!paper) return c.json({ success: false, error: { message: 'Paper not found' } }, 404);

    const source = resolvePdfSource(paper);
    if (!source) return c.json({ success: false, error: { message: 'PDF not found for this paper' } }, 404);

    const proxyUrl = `/api/papers/${paperId}/pdf-proxy`;

    if (source.kind === 'external') {
        // External link (e.g. arXiv) stored as pdfUrl
        return c.json({ success: true, data: { pdfUrl: paper.pdfUrl, downloadUrl: paper.pdfUrl, proxyUrl } });
    }

    let downloadUrl;
    if (canPresign(c.env)) {
        try {
            downloadUrl = await presignDownload(c.env, source.key);
        } catch (err) {
            console.error('[PDF presign download]', err);
        }
    }
    if (!downloadUrl) {
        // Plain links can't send an Authorization header: hand out a short-lived
        // token that only downloads this one paper, never the login token.
        const token = generateFileToken(c.get('user').id, paper.id, c.env);
        downloadUrl = `${new URL(c.req.url).origin}/api/files/pdf?t=${encodeURIComponent(token)}`;
    }

    return c.json({
        success: true,
        data: { pdfUrl: paper.pdfUrl, downloadUrl, proxyUrl, expiresIn: PRESIGNED_URL_EXPIRY }
    });
});

/**
 * Stream PDF through the Worker (avoids R2 CORS)
 * GET /api/papers/:id/pdf-proxy[?download=1]
 */
papers.get('/:id/pdf-proxy', async (c) => {
    const paper = await findPaperFiles(c, parseInt(c.req.param('id'), 10));
    if (!paper) return c.json({ success: false, error: { message: 'Paper not found' } }, 404);
    return pdfResponse(c, paper, c.req.query('download') ? 'attachment' : 'inline');
});

export default papers;
