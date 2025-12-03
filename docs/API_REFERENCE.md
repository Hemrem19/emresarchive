# Public API & Component Reference

This guide catalogues every exported module in the project across the frontend, backend, and supporting utilities. For each module you will find:
- A quick description of what the export is responsible for
- Parameter and return-value details collected from the source
- Usage guidance and runnable examples that demonstrate typical integration patterns

## How to Use This Guide
- **Start with the category overview** to understand where a module fits in the architecture.
- **Scan the tables** to pick the function or component you want to call and confirm its contract.
- **Copy the usage examples** as a starting point and adapt them to your context.
- **Backend endpoint tables** document the HTTP surface area exposed to clients; pair them with the controller tables for deeper implementation details.

## Frontend API Clients (`api/`)

These modules provide authenticated wrappers around the backend REST API. They automatically attach bearer tokens, refresh expired sessions, and handle response parsing and rate-limit helpers.

**Quick Start**

```js
import { login } from './api/auth.js';
import { getAllPapers, createPaper } from './api/papers.js';

const { user } = await login({ email: 'reader@example.com', password: 'changeme123' });
const { papers } = await getAllPapers({ page: 1, limit: 10 });

const newPaper = await createPaper({
  title: 'Sample Paper',
  authors: ['Doe, Jane'],
  journal: 'Journal of Interesting Things',
  year: 2024,
  status: 'To Read'
});
```

### `api/annotations.js`

| Export | Description | Parameters | Returns |
| --- | --- | --- | --- |
| `getAnnotations` | Gets all annotations for a paper. | `paperId` (number|string) – The paper ID. | (Promise<Array>) Promise resolving to array of annotations. |
| `getAnnotation` | Gets a single annotation by ID. | `id` (number|string) – The annotation ID. | (Promise<Object>) Promise resolving to annotation object. |
| `createAnnotation` | Creates a new annotation for a paper. | `paperId` (number|string) – The paper ID.<br>`annotationData` (Object) – Annotation data { type, pageNumber, position, content, color }. | (Promise<Object>) Promise resolving to created annotation object. |
| `updateAnnotation` | Updates an existing annotation. | `id` (number|string) – The annotation ID.<br>`updateData` (Object) – Fields to update. | (Promise<Object>) Promise resolving to updated annotation object. |
| `deleteAnnotation` | Deletes an annotation (soft delete). | `id` (number|string) – The annotation ID. | (Promise<void>)  |

**Usage Example**

```js
import {
  getAnnotations,
  createAnnotation,
  updateAnnotation,
  deleteAnnotation
} from './api/annotations.js';

const annotations = await getAnnotations(paperId);

const highlight = await createAnnotation(paperId, {
  type: 'highlight',
  pageNumber: 2,
  position: { x: 140, y: 320, width: 210, height: 24 },
  content: 'Key claim about evaluation metrics',
  color: '#FFD54F'
});

await updateAnnotation(highlight.id, { color: '#FFA000' });
await deleteAnnotation(highlight.id);
```

### `api/auth.js`

| Export | Description | Parameters | Returns |
| --- | --- | --- | --- |
| `getAccessToken` | Gets the stored access token. | — | (string|null) The access token or null if not found. |
| `getUser` | Gets the stored user data. | — | (Object|null) The user data or null if not found. |
| `setAuth` | Stores authentication tokens and user data. | `accessToken` (string) – The JWT access token.<br>`user` (Object) – The user data.
 | — |
| `clearAuth` | Clears authentication tokens and user data. | — | — |
| `isAuthenticated` | Checks if user is authenticated. | — | (boolean) True if authenticated, false otherwise. |
| `register` | Registers a new user. | `data` (Object) – Registration data { email, password, name }. | (Promise<Object>) Promise resolving to { accessToken, user }. |
| `login` | Logs in a user. | `data` (Object) – Login data { email, password }. | (Promise<Object>) Promise resolving to { accessToken, user }. |
| `logout` | Logs out the current user. | — | (Promise<void>)  |
| `refreshToken` | Refreshes the access token using the refresh token cookie. | — | (Promise<string>) Promise resolving to new access token. |
| `verifyEmail` | Verifies email with a verification token. | `token` (string) – Verification token from email. | (Promise<Object>) Promise resolving to verification result. |
| `resendVerificationEmail` | Resends verification email (requires authentication). | — | (Promise<Object>) Promise resolving to send result. |
| `getCurrentUser` | Gets the current user's profile. | — | (Promise<Object>) Promise resolving to user data. |

**Usage Example**

```js
import {
  register,
  login,
  getCurrentUser,
  refreshToken,
  logout,
  resendVerificationEmail
} from './api/auth.js';

await register({ email: 'new.user@example.com', password: 'Supersafe123!', name: 'New User' });
const session = await login({ email: 'new.user@example.com', password: 'Supersafe123!' });

const profile = await getCurrentUser();

// Attempt to refresh proactively if you are about to call long-running APIs
const freshToken = await refreshToken();

// Remind the user to verify their email
await resendVerificationEmail();

await logout();
```

### `api/collections.js`

| Export | Description | Parameters | Returns |
| --- | --- | --- | --- |
| `getAllCollections` | Gets all collections. | — | (Promise<Array>) Promise resolving to array of collections. |
| `getCollection` | Gets a single collection by ID. | `id` (number|string) – The collection ID. | (Promise<Object>) Promise resolving to collection object. |
| `createCollection` | Creates a new collection. | `collectionData` (Object) – Collection data { name, icon, color, filters }. | (Promise<Object>) Promise resolving to created collection object. |
| `updateCollection` | Updates an existing collection. | `id` (number|string) – The collection ID.<br>`updateData` (Object) – Fields to update. | (Promise<Object>) Promise resolving to updated collection object. |
| `deleteCollection` | Deletes a collection (soft delete). | `id` (number|string) – The collection ID. | (Promise<void>)  |

**Usage Example**

```js
import {
  getAllCollections,
  createCollection,
  updateCollection,
  deleteCollection
} from './api/collections.js';

const collections = await getAllCollections();

const readingList = await createCollection({
  name: 'Reading List',
  icon: 'bookmark',
  color: '#1D4ED8',
  filters: { status: 'To Read', tags: ['ml'] }
});

await updateCollection(readingList.id, { color: '#2563EB' });
await deleteCollection(readingList.id);
```

### `api/papers.js`

| Export | Description | Parameters | Returns |
| --- | --- | --- | --- |
| `getAllPapers` | Gets all papers with optional filtering and pagination. | `options` (Object) – Query options.<br>`options.page` (number) – Page number (default: 1).<br>`options.limit` (number) – Items per page (default: 25).<br>`options.status` (string) – Filter by status.<br>`options.tag` (string) – Filter by tag.<br>`options.sortBy` (string) – Sort field (default: 'updatedAt').<br>`options.sortOrder` (string) – Sort order: 'asc' or 'desc' (default: 'desc'). | (Promise<Object>) Promise resolving to { papers, pagination }. |
| `getPaper` | Gets a single paper by ID. | `id` (number|string) – The paper ID. | (Promise<Object>) Promise resolving to paper object. |
| `createPaper` | Creates a new paper. | `paperData` (Object) – Paper data { title, authors, journal, year, doi, abstract, tags, status, notes, readingProgress, relatedPaperIds }. | (Promise<Object>) Promise resolving to created paper object. |
| `updatePaper` | Updates an existing paper. | `id` (number|string) – The paper ID.<br>`updateData` (Object) – Fields to update. | (Promise<Object>) Promise resolving to updated paper object. |
| `deletePaper` | Deletes a paper (soft delete). | `id` (number|string) – The paper ID. | (Promise<void>)  |
| `searchPapers` | Searches papers by title, authors, or notes. | `query` (string) – Search query.<br>`options` (Object) – Search options.<br>`options.page` (number) – Page number (default: 1).<br>`options.limit` (number) – Items per page (default: 25). | (Promise<Object>) Promise resolving to { papers, pagination }. |
| `getUploadUrl` | Gets a presigned URL for PDF upload. | `options` (Object) – Upload options.<br>`options.filename` (string) – PDF filename.<br>`options.size` (number) – File size in bytes.<br>`options.contentType` (string) – MIME type (default: 'application/pdf').<br>`options.paperId` (number|null) – Optional paper ID (for new papers, can be null). | (Promise<Object>) Promise resolving to { uploadUrl, s3Key, expiresIn }. |
| `uploadPdfViaBackend` | Uploads a PDF file to S3 via backend server (direct upload). This avoids presigned URL signature mismatch issues. | `file` (File|Blob) – PDF file to upload.<br>`paperId` (number|null) – Optional paper ID (for new papers, can be null). | (Promise<Object>) Promise resolving to { s3Key, pdfSizeBytes, filename }. |
| `uploadPdf` | Uploads a PDF file to S3 using presigned URL (supports both POST and PUT). | `uploadUrl` (string) – Presigned upload URL.<br>`file` (File|Blob) – PDF file to upload.<br>`fields` (Object|null) – Presigned POST fields (if using POST method). | (Promise<void>)  |
| `getPdfDownloadUrl` | Gets a presigned URL for PDF download or proxy URL. | `paperId` (number|string) – The paper ID. | (Promise<Object>) Promise resolving to { pdfUrl, downloadUrl, proxyUrl, expiresIn }. |
| `getPdfViewUrl` | Gets PDF URL for viewing (prefers proxy to avoid CORS). | `paperId` (number|string) – The paper ID. | (Promise<string>) Promise resolving to PDF URL (proxy URL preferred). |

**Usage Example**

```js
import {
  getAllPapers,
  searchPapers,
  createPaper,
  updatePaper,
  deletePaper,
  uploadPdfViaBackend,
  getPdfViewUrl
} from './api/papers.js';

const { papers, pagination } = await getAllPapers({ status: 'Reading', page: 1, limit: 20 });
const { papers: searchResults } = await searchPapers('transformer', { page: 1, limit: 5 });

const paper = await createPaper({
  title: 'Attention Is All You Need (Revisited)',
  authors: ['Vaswani, Ashish', 'Shazeer, Noam'],
  journal: 'NIPS',
  year: 2024,
  tags: ['nlp', 'transformers'],
  status: 'To Read'
});

await updatePaper(paper.id, { status: 'Reading', notes: 'Review Section 3' });

const fileInput = document.querySelector('#pdf-upload');
if (fileInput?.files?.length) {
  await uploadPdfViaBackend(fileInput.files[0], paper.id);
}

const pdfUrl = await getPdfViewUrl(paper.id);
await deletePaper(paper.id);
```

### `api/sync.js`

| Export | Description | Parameters | Returns |
| --- | --- | --- | --- |
| `getClientId` | Gets or generates a unique client ID for this browser/device. | — | (string) The client ID. |
| `getLastSyncedAt` | Gets the last sync timestamp. | — | (string|null) The last sync timestamp or null if never synced. |
| `setLastSyncedAt` | Sets the last sync timestamp. | `timestamp` (string) – ISO timestamp string.
 | — |
| `apiRequest` | Helper function to make authenticated API requests with automatic token refresh. | `url` (string) – The API endpoint URL.<br>`options` (Object) – Fetch options. | (Promise<Response>) The fetch response. |
| `fullSync` | Performs a full sync - gets all data from the server. | — | (Promise<Object>) Promise resolving to { papers, collections, annotations, syncedAt }. |
| `incrementalSync` | Performs an incremental sync - sends local changes and receives server changes. | `localChanges` (Object) – Local changes to send { papers: {created, updated, deleted}, collections: {...}, annotations: {...} }. | (Promise<Object>) Promise resolving to sync result with appliedChanges and serverChanges. |
| `getSyncStatus` | Gets sync status from the server. | — | (Promise<Object>) Promise resolving to { lastSyncedAt, counts, lastSyncAction }. |

**Usage Example**

```js
import {
  getClientId,
  getLastSyncedAt,
  setLastSyncedAt,
  fullSync,
  incrementalSync,
  getSyncStatus
} from './api/sync.js';

const clientId = getClientId();

if (!getLastSyncedAt()) {
  const snapshot = await fullSync();
  // hydrate local stores...
  setLastSyncedAt(snapshot.syncedAt);
} else {
  const pendingChanges = aggregatePendingChanges(); // your local queue
  const result = await incrementalSync(pendingChanges);
  setLastSyncedAt(result.syncedAt);
}

const syncStatus = await getSyncStatus();
console.info('Synced records', syncStatus.counts);
```

### `api/user.js`

| Export | Description | Parameters | Returns |
| --- | --- | --- | --- |
| `clearAllUserData` | Clear all user data (papers, collections, annotations) | — | (Promise<Object>) Response with deletion counts |

**Usage Example**

```js
import { clearAllUserData } from './api/user.js';
import { showToast } from './ui.js';

try {
  const { papersDeleted, collectionsDeleted, annotationsDeleted } = await clearAllUserData();
  showToast(`Cleared ${papersDeleted} papers, ${collectionsDeleted} collections, and ${annotationsDeleted} annotations.`, 'success', { duration: 4000 });
} catch (error) {
  showToast(error.message ?? 'Unable to clear account data', 'error');
}
```

### `api/utils.js`

| Export | Description | Parameters | Returns |
| --- | --- | --- | --- |
| `isRateLimited` | Checks if we are currently rate limited. | — | (boolean) True if rate limited. |
| `setRateLimit` | Sets rate limit state. | `retryAfterSeconds` (number) – Optional retry-after duration in seconds.
 | — |
| `clearRateLimit` | Clears rate limit state. | — | — |
| `getRateLimitRemainingTime` | Gets remaining rate limit time in milliseconds. | — | (number) Milliseconds until rate limit expires, or 0 if not rate limited. |
| `parseJsonResponse` | Safely parse JSON response, handling non-JSON error responses. Includes special handling for rate limiting (429). | `response` (Response) – Fetch response object | (Promise<Object>) Parsed JSON data |
| `withRateLimitCheck` | Wraps an API call with rate limit checking. | `apiFunc` (Function) – Async function that makes the API call | (Promise<any>) Result of the API call |
| `createApiError` | Creates a standardized error object. | `message` (string) – Error message<br>`status` (number) – HTTP status code<br>`details` (Object) – Additional error details | (Error) Error object with additional properties |

**Usage Example**

```js
import {
  isRateLimited,
  getRateLimitRemainingTime,
  setRateLimit,
  clearRateLimit,
  withRateLimitCheck
} from './api/utils.js';
import { searchPapers } from './api/papers.js';

if (isRateLimited()) {
  console.warn('Retry after', getRateLimitRemainingTime() / 1000, 'seconds');
}

const safeSearch = withRateLimitCheck(() => searchPapers('graph neural network'));
const result = await safeSearch();

// Manually override rate limit state if server instructs you via headers
setRateLimit(60); // 1 minute cooldown
clearRateLimit();
```

## Frontend Core Services (`core/`)

Core modules coordinate global UI state, routing, filtering, and background synchronisation. They are designed to be composed together at application startup.

**Initialization Pattern**

```js
import { createAppState } from './core/state.js';
import { createRouter, initializeRouter } from './core/router.js';
import { applyFiltersAndRender } from './core/filters.js';
import { createKeyboardShortcuts } from './core/keyboardShortcuts.js';
import { createCommandPalette } from './core/commandPalette.js';
import { initializeAutoSync } from './core/syncManager.js';

const appState = createAppState();
const commandPalette = createCommandPalette(appState);

const router = createRouter(
  document.getElementById('app'),
  appState,
  () => applyFiltersAndRender(appState)
);

initializeRouter(router);
createKeyboardShortcuts(commandPalette, appState);
initializeAutoSync();
```

### `core/commandPalette.js`

| Export | Description | Parameters | Returns |
| --- | --- | --- | --- |
| `createCommandPalette` | Creates and manages the command palette for quick navigation | `appState` (Object) – Application state object | (Object) Command palette instance with methods |

**Usage Example**

```js
import { createCommandPalette } from './core/commandPalette.js';
import { applyFiltersAndRender } from './core/filters.js';

const commandPalette = createCommandPalette(appState);

commandPalette.registerCommand({
  id: 'focus-search',
  title: 'Focus Search Input',
  shortcut: '⌘+K',
  handler: () => document.querySelector('#search-input')?.focus()
});

commandPalette.registerCommand({
  id: 'reload-dashboard',
  title: 'Reload Dashboard',
  handler: () => applyFiltersAndRender(appState)
});

commandPalette.open(); // show palette programmatically
```

### `core/filters.js`

| Export | Description | Parameters | Returns |
| --- | --- | --- | --- |
| `getFilteredPapers` | Filters papers based on active filters (status, tags, search) | `papers` (Array) – Array of paper objects<br>`appState` (Object) – Application state object | (Array) Filtered array of papers |
| `updateUrlHash` | Updates the URL hash based on active filters | `appState` (Object) – Application state object
 | — |
| `parseUrlHash` | Parses the URL hash and updates active filters in appState | `appState` (Object) – Application state object
 | — |
| `renderFilterChips` | Renders visual filter chips showing active filters | `appState` (Object) – Application state object<br>`applyFiltersAndRender` (Function) – Callback to re-apply filters
 | — |
| `calculatePagination` | Calculates pagination metadata (total pages, valid current page) | `totalItems` (number) – Total number of items after filtering<br>`appState` (Object) – Application state object
 | — |
| `getPaginatedPapers` | Gets papers for the current page | `papers` (Array) – Array of papers (after filtering and sorting)<br>`appState` (Object) – Application state object | (Array) Paginated subset of papers |
| `renderPaginationControls` | Renders pagination controls (page numbers, prev/next buttons) | `appState` (Object) – Application state object<br>`applyFiltersAndRender` (Function) – Callback to re-apply filters
 | — |
| `applyFiltersAndRender` | Main function to apply all filters, sort, paginate, and render results | `appState` (Object) – Application state object
 | — |

**Usage Example**

```js
import {
  getFilteredPapers,
  getPaginatedPapers,
  applyFiltersAndRender,
  renderPaginationControls,
  renderFilterChips
} from './core/filters.js';
import { renderPaperList } from './ui.js';

function renderDashboard(appState) {
  const filtered = getFilteredPapers(appState.papersCache, appState);
  const pageItems = getPaginatedPapers(filtered, appState);

  renderPaperList(pageItems, appState.currentSearchTerm, appState.selectedPaperIds);
  renderPaginationControls(appState, () => applyFiltersAndRender(appState));
  renderFilterChips(appState, () => applyFiltersAndRender(appState));
}

applyFiltersAndRender(appState, renderDashboard);
```

### `core/keyboardShortcuts.js`

| Export | Description | Parameters | Returns |
| --- | --- | --- | --- |
| `createKeyboardShortcuts` | Creates and manages global keyboard shortcuts | `commandPalette` (Object) – Command palette instance | (Object) Keyboard shortcuts instance with methods |

**Usage Example**

```js
import { createKeyboardShortcuts } from './core/keyboardShortcuts.js';

const shortcuts = createKeyboardShortcuts(commandPalette, appState);

shortcuts.registerShortcut('ctrl+shift+f', () => {
  appState.currentSearchTerm = '';
  document.querySelector('#search-input')?.focus();
});

// Temporarily disable shortcuts when modal is open
document.addEventListener('modal:open', () => shortcuts.disable());
document.addEventListener('modal:close', () => shortcuts.enable());
```

### `core/router.js`

| Export | Description | Parameters | Returns |
| --- | --- | --- | --- |
| `renderView` | Renders a view by setting innerHTML and executing a setup function | `app` (HTMLElement) – The main app container element<br>`viewContent` (string) – HTML content to render<br>`setupFn` (Function) – Optional setup/mount function to call after render
 | — |
| `handleBeforeUnload` | Handler for browser beforeunload event to warn about unsaved changes | `event` (Event) – The beforeunload event<br>`appState` (Object) – Application state object | (string|undefined) Warning message or undefined |
| `createRouter` | Main router function that handles URL hash changes and view rendering | `app` (HTMLElement) – The main app container element<br>`appState` (Object) – Application state object<br>`renderSidebarStatusLinks` (Function) – Function to re-render sidebar status links
 | — |
| `initializeRouter` | Initializes the router by setting up event listeners | `router` (Function) – The router function
 | — |

**Usage Example**

```js
import { createRouter, initializeRouter, handleBeforeUnload } from './core/router.js';
import { dashboardView } from './dashboard.view.js';
import { detailsView } from './details.view.js';

const appRoot = document.getElementById('app');
const router = createRouter(appRoot, appState, renderSidebarStatusLinks);

router.registerRoute('#/dashboard', () => dashboardView.render(appState));
router.registerRoute('#/papers/:id', params => detailsView.render(params.id, appState));

initializeRouter(router);
window.addEventListener('beforeunload', event => handleBeforeUnload(event, appState));
```

### `core/state.js`

| Export | Description | Parameters | Returns |
| --- | --- | --- | --- |
| `createAppState` | Creates and initializes the application state object. State includes papers cache, filters, pagination, search, and user preferences. | — | (Object) The initialized application state |
| `persistStateToStorage` | Persists specific state values to localStorage | `key` (string) – The localStorage key<br>`value` (*) – The value to store
 | — |
| `clearStorageKey` | Clears specific state values from localStorage | `key` (string) – The localStorage key to clear
 | — |

**Usage Example**

```js
import { createAppState, persistStateToStorage, clearStorageKey } from './core/state.js';

const appState = createAppState();

appState.currentSearchTerm = 'federated learning';
persistStateToStorage('userPreferences', {
  searchTerm: appState.currentSearchTerm,
  selectedStatus: appState.activeFilters.status
});

// Later, when user resets preferences
clearStorageKey('userPreferences');
```

### `core/syncManager.js`

| Export | Description | Parameters | Returns |
| --- | --- | --- | --- |
| `triggerDebouncedSync` | Debounced sync trigger - syncs after a delay when triggered. Useful for syncing after CRUD operations without overwhelming the server. | — | — |
| `initializeAutoSync` | Initializes automatic sync on app load. Performs initial sync after a short delay to allow app to initialize. | — | — |
| `stopAutoSync` | Stops all automatic sync operations. Useful when user disables cloud sync or logs out. | — | — |
| `restartAutoSync` | Restarts automatic sync (e.g., when user enables cloud sync). | — | — |
| `performManualSync` | Performs immediate sync (manual trigger). Shows notification with sync results. | — | — |

**Usage Example**

```js
import {
  triggerDebouncedSync,
  initializeAutoSync,
  stopAutoSync,
  restartAutoSync,
  performManualSync
} from './core/syncManager.js';

initializeAutoSync();

async function onPaperSaved() {
  // persist to local store...
  triggerDebouncedSync();
}

document.getElementById('sync-now-btn')?.addEventListener('click', async () => {
  await performManualSync();
});

document.getElementById('cloud-sync-toggle')?.addEventListener('change', event => {
  if (event.target.checked) {
    restartAutoSync();
  } else {
    stopAutoSync();
  }
});
```

## Frontend Dashboard Handlers

Event-handler factories wire DOM interactions on the dashboard to application state transitions. Register handlers when the dashboard view mounts and clean them up when it unmounts to avoid duplicate listeners.

**Mount/Unmount Pattern**

```js
import { registerBatchOperationHandlers, unregisterBatchOperationHandlers } from './dashboard/handlers/batch-operations.js';

let batchHandlers;

export function mountDashboard(appState) {
  batchHandlers = registerBatchOperationHandlers(appState, () => applyFiltersAndRender(appState), updateBatchToolbar);
}

export function unmountDashboard() {
  unregisterBatchOperationHandlers(batchHandlers);
}
```

### `dashboard/handlers/batch-operations.js`

| Export | Description | Parameters | Returns |
| --- | --- | --- | --- |
| `createBatchStatusChangeHandler` | Creates batch status change handler | `appState` (Object) – Application state<br>`applyFiltersAndRender` (Function) – Function to re-render the dashboard | (Function) Event handler for batch status change |
| `createBatchAddTagsHandler` | Creates batch add tags handler | `appState` (Object) – Application state<br>`applyFiltersAndRender` (Function) – Function to re-render the dashboard | (Function) Event handler for batch add tags |
| `createBatchRemoveTagsHandler` | Creates batch remove tags handler | `appState` (Object) – Application state<br>`applyFiltersAndRender` (Function) – Function to re-render the dashboard | (Function) Event handler for batch remove tags |
| `createBatchDeleteHandler` | Creates batch delete handler | `appState` (Object) – Application state<br>`applyFiltersAndRender` (Function) – Function to re-render the dashboard<br>`updateBatchToolbar` (Function) – Function to update batch toolbar UI | (Function) Event handler for batch delete |
| `createBatchExportBibliographyHandler` | Creates batch export bibliography handler | `appState` (Object) – Application state | (Function) Event handler for batch export bibliography |
| `registerBatchOperationHandlers` | Registers all batch operation event listeners | `appState` (Object) – Application state<br>`applyFiltersAndRender` (Function) – Function to re-render the dashboard<br>`updateBatchToolbar` (Function) – Function to update batch toolbar UI | (Object) Object containing all handler functions for cleanup |
| `unregisterBatchOperationHandlers` | Unregisters all batch operation event listeners | `handlers` (Object) – Object containing all handler functions
 | — |

**Usage Example**

```js
import {
  registerBatchOperationHandlers,
  unregisterBatchOperationHandlers
} from './dashboard/handlers/batch-operations.js';
import { updateBatchToolbar } from './dashboard/ui/batch-toolbar.js';
import { applyFiltersAndRender } from './core/filters.js';

let batchHandlers;

export function mountBatchRegion(appState) {
  batchHandlers = registerBatchOperationHandlers(appState, () => applyFiltersAndRender(appState), updateBatchToolbar);
}

export function unmountBatchRegion() {
  unregisterBatchOperationHandlers(batchHandlers);
}
```

### `dashboard/handlers/collections.js`

| Export | Description | Parameters | Returns |
| --- | --- | --- | --- |
| `handleSaveCollection` | Handles saving current filters as a new collection | `appState` (Object) – Application state<br>`applyFiltersAndRender` (Function) – Function to re-render the dashboard
 | — |
| `handleApplyCollection` | Handles applying a saved collection (restore its filters) | `collectionId` (number) – ID of the collection to apply<br>`appState` (Object) – Application state<br>`applyFiltersAndRender` (Function) – Function to re-render the dashboard
 | — |
| `handleEditCollection` | Handles editing or deleting a collection | `collectionId` (number) – ID of the collection to edit<br>`appState` (Object) – Application state<br>`applyFiltersAndRender` (Function) – Function to re-render the dashboard
 | — |
| `registerCollectionHandlers` | Registers collection event listeners using event delegation | `appState` (Object) – Application state<br>`applyFiltersAndRender` (Function) – Function to re-render the dashboard | (Object) Object containing all handler functions for cleanup |
| `unregisterCollectionHandlers` | Unregisters collection event listeners | `handlers` (Object) – Object containing all handler functions
 | — |

**Usage Example**

```js
import {
  registerCollectionHandlers,
  unregisterCollectionHandlers
} from './dashboard/handlers/collections.js';
import { applyFiltersAndRender } from './core/filters.js';

let collectionHandlers;

export function mountCollections(appState) {
  collectionHandlers = registerCollectionHandlers(appState, () => applyFiltersAndRender(appState));
}

export function unmountCollections() {
  unregisterCollectionHandlers(collectionHandlers);
}
```

### `dashboard/handlers/pagination.js`

| Export | Description | Parameters | Returns |
| --- | --- | --- | --- |
| `createItemsPerPageChangeHandler` | Creates items per page change handler | `appState` (Object) – Application state<br>`applyFiltersAndRender` (Function) – Function to re-render the dashboard | (Function) Event handler for items per page change |
| `createSortChangeHandler` | Creates sort change handler | `appState` (Object) – Application state<br>`applyFiltersAndRender` (Function) – Function to re-render the dashboard | (Function) Event handler for sort change |
| `registerPaginationHandlers` | Registers pagination and sort event listeners | `appState` (Object) – Application state<br>`applyFiltersAndRender` (Function) – Function to re-render the dashboard | (Object) Object containing handler functions for cleanup |
| `unregisterPaginationHandlers` | Unregisters pagination and sort event listeners | `handlers` (Object) – Object containing handler functions
 | — |

**Usage Example**

```js
import {
  registerPaginationHandlers,
  unregisterPaginationHandlers
} from './dashboard/handlers/pagination.js';
import { applyFiltersAndRender } from './core/filters.js';

let paginationHandlers;

export function mountPaginationControls(appState) {
  paginationHandlers = registerPaginationHandlers(appState, () => applyFiltersAndRender(appState));
}

export function unmountPaginationControls() {
  unregisterPaginationHandlers(paginationHandlers);
}
```

### `dashboard/handlers/paper-list.js`

| Export | Description | Parameters | Returns |
| --- | --- | --- | --- |
| `createPaperListClickHandler` | Creates paper list click handler (expand notes, checkboxes, delete) | `appState` (Object) – Application state<br>`applyFiltersAndRender` (Function) – Function to re-render the dashboard<br>`updateBatchToolbar` (Function) – Function to update batch toolbar UI | (Function) Event handler for paper list clicks |
| `createPaperListChangeHandler` | Creates paper list change handler (status select) | `appState` (Object) – Application state<br>`applyFiltersAndRender` (Function) – Function to re-render the dashboard | (Function) Event handler for paper list changes |
| `registerPaperListHandlers` | Registers paper list event listeners | `appState` (Object) – Application state<br>`applyFiltersAndRender` (Function) – Function to re-render the dashboard<br>`updateBatchToolbar` (Function) – Function to update batch toolbar UI | (Object) Object containing handler functions for cleanup |
| `unregisterPaperListHandlers` | Unregisters paper list event listeners | `handlers` (Object) – Object containing handler functions
 | — |

**Usage Example**

```js
import {
  registerPaperListHandlers,
  unregisterPaperListHandlers
} from './dashboard/handlers/paper-list.js';
import { applyFiltersAndRender } from './core/filters.js';
import { updateBatchToolbar } from './dashboard/ui/batch-toolbar.js';

let paperListHandlers;

export function mountPaperList(appState) {
  paperListHandlers = registerPaperListHandlers(appState, () => applyFiltersAndRender(appState), updateBatchToolbar);
}

export function unmountPaperList() {
  unregisterPaperListHandlers(paperListHandlers);
}
```

### `dashboard/handlers/quick-add.js`

| Export | Description | Parameters | Returns |
| --- | --- | --- | --- |
| `createQuickAddHandler` | Creates quick add form submission handler | `appState` (Object) – Application state<br>`applyFiltersAndRender` (Function) – Function to re-render the dashboard | (Function) Event handler for quick add form |
| `registerQuickAddHandler` | Registers quick add form event listener | `appState` (Object) – Application state<br>`applyFiltersAndRender` (Function) – Function to re-render the dashboard | (Object) Object containing handler function for cleanup |
| `unregisterQuickAddHandler` | Unregisters quick add form event listener | `handlers` (Object) – Object containing handler function
 | — |

**Usage Example**

```js
import {
  registerQuickAddHandler,
  unregisterQuickAddHandler
} from './dashboard/handlers/quick-add.js';
import { applyFiltersAndRender } from './core/filters.js';

let quickAddHandler;

export function mountQuickAdd(appState) {
  quickAddHandler = registerQuickAddHandler(appState, () => applyFiltersAndRender(appState));
}

export function unmountQuickAdd() {
  unregisterQuickAddHandler(quickAddHandler);
}
```

### `dashboard/handlers/search-mode.js`

| Export | Description | Parameters | Returns |
| --- | --- | --- | --- |
| `updateSearchModeButtons` | Updates search mode button states based on current mode | `searchMode` (string) – Current search mode ('all' or 'notes')
 | — |
| `createSearchModeAllHandler` | Creates a handler for switching to "All Fields" search mode | `appState` (Object) – Application state<br>`applyFiltersAndRender` (Function) – Function to re-render the dashboard | (Function) Event handler for "All Fields" mode |
| `createSearchModeNotesHandler` | Creates a handler for switching to "Notes Only" search mode | `appState` (Object) – Application state<br>`applyFiltersAndRender` (Function) – Function to re-render the dashboard | (Function) Event handler for "Notes Only" mode |
| `registerSearchModeHandlers` | Registers search mode event listeners for both desktop and mobile | `appState` (Object) – Application state<br>`applyFiltersAndRender` (Function) – Function to re-render the dashboard | (Object) Object containing all handler functions for cleanup |
| `unregisterSearchModeHandlers` | Unregisters search mode event listeners | `handlers` (Object) – Object containing all handler functions
 | — |

**Usage Example**

```js
import {
  registerSearchModeHandlers,
  unregisterSearchModeHandlers,
  updateSearchModeButtons
} from './dashboard/handlers/search-mode.js';
import { applyFiltersAndRender } from './core/filters.js';

let searchModeHandlers;

export function mountSearchMode(appState) {
  searchModeHandlers = registerSearchModeHandlers(appState, () => applyFiltersAndRender(appState));
  updateSearchModeButtons(appState.searchMode);
}

export function unmountSearchMode() {
  unregisterSearchModeHandlers(searchModeHandlers);
}
```

## Frontend Dashboard Services

Service modules encapsulate shared UI behaviours and error-handling logic that multiple views consume. They do not attach DOM listeners directly; instead they expose functions you can call from handlers or view setups.

### `dashboard/services/error-handler.js`

| Export | Description | Parameters | Returns |
| --- | --- | --- | --- |
| `handleOperationError` | Handles operation errors with consistent messaging and logging | `error` (Error) – The error object<br>`context` (string) – Context where the error occurred (e.g., 'batch delete', 'update status')<br>`options` (Object) – Configuration options<br>`options.showToast` (boolean) – Show toast notification (default: true)<br>`options.logToConsole` (boolean) – Log to console (default: true)<br>`options.fallbackMessage` (string) – Custom fallback message | (string) The error message that was displayed/logged |
| `createErrorMessage` | Creates a user-friendly error message based on error type | `error` (Error) – The error object<br>`context` (string) – Context where the error occurred | (string) User-friendly error message |
| `shouldRetry` | Determines if an operation should be retried based on error type | `error` (Error) – The error object | (boolean) True if operation should be retried |
| `withErrorHandling` | Wraps an async operation with error handling | `operation` (Function) – Async function to execute<br>`context` (string) – Context description<br>`options` (Object) – Error handling options | (Promise<{success: boolean, data?: any, error?: Error) >} |
| `handleBatchErrors` | Handles multiple errors from batch operations | `` () – {Array<{paperId: number, error: Error}>} errors - Array of error objects<br>`context` (string) – Context where errors occurred | (string) Summary message |

**Usage Example**

```js
import {
  handleOperationError,
  withErrorHandling,
  handleBatchErrors
} from './dashboard/services/error-handler.js';
import { deletePaper } from './api/papers.js';
import { showToast } from './ui.js';

async function deleteSelectedPapers(appState) {
  const operations = [...appState.selectedPaperIds].map(paperId =>
    withErrorHandling(() => deletePaper(paperId), `delete paper ${paperId}`)
  );

  const results = await Promise.all(operations);
  const failures = results.filter(result => !result.success);

  if (failures.length) {
    const summary = handleBatchErrors(
      failures.map(({ error }, index) => ({ paperId: Array.from(appState.selectedPaperIds)[index], error })),
      'batch delete'
    );
    showToast(summary, 'error');
  } else {
    showToast('Selected papers deleted', 'success');
  }
}

document.addEventListener('error', event => handleOperationError(event.detail.error, event.detail.context));
```

### `dashboard/services/modal-manager.js`

| Export | Description | Parameters | Returns |
| --- | --- | --- | --- |
| `showModal` | Shows a modal with automatic lifecycle management | `config` (ModalConfig) – Modal configuration | (Object) Modal controller with close method |
| `closeModal` | Closes a specific modal | `id` (string) – Modal element ID
 | — |
| `closeAllModals` | Closes all active modals | — | — |
| `isModalOpen` | Checks if a modal is currently open | `id` (string) – Modal element ID | (boolean) True if modal is open |
| `getActiveModalCount` | Gets the number of active modals | — | (number) Number of open modals |
| `showConfirmationModal` | Creates a confirmation modal | `config` (Object) – Confirmation config<br>`config.title` (string) – Modal title<br>`config.message` (string) – Confirmation message<br>`config.confirmText` (string) – Confirm button text (default: "Confirm")<br>`config.cancelText` (string) – Cancel button text (default: "Cancel")<br>`config.onConfirm` (Function) – Callback when confirmed<br>`config.onCancel` (Function) – Callback when cancelled | (Object) Modal controller |
| `showAlertModal` | Creates an alert modal | `config` (Object) – Alert config<br>`config.title` (string) – Modal title<br>`config.message` (string) – Alert message<br>`config.type` (string) – Alert type: 'info', 'success', 'warning', 'error' (default: 'info')<br>`config.buttonText` (string) – Button text (default: "OK")<br>`config.onClose` (Function) – Callback when closed | (Object) Modal controller |

**Usage Example**

```js
import {
  showModal,
  closeModal,
  showConfirmationModal,
  showAlertModal,
  isModalOpen
} from './dashboard/services/modal-manager.js';

const customModal = showModal({
  id: 'paper-share-modal',
  html: '<div id="paper-share-modal" class="modal hidden">...</div>',
  onOpen: modal => modal.classList.remove('opacity-0'),
  onClose: () => console.debug('Share modal closed')
});

document.getElementById('share-cancel')?.addEventListener('click', () => closeModal('paper-share-modal'));

await showConfirmationModal({
  message: 'Delete this paper and all annotations?',
  confirmText: 'Delete',
  onConfirm: () => console.info('Confirmed delete')
});

await showAlertModal({
  type: 'success',
  title: 'Export Complete',
  message: 'Your bibliography export is ready to download.'
});

if (isModalOpen('paper-share-modal')) {
  closeModal('paper-share-modal');
}
```

### `dashboard/services/tag-manager.js`

| Export | Description | Parameters | Returns |
| --- | --- | --- | --- |
| `parseTags` | Parses and sanitizes tag input | `input` (string|Array) – Comma-separated string or array of tags | (Array<string>) Array of sanitized, unique, valid tags |
| `sanitizeTag` | Sanitizes a single tag | `tag` (string) – Tag to sanitize | (string) Sanitized tag |
| `isValidTag` | Validates a single tag | `tag` (string) – Tag to validate | (Object) Validation result with valid flag and error message |
| `validateTags` | Validates an array of tags | `tags` (Array<string>) – Tags to validate | (Object) Validation result with valid flag, errors array, and valid tags |
| `addTagsToPaper` | Adds tags to a paper's existing tags | `paper` (Object) – Paper object<br>`tagsToAdd` (Array<string>) – Tags to add | (Object) Result with updated tags and any errors |
| `removeTagsFromPaper` | Removes tags from a paper's existing tags | `paper` (Object) – Paper object<br>`tagsToRemove` (Array<string>) – Tags to remove | (Object) Result with updated tags and removed count |
| `replaceTagsOnPaper` | Replaces all tags on a paper | `paper` (Object) – Paper object<br>`newTags` (Array<string>) – New tags to set | (Object) Result with updated tags and any errors |
| `getAllTags` | Gets all unique tags from a collection of papers | `papers` (Array<Object>) – Array of paper objects | (Array<string>) Sorted array of unique tags |
| `getTagStatistics` | Gets tag usage statistics | `papers` (Array<Object>) – Array of paper objects | (Array<Object>) Array of {tag, count} objects sorted by count descending |
| `suggestTags` | Suggests tags based on paper title and authors | `paper` (Object) – Paper object<br>`allPapers` (Array<Object>) – All papers for context | (Array<string>) Suggested tags |
| `mergeTags` | Merges duplicate or similar tags | `tags` (Array<string>) – Tags to merge<br>`mergeMap` (Object) – Map of {oldTag: newTag} | (Array<string>) Merged tags |
| `getTagRules` | Exports tag manager configuration | — | (Object) Tag rules configuration |

**Usage Example**

```js
import {
  parseTags,
  validateTags,
  addTagsToPaper,
  removeTagsFromPaper,
  getAllTags,
  getTagStatistics
} from './dashboard/services/tag-manager.js';

const userInput = 'nlp, transformers,  attention ';
const draftTags = parseTags(userInput);

const { valid, validTags, errors } = validateTags(draftTags);
if (!valid) {
  console.warn('Invalid tags', errors);
}

const updatedPaper = addTagsToPaper(paper, validTags);
const cleanedPaper = removeTagsFromPaper(updatedPaper.paper, ['draft']);

const allTags = getAllTags(appState.papersCache);
const tagStats = getTagStatistics(appState.papersCache);
```

## Frontend Dashboard UI

UI helpers manipulate DOM fragments that belong to the dashboard layout. Use them alongside the handlers from the previous section to keep toolbar and selection state in sync.

### `dashboard/ui/batch-toolbar.js`

| Export | Description | Parameters | Returns |
| --- | --- | --- | --- |
| `updateBatchToolbar` | Updates batch toolbar visibility and selection count | `appState` (Object) – Application state
 | — |
| `populateBatchStatusSelect` | Populates batch status select with current status options | — | — |
| `createSelectAllHandler` | Creates select all checkbox handler | `appState` (Object) – Application state<br>`applyFiltersAndRender` (Function) – Function to re-render the dashboard<br>`updateBatchToolbar` (Function) – Function to update batch toolbar UI | (Function) Event handler for select all checkbox |
| `createClearSelectionHandler` | Creates clear selection button handler | `appState` (Object) – Application state<br>`applyFiltersAndRender` (Function) – Function to re-render the dashboard<br>`updateBatchToolbar` (Function) – Function to update batch toolbar UI | (Function) Event handler for clear selection button |
| `registerBatchToolbarHandlers` | Registers batch toolbar event listeners | `appState` (Object) – Application state<br>`applyFiltersAndRender` (Function) – Function to re-render the dashboard<br>`updateBatchToolbar` (Function) – Function to update batch toolbar UI | (Object) Object containing handler functions for cleanup |
| `unregisterBatchToolbarHandlers` | Unregisters batch toolbar event listeners | `handlers` (Object) – Object containing handler functions
 | — |

**Usage Example**

```js
import {
  updateBatchToolbar,
  populateBatchStatusSelect,
  registerBatchToolbarHandlers,
  unregisterBatchToolbarHandlers
} from './dashboard/ui/batch-toolbar.js';
import { applyFiltersAndRender } from './core/filters.js';

let batchToolbarHandlers;

export function mountBatchToolbar(appState) {
  populateBatchStatusSelect();
  updateBatchToolbar(appState);
  batchToolbarHandlers = registerBatchToolbarHandlers(appState, () => applyFiltersAndRender(appState), updateBatchToolbar);
}

export function unmountBatchToolbar() {
  unregisterBatchToolbarHandlers(batchToolbarHandlers);
}
```

## Frontend Dashboard Utilities

Utility modules provide shared transformations for batch workflows. They are pure helpers that can be reused in handlers or services.

### `dashboard/utils/batch-operations-utils.js`

| Export | Description | Parameters | Returns |
| --- | --- | --- | --- |
| `executeBatchOperation` | Executes a batch operation on multiple papers with consistent error handling | `selectedIds` (Array<number>) – Array of paper IDs to process<br>`operation` (Function) – Async function to execute for each paper (receives paperId)<br>`options` (Object) – Configuration options<br>`options.showProgress` (boolean) – Show progress toast (default: true)<br>`options.showResult` (boolean) – Show result toast (default: true)<br>`options.actionName` (string) – Name of the action for messages (default: 'operation') | (Promise<Object>) Object with successCount, errorCount, and results array |
| `showBatchResult` | Shows a standardized batch operation result toast | `successCount` (number) – Number of successful operations<br>`errorCount` (number) – Number of failed operations<br>`actionName` (string) – Name of the action
 | — |
| `updatePaperInCache` | Updates a paper in the cache with new data | `cache` (Array) – Papers cache array<br>`paperId` (number) – ID of the paper to update<br>`updates` (Object) – Object with properties to update | (boolean) True if paper was found and updated, false otherwise |
| `removePapersFromCache` | Removes papers from cache | `cache` (Array) – Papers cache array<br>`paperIds` (Array<number>) – Array of paper IDs to remove | (Array) New cache array without the specified papers |
| `parseTags` | Parses and sanitizes tag input | `input` (string) – Comma-separated tag input | (Array<string>) Array of sanitized, unique tags |
| `addTagsToPaper` | Adds tags to a paper's existing tags | `paper` (Object) – Paper object<br>`tagsToAdd` (Array<string>) – Tags to add | (Array<string>) Updated tags array |
| `removeTagsFromPaper` | Removes tags from a paper's existing tags | `paper` (Object) – Paper object<br>`tagsToRemove` (Array<string>) – Tags to remove | (Array<string>) Updated tags array |

**Usage Example**

```js
import {
  executeBatchOperation,
  showBatchResult,
  updatePaperInCache,
  removePapersFromCache,
  parseTags
} from './dashboard/utils/batch-operations-utils.js';
import { updatePaper, deletePaper } from './api/papers.js';

const selectedIds = new Set([1, 2, 3]);

const result = await executeBatchOperation(selectedIds, async paperId => {
  const updated = await updatePaper(paperId, { status: 'Finished' });
  updatePaperInCache(appState.papersCache, paperId, updated);
  return updated;
}, { actionName: 'mark as finished' });

showBatchResult(result.successCount, result.errorCount, 'mark as finished');

const tags = parseTags('nlp,attention');

await executeBatchOperation(selectedIds, async paperId => {
  await deletePaper(paperId);
  removePapersFromCache(appState.papersCache, [paperId]);
}, { actionName: 'delete paper', showProgress: false });
```

## Frontend Views & Components

View modules expose high-level objects that render specific app screens. Each view typically provides lifecycle methods like `mount`, `render`, `open`, and `cleanup`. Import these objects inside the router or feature entrypoints.

### `auth.view.js`

| Export | Description | Parameters | Returns |
| --- | --- | --- | --- |
| `authView` | — | — | — |

**Key Methods**
- `mount()` injects the authentication modal and attaches listeners.
- `open(tab = 'login')` and `close()` control modal visibility.
- `handleLogin(event)` and `handleRegister(event)` submit credentials.
- `updateUIForAuthenticated(user)` / `updateUIForUnauthenticated()` toggle UI state.
- `validateEmail(email)` helpers ensure inline validation feedback.

**Usage Example**

```js
import { authView } from './auth.view.js';

await authView.mount();

document.getElementById('show-auth')?.addEventListener('click', () => authView.open('register'));
document.getElementById('logout-btn')?.addEventListener('click', () => authView.logout());

window.addEventListener('auth:recheck', () => authView.refreshStatus());
```

### `dashboard.view.js`

| Export | Description | Parameters | Returns |
| --- | --- | --- | --- |
| `dashboardView` | — | — | — |

**Key Methods**
- `mount(appState, applyFiltersAndRender)` loads data, registers all handlers, and renders sidebar widgets.
- `render(appState)` re-renders the main list and toolbar.
- `refreshData(appState)` refetches papers and collections.
- `unmount()` unregisters every handler registered during mount.

**Usage Example**

```js
import { dashboardView } from './dashboard.view.js';
import { applyFiltersAndRender } from './core/filters.js';

export async function showDashboard(appState) {
  await dashboardView.mount(appState, () => applyFiltersAndRender(appState));
  dashboardView.render(appState);
}

export function hideDashboard() {
  dashboardView.unmount();
}
```

### `details.view.js`

| Export | Description | Parameters | Returns |
| --- | --- | --- | --- |
| `detailsView` | — | — | — |

**Key Methods**
- `mount(paperId, appState)` renders the paper detail panel and wires up event handlers.
- `renderPdfTab(paper)` and `loadPdfPreview(paperId)` manage PDF viewing.
- `handleNotesSave(event)` persists note edits back to IndexedDB and remote sync.
- `renderMetadata(paper)` updates metadata sections when edits occur.
- `unmount()` removes listeners and clears cached handlers.

**Usage Example**

```js
import { detailsView } from './details.view.js';

export async function showPaperDetails(appState, paperId) {
  await detailsView.mount(paperId, appState);
  detailsView.renderMetadata(await detailsView.getPaper());
}

export function hidePaperDetails() {
  detailsView.unmount();
}
```

### `docs.view.js`

| Export | Description | Parameters | Returns |
| --- | --- | --- | --- |
| `docsView` | Documentation view module Provides comprehensive user guide and onboarding experience | — | — |

**Key Methods**
- `mount(appState)` scrolls to top and enables smooth in-page navigation.
- `unmount()` is a placeholder for future cleanup.

**Usage Example**

```js
import { docsView } from './docs.view.js';

function showDocs(appState) {
  docsView.mount(appState);
  document.getElementById('app').innerHTML = templates.docs;
}
```

### `landing.view.js`

| Export | Description | Parameters | Returns |
| --- | --- | --- | --- |
| `landingView` | Landing page view module for marketing content | — | — |

**Key Methods**
- `mount()` sets up smooth scroll animations, CTA tracking, and Intersection Observer for fade-in effects.
- `unmount()` cleans up event listeners (currently no-op as cleanup handled by DOM removal).

**Features**
- Hero section with headline and primary CTA
- Value proposition section (3 columns)
- Key features showcase (4 columns)
- Technical trust signals
- Social proof section
- How it works (3-step process)
- Secondary CTA section
- Footer with links and branding

**Usage Example**

```js
import { landingView } from './landing.view.js';
import { views as templates } from './views/index.js';

// Router automatically handles landing page
// When route is #/, router renders templates.landing and calls landingView.mount()
```

### `form.view.js`

| Export | Description | Parameters | Returns |
| --- | --- | --- | --- |
| `formView` | — | — | — |

**Key Methods**
- `mount(paperId, appState)` determines create vs edit mode, pre-fills fields, and sets up listeners.
- `handleSubmit(event, appState)` validates form data and persists it to IndexedDB/cloud.
- `handlePdfUpload(file)` sends PDFs either through direct backend upload or presigned URLs.
- `resetForm()` clears state when leaving the view.
- `unmount()` removes registered DOM listeners to prevent leaks.

**Usage Example**

```js
import { formView } from './form.view.js';
import { applyFiltersAndRender } from './core/filters.js';

export async function showPaperForm(appState, paperId = null) {
  await formView.mount(paperId, appState);
  document.getElementById('add-paper-form')?.addEventListener('submit', async event => {
    event.preventDefault();
    await formView.handleSubmit(event, appState);
    applyFiltersAndRender(appState);
  });
}

export function hidePaperForm() {
  formView.unmount();
}
```

### `graph.view.js`

| Export | Description | Parameters | Returns |
| --- | --- | --- | --- |
| `graphView` | — | — | — |

**Key Methods**
- `mount(appState)` loads papers, builds vis-network dataset, and attaches filter/zoom handlers.
- `prepareGraphData(papers)` transforms paper relations into nodes/edges.
- `applyFilters()` filters graph by status, tags, and search term.
- `destroy()` tears down the network instance and removes listeners.

**Usage Example**

```js
import { graphView } from './graph.view.js';

export async function showGraph(appState) {
  await graphView.mount(appState);
}

export function hideGraph() {
  graphView.destroy();
}
```

### `settings.view.js`

| Export | Description | Parameters | Returns |
| --- | --- | --- | --- |
| `settingsView` | — | — | — |

**Key Methods**
- `mount(appState)` wires appearance toggles, import/export, sync controls, and status drag-and-drop.
- `setupStatusReordering()` persists a custom reading-status order.
- `setupImportExport(appState)` handles JSON (and RIS) import/export flows.
- `setupCloudSync()` toggles cloud sync and triggers manual sync actions.
- `setupDangerZone(appState)` surfaces destructive actions like clearing all data.
- `unmount()` currently logs teardown (extend when adding listeners).

**Usage Example**

```js
import { settingsView } from './settings.view.js';

export function showSettings(appState) {
  document.getElementById('app').innerHTML = templates.settings;
  settingsView.mount(appState);
}
```

### `views.js`

| Export | Description | Parameters | Returns |
| --- | --- | --- | --- |
| `views` | — | — | — |

The `views` object stores precompiled HTML template strings for all major screens (dashboard, auth modal, docs, etc.). Import desired fragments and inject into the DOM before running the corresponding view module's `mount`.

**Usage Example**

```js
import { views } from './views.js';
import { dashboardView } from './dashboard.view.js';

document.getElementById('app').innerHTML = views.home;
await dashboardView.mount(appState, () => applyFiltersAndRender(appState));
```

## Frontend Data Layer (`db/`)

The data layer abstracts IndexedDB access and synchronisation bookkeeping. Use the high-level functions in `db.js` for most operations; reach into adapter files when you need fine-grained control or to extend persistence.

### `db.js`

| Export | Description | Parameters | Returns |
| --- | --- | --- | --- |
| `openDB` | Re-exported from `openDB` | — | — |
| `addPaper` | — | — | — |
| `getAllPapers` | — | — | — |
| `getPaperById` | — | — | — |
| `getPaperByDoi` | — | — | — |
| `updatePaper` | — | — | — |
| `deletePaper` | — | — | — |
| `searchPapers` | — | — | — |
| `getUploadUrl` | — | — | — |
| `uploadPdf` | — | — | — |
| `getPdfDownloadUrl` | — | — | — |
| `addCollection` | — | — | — |
| `getAllCollections` | — | — | — |
| `getCollectionById` | — | — | — |
| `updateCollection` | — | — | — |
| `deleteCollection` | — | — | — |
| `addAnnotation` | — | — | — |
| `getAnnotationsByPaperId` | — | — | — |
| `getAnnotationById` | — | — | — |
| `updateAnnotation` | — | — | — |
| `deleteAnnotation` | — | — | — |
| `deleteAnnotationsByPaperId` | — | — | — |
| `isCloudSyncAvailable` | Re-exported from `isCloudSyncAvailable` | — | — |

**Usage Example**

```js
import {
  openDB,
  addPaper,
  getAllPapers,
  updatePaper,
  deletePaper,
  addCollection,
  getAllCollections
} from './db.js';

await openDB();

const paperId = await addPaper({ title: 'A Survey on Graph Transformers' });
const papers = await getAllPapers();

await updatePaper(paperId, { status: 'Reading' });
await addCollection({ name: 'AI', filters: { tags: ['ai'] } });

await deletePaper(paperId);
```

### `db/adapter.js`

| Export | Description | Parameters | Returns |
| --- | --- | --- | --- |
| `papers` | — | — | — |
| `collections` | Collection operations adapter | — | — |
| `annotations` | Annotation operations adapter | — | — |
| `isCloudSyncAvailable` | Checks if cloud sync is available. | — | (boolean) True if cloud sync is enabled and user is authenticated. |

**Usage Example**

```js
import { papers } from './db/adapter.js';

await papers.open();
const paper = await papers.getPaperById(42);
await papers.updatePaper(42, { status: 'Finished' });

if (!papers.supportsCloudSync) {
  console.warn('Local-only mode');
}
```

### `db/sync.js`

| Export | Description | Parameters | Returns |
| --- | --- | --- | --- |
| `getPendingChanges` | Gets pending changes from localStorage. | — | (Object) Pending changes { papers: {created, updated, deleted}, collections: {...}, annotations: {...} }. |
| `trackPaperCreated` | Adds a paper creation to pending changes. | `paper` (Object) – Paper data (will be sent to API).
 | — |
| `trackPaperUpdated` | Adds a paper update to pending changes. | `id` (number) – Paper ID.<br>`paper` (Object) – Paper update data.
 | — |
| `trackPaperDeleted` | Adds a paper deletion to pending changes. | `id` (number) – Paper ID.
 | — |
| `trackCollectionCreated` | Adds a collection creation to pending changes. | `collection` (Object) – Collection data.
 | — |
| `trackCollectionUpdated` | Adds a collection update to pending changes. | `id` (number) – Collection ID.<br>`collection` (Object) – Collection update data.
 | — |
| `trackCollectionDeleted` | Adds a collection deletion to pending changes. | `id` (number) – Collection ID.
 | — |
| `trackAnnotationCreated` | Adds an annotation creation to pending changes. | `annotation` (Object) – Annotation data.
 | — |
| `trackAnnotationUpdated` | Adds an annotation update to pending changes. | `id` (number) – Annotation ID.<br>`annotation` (Object) – Annotation update data.
 | — |
| `trackAnnotationDeleted` | Adds an annotation deletion to pending changes. | `id` (number) – Annotation ID.
 | — |
| `isSyncInProgress` | Checks if sync is in progress. | — | (boolean) True if sync is in progress. |
| `performFullSync` | Performs a full sync - gets all data from server and replaces local data. | — | (Promise<Object>) Sync result with status and data counts. |
| `performIncrementalSync` | Performs an incremental sync - sends local changes and receives server changes. | — | (Promise<Object>) Sync result with applied changes and conflicts. |
| `performSync` | Performs sync (full or incremental based on whether we've synced before). | — | (Promise<Object>) Sync result. |
| `getSyncStatusInfo` | Gets sync status (local and server). | — | (Promise<Object>) Sync status object. |

**Usage Example**

```js
import {
  getPendingChanges,
  trackPaperCreated,
  trackPaperUpdated,
  trackPaperDeleted,
  performSync,
  isSyncInProgress
} from './db/sync.js';

trackPaperCreated({ id: 1001, title: 'Knowledge Graph Embeddings' });
trackPaperUpdated(1001, { status: 'Reading' });

if (!isSyncInProgress()) {
  const result = await performSync();
  console.log('Sync result', result);
}

console.log('Pending changes', getPendingChanges());
```

## Frontend Utilities

Utility modules bundle shared helpers used across views and services: DOI normalization, citation formatting, configuration access, UI rendering primitives, and data importers.

### `api.js`

| Export | Description | Parameters | Returns |
| --- | --- | --- | --- |
| `normalizePaperIdentifier` | Normalizes input to extract DOI from various URL formats. Supports: - Direct DOI: "10.1234/example" - doi.org URLs: "https://doi.org/10.1234/example" - Publisher URLs: "https://publisher.com/article/doi/10.1234/example" - arXiv URLs: Detects but doesn't support (returns helpful error) | `input` (string) – DOI, URL, or identifier string. | (Object) Object with { type: 'doi'\|'arxiv'\|'unsupported', value: string, original: string } |
| `fetchDoiMetadata` | Fetches metadata for a given DOI with comprehensive error handling. | `doi` (string) – The DOI to fetch.<br>`options` (Object) – Fetch options.<br>`options.timeout` (number) – Timeout in ms (default: 10000). | (Promise<Object>) A promise that resolves with the structured paper data. |

**Usage Example**

```js
import { normalizePaperIdentifier, fetchDoiMetadata } from './api.js';

const identifier = normalizePaperIdentifier('https://doi.org/10.1145/3448016.3457242');
if (identifier.type === 'doi') {
  const metadata = await fetchDoiMetadata(identifier.value);
  console.log('Fetched metadata', metadata);
}
```

### `citation.js`

| Export | Description | Parameters | Returns |
| --- | --- | --- | --- |
| `generateCitation` | Generates a citation string for a given paper in a specified format. | `paper` (object) – The paper object.<br>`format` (string) – The citation format ('apa', 'ieee', 'mla', 'chicago', 'harvard', 'vancouver'). | (string) The formatted citation string. |
| `generateBibliography` | Generates a bibliography (references list) from multiple papers. | `papers` (object[]) – Array of paper objects.<br>`format` (string) – The citation format ('apa', 'ieee', 'mla', 'chicago', 'harvard', 'vancouver').<br>`style` (string) – Bibliography style: 'numbered' (1., 2., 3.) or 'alphabetical' (A, B, C). | (string) The formatted bibliography string. |
| `exportBibliographyToFile` | Exports bibliography to a text file. | `bibliography` (string) – The formatted bibliography text.<br>`format` (string) – The citation format used (for filename).
 | — |
| `copyBibliographyToClipboard` | Copies bibliography to clipboard. | `bibliography` (string) – The formatted bibliography text. | (Promise<boolean>) True if successful, false otherwise. |

**Usage Example**

```js
import {
  generateCitation,
  generateBibliography,
  exportBibliographyToFile,
  copyBibliographyToClipboard
} from './citation.js';

const citation = generateCitation(paper, 'apa');
const bibliography = generateBibliography(selectedPapers, 'ieee', 'numbered');

await copyBibliographyToClipboard(bibliography);
await exportBibliographyToFile(bibliography, 'ieee');
```

### `config.js`

| Export | Description | Parameters | Returns |
| --- | --- | --- | --- |
| `DEFAULT_STATUSES` | This file centralizes application-wide configurations, such as reading statuses. | — | — |
| `API_CONFIG` | — | — | — |
| `setApiBaseUrl` | Updates the API base URL and stores it in localStorage. | `url` (string) – The new API base URL.
 | — |
| `getApiBaseUrl` | Gets the current API base URL. | — | (string) The current API base URL. |
| `isCloudSyncEnabled` | Checks if cloud sync is enabled. | — | (boolean) True if cloud sync is enabled, false otherwise. |
| `setCloudSyncEnabled` | Enables or disables cloud sync mode. | `enabled` (boolean) – True to enable cloud sync, false for local-only.
 | — |
| `getStatusOrder` | Retrieves the user-defined status order from localStorage, or returns the default. | — | (string[]) An array of status strings in the correct order. |
| `saveStatusOrder` | Saves the new status order to localStorage. | `newOrder` (string[]) – The new array of status strings to save.
 | — |

**Usage Example**

```js
import {
  getApiBaseUrl,
  setApiBaseUrl,
  isCloudSyncEnabled,
  setCloudSyncEnabled,
  getStatusOrder,
  saveStatusOrder
} from './config.js';

setApiBaseUrl('https://your-backend.example.com');
if (isCloudSyncEnabled()) {
  console.log('Sync ready at', getApiBaseUrl());
}

saveStatusOrder(['To Read', 'Reading', 'Finished', 'Archived']);
console.log('Status order', getStatusOrder());

setCloudSyncEnabled(false);
```

### `import/ris-parser.js`

| Export | Description | Parameters | Returns |
| --- | --- | --- | --- |
| `parseRIS` | Parses a RIS format string and returns an array of paper objects. | `risContent` (string) – The RIS file content as a string. | (Promise<Array>) Array of paper objects ready for import. |

**Usage Example**

```js
import { parseRIS } from './import/ris-parser.js';
import { addPaper } from './db.js';

const file = document.getElementById('ris-upload').files[0];
const content = await file.text();
const papers = await parseRIS(content);

await Promise.all(papers.map(addPaper));
```

### `ui.js`

| Export | Description | Parameters | Returns |
| --- | --- | --- | --- |
| `escapeHtml` | — | — | — |
| `showToast` | Displays a toast notification with support for different types and actions. | `message` (string) – The message to display.<br>`type` (string) – Type of toast: 'success', 'error', 'warning', 'info'.<br>`options` (Object) – Additional options.<br>`options.duration` (number) – Duration in ms (default: 3000, 0 = persistent).<br>`options.actions` (Array) – Array of action objects {label, onClick}.
 | — |
| `formatRelativeTime` | Formats a date as a relative time string (e.g., "2 days ago", "just now"). | `date` (Date|string) – The date to format. | (string) A human-readable relative time string. |
| `sortPapers` | Sorts an array of papers based on a given key. | `papers` (Array<Object>) – The array of papers to sort.<br>`sortBy` (string) – The key to sort by ('date_added', 'last_updated', 'title_asc', 'year_desc', 'status_asc'). | (Array<Object>) A new array with the sorted papers. |
| `renderPaperList` | — | — | — |
| `renderSidebarTags` | — | — | — |
| `renderSidebarCollections` | Renders collections in the sidebar. | `collections` (Array<Object>) – Array of collection objects.
 | — |
| `highlightActiveSidebarLink` | — | — | — |

**Usage Example**

```js
import {
  showToast,
  renderPaperList,
  renderSidebarTags,
  renderSidebarCollections,
  formatRelativeTime
} from './ui.js';

renderPaperList(appState.papersCache, appState.currentSearchTerm, appState.selectedPaperIds);
renderSidebarTags(appState.papersCache);
renderSidebarCollections(appState.collectionsCache);

showToast(`Last synced ${formatRelativeTime(appState.lastSyncAt)}`, 'info');
```

## Backend Express Controllers

Controller modules implement the business logic for each REST endpoint. They expect to run within an Express request lifecycle with authentication middleware applied where indicated. Refer to the route section for HTTP method and path mappings.

### `backend/src/controllers/annotations.js`

| Export | Description | Parameters | Returns |
| --- | --- | --- | --- |
| `getAnnotations` | Get Annotations for a Paper GET /api/papers/:id/annotations | — | — |
| `getAnnotation` | Get Single Annotation GET /api/annotations/:id | — | — |
| `createAnnotation` | Create Annotation POST /api/papers/:id/annotations | — | — |
| `updateAnnotation` | Update Annotation PUT /api/annotations/:id | — | — |
| `deleteAnnotation` | Delete Annotation (Soft Delete) DELETE /api/annotations/:id | — | — |

**Usage Example**

```sh
curl -H "Authorization: Bearer $TOKEN" \
     https://your-backend.example.com/api/papers/123/annotations
```

```js
// Unit-test style invocation
import { getAnnotations } from '../backend/src/controllers/annotations.js';
import { createMockResponse } from '../tests/helpers.js';

const req = { params: { id: 123 }, user: { id: 'user_1' } };
const res = createMockResponse();
await getAnnotations(req, res, console.error);
expect(res.statusCode).toBe(200);
```

### `backend/src/controllers/auth.js`

| Export | Description | Parameters | Returns |
| --- | --- | --- | --- |
| `register` | User Registration POST /api/auth/register | — | — |
| `login` | User Login POST /api/auth/login | — | — |
| `logout` | User Logout POST /api/auth/logout | — | — |
| `refresh` | Refresh Access Token POST /api/auth/refresh | — | — |
| `getMe` | Get Current User GET /api/auth/me Requires authentication middleware | — | — |
| `verifyEmail` | Verify Email POST /api/auth/verify-email Body: { token: string } | — | — |
| `resendVerificationEmail` | Resend Verification Email POST /api/auth/resend-verification Requires authentication | — | — |
| `forgotPassword` | Forgot Password (Placeholder - implement later) POST /api/auth/forgot-password | — | — |
| `resetPassword` | Reset Password (Placeholder - implement later) POST /api/auth/reset-password | — | — |

**Usage Example**

```sh
curl -X POST https://your-backend.example.com/api/auth/login \
     -H "Content-Type: application/json" \
     -d '{"email":"user@example.com","password":"secret123"}'
```

```js
import request from 'supertest';
import app from '../backend/src/server.js';

const response = await request(app)
  .post('/api/auth/register')
  .send({ email: 'user@example.com', password: 'secret123', name: 'Test User' });

expect(response.statusCode).toBe(201);
```

### `backend/src/controllers/collections.js`

| Export | Description | Parameters | Returns |
| --- | --- | --- | --- |
| `getAllCollections` | Get All Collections GET /api/collections | — | — |
| `getCollection` | Get Single Collection GET /api/collections/:id | — | — |
| `createCollection` | Create Collection POST /api/collections | — | — |
| `updateCollection` | Update Collection PUT /api/collections/:id | — | — |
| `deleteCollection` | Delete Collection (Soft Delete) DELETE /api/collections/:id | — | — |

**Usage Example**

```sh
curl -X POST https://your-backend.example.com/api/collections \
     -H "Authorization: Bearer $TOKEN" \
     -H "Content-Type: application/json" \
     -d '{"name":"Reading List","filters":{"status":"To Read"}}'
```

### `backend/src/controllers/papers.js`

| Export | Description | Parameters | Returns |
| --- | --- | --- | --- |
| `getAllPapers` | Get All Papers GET /api/papers Query params: page, limit, status, tag, sortBy, sortOrder | — | — |
| `getPaper` | Get Single Paper GET /api/papers/:id | — | — |
| `createPaper` | Create Paper POST /api/papers | — | — |
| `updatePaper` | Update Paper PUT /api/papers/:id | — | — |
| `deletePaper` | Delete Paper (Soft Delete) DELETE /api/papers/:id | — | — |
| `searchPapers` | Search Papers GET /api/papers/search?q=query&status=Reading&tag=ml | — | — |
| `getUploadUrl` | Get Presigned Upload URL for PDF POST /api/papers/upload-url Body: { filename, size, contentType, paperId? } | — | — |
| `uploadPdfDirect` | Upload PDF directly to S3/R2 (server-side upload) POST /api/papers/upload Body: multipart/form-data with 'file' field Query params: paperId (optional) - if provided, uses that ID, otherwise generates temp ID | — | — |
| `getPdfDownloadUrl` | Get Presigned Download URL for PDF GET /api/papers/:id/pdf | — | — |
| `proxyPdfStream` | Proxy PDF Stream (avoids CORS issues) GET /api/papers/:id/pdf-proxy | — | — |

**Usage Example**

```sh
curl -X GET "https://your-backend.example.com/api/papers?page=1&limit=25" \
     -H "Authorization: Bearer $TOKEN"
```

```sh
curl -X POST https://your-backend.example.com/api/papers \
     -H "Authorization: Bearer $TOKEN" \
     -H "Content-Type: application/json" \
     -d '{"title":"Attention Is All You Need","authors":["Ashish Vaswani"],"year":2017}'
```

### `backend/src/controllers/sync.js`

| Export | Description | Parameters | Returns |
| --- | --- | --- | --- |
| `fullSync` | Full Sync GET /api/sync/full Returns all papers, collections, and annotations for the authenticated user | — | — |
| `incrementalSync` | Incremental Sync POST /api/sync/incremental Receives changes from client and returns changes from server since lastSyncAt Implements conflict resolution (last-write-wins with version tracking) | — | — |
| `getSyncStatus` | Get Sync Status GET /api/sync/status Returns last sync timestamp and sync metadata | — | — |

**Usage Example**

```sh
curl -X POST https://your-backend.example.com/api/sync/incremental \
     -H "Authorization: Bearer $TOKEN" \
     -H "Content-Type: application/json" \
     -d '{"lastSyncedAt":"2024-11-01T12:00:00Z","changes":{"papers":{"created":[],"updated":[],"deleted":[]}}}'
```

### `backend/src/controllers/user.js`

| Export | Description | Parameters | Returns |
| --- | --- | --- | --- |
| `getStats` | — | — | — |
| `getSessions` | — | — | — |
| `revokeSession` | — | — | — |
| `updateSettings` | — | — | — |
| `clearAllData` | Clear All User Data DELETE /api/user/data Permanently deletes all papers, collections, and annotations for the authenticated user Uses hard delete to ensure unique constraints don't block re-imports | — | — |

**Usage Example**

```sh
curl -X GET https://your-backend.example.com/api/user/stats \
     -H "Authorization: Bearer $TOKEN"
```

## Backend Express Routes

Routes compose the controllers with Express routers. The tables below list each public endpoint, the HTTP method, and the controller that handles it.

### `backend/src/routes/annotations.js`

| Method | Path | Description | Controller |
| --- | --- | --- | --- |
| GET | `/api/papers/:id/annotations` | List annotations for a paper | `getAnnotations` |
| POST | `/api/papers/:id/annotations` | Create new annotation | `createAnnotation` |
| GET | `/api/annotations/:id` | Get single annotation | `getAnnotation` |
| PUT | `/api/annotations/:id` | Update annotation | `updateAnnotation` |
| DELETE | `/api/annotations/:id` | Soft-delete annotation | `deleteAnnotation` |

### `backend/src/routes/auth.js`

| Method | Path | Description | Controller |
| --- | --- | --- | --- |
| POST | `/api/auth/register` | Register new user | `register` |
| POST | `/api/auth/login` | Login user (sets refresh cookie) | `login` |
| POST | `/api/auth/refresh` | Refresh access token | `refresh` |
| POST | `/api/auth/verify-email` | Verify email token | `verifyEmail` |
| POST | `/api/auth/forgot-password` | Start password reset flow | `forgotPassword` |
| POST | `/api/auth/reset-password` | Complete password reset | `resetPassword` |
| POST | `/api/auth/logout` | Logout and revoke refresh token | `logout` |
| POST | `/api/auth/resend-verification` | Resend verification email | `resendVerificationEmail` |
| GET | `/api/auth/me` | Get authenticated user profile | `getMe` |

### `backend/src/routes/collections.js`

| Method | Path | Description | Controller |
| --- | --- | --- | --- |
| GET | `/api/collections` | List collections | `getAllCollections` |
| GET | `/api/collections/:id` | Get collection by ID | `getCollection` |
| POST | `/api/collections` | Create collection | `createCollection` |
| PUT | `/api/collections/:id` | Update collection | `updateCollection` |
| DELETE | `/api/collections/:id` | Delete collection | `deleteCollection` |

### `backend/src/routes/papers.js`

| Method | Path | Description | Controller |
| --- | --- | --- | --- |
| GET | `/api/papers` | List papers with filtering | `getAllPapers` |
| GET | `/api/papers/search` | Search papers | `searchPapers` |
| GET | `/api/papers/:id` | Get paper by ID | `getPaper` |
| POST | `/api/papers` | Create paper | `createPaper` |
| PUT | `/api/papers/:id` | Update paper | `updatePaper` |
| DELETE | `/api/papers/:id` | Delete paper | `deletePaper` |
| POST | `/api/papers/upload-url` | Get presigned upload URL | `getUploadUrl` |
| POST | `/api/papers/upload` | Upload PDF via backend | `uploadPdfDirect` |
| GET | `/api/papers/:id/pdf` | Get presigned download URL | `getPdfDownloadUrl` |
| GET | `/api/papers/:id/pdf-proxy` | Stream PDF via proxy | `proxyPdfStream` |

### `backend/src/routes/sync.js`

| Method | Path | Description | Controller |
| --- | --- | --- | --- |
| GET | `/api/sync/full` | Run full sync | `fullSync` |
| POST | `/api/sync/incremental` | Run incremental sync | `incrementalSync` |
| GET | `/api/sync/status` | Fetch sync status | `getSyncStatus` |

### `backend/src/routes/user.js`

| Method | Path | Description | Controller |
| --- | --- | --- | --- |
| GET | `/api/user/stats` | Get user statistics | `getStats` |
| GET | `/api/user/sessions` | List active sessions | `getSessions` |
| DELETE | `/api/user/sessions/:id` | Revoke session | `revokeSession` |
| PUT | `/api/user/settings` | Update user settings | `updateSettings` |
| DELETE | `/api/user/data` | Clear all user data | `clearAllData` |

## Backend Middleware

### `backend/src/middleware/auth.js`

| Export | Description | Parameters | Returns |
| --- | --- | --- | --- |
| `authenticate` | Ensures the request has a valid JWT access token and adds `req.user`. | — | — |

**Usage Example**

```js
import express from 'express';
import { authenticate } from '../backend/src/middleware/auth.js';

const router = express.Router();
router.use(authenticate);
router.get('/secure', (req, res) => res.json({ ok: true, userId: req.user.id }));
```

### `backend/src/middleware/errorHandler.js`

| Export | Description | Parameters | Returns |
| --- | --- | --- | --- |
| `errorHandler` | Centralized error handling middleware producing JSON responses. | — | — |

**Usage Example**

```js
import { errorHandler } from '../backend/src/middleware/errorHandler.js';
app.use(errorHandler);
```

### `backend/src/middleware/notFound.js`

| Export | Description | Parameters | Returns |
| --- | --- | --- | --- |
| `notFound` | 404 middleware that returns consistent JSON for unknown routes. | — | — |

**Usage Example**

```js
import { notFound } from '../backend/src/middleware/notFound.js';
app.use(notFound);
```

## Backend Internal Libraries

### `backend/src/lib/email.js`

| Export | Description | Parameters | Returns |
| --- | --- | --- | --- |
| `generateVerificationToken` | Generates a secure verification token | — | (string) A cryptographically secure random token |
| `getVerificationTokenExpiry` | Generates verification token expiry (24 hours from now) | — | (Date) Expiry date |
| `sendVerificationEmail` | Sends a verification email using the configured email service | `email` (string) – Recipient email address<br>`token` (string) – Verification token<br>`name` (string) – User's name (optional) | (Promise<void>)  |
| `sendPasswordResetEmail` | Sends a password reset email (placeholder for future implementation) | `email` (string) – Recipient email address<br>`token` (string) – Reset token<br>`name` (string) – User's name (optional) | (Promise<void>)  |

**Usage Example**

```js
import { sendVerificationEmail } from '../backend/src/lib/email.js';

await sendVerificationEmail('user@example.com', 'token-123', 'User');
```
### `backend/src/lib/jwt.js`

| Export | Description | Parameters | Returns |
| --- | --- | --- | --- |
| `generateAccessToken` | Generate access token (short-lived) | — | — |
| `generateRefreshToken` | Generate refresh token (long-lived) | — | — |
| `verifyAccessToken` | Verify access token | — | — |
| `verifyRefreshToken` | Verify refresh token | — | — |

**Usage Example**

```js
import { generateAccessToken, verifyAccessToken } from '../backend/src/lib/jwt.js';

const token = generateAccessToken('user_id', 'user@example.com');
const payload = verifyAccessToken(token);
console.log(payload.sub);
```
### `backend/src/lib/password.js`

| Export | Description | Parameters | Returns |
| --- | --- | --- | --- |
| `hashPassword` | Hash a password | — | — |
| `verifyPassword` | Verify a password against a hash | — | — |

**Usage Example**

```js
import { hashPassword, verifyPassword } from '../backend/src/lib/password.js';

const hash = await hashPassword('Supersafe123!');
const matches = await verifyPassword('Supersafe123!', hash);
```

### `backend/src/lib/prisma.js`

| Export | Description | Parameters | Returns |
| --- | --- | --- | --- |
| `prisma` | Shared PrismaClient instance (named export). | — | (PrismaClient) |
| `prisma` (default) | Default export of the PrismaClient instance. | — | (PrismaClient) |

**Usage Example**

```js
import prisma from '../backend/src/lib/prisma.js';

const paperCount = await prisma.paper.count();
```

### `backend/src/lib/s3.js`

| Export | Description | Parameters | Returns |
| --- | --- | --- | --- |
| `getPresignedUploadUrl` | Generate a presigned URL for uploading a PDF | `key` (string) – S3 object key (e.g., "papers/{userId}/{paperId}/{filename}")<br>`contentType` (string) – MIME type (e.g., "application/pdf")<br>`contentLength` (number) – File size in bytes | (Promise<string>) Presigned URL for upload |
| `getPresignedDownloadUrl` | Generate a presigned URL for downloading a PDF | `key` (string) – S3 object key | (Promise<string>) Presigned URL for download |
| `generatePdfKey` | Generate S3 key for a paper's PDF | `userId` (number) – User ID<br>`paperId` (number) – Paper ID<br>`filename` (string) – Original filename | (string) S3 object key |
| `getS3ObjectStream` | Get S3 object as a stream (for proxying to client) | `key` (string) – S3 object key | (Promise<ReadableStream>) Stream of the S3 object |
| `extractS3Key` | Extract S3 key from a full S3 URL or key string | `urlOrKey` (string) – S3 URL or key | (string) S3 object key |
| `uploadFileToS3` | Upload file directly to S3/R2 (server-side upload) Use this instead of presigned URLs to avoid signature mismatch issues | `fileBuffer` (Buffer|Uint8Array|Blob) – File buffer or Blob<br>`key` (string) – S3 object key<br>`contentType` (string) – MIME type (e.g., "application/pdf") | (Promise<void>)  |
| `isS3Configured` | Check if S3 is configured | — | (boolean) True if S3 is configured |

**Usage Example**

```js
import { generatePdfKey, uploadFileToS3 } from '../backend/src/lib/s3.js';

const key = generatePdfKey('user_1', 'paper_42', 'paper.pdf');
await uploadFileToS3(Buffer.from(pdfBytes), key, 'application/pdf');
```
### `backend/src/lib/validation.js`

| Export | Description | Parameters | Returns |
| --- | --- | --- | --- |
| `registerSchema` | — | — | — |
| `loginSchema` | — | — | — |
| `refreshSchema` | — | — | — |
| `verifyEmailSchema` | — | — | — |
| `paperSchema` | — | — | — |
| `paperUpdateSchema` | — | — | — |
| `collectionSchema` | — | — | — |
| `collectionUpdateSchema` | — | — | — |
| `annotationSchema` | — | — | — |
| `annotationUpdateSchema` | — | — | — |
| `incrementalSyncSchema` | — | — | — |
| `validate` | Higher-order middleware to validate requests against zod schemas. | — | — |

**Usage Example**

```js
import { router } from 'express';
import { validate, paperSchema } from '../backend/src/lib/validation.js';
import { createPaper } from '../backend/src/controllers/papers.js';

router.post('/api/papers', validate(paperSchema), createPaper);
```

## Backend Server Bootstrap

### `backend/src/server.js`

| Export | Description | Parameters | Returns |
| --- | --- | --- | --- |
| `app` | Configured Express application (default export) with security, CORS, rate limiting, and API routes wired in. | — | (ExpressApp) |

**Usage Example**

```js
import app from '../backend/src/server.js';

app.listen(3000, () => {
  console.log('API listening on http://localhost:3000');
});
```

## Testing Utilities

### `tests/helpers.js`

| Export | Description | Parameters | Returns |
| --- | --- | --- | --- |
| `createMockPaper` | Create a mock paper object for testing Note: id is not included by default - let IndexedDB auto-generate it | — | — |
| `createMockPapers` | Create multiple mock papers | — | — |
| `createMockCollection` | Create a mock collection Note: id is not included by default - let IndexedDB auto-generate it | — | — |
| `waitFor` | Wait for async operations | — | — |
| `mockFetch` | Mock fetch for DOI API calls | — | — |
| `resetAllMocks` | Reset all mocks | — | — |
| `setMockAuth` | Mock authentication state | — | — |
| `clearMockAuth` | Clear mock authentication state | — | — |
| `setMockSyncEnabled` | Mock cloud sync state | — | — |
| `clearMockSync` | Clear mock sync state | — | — |
| `createMockFetchResponse` | Create a mock fetch response | — | — |
| `createMockAnnotation` | Create a mock annotation object | — | — |

**Usage Example**

```js
import { createMockPaper, mockFetch, resetAllMocks } from '../tests/helpers.js';

beforeEach(() => {
  resetAllMocks();
});

test('renders paper title', async () => {
  const paper = createMockPaper({ title: 'Test Paper' });
  mockFetch({ success: true, data: { papers: [paper] } });
  // ...render component and assert
});
```
## Tooling

### `vitest.config.js`

| Export | Description | Parameters | Returns |
| --- | --- | --- | --- |
| `defineConfig` | — | — | — |

Used by Vitest to configure module resolution. Import in test setup if you need to reuse the same path aliases or coverage thresholds.
