/**
 * Groups API Module
 * Private shared libraries: groups, members, invites, and copying papers
 * between libraries.
 */

import { API_CONFIG } from '../config.js';
import { parseJsonResponse } from './utils.js';
import { apiRequest } from './sync.js';

const GROUPS = `${API_CONFIG.BASE_URL}/api/groups`;
const PAPERS = `${API_CONFIG.BASE_URL}/api/papers`;

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

/** My groups (with my role) and invites waiting for me. */
export const listGroups = () => call(GROUPS);

export const createGroup = (name) => call(GROUPS, 'POST', { name }).then((d) => d.group);

/** One group with my role and its storage { usedBytes, limitBytes }. */
export const getGroup = (id) => call(`${GROUPS}/${id}`).then((d) => d.group);

export const renameGroup = (id, name) => call(`${GROUPS}/${id}`, 'PATCH', { name });

export const deleteGroup = (id) => call(`${GROUPS}/${id}`, 'DELETE');

export const listMembers = (id) => call(`${GROUPS}/${id}/members`).then((d) => d.members);

export const setMemberRole = (id, userId, role) => call(`${GROUPS}/${id}/members/${userId}`, 'PATCH', { role });

/** Removes a member; with my own id, leaves the group. */
export const removeMember = (id, userId) => call(`${GROUPS}/${id}/members/${userId}`, 'DELETE');

export const listInvites = (id) => call(`${GROUPS}/${id}/invites`).then((d) => d.invites);

export const inviteMember = (id, email, role = 'member') =>
    call(`${GROUPS}/${id}/invites`, 'POST', { email, role }).then((d) => d.invite);

export const cancelInvite = (id, inviteId) => call(`${GROUPS}/${id}/invites/${inviteId}`, 'DELETE');

export const acceptInvite = (inviteId) => call(`${GROUPS}/invites/${inviteId}/accept`, 'POST');

export const declineInvite = (inviteId) => call(`${GROUPS}/invites/${inviteId}/decline`, 'POST');

/**
 * Copies papers into another library ("personal" or "group:12").
 * @returns {Promise<Array<{sourceId, id?, success, pdfCopied?, pdfSkipped?, error?}>>}
 */
export const copyPapers = (paperIds, to) => call(`${PAPERS}/copy`, 'POST', { paperIds, to }).then((d) => d.results);
