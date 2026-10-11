import { Hono } from 'hono';
import { authenticate } from '../middleware/auth.js';
import { normalizeImport, runImport, sweepUnreferencedPdfs } from '../services/importer.js';

const importRouter = new Hono();
importRouter.use('*', authenticate);

/**
 * Batch import (backup restore)
 * POST /api/import/batch-import
 * Body: { mode?: 'merge' | 'replace', papers, folders, paperFolders, annotations }
 *   Items carry their backup id as `ref` (or `id`); paperFolders and
 *   annotations point at those refs via paperRef/folderRef (or paperId/folderId).
 * Returns the backup ids mapped to the new server ids.
 */
importRouter.post('/batch-import', async (c) => {
    const user = c.get('user');
    const body = await c.req.json().catch(() => null);
    if (!body || typeof body !== 'object') {
        return c.json({ success: false, error: { message: 'Invalid JSON body' } }, 400);
    }
    const mode = body.mode === 'replace' ? 'replace' : 'merge';
    const startedAt = new Date().toISOString();

    let normalized;
    try {
        normalized = normalizeImport(body, user, startedAt);
    } catch (err) {
        return c.json({ success: false, error: { message: err.message } }, 400);
    }

    let result;
    try {
        result = await runImport(c.env.citavers_db, user, normalized, { mode, now: startedAt });
    } catch (err) {
        console.error('[import] batch failed:', err);
        return c.json({ success: false, error: { message: 'Import failed. Your existing library was not changed.' } }, 500);
    }

    let pdfsRemoved = 0;
    if (mode === 'replace') {
        try {
            pdfsRemoved = await sweepUnreferencedPdfs(c.env, c.env.citavers_db, user, startedAt);
        } catch (err) {
            console.error('[import] PDF sweep failed:', err.message);
        }
    }

    return c.json({
        success: true,
        data: {
            mode,
            summary: { ...result.counts, pdfsRemoved },
            idMap: { papers: result.paperIds, folders: result.folderIds },
            droppedPdfRefs: normalized.droppedPdfRefs,
            warnings: normalized.warnings,
        },
    });
});

export default importRouter;
