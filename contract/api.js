/**
 * The contract between the app and the Worker: every request the app makes,
 * and every route the Worker serves. Checked by tests on both sides
 * (tests/api-contract.test.js, backend/tests/contract.test.js), so they fail
 * when the two drift apart. Update this file in the same commit as any change
 * to an API call or a route (see "API contract" in CLAUDE.md).
 *
 * Paths are written exactly as the Worker registers them (Hono syntax):
 * `:name` is one path segment, `:name{a|b}` a segment matching that pattern.
 *
 * access: who may call the route
 *   public      no login (sign-in, register, health…)
 *   user        a login token (Authorization: Bearer)
 *   file-token  a short-lived link token for one paper's PDF (?t=…)
 *   socket      the sync WebSocket; authenticated by its token query
 *
 * This file is not deployed (build.js copies an explicit list) and must not
 * hold secrets: only methods, paths and sample arguments.
 */

/**
 * client: "file#function" that makes the request; one function may make
 *   several (several entries), and raw URLs outside api/ name only the file.
 * call: sample arguments the frontend test calls the function with.
 * returnsUrl: the function builds the URL for a link instead of fetching it.
 */
export const ENDPOINTS = [
    // auth
    { method: 'POST', path: '/api/auth/register', access: 'public', client: 'api/auth.js#register', call: [{ email: 'a@example.test', password: 'long-enough-1', name: 'A' }] },
    { method: 'POST', path: '/api/auth/login', access: 'public', client: 'api/auth.js#login', call: [{ email: 'a@example.test', password: 'long-enough-1' }] },
    { method: 'POST', path: '/api/auth/refresh', access: 'public', client: 'api/auth.js#refreshToken', call: [] },
    { method: 'POST', path: '/api/auth/logout', access: 'public', client: 'api/auth.js#logout', call: [] },
    { method: 'GET', path: '/api/auth/me', access: 'user', client: 'api/auth.js#getCurrentUser', call: [] },
    { method: 'POST', path: '/api/auth/verify-email', access: 'public', client: 'api/auth.js#verifyEmail', call: ['verification-token'] },
    { method: 'POST', path: '/api/auth/resend-verification', access: 'user', client: 'api/auth.js#resendVerificationEmail', call: [] },

    // user
    { method: 'GET', path: '/api/user/stats', access: 'user', client: 'api/user.js#getStorageUsage', call: [] },
    { method: 'GET', path: '/api/user/sessions', access: 'user', client: 'api/user.js#listSessions', call: [] },
    { method: 'DELETE', path: '/api/user/sessions', access: 'user', client: 'api/user.js#endOtherSessions', call: [] },
    { method: 'DELETE', path: '/api/user/sessions/:id', access: 'user', client: 'api/user.js#endSession', call: [7] },
    { method: 'DELETE', path: '/api/user/data', access: 'user', client: 'api/user.js#clearAllUserData', call: [] },
    { method: 'PUT', path: '/api/user/settings', access: 'user', client: 'api/user.js#saveSettings', call: [{ itemsPerPage: 50 }] },

    // folders
    { method: 'GET', path: '/api/folders', access: 'user', client: 'api/folders.js#getAllFolders', call: [] },
    { method: 'GET', path: '/api/folders/:id', access: 'user', client: 'api/folders.js#getFolder', call: [7] },
    { method: 'POST', path: '/api/folders', access: 'user', client: 'api/folders.js#createFolder', call: [{ name: 'F' }] },
    { method: 'PUT', path: '/api/folders/:id', access: 'user', client: 'api/folders.js#updateFolder', call: [7, { name: 'F' }] },
    { method: 'DELETE', path: '/api/folders/:id', access: 'user', client: 'api/folders.js#deleteFolder', call: [7] },
    { method: 'GET', path: '/api/folders/:id/papers', access: 'user', client: 'api/paperFolders.js#getPapersInFolder', call: [7] },
    { method: 'POST', path: '/api/folders/:id/papers', access: 'user', client: 'api/paperFolders.js#addPaperToFolder', call: [7, 8] },
    { method: 'DELETE', path: '/api/folders/:id/papers/:paperId', access: 'user', client: 'api/paperFolders.js#removePaperFromFolder', call: [7, 8] },

    // papers
    { method: 'POST', path: '/api/papers/copy', access: 'user', client: 'api/groups.js#copyPapers', call: [[7], 'personal'] },
    { method: 'POST', path: '/api/papers/batch', access: 'user', client: 'api/papers.js#batchOperations', call: [[]] },
    { method: 'GET', path: '/api/papers', access: 'user', client: 'api/papers.js#getAllPapers', call: [] },
    { method: 'GET', path: '/api/papers/search', access: 'user', client: 'api/papers.js#searchPapers', call: ['q'] },
    { method: 'GET', path: '/api/papers/:id', access: 'user', client: 'api/papers.js#getPaper', call: [7] },
    { method: 'POST', path: '/api/papers', access: 'user', client: 'api/papers.js#createPaper', call: [{ title: 'T' }] },
    { method: 'PUT', path: '/api/papers/:id', access: 'user', client: 'api/papers.js#updatePaper', call: [7, { title: 'T' }] },
    { method: 'DELETE', path: '/api/papers/:id', access: 'user', client: 'api/papers.js#deletePaper', call: [7] },
    { method: 'POST', path: '/api/papers/upload', access: 'user', client: 'api/papers.js#uploadPdfViaBackend', call: [new Blob(['%PDF'], { type: 'application/pdf' }), 7] },
    { method: 'GET', path: '/api/papers/:id/pdf', access: 'user', client: 'api/papers.js#getPdfDownloadUrl', call: [7] },
    { method: 'GET', path: '/api/papers/:id/pdf', access: 'user', client: 'api/papers.js#getPdfViewUrl', call: [7] },
    { method: 'GET', path: '/api/papers/:id/pdf-proxy', access: 'user', client: 'api/papers.js#getPdfViewUrl', call: [7], returnsUrl: true },

    // networks
    { method: 'POST', path: '/api/networks/auto-generate', access: 'user', client: 'api/network.js#generateNetwork', call: [] },
    { method: 'GET', path: '/api/networks', access: 'user', client: 'api/network.js#getUserNetworks', call: [] },
    { method: 'GET', path: '/api/networks/papers/:paperId/connections', access: 'user', client: 'api/network.js#getPaperConnections', call: [7] },
    { method: 'GET', path: '/api/networks/:id', access: 'user', client: 'api/network.js#getNetwork', call: [7] },

    // import, files
    { method: 'POST', path: '/api/import/batch-import', access: 'user', client: 'api/import.js#batchImport', call: [{ papers: [] }] },
    { method: 'GET', path: '/api/files/pdf', access: 'file-token', client: 'api/papers.js#getPdfDownloadUrl', serverHandsOut: 'downloadUrl and viewUrl of GET /api/papers/:id/pdf' },

    // groups
    { method: 'GET', path: '/api/groups', access: 'user', client: 'api/groups.js#listGroups', call: [] },
    { method: 'POST', path: '/api/groups', access: 'user', client: 'api/groups.js#createGroup', call: ['G'] },
    { method: 'POST', path: '/api/groups/invites/:inviteId/:answer{accept|decline}', access: 'user', client: 'api/groups.js#acceptInvite', call: [7] },
    { method: 'POST', path: '/api/groups/invites/:inviteId/:answer{accept|decline}', access: 'user', client: 'api/groups.js#declineInvite', call: [7] },
    { method: 'GET', path: '/api/groups/:id', access: 'user', client: 'api/groups.js#getGroup', call: [7] },
    { method: 'PATCH', path: '/api/groups/:id', access: 'user', client: 'api/groups.js#renameGroup', call: [7, 'G'] },
    { method: 'DELETE', path: '/api/groups/:id', access: 'user', client: 'api/groups.js#deleteGroup', call: [7] },
    { method: 'GET', path: '/api/groups/:id/members', access: 'user', client: 'api/groups.js#listMembers', call: [7] },
    { method: 'PATCH', path: '/api/groups/:id/members/:userId', access: 'user', client: 'api/groups.js#setMemberRole', call: [7, 8, 'admin'] },
    { method: 'POST', path: '/api/groups/:id/owner', access: 'user', client: 'api/groups.js#transferOwnership', call: [7, 8] },
    { method: 'DELETE', path: '/api/groups/:id/members/:userId', access: 'user', client: 'api/groups.js#removeMember', call: [7, 8] },
    { method: 'GET', path: '/api/groups/:id/invites', access: 'user', client: 'api/groups.js#listInvites', call: [7] },
    { method: 'POST', path: '/api/groups/:id/invites', access: 'user', client: 'api/groups.js#inviteMember', call: [7, 'b@example.test'] },
    { method: 'DELETE', path: '/api/groups/:id/invites/:inviteId', access: 'user', client: 'api/groups.js#cancelInvite', call: [7, 8] },

    // comments, notifications
    { method: 'GET', path: '/api/comments/summary', access: 'user', client: 'api/comments.js#commentSummary', call: [] },
    { method: 'GET', path: '/api/comments/papers/:paperId', access: 'user', client: 'api/comments.js#listComments', call: [7] },
    { method: 'POST', path: '/api/comments/papers/:paperId', access: 'user', client: 'api/comments.js#addComment', call: [7, { content: 'c' }] },
    { method: 'PATCH', path: '/api/comments/:id', access: 'user', client: 'api/comments.js#editComment', call: [7, { content: 'c' }] },
    { method: 'DELETE', path: '/api/comments/:id', access: 'user', client: 'api/comments.js#deleteComment', call: [7] },
    { method: 'GET', path: '/api/notifications', access: 'user', client: 'api/notifications.js#listNotifications', call: [] },
    { method: 'POST', path: '/api/notifications/read', access: 'user', client: 'api/notifications.js#markNotificationsRead', call: [] },

    // live sync: a WebSocket opened by the sync manager, not an api/ function
    { method: 'GET', path: '/api/sync/workspace/:id', access: 'socket', client: 'core/syncManager.js' },
];

/** Routes the app does not call, and why they exist. */
export const SERVER_ONLY = [
    { method: 'GET', path: '/health', access: 'public', why: 'uptime check' },
];

/** Exported api/*.js functions that make no request to the Worker. */
export const NOT_REQUESTS = [
    'api/auth.js#getAccessToken', 'api/auth.js#getUser', 'api/auth.js#setAuth', 'api/auth.js#clearAuth', 'api/auth.js#isAuthenticated',
    'api/sync.js#mapPaperToApi', 'api/sync.js#mapPaperFromApi', 'api/sync.js#mapCollectionToApi', 'api/sync.js#mapCollectionFromApi',
    'api/sync.js#mapAnnotationToApi', 'api/sync.js#mapAnnotationFromApi',
    'api/sync.js#apiRequest', // the authenticated fetch the others go through
    'api/utils.js#*', // rate-limit and response helpers
    'api/arxiv.js#fetchArxivMetadata', // talks to export.arxiv.org, not the Worker
];

/**
 * Known mismatches, tolerated until decided (each test run prints them).
 * Remove an item once it is fixed; never add one to make a new change pass.
 */
export const KNOWN_DRIFT = [];
