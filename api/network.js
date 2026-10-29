import { parseJsonResponse, withRateLimitCheck } from './utils.js';
import { API_CONFIG } from '../config.js';

/**
 * Network requests act on the library the app has open: apiRequest sends it
 * (X-Library), along with the token, refreshing it when it has expired.
 */
async function request(path, options, failure) {
    return withRateLimitCheck(async () => {
        // Loaded on use, like the other api/ modules that import sync.js
        const { apiRequest } = await import('./sync.js');
        const response = await apiRequest(`${API_CONFIG.BASE_URL}${path}`, { credentials: 'include', ...options });
        const data = await parseJsonResponse(response);
        if (!data.success) throw new Error(data.error?.message || failure);
        return data.data;
    });
}

/**
 * Build (or rebuild) the network of the open library
 * @returns {Promise<{ graph: Object, stats: Object }>} stats: nodeCount,
 *   edgeCount, citationEdges, withoutDoi, notFound, pendingLookups, suggestions
 */
export function generateNetwork() {
    return request('/api/networks/auto-generate', { method: 'POST' }, 'Failed to generate network');
}

/**
 * A network: { graph: { …, stale }, nodes, edges, suggestions }
 * @param {string} id - The network ID
 */
export function getNetwork(id) {
    return request(`/api/networks/${id}`, {}, 'Failed to fetch network');
}

/**
 * The networks of the open library, newest first
 * @returns {Promise<Array>} List of networks
 */
export function getUserNetworks() {
    return request('/api/networks', {}, 'Failed to fetch networks');
}

/**
 * Why a paper is connected to others in its library's network:
 * [{ paper: { id, title, year }, reasons: [{ type: 'cites' | 'cited_by' | 'same_author', names? }] }]
 */
export async function getPaperConnections(paperId) {
    const { apiRequest } = await import('./sync.js');
    const response = await apiRequest(`${API_CONFIG.BASE_URL}/api/networks/papers/${paperId}/connections`, { credentials: 'include' });
    const data = await parseJsonResponse(response);
    if (!data.success) throw new Error(data.error?.message || 'Failed to load connections');
    return data.data.connections;
}
