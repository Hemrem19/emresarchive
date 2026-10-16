/**
 * Paper comments API: one discussion thread per paper in a group library
 * (backend/src/routes/comments.js).
 */

import { API_CONFIG } from '../config.js';
import { parseJsonResponse } from './utils.js';
import { apiRequest } from './sync.js';

const comments = () => `${API_CONFIG.BASE_URL}/api/comments`;

async function call(url, method = 'GET', body) {
    const response = await apiRequest(url, {
        method,
        credentials: 'include',
        ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
    const result = await parseJsonResponse(response);
    if (!result.success) {
        const error = new Error(result.error?.message || 'Request failed');
        error.status = response.status;
        throw error;
    }
    return result.data;
}

/** The thread of a paper, oldest first. */
export const listComments = (paperId) => call(`${comments()}/papers/${paperId}`).then((d) => d.comments);

/** Posts { content, pageNumber?, parentId?, clientId }; a retry with the same clientId returns the same comment. */
export const addComment = (paperId, comment) =>
    call(`${comments()}/papers/${paperId}`, 'POST', comment).then((d) => d.comment);

export const editComment = (id, fields) => call(`${comments()}/${id}`, 'PATCH', fields).then((d) => d.comment);

export const deleteComment = (id) => call(`${comments()}/${id}`, 'DELETE');

/** Brings back a comment deleted in the last few minutes. */
export const restoreComment = (id) => call(`${comments()}/${id}`, 'PATCH', { restore: true }).then((d) => d.comment);

/** [{ paperId, count, lastAt, lastOtherAt }] for the open library. */
export const commentSummary = () => call(`${comments()}/summary`).then((d) => d.papers);
