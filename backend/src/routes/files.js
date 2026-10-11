import { Hono } from 'hono';
import { drizzle } from 'drizzle-orm/d1';
import { eq } from 'drizzle-orm';
import * as schema from '../../drizzle/schema.js';
import { verifyFileToken } from '../lib/jwt.js';
import { READ_FILES, findAccessible } from '../lib/access.js';
import { PDF_COLUMNS, pdfResponse } from '../services/pdf.js';

/**
 * Downloads through plain links, which cannot send an Authorization header.
 * Authenticated by a short-lived file token (see generateFileToken) that names
 * one paper; access is re-checked here, so a revoked right also revokes links.
 */
const files = new Hono();

/** GET /api/files/pdf?t=<file token> */
files.get('/pdf', async (c) => {
    const grant = verifyFileToken(c.req.query('t'), c.env);
    if (!grant) return c.json({ success: false, error: { message: 'Link expired or invalid' } }, 401);

    const db = drizzle(c.env.citavers_db, { schema });
    const user = await db.query.users.findFirst({ where: eq(schema.users.id, grant.userId), columns: { id: true } });
    if (!user) return c.json({ success: false, error: { message: 'Link expired or invalid' } }, 401);

    const paper = await findAccessible(db.query.papers, schema.papers, user, grant.paperId, READ_FILES, PDF_COLUMNS);
    if (!paper) return c.json({ success: false, error: { message: 'Paper not found' } }, 404);
    return pdfResponse(c, paper, 'attachment');
});

export default files;
