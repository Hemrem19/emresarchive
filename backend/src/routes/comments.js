import { Hono } from 'hono';
import { drizzle } from 'drizzle-orm/d1';
import * as schema from '../../drizzle/schema.js';
import { and, asc, count, eq, isNull, max, sql } from 'drizzle-orm';
import { authenticate } from '../middleware/auth.js';
import {
    READ, WRITE, accessible, allows, authorColumn, authoredBy, findAccessible, isAuthor, isGroupLibrary, libraryFields, libraryOf,
    maySupervise, parseLibrary,
} from '../lib/access.js';
import { announceChange } from '../services/groups.js';

/**
 * Paper comments: one discussion thread per paper, with one level of replies.
 * A comment is an annotations row of type 'comment' in the paper's library.
 *
 *   GET    /api/comments/summary            counts per paper in the X-Library library
 *   GET    /api/comments/papers/:paperId    the thread
 *   POST   /api/comments/papers/:paperId    { content, pageNumber?, parentId?, clientId? }
 *   PATCH  /api/comments/:id                { content, pageNumber? } (author) or { restore: true }
 *   DELETE /api/comments/:id                author, or a group owner or admin
 *
 * Writes in a group tell its sync room which paper changed, so only the
 * members looking at that paper refetch; nobody pulls the whole library.
 */
const comments = new Hono();
comments.use('*', authenticate);

export const COMMENT = 'comment';
export const MAX_CONTENT = 5000;
export const MAX_PER_PAPER = 1000;
export const MAX_LISTED = 500;
export const RESTORE_WINDOW_MS = 10 * 60 * 1000;

const A = schema.annotations;
const U = schema.users;
const AUTHOR = authorColumn(A);
const getDb = (c) => drizzle(c.env.citavers_db, { schema });

const fail = (c, status, message) => c.json({ success: false, error: { message } }, status);

const idParam = (c, name) => {
    const id = Number(c.req.param(name));
    return Number.isInteger(id) && id > 0 ? id : null;
};

const COLUMNS = {
    id: A.id, paperId: A.paperId, parentId: A.parentId, userId: AUTHOR, groupId: A.groupId,
    content: A.content, pageNumber: A.pageNumber, clientId: A.clientId,
    createdAt: A.createdAt, updatedAt: A.updatedAt, deletedAt: A.deletedAt,
    authorName: U.name, authorEmail: U.email,
};

const authorName = (row) => row.authorName?.trim() || String(row.authorEmail || '').split('@')[0] || 'Someone';

/** A comment as the app sees it; a deleted one keeps its place but not its text. */
function present(row, user) {
    const deleted = Boolean(row.deletedAt);
    return {
        id: row.id,
        paperId: row.paperId,
        parentId: row.parentId ?? null,
        author: { name: authorName(row) },
        content: deleted ? null : row.content,
        pageNumber: deleted ? null : row.pageNumber ?? null,
        clientId: row.clientId ?? null,
        createdAt: row.createdAt,
        edited: !deleted && row.updatedAt > row.createdAt,
        deleted,
        mine: isAuthor(user, row),
        canEdit: !deleted && isAuthor(user, row),
        canDelete: !deleted && (isAuthor(user, row) || maySupervise(user, row)),
    };
}

const loadComment = (db, id) => db.select(COLUMNS).from(A).innerJoin(U, eq(U.id, AUTHOR))
    .where(and(eq(A.id, id), eq(A.type, COMMENT))).get();

function cleanContent(value) {
    const text = typeof value === 'string' ? value.replace(/\r\n?/g, '\n').trim() : '';
    if (!text) return { error: 'Write something first' };
    if (text.length > MAX_CONTENT) return { error: `Comments can be up to ${MAX_CONTENT} characters` };
    return { text };
}

function cleanPage(value) {
    if (value === undefined || value === null || value === '') return null;
    const page = Number(value);
    return Number.isInteger(page) && page > 0 && page <= 100000 ? page : undefined;
}

// Room messages must not delay or fail the response
function announce(c, row) {
    const library = libraryOf(row);
    if (!isGroupLibrary(library)) return;
    const job = announceChange(c.env, library.groupId, { paperId: row.paperId });
    try {
        c.executionCtx.waitUntil(job);
    } catch {
        return job; // no execution context (tests)
    }
}

/** The paper in the URL, if the caller may perform `action` on it. */
const paperFor = (c, action) => {
    const paperId = idParam(c, 'paperId');
    if (!paperId) return null;
    return findAccessible(getDb(c).query.papers, schema.papers, c.get('user'), paperId, action,
        { id: true, userId: true, groupId: true });
};

/** Comment counts per paper in the open library, for the dashboard badges. */
comments.get('/summary', async (c) => {
    const user = c.get('user');
    const library = parseLibrary(user, c.req.header('x-library'));
    if (!library) return fail(c, 404, 'Library not found');

    const others = sql`CASE WHEN NOT (${authoredBy(A, user)}) THEN ${A.createdAt} END`;
    const rows = await getDb(c).select({ paperId: A.paperId, count: count(), lastAt: max(A.createdAt), lastOtherAt: max(others) })
        .from(A)
        .where(and(accessible(A, user, READ, library), eq(A.type, COMMENT)))
        .groupBy(A.paperId);
    return c.json({ success: true, data: { papers: rows } });
});

comments.get('/papers/:paperId', async (c) => {
    const user = c.get('user');
    const paper = await paperFor(c, READ);
    if (!paper) return fail(c, 404, 'Paper not found');

    const rows = await getDb(c).select(COLUMNS).from(A).innerJoin(U, eq(U.id, AUTHOR))
        .where(and(eq(A.paperId, paper.id), eq(A.type, COMMENT)))
        .orderBy(asc(A.createdAt), asc(A.id))
        .limit(MAX_PER_PAPER);

    // A deleted comment stays only as the head of replies that are still there
    const liveParents = new Set(rows.filter((r) => r.parentId && !r.deletedAt).map((r) => r.parentId));
    const shown = rows.filter((r) => !r.deletedAt || (!r.parentId && liveParents.has(r.id))).slice(-MAX_LISTED);
    return c.json({ success: true, data: { comments: shown.map((r) => present(r, user)) } });
});

comments.post('/papers/:paperId', async (c) => {
    const db = getDb(c);
    const user = c.get('user');
    const paper = await paperFor(c, WRITE);
    if (!paper) return fail(c, 404, 'Paper not found');

    const body = await c.req.json().catch(() => ({}));
    const { text, error } = cleanContent(body.content);
    if (error) return fail(c, 400, error);
    const pageNumber = cleanPage(body.pageNumber);
    if (pageNumber === undefined) return fail(c, 400, 'The page must be a whole number');
    const clientId = typeof body.clientId === 'string' && body.clientId.length <= 64 ? body.clientId : null;

    // A retried post returns what the first one created
    if (clientId) {
        const earlier = await db.select({ id: A.id }).from(A)
            .where(and(authoredBy(A, user), eq(A.clientId, clientId))).get();
        if (earlier) return c.json({ success: true, data: { comment: present(await loadComment(db, earlier.id), user) } });
    }

    let parentId = null;
    if (body.parentId !== undefined && body.parentId !== null) {
        const parent = await db.select({ id: A.id, parentId: A.parentId }).from(A)
            .where(and(eq(A.id, Number(body.parentId)), eq(A.paperId, paper.id), eq(A.type, COMMENT), isNull(A.deletedAt))).get();
        if (!parent) return fail(c, 404, 'That comment is no longer there');
        if (parent.parentId) return fail(c, 400, 'Reply to the comment that started the thread');
        parentId = parent.id;
    }

    const [{ total }] = await db.select({ total: count() }).from(A)
        .where(and(eq(A.paperId, paper.id), eq(A.type, COMMENT), isNull(A.deletedAt)));
    if (total >= MAX_PER_PAPER) return fail(c, 409, `A paper can have up to ${MAX_PER_PAPER} comments`);

    const now = new Date().toISOString();
    const [{ id }] = await db.insert(A).values({
        ...libraryFields(libraryOf(paper), user),
        paperId: paper.id,
        parentId,
        type: COMMENT,
        content: text,
        pageNumber,
        clientId,
        createdAt: now,
        updatedAt: now,
    }).returning({ id: A.id });

    const row = await loadComment(db, id);
    await announce(c, row);
    return c.json({ success: true, data: { comment: present(row, user) } }, 201);
});

/** The comment in the URL, if the caller may see it at all. */
async function commentFor(c) {
    const id = idParam(c, 'id');
    const row = id && await loadComment(getDb(c), id);
    if (!row || !allows(c.get('user'), READ, row)) return null;
    // Comments on a deleted paper go with it
    const paper = await findAccessible(getDb(c).query.papers, schema.papers, c.get('user'), row.paperId, READ, { id: true });
    return paper ? row : null;
}

comments.patch('/:id', async (c) => {
    const db = getDb(c);
    const user = c.get('user');
    const row = await commentFor(c);
    if (!row) return fail(c, 404, 'Comment not found');
    const body = await c.req.json().catch(() => ({}));

    if (body.restore === true) {
        const mayRestore = allows(user, WRITE, row) && (isAuthor(user, row) || maySupervise(user, row));
        if (!row.deletedAt || !mayRestore) return fail(c, 404, 'Comment not found');
        if (Date.now() - Date.parse(row.deletedAt) > RESTORE_WINDOW_MS) return fail(c, 409, 'This comment can no longer be restored');
        await db.update(A).set({ deletedAt: null }).where(eq(A.id, row.id));
    } else {
        if (row.deletedAt || !allows(user, WRITE, row) || !isAuthor(user, row)) {
            return fail(c, 403, 'Only the author can edit a comment');
        }
        const { text, error } = cleanContent(body.content);
        if (error) return fail(c, 400, error);
        const pageNumber = body.pageNumber === undefined ? row.pageNumber : cleanPage(body.pageNumber);
        if (pageNumber === undefined) return fail(c, 400, 'The page must be a whole number');
        await db.update(A).set({ content: text, pageNumber, updatedAt: new Date().toISOString() }).where(eq(A.id, row.id));
    }

    const updated = await loadComment(db, row.id);
    await announce(c, updated);
    return c.json({ success: true, data: { comment: present(updated, user) } });
});

comments.delete('/:id', async (c) => {
    const user = c.get('user');
    const row = await commentFor(c);
    if (!row || row.deletedAt) return fail(c, 404, 'Comment not found');
    if (!allows(user, WRITE, row) || !(isAuthor(user, row) || maySupervise(user, row))) {
        return fail(c, 403, 'You can delete only your own comments');
    }
    await getDb(c).update(A).set({ deletedAt: new Date().toISOString() }).where(eq(A.id, row.id));
    await announce(c, row);
    return c.json({ success: true });
});

export default comments;
