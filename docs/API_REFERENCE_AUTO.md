# Public API Inventory (Auto-generated Base)

> This file is generated to assist with documentation. Review and enhance descriptions and usage examples as needed.

## Frontend API Clients (`api/`)

### `api/annotations.js`

| Export | Description | Parameters | Returns |
| --- | --- | --- | --- |
| `getAnnotations` | Gets all annotations for a paper. | `paperId` (number|string) – The paper ID. | (Promise<Array>) Promise resolving to array of annotations. |
| `getAnnotation` | Gets a single annotation by ID. | `id` (number|string) – The annotation ID. | (Promise<Object>) Promise resolving to annotation object. |
| `createAnnotation` | Creates a new annotation for a paper. | `paperId` (number|string) – The paper ID.<br>`annotationData` (Object) – Annotation data { type, pageNumber, position, content, color }. | (Promise<Object>) Promise resolving to created annotation object. |
| `updateAnnotation` | Updates an existing annotation. | `id` (number|string) – The annotation ID.<br>`updateData` (Object) – Fields to update. | (Promise<Object>) Promise resolving to updated annotation object. |
| `deleteAnnotation` | Deletes an annotation (soft delete). | `id` (number|string) – The annotation ID. | (Promise<void>)  |

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

### `api/collections.js`

| Export | Description | Parameters | Returns |
| --- | --- | --- | --- |
| `getAllCollections` | Gets all collections. | — | (Promise<Array>) Promise resolving to array of collections. |
| `getCollection` | Gets a single collection by ID. | `id` (number|string) – The collection ID. | (Promise<Object>) Promise resolving to collection object. |
| `createCollection` | Creates a new collection. | `collectionData` (Object) – Collection data { name, icon, color, filters }. | (Promise<Object>) Promise resolving to created collection object. |
| `updateCollection` | Updates an existing collection. | `id` (number|string) – The collection ID.<br>`updateData` (Object) – Fields to update. | (Promise<Object>) Promise resolving to updated collection object. |
| `deleteCollection` | Deletes a collection (soft delete). | `id` (number|string) – The collection ID. | (Promise<void>)  |

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

### `api/user.js`

| Export | Description | Parameters | Returns |
| --- | --- | --- | --- |
| `clearAllUserData` | Clear all user data (papers, collections, annotations) | — | (Promise<Object>) Response with deletion counts |

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

## Frontend Core Services (`core/`)

### `core/commandPalette.js`

| Export | Description | Parameters | Returns |
| --- | --- | --- | --- |
| `createCommandPalette` | Creates and manages the command palette for quick navigation | `appState` (Object) – Application state object | (Object) Command palette instance with methods |

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

### `core/keyboardShortcuts.js`

| Export | Description | Parameters | Returns |
| --- | --- | --- | --- |
| `createKeyboardShortcuts` | Creates and manages global keyboard shortcuts | `commandPalette` (Object) – Command palette instance | (Object) Keyboard shortcuts instance with methods |

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

### `core/state.js`

| Export | Description | Parameters | Returns |
| --- | --- | --- | --- |
| `createAppState` | Creates and initializes the application state object. State includes papers cache, filters, pagination, search, and user preferences. | — | (Object) The initialized application state |
| `persistStateToStorage` | Persists specific state values to localStorage | `key` (string) – The localStorage key<br>`value` (*) – The value to store
 | — |
| `clearStorageKey` | Clears specific state values from localStorage | `key` (string) – The localStorage key to clear
 | — |

### `core/syncManager.js`

| Export | Description | Parameters | Returns |
| --- | --- | --- | --- |
| `triggerDebouncedSync` | Debounced sync trigger - syncs after a delay when triggered. Useful for syncing after CRUD operations without overwhelming the server. | — | — |
| `initializeAutoSync` | Initializes automatic sync on app load. Performs initial sync after a short delay to allow app to initialize. | — | — |
| `stopAutoSync` | Stops all automatic sync operations. Useful when user disables cloud sync or logs out. | — | — |
| `restartAutoSync` | Restarts automatic sync (e.g., when user enables cloud sync). | — | — |
| `performManualSync` | Performs immediate sync (manual trigger). Shows notification with sync results. | — | — |

## Frontend Dashboard Handlers

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

### `dashboard/handlers/pagination.js`

| Export | Description | Parameters | Returns |
| --- | --- | --- | --- |
| `createItemsPerPageChangeHandler` | Creates items per page change handler | `appState` (Object) – Application state<br>`applyFiltersAndRender` (Function) – Function to re-render the dashboard | (Function) Event handler for items per page change |
| `createSortChangeHandler` | Creates sort change handler | `appState` (Object) – Application state<br>`applyFiltersAndRender` (Function) – Function to re-render the dashboard | (Function) Event handler for sort change |
| `registerPaginationHandlers` | Registers pagination and sort event listeners | `appState` (Object) – Application state<br>`applyFiltersAndRender` (Function) – Function to re-render the dashboard | (Object) Object containing handler functions for cleanup |
| `unregisterPaginationHandlers` | Unregisters pagination and sort event listeners | `handlers` (Object) – Object containing handler functions
 | — |

### `dashboard/handlers/paper-list.js`

| Export | Description | Parameters | Returns |
| --- | --- | --- | --- |
| `createPaperListClickHandler` | Creates paper list click handler (expand notes, checkboxes, delete) | `appState` (Object) – Application state<br>`applyFiltersAndRender` (Function) – Function to re-render the dashboard<br>`updateBatchToolbar` (Function) – Function to update batch toolbar UI | (Function) Event handler for paper list clicks |
| `createPaperListChangeHandler` | Creates paper list change handler (status select) | `appState` (Object) – Application state<br>`applyFiltersAndRender` (Function) – Function to re-render the dashboard | (Function) Event handler for paper list changes |
| `registerPaperListHandlers` | Registers paper list event listeners | `appState` (Object) – Application state<br>`applyFiltersAndRender` (Function) – Function to re-render the dashboard<br>`updateBatchToolbar` (Function) – Function to update batch toolbar UI | (Object) Object containing handler functions for cleanup |
| `unregisterPaperListHandlers` | Unregisters paper list event listeners | `handlers` (Object) – Object containing handler functions
 | — |

### `dashboard/handlers/quick-add.js`

| Export | Description | Parameters | Returns |
| --- | --- | --- | --- |
| `createQuickAddHandler` | Creates quick add form submission handler | `appState` (Object) – Application state<br>`applyFiltersAndRender` (Function) – Function to re-render the dashboard | (Function) Event handler for quick add form |
| `registerQuickAddHandler` | Registers quick add form event listener | `appState` (Object) – Application state<br>`applyFiltersAndRender` (Function) – Function to re-render the dashboard | (Object) Object containing handler function for cleanup |
| `unregisterQuickAddHandler` | Unregisters quick add form event listener | `handlers` (Object) – Object containing handler function
 | — |

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

## Frontend Dashboard Services

### `dashboard/services/error-handler.js`

| Export | Description | Parameters | Returns |
| --- | --- | --- | --- |
| `handleOperationError` | Handles operation errors with consistent messaging and logging | `error` (Error) – The error object<br>`context` (string) – Context where the error occurred (e.g., 'batch delete', 'update status')<br>`options` (Object) – Configuration options<br>`options.showToast` (boolean) – Show toast notification (default: true)<br>`options.logToConsole` (boolean) – Log to console (default: true)<br>`options.fallbackMessage` (string) – Custom fallback message | (string) The error message that was displayed/logged |
| `createErrorMessage` | Creates a user-friendly error message based on error type | `error` (Error) – The error object<br>`context` (string) – Context where the error occurred | (string) User-friendly error message |
| `shouldRetry` | Determines if an operation should be retried based on error type | `error` (Error) – The error object | (boolean) True if operation should be retried |
| `withErrorHandling` | Wraps an async operation with error handling | `operation` (Function) – Async function to execute<br>`context` (string) – Context description<br>`options` (Object) – Error handling options | (Promise<{success: boolean, data?: any, error?: Error) >} |
| `handleBatchErrors` | Handles multiple errors from batch operations | `` () – {Array<{paperId: number, error: Error}>} errors - Array of error objects<br>`context` (string) – Context where errors occurred | (string) Summary message |

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

## Frontend Dashboard UI

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

## Frontend Dashboard Utilities

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

## Frontend Views & Components

### `auth.view.js`

| Export | Description | Parameters | Returns |
| --- | --- | --- | --- |
| `authView` | — | — | — |

### `dashboard.view.js`

| Export | Description | Parameters | Returns |
| --- | --- | --- | --- |
| `dashboardView` | — | — | — |

### `details.view.js`

| Export | Description | Parameters | Returns |
| --- | --- | --- | --- |
| `detailsView` | — | — | — |

### `docs.view.js`

| Export | Description | Parameters | Returns |
| --- | --- | --- | --- |
| `docsView` | Documentation view module Provides comprehensive user guide and onboarding experience | — | — |

### `form.view.js`

| Export | Description | Parameters | Returns |
| --- | --- | --- | --- |
| `formView` | — | — | — |

### `graph.view.js`

| Export | Description | Parameters | Returns |
| --- | --- | --- | --- |
| `graphView` | — | — | — |

### `settings.view.js`

| Export | Description | Parameters | Returns |
| --- | --- | --- | --- |
| `settingsView` | — | — | — |

### `views.js`

| Export | Description | Parameters | Returns |
| --- | --- | --- | --- |
| `views` | — | — | — |

## Frontend Data Layer (`db/`)

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

### `db/adapter.js`

| Export | Description | Parameters | Returns |
| --- | --- | --- | --- |
| `papers` | — | — | — |
| `collections` | Collection operations adapter | — | — |
| `annotations` | Annotation operations adapter | — | — |
| `isCloudSyncAvailable` | Checks if cloud sync is available. | — | (boolean) True if cloud sync is enabled and user is authenticated. |

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

## Frontend Utilities

### `api.js`

| Export | Description | Parameters | Returns |
| --- | --- | --- | --- |
| `normalizePaperIdentifier` | Normalizes input to extract DOI from various URL formats. Supports: - Direct DOI: "10.1234/example" - doi.org URLs: "https://doi.org/10.1234/example" - Publisher URLs: "https://publisher.com/article/doi/10.1234/example" - arXiv URLs: Detects but doesn't support (returns helpful error) | `input` (string) – DOI, URL, or identifier string. | (Object) Object with { type: 'doi'\|'arxiv'\|'unsupported', value: string, original: string } |
| `fetchDoiMetadata` | Fetches metadata for a given DOI with comprehensive error handling. | `doi` (string) – The DOI to fetch.<br>`options` (Object) – Fetch options.<br>`options.timeout` (number) – Timeout in ms (default: 10000). | (Promise<Object>) A promise that resolves with the structured paper data. |

### `citation.js`

| Export | Description | Parameters | Returns |
| --- | --- | --- | --- |
| `generateCitation` | Generates a citation string for a given paper in a specified format. | `paper` (object) – The paper object.<br>`format` (string) – The citation format ('apa', 'ieee', 'mla', 'chicago', 'harvard', 'vancouver'). | (string) The formatted citation string. |
| `generateBibliography` | Generates a bibliography (references list) from multiple papers. | `papers` (object[]) – Array of paper objects.<br>`format` (string) – The citation format ('apa', 'ieee', 'mla', 'chicago', 'harvard', 'vancouver').<br>`style` (string) – Bibliography style: 'numbered' (1., 2., 3.) or 'alphabetical' (A, B, C). | (string) The formatted bibliography string. |
| `exportBibliographyToFile` | Exports bibliography to a text file. | `bibliography` (string) – The formatted bibliography text.<br>`format` (string) – The citation format used (for filename).
 | — |
| `copyBibliographyToClipboard` | Copies bibliography to clipboard. | `bibliography` (string) – The formatted bibliography text. | (Promise<boolean>) True if successful, false otherwise. |

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

### `import/ris-parser.js`

| Export | Description | Parameters | Returns |
| --- | --- | --- | --- |
| `parseRIS` | Parses a RIS format string and returns an array of paper objects. | `risContent` (string) – The RIS file content as a string. | (Promise<Array>) Array of paper objects ready for import. |

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

## Backend Express Controllers

### `backend/src/controllers/annotations.js`

| Export | Description | Parameters | Returns |
| --- | --- | --- | --- |
| `getAnnotations` | Get Annotations for a Paper GET /api/papers/:id/annotations | — | — |
| `getAnnotation` | Get Single Annotation GET /api/annotations/:id | — | — |
| `createAnnotation` | Create Annotation POST /api/papers/:id/annotations | — | — |
| `updateAnnotation` | Update Annotation PUT /api/annotations/:id | — | — |
| `deleteAnnotation` | Delete Annotation (Soft Delete) DELETE /api/annotations/:id | — | — |

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

### `backend/src/controllers/collections.js`

| Export | Description | Parameters | Returns |
| --- | --- | --- | --- |
| `getAllCollections` | Get All Collections GET /api/collections | — | — |
| `getCollection` | Get Single Collection GET /api/collections/:id | — | — |
| `createCollection` | Create Collection POST /api/collections | — | — |
| `updateCollection` | Update Collection PUT /api/collections/:id | — | — |
| `deleteCollection` | Delete Collection (Soft Delete) DELETE /api/collections/:id | — | — |

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

### `backend/src/controllers/sync.js`

| Export | Description | Parameters | Returns |
| --- | --- | --- | --- |
| `fullSync` | Full Sync GET /api/sync/full Returns all papers, collections, and annotations for the authenticated user | — | — |
| `incrementalSync` | Incremental Sync POST /api/sync/incremental Receives changes from client and returns changes from server since lastSyncAt Implements conflict resolution (last-write-wins with version tracking) | — | — |
| `getSyncStatus` | Get Sync Status GET /api/sync/status Returns last sync timestamp and sync metadata | — | — |

### `backend/src/controllers/user.js`

| Export | Description | Parameters | Returns |
| --- | --- | --- | --- |
| `getStats` | — | — | — |
| `getSessions` | — | — | — |
| `revokeSession` | — | — | — |
| `updateSettings` | — | — | — |
| `clearAllData` | Clear All User Data DELETE /api/user/data Permanently deletes all papers, collections, and annotations for the authenticated user Uses hard delete to ensure unique constraints don't block re-imports | — | — |

## Backend Express Routes

### `backend/src/routes/annotations.js`

| Export | Description | Parameters | Returns |
| --- | --- | --- | --- |
| `router` | — | — | — |

### `backend/src/routes/auth.js`

| Export | Description | Parameters | Returns |
| --- | --- | --- | --- |
| `router` | — | — | — |

### `backend/src/routes/collections.js`

| Export | Description | Parameters | Returns |
| --- | --- | --- | --- |
| `router` | — | — | — |

### `backend/src/routes/papers.js`

| Export | Description | Parameters | Returns |
| --- | --- | --- | --- |
| `router` | — | — | — |

### `backend/src/routes/sync.js`

| Export | Description | Parameters | Returns |
| --- | --- | --- | --- |
| `router` | — | — | — |

### `backend/src/routes/user.js`

| Export | Description | Parameters | Returns |
| --- | --- | --- | --- |
| `router` | — | — | — |

## Backend Middleware

### `backend/src/middleware/auth.js`

| Export | Description | Parameters | Returns |
| --- | --- | --- | --- |
| `authenticate` | — | — | — |

### `backend/src/middleware/errorHandler.js`

| Export | Description | Parameters | Returns |
| --- | --- | --- | --- |
| `errorHandler` | Error Handler Middleware Centralized error handling for Express routes | — | — |

### `backend/src/middleware/notFound.js`

| Export | Description | Parameters | Returns |
| --- | --- | --- | --- |
| `notFound` | 404 Not Found Middleware Handles undefined routes | — | — |

## Backend Internal Libraries

### `backend/src/lib/email.js`

| Export | Description | Parameters | Returns |
| --- | --- | --- | --- |
| `generateVerificationToken` | Generates a secure verification token | — | (string) A cryptographically secure random token |
| `getVerificationTokenExpiry` | Generates verification token expiry (24 hours from now) | — | (Date) Expiry date |
| `sendVerificationEmail` | Sends a verification email using the configured email service | `email` (string) – Recipient email address<br>`token` (string) – Verification token<br>`name` (string) – User's name (optional) | (Promise<void>)  |
| `sendPasswordResetEmail` | Sends a password reset email (placeholder for future implementation) | `email` (string) – Recipient email address<br>`token` (string) – Reset token<br>`name` (string) – User's name (optional) | (Promise<void>)  |

### `backend/src/lib/jwt.js`

| Export | Description | Parameters | Returns |
| --- | --- | --- | --- |
| `generateAccessToken` | Generate access token (short-lived) | — | — |
| `generateRefreshToken` | Generate refresh token (long-lived) | — | — |
| `verifyAccessToken` | Verify access token | — | — |
| `verifyRefreshToken` | Verify refresh token | — | — |

### `backend/src/lib/password.js`

| Export | Description | Parameters | Returns |
| --- | --- | --- | --- |
| `hashPassword` | Hash a password | — | — |
| `verifyPassword` | Verify a password against a hash | — | — |

### `backend/src/lib/prisma.js`

| Export | Description | Parameters | Returns |
| --- | --- | --- | --- |
| `prisma` | — | — | — |
| `prisma` | — | — | — |

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
| `validate` | — | — | — |

## Backend Server Bootstrap

### `backend/src/server.js`

| Export | Description | Parameters | Returns |
| --- | --- | --- | --- |
| `app` | — | — | — |

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

## Tooling

### `vitest.config.js`

| Export | Description | Parameters | Returns |
| --- | --- | --- | --- |
| `defineConfig` | — | — | — |
