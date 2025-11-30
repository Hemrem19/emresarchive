# Volume 4: The Reference Manual (The Deep Dive)

**Generated from Code Audit** | **Date:** 2025-01-XX  
**Status:** Verified Against Source Code

**Strict Requirement**: "If a function or variable exists in the code, it must exist in this document."

---

## 4.1 Global Variables & Constants

### Application State (`core/state.js`)

**`createAppState()`** - Creates and initializes application state object
- Returns: `Object` with structure:
  ```javascript
  {
    allPapersCache: Array,           // Cached papers list
    collectionsCache: Array,         // Cached collections list
    hasUnsavedChanges: Boolean,       // Form unsaved changes flag
    currentSortBy: String,           // Current sort option
    currentSearchTerm: String,       // Current search query
    currentPath: String,             // Current route path
    currentView: Object|null,        // Current view module
    selectedPaperIds: Set,          // Selected papers for batch ops
    activeFilters: {
      status: String|null,           // Active status filter
      tags: Array                    // Active tag filters
    },
    pagination: {
      currentPage: Number,           // Current page number
      itemsPerPage: Number,          // Items per page
      totalItems: Number,            // Total filtered items
      totalPages: Number            // Total pages
    },
    searchMode: String              // 'all' or 'notes'
  }
  ```

**`persistStateToStorage(key, value)`** - Persists state to localStorage
- Parameters: `key` (String), `value` (Any)
- Returns: `void`

**`clearStorageKey(key)`** - Clears state from localStorage
- Parameters: `key` (String)
- Returns: `void`

### Configuration (`config.js`)

**`DEFAULT_STATUSES`** - Array of default reading statuses
- Value: `['Reading', 'To Read', 'Finished', 'Archived']`

**`API_CONFIG`** - API configuration object
- Properties:
  - `BASE_URL`: String (default: `'https://emresarchive-production.up.railway.app'`)
  - `ACCESS_TOKEN_KEY`: String (`'citavers_access_token'`)
  - `REFRESH_TOKEN_KEY`: String (`'citavers_refresh_token'`)
  - `USER_KEY`: String (`'citavers_user'`)
  - `SYNC_MODE_KEY`: String (`'citavers_sync_mode'`)

**`setApiBaseUrl(url)`** - Updates API base URL
- Parameters: `url` (String)
- Returns: `void`
- Throws: `Error` if URL invalid

**`getApiBaseUrl()`** - Gets current API base URL
- Returns: `String`

**`isCloudSyncEnabled()`** - Checks if cloud sync is enabled
- Returns: `Boolean`

**`setCloudSyncEnabled(enabled)`** - Enables/disables cloud sync
- Parameters: `enabled` (Boolean)
- Returns: `void`

**`getStatusOrder()`** - Gets user-defined status order
- Returns: `Array<String>`

**`saveStatusOrder(newOrder)`** - Saves status order
- Parameters: `newOrder` (Array<String>)
- Returns: `void`

### Database Constants (`db/core.js`)

**`DB_NAME`** - IndexedDB database name
- Value: `'CitaversDB'`

**`DB_VERSION`** - Current database version
- Value: `6`

**`STORE_NAME_PAPERS`** - Papers object store name
- Value: `'papers'`

**`STORE_NAME_COLLECTIONS`** - Collections object store name
- Value: `'collections'`

**`STORE_NAME_ANNOTATIONS`** - Annotations object store name
- Value: `'annotations'`

---

## 4.2 Database Functions

### Database Core (`db/core.js`)

**`openDB()`** - Opens IndexedDB database
- Returns: `Promise<IDBDatabase>`
- Throws: `Error` if IndexedDB not supported or open fails

### Database Adapter (`db/adapter.js`)

**`isCloudSyncAvailable()`** - Checks if cloud sync is available
- Returns: `Boolean`

#### Paper Operations (`db/adapter.js` → `papers`)

**`papers.addPaper(paperData)`** - Adds a new paper
- Parameters: `paperData` (Object)
- Returns: `Promise<Number>` (paper ID)
- Routes to: Cloud API or local IndexedDB

**`papers.getAllPapers()`** - Gets all papers
- Returns: `Promise<Array<Object>>`
- Always reads from local first (offline-first)

**`papers.getPaperById(id)`** - Gets paper by ID
- Parameters: `id` (Number)
- Returns: `Promise<Object|null>`

**`papers.getPaperByDoi(doi)`** - Gets paper by DOI
- Parameters: `doi` (String)
- Returns: `Promise<Object|null>`

**`papers.updatePaper(id, updateData)`** - Updates paper
- Parameters: `id` (Number), `updateData` (Object)
- Returns: `Promise<Object>`
- Optimistic UI: Updates local immediately, syncs in background

**`papers.deletePaper(id)`** - Deletes paper
- Parameters: `id` (Number)
- Returns: `Promise<void>`
- Optimistic UI: Deletes local immediately, syncs in background

**`papers.batchOperations(operations)`** - Performs batch operations
- Parameters: `operations` (Array<Object>)
- Returns: `Promise<Array<Object>>`
- Operations format: `[{type: 'update'|'delete', id: Number, data?: Object}]`

**`papers.searchPapers(query, options)`** - Searches papers locally
- Parameters: `query` (String), `options` (Object, optional)
- Returns: `Promise<Array<Object>>`

**`papers.getUploadUrl(options)`** - Gets S3 upload URL
- Parameters: `options` (Object: `{filename, size, contentType, paperId}`)
- Returns: `Promise<Object>` (`{uploadUrl, s3Key}`)
- Requires: Cloud sync enabled

**`papers.uploadPdf(uploadUrl, file)`** - Uploads PDF to S3
- Parameters: `uploadUrl` (String), `file` (File)
- Returns: `Promise<void>`
- Requires: Cloud sync enabled

**`papers.getPdfDownloadUrl(paperId)`** - Gets PDF download URL
- Parameters: `paperId` (Number)
- Returns: `Promise<String>` (presigned URL)
- Requires: Cloud sync enabled

#### Collection Operations (`db/adapter.js` → `collections`)

**`collections.addCollection(collectionData)`** - Adds collection
- Parameters: `collectionData` (Object)
- Returns: `Promise<Number>` (collection ID)

**`collections.getAllCollections()`** - Gets all collections
- Returns: `Promise<Array<Object>>`

**`collections.getCollectionById(id)`** - Gets collection by ID
- Parameters: `id` (Number)
- Returns: `Promise<Object|null>`

**`collections.updateCollection(id, updateData)`** - Updates collection
- Parameters: `id` (Number), `updateData` (Object)
- Returns: `Promise<Number>`

**`collections.deleteCollection(id)`** - Deletes collection
- Parameters: `id` (Number)
- Returns: `Promise<void>`

#### Annotation Operations (`db/adapter.js` → `annotations`)

**`annotations.addAnnotation(annotationData)`** - Adds annotation
- Parameters: `annotationData` (Object)
- Returns: `Promise<Number>` (annotation ID)

**`annotations.getAnnotationsByPaperId(paperId)`** - Gets annotations for paper
- Parameters: `paperId` (Number)
- Returns: `Promise<Array<Object>>`

**`annotations.getAnnotationById(id)`** - Gets annotation by ID
- Parameters: `id` (Number)
- Returns: `Promise<Object|null>`

**`annotations.updateAnnotation(id, updateData)`** - Updates annotation
- Parameters: `id` (Number), `updateData` (Object)
- Returns: `Promise<Number>`

**`annotations.deleteAnnotation(id)`** - Deletes annotation
- Parameters: `id` (Number)
- Returns: `Promise<void>`

**`annotations.deleteAnnotationsByPaperId(paperId)`** - Deletes all annotations for paper
- Parameters: `paperId` (Number)
- Returns: `Promise<void>`

### Database Entry Point (`db.js`)

All functions from `db/adapter.js` are re-exported for convenience:

- `addPaper`, `getAllPapers`, `getPaperById`, `getPaperByDoi`
- `updatePaper`, `deletePaper`, `batchOperations`
- `searchPapers`, `getUploadUrl`, `uploadPdf`, `getPdfDownloadUrl`
- `addCollection`, `getAllCollections`, `getCollectionById`
- `updateCollection`, `deleteCollection`
- `addAnnotation`, `getAnnotationsByPaperId`, `getAnnotationById`
- `updateAnnotation`, `deleteAnnotation`, `deleteAnnotationsByPaperId`
- `exportAllData`, `importData`, `clearAllData` (from `db/data.js`)
- `performSync`, `performFullSync`, `performIncrementalSync` (from `db/sync.js`)
- `getSyncStatusInfo`, `getPendingChanges` (from `db/sync.js`)
- `trackPaperCreated`, `trackPaperUpdated`, `trackPaperDeleted` (from `db/sync.js`)
- `trackCollectionCreated`, `trackCollectionUpdated`, `trackCollectionDeleted` (from `db/sync.js`)
- `trackAnnotationCreated`, `trackAnnotationUpdated`, `trackAnnotationDeleted` (from `db/sync.js`)
- `deduplicateLocalPapers` (from `db/sync.js`)
- `isCloudSyncAvailable` (from `db/adapter.js`)

### Sync Functions (`db/sync.js`)

**`getPendingChanges()`** - Gets pending sync changes
- Returns: `Object` with `papers`, `collections`, `annotations` arrays

**`trackPaperCreated(paper)`** - Tracks paper creation for sync
- Parameters: `paper` (Object)
- Returns: `void`

**`trackPaperUpdated(id, paper)`** - Tracks paper update for sync
- Parameters: `id` (Number), `paper` (Object)
- Returns: `void`

**`trackPaperDeleted(id)`** - Tracks paper deletion for sync
- Parameters: `id` (Number)
- Returns: `void`

**`trackCollectionCreated(collection)`** - Tracks collection creation
- Parameters: `collection` (Object)
- Returns: `void`

**`trackCollectionUpdated(id, collection)`** - Tracks collection update
- Parameters: `id` (Number), `collection` (Object)
- Returns: `void`

**`trackCollectionDeleted(id)`** - Tracks collection deletion
- Parameters: `id` (Number)
- Returns: `void`

**`trackAnnotationCreated(annotation)`** - Tracks annotation creation
- Parameters: `annotation` (Object)
- Returns: `void`

**`trackAnnotationUpdated(id, annotation)`** - Tracks annotation update
- Parameters: `id` (Number), `annotation` (Object)
- Returns: `void`

**`trackAnnotationDeleted(id)`** - Tracks annotation deletion
- Parameters: `id` (Number)
- Returns: `void`

**`isSyncInProgress()`** - Checks if sync is in progress
- Returns: `Boolean`

**`performFullSync()`** - Performs full sync with backend
- Returns: `Promise<void>`

**`performIncrementalSync()`** - Performs incremental sync
- Returns: `Promise<void>`

**`performSync()`** - Performs sync (full or incremental)
- Returns: `Promise<void>`

**`deduplicateLocalPapers()`** - Removes duplicate papers locally
- Returns: `Promise<void>`

**`getSyncStatusInfo()`** - Gets sync status information
- Returns: `Promise<Object>`

### Data Management (`db/data.js`)

**`exportAllData()`** - Exports all data as JSON
- Returns: `Promise<Object>` with `papers`, `collections`, `annotations`

**`importData(data)`** - Imports data from JSON
- Parameters: `data` (Object)
- Returns: `Promise<void>`

**`clearAllData()`** - Clears all local data
- Returns: `Promise<void>`

---

## 4.3 API Client Functions

### Authentication API (`api/auth.js`)

**`getAccessToken()`** - Gets stored access token
- Returns: `String|null`

**`getUser()`** - Gets stored user data
- Returns: `Object|null`

**`setAuth(accessToken, user)`** - Stores auth tokens and user
- Parameters: `accessToken` (String), `user` (Object)
- Returns: `void`

**`clearAuth()`** - Clears auth tokens and user
- Returns: `void`

**`isAuthenticated()`** - Checks if user is authenticated
- Returns: `Boolean`

**`register(data)`** - Registers new user
- Parameters: `data` (Object: `{email, password, name?}`)
- Returns: `Promise<Object>` (user data)
- API: `POST /api/auth/register`

**`login(data)`** - Logs in user
- Parameters: `data` (Object: `{email, password}`)
- Returns: `Promise<Object>` (user data and tokens)
- API: `POST /api/auth/login`

**`logout()`** - Logs out user
- Returns: `Promise<void>`
- API: `POST /api/auth/logout`

**`refreshToken()`** - Refreshes access token
- Returns: `Promise<String>` (new access token)
- API: `POST /api/auth/refresh`

**`verifyEmail(token)`** - Verifies email address
- Parameters: `token` (String)
- Returns: `Promise<void>`
- API: `POST /api/auth/verify-email`

**`resendVerificationEmail()`** - Resends verification email
- Returns: `Promise<void>`
- API: `POST /api/auth/resend-verification`

**`getCurrentUser()`** - Gets current user data
- Returns: `Promise<Object>`
- API: `GET /api/auth/me`

### Papers API (`api/papers.js`)

**`getAllPapers(options)`** - Gets all papers from backend
- Parameters: `options` (Object, optional)
- Returns: `Promise<Array<Object>>`
- API: `GET /api/papers`

**`getPaper(id)`** - Gets paper by ID
- Parameters: `id` (Number)
- Returns: `Promise<Object>`
- API: `GET /api/papers/:id`

**`createPaper(paperData)`** - Creates paper
- Parameters: `paperData` (Object)
- Returns: `Promise<Object>` (created paper)
- API: `POST /api/papers`

**`updatePaper(id, updateData)`** - Updates paper
- Parameters: `id` (Number), `updateData` (Object)
- Returns: `Promise<Object>` (updated paper)
- API: `PUT /api/papers/:id`

**`deletePaper(id)`** - Deletes paper
- Parameters: `id` (Number)
- Returns: `Promise<void>`
- API: `DELETE /api/papers/:id`

**`searchPapers(query, options)`** - Searches papers
- Parameters: `query` (String), `options` (Object, optional)
- Returns: `Promise<Array<Object>>`
- API: `GET /api/papers/search?q=...`

**`getUploadUrl(options)`** - Gets S3 presigned upload URL
- Parameters: `options` (Object: `{filename, size, contentType, paperId?}`)
- Returns: `Promise<Object>` (`{uploadUrl, s3Key, fields}`)
- API: `POST /api/papers/upload-url`

**`uploadPdfViaBackend(file, paperId)`** - Uploads PDF via backend
- Parameters: `file` (File), `paperId` (Number, optional)
- Returns: `Promise<Object>` (`{s3Key, paperId}`)
- API: `POST /api/papers/upload`

**`uploadPdf(uploadUrl, file, fields)`** - Uploads PDF to S3
- Parameters: `uploadUrl` (String), `file` (File), `fields` (Object, optional)
- Returns: `Promise<void>`

**`getPdfDownloadUrl(paperId)`** - Gets PDF download URL
- Parameters: `paperId` (Number)
- Returns: `Promise<String>` (presigned URL)
- API: `GET /api/papers/:id/pdf`

**`getPdfViewUrl(paperId)`** - Gets PDF view URL (proxy)
- Parameters: `paperId` (Number)
- Returns: `Promise<String>` (proxy URL)
- API: `GET /api/papers/:id/pdf-proxy`

**`batchOperations(operations)`** - Performs batch operations
- Parameters: `operations` (Array<Object>)
- Returns: `Promise<Array<Object>>` (results)
- API: `POST /api/papers/batch`

### Collections API (`api/collections.js`)

**`getAllCollections()`** - Gets all collections
- Returns: `Promise<Array<Object>>`
- API: `GET /api/collections`

**`getCollection(id)`** - Gets collection by ID
- Parameters: `id` (Number)
- Returns: `Promise<Object>`
- API: `GET /api/collections/:id`

**`createCollection(collectionData)`** - Creates collection
- Parameters: `collectionData` (Object)
- Returns: `Promise<Object>`
- API: `POST /api/collections`

**`updateCollection(id, updateData)`** - Updates collection
- Parameters: `id` (Number), `updateData` (Object)
- Returns: `Promise<Object>`
- API: `PUT /api/collections/:id`

**`deleteCollection(id)`** - Deletes collection
- Parameters: `id` (Number)
- Returns: `Promise<void>`
- API: `DELETE /api/collections/:id`

### Annotations API (`api/annotations.js`)

**`getAnnotations(paperId)`** - Gets annotations for paper
- Parameters: `paperId` (Number)
- Returns: `Promise<Array<Object>>`
- API: `GET /api/papers/:id/annotations`

**`getAnnotation(id)`** - Gets annotation by ID
- Parameters: `id` (Number)
- Returns: `Promise<Object>`
- API: `GET /api/annotations/:id`

**`createAnnotation(paperId, annotationData)`** - Creates annotation
- Parameters: `paperId` (Number), `annotationData` (Object)
- Returns: `Promise<Object>`
- API: `POST /api/papers/:id/annotations`

**`updateAnnotation(id, updateData)`** - Updates annotation
- Parameters: `id` (Number), `updateData` (Object)
- Returns: `Promise<Object>`
- API: `PUT /api/annotations/:id`

**`deleteAnnotation(id)`** - Deletes annotation
- Parameters: `id` (Number)
- Returns: `Promise<void>`
- API: `DELETE /api/annotations/:id`

### Sync API (`api/sync.js`)

**`getClientId()`** - Gets or generates client ID
- Returns: `String`

**`getLastSyncedAt()`** - Gets last sync timestamp
- Returns: `Number|null`

**`setLastSyncedAt(timestamp)`** - Sets last sync timestamp
- Parameters: `timestamp` (Number)
- Returns: `void`

**`apiRequest(url, options)`** - Makes authenticated API request
- Parameters: `url` (String), `options` (Object)
- Returns: `Promise<Response>`

**`fullSync()`** - Performs full sync
- Returns: `Promise<Object>` (sync result)
- API: `GET /api/sync/full`

**`incrementalSync(localChanges)`** - Performs incremental sync
- Parameters: `localChanges` (Object)
- Returns: `Promise<Object>` (sync result)
- API: `POST /api/sync/incremental`

**`getSyncStatus()`** - Gets sync status
- Returns: `Promise<Object>`
- API: `GET /api/sync/status`

### User API (`api/user.js`)

**`clearAllUserData()`** - Clears all user data (cloud)
- Returns: `Promise<void>`
- API: `DELETE /api/user/data`

### Import API (`api/import.js`)

**`batchImport(data)`** - Imports data in batch
- Parameters: `data` (Object: `{papers, collections, annotations}`)
- Returns: `Promise<Object>` (import result)
- API: `POST /api/import/batch-import`

### Network API (`api/network.js`)

**`generateNetwork()`** - Generates network graph
- Returns: `Promise<Object>` (network data)
- API: `POST /api/networks/auto-generate`

**`getNetwork(id)`** - Gets network graph
- Parameters: `id` (String)
- Returns: `Promise<Object>` (network data)
- API: `GET /api/networks/:id`

**`getUserNetworks()`** - Gets user's networks
- Returns: `Promise<Array<Object>>`
- API: `GET /api/networks`

### ArXiv API (`api/arxiv.js`)

**`fetchArxivMetadata(arxivId, options)`** - Fetches ArXiv metadata
- Parameters: `arxivId` (String), `options` (Object, optional)
- Returns: `Promise<Object>` (paper metadata)
- External API: ArXiv API

### API Utilities (`api/utils.js`)

**`isRateLimited()`** - Checks if rate limited
- Returns: `Boolean`

**`setRateLimit(retryAfterSeconds)`** - Sets rate limit state
- Parameters: `retryAfterSeconds` (Number|null)
- Returns: `void`

**`clearRateLimit()`** - Clears rate limit state
- Returns: `void`

**`getRateLimitRemainingTime()`** - Gets remaining rate limit time
- Returns: `Number` (milliseconds)

**`parseJsonResponse(response)`** - Parses JSON response with error handling
- Parameters: `response` (Response)
- Returns: `Promise<Object>`

**`withRateLimitCheck(apiFunc)`** - Wraps API function with rate limit check
- Parameters: `apiFunc` (Function)
- Returns: `Promise<Any>`

**`createApiError(message, status, details)`** - Creates API error object
- Parameters: `message` (String), `status` (Number|null), `details` (Any|null)
- Returns: `Error`

---

## 4.4 UI Helper Functions

### UI Utilities (`ui.js`)

**`escapeHtml(unsafe)`** - Escapes HTML special characters
- Parameters: `unsafe` (String)
- Returns: `String`

**`showToast(message, type, options)`** - Shows toast notification
- Parameters:
  - `message` (String)
  - `type` (String: `'success'|'error'|'warning'|'info'`)
  - `options` (Object: `{duration?: Number, actions?: Array}`)
- Returns: `void`

**`formatRelativeTime(date)`** - Formats date as relative time
- Parameters: `date` (Date|String|Number)
- Returns: `String` (e.g., "2 days ago")

**`sortPapers(papers, sortBy)`** - Sorts papers array
- Parameters: `papers` (Array), `sortBy` (String)
- Returns: `Array` (sorted)

**`renderPaperList(papers, searchTerm, selectedIds)`** - Renders paper list HTML
- Parameters: `papers` (Array), `searchTerm` (String), `selectedIds` (Set)
- Returns: `String` (HTML)

**`renderSidebarTags(papers)`** - Renders sidebar tags
- Parameters: `papers` (Array)
- Returns: `void` (updates DOM)

**`renderSidebarCollections(collections)`** - Renders sidebar collections
- Parameters: `collections` (Array)
- Returns: `void` (updates DOM)

**`highlightActiveSidebarLink()`** - Highlights active sidebar link
- Returns: `void`

---

## 4.5 Core Module Functions

### Router (`core/router.js`)

**`renderView(app, viewContent, setupFn)`** - Renders view
- Parameters:
  - `app` (HTMLElement)
  - `viewContent` (String, HTML)
  - `setupFn` (Function|null)
- Returns: `void`

**`handleBeforeUnload(event, appState)`** - Handles beforeunload event
- Parameters: `event` (Event), `appState` (Object)
- Returns: `String|undefined`

**`createRouter(app, appState, renderSidebarStatusLinks)`** - Creates router function
- Parameters:
  - `app` (HTMLElement)
  - `appState` (Object)
  - `renderSidebarStatusLinks` (Function)
- Returns: `Function` (router function)

**`initializeRouter(router)`** - Initializes router event listeners
- Parameters: `router` (Function)
- Returns: `void`

### Filters (`core/filters.js`)

**`parseUrlHash(appState)`** - Parses URL hash and updates filters
- Parameters: `appState` (Object)
- Returns: `void`

**`updateUrlHash(appState)`** - Updates URL hash from appState
- Parameters: `appState` (Object)
- Returns: `void`

**`applyFiltersAndRender(appState)`** - Applies filters and renders dashboard
- Parameters: `appState` (Object)
- Returns: `Promise<void>`

### Command Palette (`core/commandPalette.js`)

**`createCommandPalette(appState)`** - Creates command palette
- Parameters: `appState` (Object)
- Returns: `Object` with `init()`, `open()`, `close()` methods

### Keyboard Shortcuts (`core/keyboardShortcuts.js`)

**`createKeyboardShortcuts(commandPalette, appState)`** - Creates keyboard shortcuts
- Parameters: `commandPalette` (Object), `appState` (Object)
- Returns: `Object` with `init()` method

### Sync Manager (`core/syncManager.js`)

**`triggerDebouncedSync()`** - Triggers debounced sync (500ms delay)
- Returns: `void`

**`initializeAutoSync()`** - Initializes automatic sync
- Returns: `void`

**`stopAutoSync()`** - Stops automatic sync
- Returns: `void`

**`restartAutoSync()`** - Restarts automatic sync
- Returns: `void`

**`performManualSync()`** - Performs manual sync
- Returns: `Promise<void>`

---

## 4.6 Citation Functions

### Citation Generator (`citation.js`)

**`generateCitation(paper, format)`** - Generates citation
- Parameters: `paper` (Object), `format` (String: `'apa'|'mla'|'chicago'|'bibtex'`)
- Returns: `String` (formatted citation)

**`generateBibliography(papers, format)`** - Generates bibliography
- Parameters: `papers` (Array), `format` (String)
- Returns: `String` (formatted bibliography)

---

## 4.7 View Module Functions

### View Modules (All `*.view.js` files)

Each view module exports an object with:
- `mount(params, appState)` - Mounts view, sets up event listeners
- `unmount(appState)` - Unmounts view, cleans up event listeners

**View Modules**:
- `dashboard.view.js` → `dashboardView`
- `form.view.js` → `formView`
- `details/index.js` → `detailsView`
- `settings.view.js` → `settingsView`
- `graph.view.js` → `graphView`
- `docs.view.js` → `docsView`
- `auth.view.js` → `authView`

---

## 4.8 Backend API Endpoints

### Authentication Routes (`/api/auth`)

- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `POST /api/auth/logout` - Logout user (protected)
- `POST /api/auth/refresh` - Refresh access token
- `POST /api/auth/verify-email` - Verify email address
- `POST /api/auth/resend-verification` - Resend verification email (protected)
- `POST /api/auth/forgot-password` - Request password reset
- `POST /api/auth/reset-password` - Reset password
- `GET /api/auth/me` - Get current user (protected)

### Papers Routes (`/api/papers`)

- `GET /api/papers` - Get all papers (protected)
- `GET /api/papers/search` - Search papers (protected)
- `GET /api/papers/:id` - Get paper by ID (protected)
- `POST /api/papers` - Create paper (protected)
- `PUT /api/papers/:id` - Update paper (protected)
- `DELETE /api/papers/:id` - Delete paper (protected)
- `POST /api/papers/batch` - Batch operations (protected)
- `GET /api/papers/:id/annotations` - Get paper annotations (protected)
- `POST /api/papers/:id/annotations` - Create annotation (protected)
- `POST /api/papers/upload` - Upload PDF directly (protected)
- `POST /api/papers/upload-url` - Get S3 upload URL (protected)
- `GET /api/papers/:id/pdf` - Get PDF download URL (protected)
- `GET /api/papers/:id/pdf-proxy` - Proxy PDF stream (protected)

### Collections Routes (`/api/collections`)

- `GET /api/collections` - Get all collections (protected)
- `GET /api/collections/:id` - Get collection by ID (protected)
- `POST /api/collections` - Create collection (protected)
- `PUT /api/collections/:id` - Update collection (protected)
- `DELETE /api/collections/:id` - Delete collection (protected)

### Annotations Routes (`/api/annotations`)

- `GET /api/annotations/:id` - Get annotation by ID (protected)
- `PUT /api/annotations/:id` - Update annotation (protected)
- `DELETE /api/annotations/:id` - Delete annotation (protected)

### Sync Routes (`/api/sync`)

- `GET /api/sync/full` - Full sync (protected)
- `POST /api/sync/incremental` - Incremental sync (protected)
- `GET /api/sync/status` - Get sync status (protected)

### User Routes (`/api/user`)

- `GET /api/user/stats` - Get user statistics (protected)
- `GET /api/user/sessions` - Get user sessions (protected)
- `DELETE /api/user/sessions/:id` - Revoke session (protected)
- `PUT /api/user/settings` - Update user settings (protected)
- `DELETE /api/user/data` - Clear all user data (protected)

### Import Routes (`/api/import`)

- `POST /api/import/batch-import` - Batch import data (protected)

### Extension Routes (`/api/extension`)

- `POST /api/extension/save` - Save paper from extension (protected)

### Network Routes (`/api/networks`)

- `POST /api/networks/auto-generate` - Generate network graph (protected)
- `GET /api/networks` - Get user's networks (protected)
- `GET /api/networks/:id` - Get network graph (protected)

### Health Check

- `GET /health` - Health check endpoint (public)

---

## 4.9 Database Schemas

### IndexedDB Schema

**Database**: `CitaversDB` (Version 6)

**Object Store**: `papers`
- Key: `id` (auto-increment)
- Indexes: `title`, `authors`, `year`, `tags`, `relatedPaperIds`, `doi`, `rating`
- Fields: See Volume 3, Section 3.5

**Object Store**: `collections`
- Key: `id` (auto-increment)
- Indexes: `name`, `createdAt`
- Fields: See Volume 3, Section 3.5

**Object Store**: `annotations`
- Key: `id` (auto-increment)
- Indexes: `paperId`, `type`, `pageNumber`, `createdAt`
- Fields: See Volume 3, Section 3.5

### PostgreSQL Schema (Prisma)

See `backend/prisma/schema.prisma` for complete schema.

**Tables**:
- `users` - User accounts
- `papers` - Paper records
- `collections` - Collections
- `annotations` - Annotations
- `sessions` - JWT sessions
- `sync_logs` - Sync logs
- `paper_connections` - Paper relationships
- `citation_cache` - Citation cache
- `network_graphs` - Network graphs

---

## 4.10 Utility Functions

### Component Utilities

**`createRatingInput(options)`** (`components/rating-input.js`)
- Parameters: `options` (Object: `{value, onChange, maxRating?}`)
- Returns: `HTMLElement` (rating input component)

### Details View Managers

**`notesManager`** (`details/notes.manager.js`)
- Methods: `init()`, `save()`, `load()`

**`relatedManager`** (`details/related.manager.js`)
- Methods: `init()`, `load()`, `link()`, `unlink()`

**`summaryManager`** (`details/summary.manager.js`)
- Methods: `init()`, `save()`, `load()`

### Dashboard Handlers

**`createBatchStatusChangeHandler(appState, applyFiltersAndRender)`** (`dashboard/handlers/batch-operations.js`)
- Returns: `Function` (event handler)

**`createBatchAddTagsHandler(appState, applyFiltersAndRender)`**
- Returns: `Function` (event handler)

**`createBatchRemoveTagsHandler(appState, applyFiltersAndRender)`**
- Returns: `Function` (event handler)

**`createBatchDeleteHandler(appState, applyFiltersAndRender, updateBatchToolbar)`**
- Returns: `Function` (event handler)

**`createBatchExportBibliographyHandler(appState)`**
- Returns: `Function` (event handler)

**`registerBatchOperationHandlers(appState, applyFiltersAndRender, updateBatchToolbar)`**
- Returns: `Object` (handlers object)

**`unregisterBatchOperationHandlers(handlers)`**
- Parameters: `handlers` (Object)
- Returns: `void`

---

## 4.11 Constants & Configuration

### Service Worker (`service-worker.js`)

**`CACHE_NAME`** - Service worker cache name
- Value: `'citavers-v1'`

**`ASSETS_TO_CACHE`** - Assets to cache on install
- Value: `Array<String>` (file paths)

### Build Configuration (`build.js`)

**`FILES_TO_COPY`** - Files to copy to dist/
**`DIRS_TO_COPY`** - Directories to copy recursively

---

**End of Volume 4**


