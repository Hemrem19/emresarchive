import { Hono } from 'hono';
import { drizzle } from 'drizzle-orm/d1';
import * as schema from '../../drizzle/schema.js';
import { eq, and, isNull, desc, asc, gt, or } from 'drizzle-orm';
import { authenticate } from '../middleware/auth.js';
import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const papers = new Hono();
papers.use('*', authenticate);

const getDb = (c) => drizzle(c.env.citavers_db, { schema });

// Helper to instantiate R2-compatible S3 SDK
const getS3Client = (env) => {
    return new S3Client({
        region: env.S3_REGION || 'auto',
        endpoint: env.S3_ENDPOINT,
        credentials: {
            accessKeyId: env.S3_ACCESS_KEY_ID,
            secretAccessKey: env.S3_SECRET_ACCESS_KEY,
        },
    });
};

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
                const existing = await db.query.papers.findFirst({
                    where: and(eq(schema.papers.id, op.id), eq(schema.papers.userId, authUser.id), isNull(schema.papers.deletedAt)),
                });
                if (!existing) { results.push({ id: op.id, success: false, error: 'Not found', type: 'delete' }); continue; }
                await db.update(schema.papers)
                    .set({ deletedAt: new Date().toISOString(), version: existing.version + 1 })
                    .where(eq(schema.papers.id, op.id));
                results.push({ id: op.id, success: true, type: 'delete' });

            } else if (op.type === 'update' && op.data) {
                const existing = await db.query.papers.findFirst({
                    where: and(eq(schema.papers.id, op.id), eq(schema.papers.userId, authUser.id), isNull(schema.papers.deletedAt)),
                });
                if (!existing) { results.push({ id: op.id, success: false, error: 'Not found', type: 'update' }); continue; }

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
            eq(schema.papers.userId, authUser.id),
            or(gt(schema.papers.updatedAt, since), gt(schema.papers.deletedAt, since))
          )
        : and(eq(schema.papers.userId, authUser.id), isNull(schema.papers.deletedAt));

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
                where: and(eq(schema.papers.userId, authUser.id), isNull(schema.papers.deletedAt)),
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
 * Get Single Paper
 * GET /api/papers/:id
 */
papers.get('/:id', async (c) => {
    const db = getDb(c);
    const authUser = c.get('user');
    const paperId = parseInt(c.req.param('id'), 10);

    try {
        const paper = await db.query.papers.findFirst({
            where: and(
                eq(schema.papers.id, paperId),
                eq(schema.papers.userId, authUser.id),
                isNull(schema.papers.deletedAt)
            ),
            columns: PAPER_COLUMNS,
        });

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

    try {
        const now = new Date().toISOString();
        const [paper] = await db.insert(schema.papers).values({
            userId: authUser.id,
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
        const existing = await db.query.papers.findFirst({
            where: and(
                eq(schema.papers.id, paperId),
                eq(schema.papers.userId, authUser.id),
                isNull(schema.papers.deletedAt)
            ),
        });

        if (!existing) {
            return c.json({ success: false, error: { message: 'Paper not found' } }, 404);
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
        const existing = await db.query.papers.findFirst({
            where: and(
                eq(schema.papers.id, paperId),
                eq(schema.papers.userId, authUser.id),
                isNull(schema.papers.deletedAt)
            ),
        });

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

/**
 * PDF Upload URL
 * GET /api/papers/:id/pdf/upload-url
 */
papers.get('/:id/pdf/upload-url', async (c) => {
    const paperId = c.req.param('id');
    const user = c.get('user');
    const s3 = getS3Client(c.env);

    try {
        const objectKey = `users/${user.id}/papers/${paperId}.pdf`;
        const command = new PutObjectCommand({
            Bucket: c.env.S3_BUCKET_NAME,
            Key: objectKey,
            ContentType: 'application/pdf',
        });

        const uploadUrl = await getSignedUrl(s3, command, { expiresIn: 3600 });

        return c.json({ success: true, uploadUrl, objectKey });
    } catch (error) {
        console.error('[R2 Presigner Error]:', error);
        return c.json({ success: false, message: 'Failed to generate secure Edge upload URL.' }, 500);
    }
});

/**
 * PDF Download URL
 * GET /api/papers/:id/pdf/download-url
 */
papers.get('/:id/pdf/download-url', async (c) => {
    const paperId = c.req.param('id');
    const user = c.get('user');
    const s3 = getS3Client(c.env);

    try {
        const objectKey = `users/${user.id}/papers/${paperId}.pdf`;
        const command = new GetObjectCommand({
            Bucket: c.env.S3_BUCKET_NAME,
            Key: objectKey,
        });

        const downloadUrl = await getSignedUrl(s3, command, { expiresIn: 3600 });
        return c.json({ success: true, downloadUrl });
    } catch (error) {
        console.error('[R2 Presigner Error]:', error);
        return c.json({ success: false, message: 'Failed to generate secure Edge download URL.' }, 500);
    }
});

export default papers;
