/**
 * Notifications API: the signed-in person's mentions and replies
 * (backend/src/routes/notifications.js).
 */

import { API_CONFIG } from '../config.js';
import { parseJsonResponse } from './utils.js';
import { apiRequest } from './sync.js';

const NOTIFICATIONS = () => `${API_CONFIG.BASE_URL}/api/notifications`;

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

/** { items, unread }, newest first. */
export const listNotifications = () => call(NOTIFICATIONS());

/** Marks these ids read, or all without ids. */
export const markNotificationsRead = (ids) => call(`${NOTIFICATIONS()}/read`, 'POST', ids ? { ids } : {});
