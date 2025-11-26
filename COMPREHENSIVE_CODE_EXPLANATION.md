# Comprehensive Code Explanation
## Emre's Archive (citavErs) - Complete File and Function Documentation

**Generated:** $(date)  
**Project:** Local-first research paper management application  
**Version:** 2.0.0  
**Architecture:** Single-Page Application with view-based routing, dual-mode database (local IndexedDB + cloud API)

---

## Table of Contents

1. [Core Application Files](#core-application-files)
2. [View Modules](#view-modules)
3. [Core Modules](#core-modules)
4. [Database Modules](#database-modules)
5. [API Modules](#api-modules)
6. [Dashboard Modules](#dashboard-modules)
7. [UI and Utility Modules](#ui-and-utility-modules)
8. [Configuration Files](#configuration-files)
9. [Backend Files](#backend-files)
10. [Extension Files](#extension-files)
11. [Test Files](#test-files)
12. [Documentation Files](#documentation-files)

---

## Core Application Files

### `app.js`
**Purpose:** Main application entry point and orchestrator. Initializes all core systems and handles global event listeners.

**Key Functions:**
- **DOMContentLoaded Event Handler:** Main initialization function that:
  - Applies theme (dark/light mode) from localStorage
  - Renders sidebar status links dynamically
  - Initializes authentication view
  - Sets up global logout event listener
  - Creates application state object
  - Initializes command palette (Ctrl+K)
  - Initializes keyboard shortcuts
  - Sets up search input listener
  - Handles sidebar filter toggle logic (status and tag links)
  - Manages mobile sidebar (open/close, swipe gestures)
  - Initializes router
  - Opens database and triggers initial routing
  - Initializes automatic sync

**Mobile Sidebar Logic:**
- Touch gesture handlers for swipe-to-open (left edge detection)
- Edge zone detection (20px from left)
- Velocity-based swipe recognition
- Responsive touch listener management (adds/removes based on screen width)

**Theme Management:**
- `applyTheme()`: Reads theme from localStorage and applies dark mode class to document root

**Sidebar Status Links:**
- `renderSidebarStatusLinks()`: Dynamically generates status filter links based on configurable status order

---

### `db.js`
**Purpose:** Dual-mode database adapter entry point. Routes operations between cloud API and local IndexedDB based on sync mode.

**Architecture:**
- `db/adapter.js` - Dual-mode routing (cloud API vs local IndexedDB)
- `db/core.js` - Database initialization, migrations, schema
- `db/papers.js` - Local paper CRUD operations
- `db/collections.js` - Local collections CRUD operations
- `db/annotations.js` - Local annotations CRUD operations
- `db/data.js` - Export/Import/Clear operations
- `api/papers.js` - Cloud paper API operations
- `api/collections.js` - Cloud collections API operations
- `api/annotations.js` - Cloud annotations API operations

**Exported Functions:**
- **Database Core:** `openDB()` - Opens IndexedDB connection
- **Paper Operations:** `addPaper()`, `getAllPapers()`, `getPaperById()`, `getPaperByDoi()`, `updatePaper()`, `deletePaper()`, `batchOperations()`, `searchPapers()`, `getUploadUrl()`, `uploadPdf()`, `getPdfDownloadUrl()`
- **Collection Operations:** `addCollection()`, `getAllCollections()`, `getCollectionById()`, `updateCollection()`, `deleteCollection()`
- **Annotation Operations:** `addAnnotation()`, `getAnnotationsByPaperId()`, `getAnnotationById()`, `updateAnnotation()`, `deleteAnnotation()`, `deleteAnnotationsByPaperId()`
- **Data Management:** `exportAllData()`, `importData()`, `clearAllData()`
- **Sync Operations:** `performSync()`, `performFullSync()`, `performIncrementalSync()`, `getSyncStatusInfo()`, `getPendingChanges()`, `trackPaperCreated()`, `trackPaperUpdated()`, `trackPaperDeleted()`, `trackCollectionCreated()`, `trackCollectionUpdated()`, `trackCollectionDeleted()`, `trackAnnotationCreated()`, `trackAnnotationUpdated()`, `trackAnnotationDeleted()`, `deduplicateLocalPapers()`
- **Cloud Sync Utility:** `isCloudSyncAvailable()`

**Usage Pattern:**
- If cloud sync is enabled AND user is authenticated: Uses cloud API
- Otherwise: Uses local IndexedDB (backward compatible)
- Automatic fallback to local if cloud operations fail

---

### `ui.js`
**Purpose:** UI helper functions for rendering, formatting, and user feedback.

**Key Functions:**
- **`escapeHtml(unsafe)`**: Escapes HTML special characters to prevent XSS attacks
- **`showToast(message, type, options)`**: Displays toast notifications
  - Types: 'success', 'error', 'warning', 'info'
  - Options: `duration` (ms, 0 = persistent), `actions` (array of {label, onClick})
  - Auto-removes after duration with fade animation
- **`formatRelativeTime(date)`**: Converts dates to relative time strings ("2 days ago", "just now")
- **`sortPapers(papers, sortBy)`**: Sorts papers array by various criteria
  - Options: 'last_updated', 'title_asc', 'year_desc', 'status_asc', 'progress_desc', 'date_added' (default)
- **`highlightText(text, term)`**: Highlights search terms in text with `<mark>` tags
- **`extractNoteSnippet(notes, searchTerm, maxLength)`**: Extracts snippet from notes containing search term
- **`hasNotesMatch(paper, searchTerm)`**: Checks if paper notes contain search term
- **`renderPaperList(papers, searchTerm, selectedIds)`**: Renders paper list with:
  - Checkboxes for batch selection
  - Status indicators
  - Note snippets when search matches
  - Expandable notes sections
  - Tags display
  - Reading progress bars
  - Quick status change dropdown
  - Edit/delete buttons
- **`renderSidebarTags(papers)`**: Renders tag filter links in sidebar
- **`renderSidebarCollections(collections)`**: Renders collection items in sidebar with edit buttons
- **`highlightActiveSidebarLink()`**: Highlights active sidebar link based on current URL hash

---

### `api.js`
**Purpose:** DOI and arXiv metadata fetching service.

**Key Functions:**
- **`normalizePaperIdentifier(input)`**: Normalizes input to extract DOI/arXiv ID from various formats
  - Supports: Direct DOI, doi.org URLs, Publisher URLs, arXiv URLs/IDs
  - Returns: `{type: 'doi'|'arxiv'|'unsupported', value: string, original: string}`
- **`fetchDoiMetadata(identifier, options)`**: Fetches metadata for DOI or arXiv ID
  - Options: `timeout` (default: 10000ms)
  - Handles: Timeouts, network errors, HTTP errors (404, 400, 429, 500, 502, 503)
  - Returns structured data: `{title, authors, journal, year, doi}`
  - Validates year (1000 to current year + 5)
  - Provides descriptive error messages

---

### `citation.js`
**Purpose:** Citation generation in multiple academic formats.

**Key Functions:**
- **Author Formatting Functions:**
  - `formatAuthorsAPA()`: "Doe, J., & Smith, J. A."
  - `formatAuthorsIEEE()`: "J. Doe and J. A. Smith"
  - `formatAuthorsMLA()`: "Doe, John, and Jane A. Smith"
  - `formatAuthorsChicago()`: "Doe, John, and Jane A. Smith"
  - `formatAuthorsHarvard()`: "Doe, J. and Smith, J.A."
  - `formatAuthorsVancouver()`: "Doe J, Smith JA"
- **`generateCitation(paper, format)`**: Generates citation string for a paper
  - Formats: 'apa', 'ieee', 'mla', 'chicago', 'harvard', 'vancouver'
  - Handles missing fields gracefully
- **`generateBibliography(papers, format, style)`**: Generates bibliography from multiple papers
  - Sorts alphabetically by first author's last name
  - Styles: 'numbered' (1., 2., 3.) or 'alphabetical' (A, B, C)
- **`exportBibliographyToFile(bibliography, format)`**: Downloads bibliography as text file
- **`copyBibliographyToClipboard(bibliography)`**: Copies bibliography to clipboard (removes HTML tags)

---

### `config.js`
**Purpose:** Application-wide configuration and settings management.

**Key Constants:**
- `DEFAULT_STATUSES`: ['Reading', 'To Read', 'Finished', 'Archived']
- `API_CONFIG`: Backend API configuration
  - `BASE_URL`: API base URL (defaults to Railway production URL)
  - `ACCESS_TOKEN_KEY`: localStorage key for access token
  - `REFRESH_TOKEN_KEY`: localStorage key for refresh token
  - `USER_KEY`: localStorage key for user data
  - `SYNC_MODE_KEY`: localStorage key for sync mode ('local' | 'cloud')

**Key Functions:**
- **`setApiBaseUrl(url)`**: Updates API base URL and stores in localStorage
- **`getApiBaseUrl()`**: Gets current API base URL
- **`isCloudSyncEnabled()`**: Checks if cloud sync is enabled
- **`setCloudSyncEnabled(enabled)`**: Enables/disables cloud sync mode
- **`getStatusOrder()`**: Retrieves user-defined status order from localStorage
- **`saveStatusOrder(newOrder)`**: Saves new status order to localStorage

---

### `index.html`
**Purpose:** Main HTML entry point. Defines page structure, includes external libraries, and sets up Tailwind CSS configuration.

**Structure:**
- **Head Section:**
  - Meta tags (charset, viewport)
  - Title: "citavErs"
  - Favicon and app icons (PWA support)
  - Google Fonts (Manrope)
  - Material Symbols font
  - Tailwind CSS CDN with custom config
  - PDF.js library (for PDF viewing)
  - vis-network library (for graph visualization)
  - Custom CSS (`style.css`)

- **Body Section:**
  - Mobile sidebar (hidden on desktop, slide-in on mobile)
  - Desktop sidebar (hidden on mobile)
  - Main content area with header
  - Header contains: hamburger menu, search input, search mode toggle, add paper button, auth button
  - Email verification notice
  - Main app container (`#app`) - where views are injected
  - Toast notification container
  - Command palette container
  - Authentication modal container
  - Script tag loading `app.js` as ES6 module

**Tailwind Config:**
- Dark mode: class-based
- Custom colors: primary (#137fec), background-light, background-dark
- Custom font: Manrope (display font)
- Custom border radius values

---

### `style.css`
**Purpose:** Custom CSS styles and animations.

**Key Styles:**
- Font smoothing for better rendering
- Material Symbols default settings
- Toast animations (slide-in from right, fade out)
- Command palette animations (fade-in, slide-down)
- PDF viewer fullscreen styles
- PDF text layer for text selection
- PDF annotations layer (z-index 3)
- Mobile & touch optimizations:
  - Touch manipulation (prevents 300ms tap delay)
  - Minimum 44x44px touch targets (Apple HIG)
  - iOS Safari zoom prevention (16px minimum font size)
  - Smooth momentum scrolling
- Command palette mobile optimizations
- Horizontal overflow prevention
- Graph view side panel animations
- Custom scrollbar for graph panel

---

## View Modules

### `dashboard.view.js`
**Purpose:** Main orchestrator for dashboard view. Delegates to specialized handlers.

**Key Functions:**
- **`mount(appState, applyFiltersAndRender)`**: 
  - Loads all papers and collections
  - Renders sidebar tags and collections
  - Clears paper selections
  - Populates batch status select
  - Sets search input value from state
  - Registers all event handlers:
    - Pagination handlers
    - Quick add handler
    - Batch toolbar handlers
    - Batch operation handlers
    - Paper list handlers
    - Search mode handlers
    - Collection handlers
  - Updates batch toolbar
- **`unmount()`**: Unregisters all event handlers and cleans up

**Handler Registration:**
- `registerPaginationHandlers()` - Page navigation
- `registerQuickAddHandler()` - Quick add by DOI
- `registerBatchToolbarHandlers()` - Batch selection toolbar
- `registerBatchOperationHandlers()` - Batch operations (delete, status change)
- `registerPaperListHandlers()` - Paper list interactions
- `registerSearchModeHandlers()` - Search mode toggle
- `registerCollectionHandlers()` - Collection management

---

### `details.view.js`
**Purpose:** Paper details view with notes editor, PDF preview, and related papers.

**Key Functions:**
- **`mount(paperId, appState)`**: 
  - Loads paper by ID
  - Renders paper details view
  - Sets up event listeners
  - Handles PDF download from S3 if needed
- **`unmount()`**: 
  - Removes notes editor blur listener
  - Cleans up link modal
  - Resets paperId
- **`render(paper)`**: Renders paper details HTML with:
  - Sidebar: Title, authors, metadata, reading progress, tags, PDF download, citation generation, related papers
  - Main area: Tabbed interface (Notes, PDF Preview)
  - Notes panel: Rich text editor with toolbar
  - PDF panel: PDF viewer with navigation, zoom, fullscreen
- **`setupEventListeners(paper)`**: Sets up:
  - Notes editor auto-save on blur
  - PDF viewer controls (navigation, zoom, fullscreen)
  - Tab switching
  - Reading progress updates
  - Citation generation modal
  - Related papers linking
  - PDF download from cloud
- **`renderProgressBar(progress)`**: Renders reading progress visualization
- **`renderRelatedPapers(paper)`**: Renders linked papers list
- **`setupPdfViewer(paper)`**: Initializes PDF.js viewer with:
  - Page navigation
  - Zoom controls (auto, fit, width, 50%-200%)
  - Fullscreen support
  - Text selection
  - Annotation rendering (highlights, notes)
  - Touch gestures for mobile

**PDF Viewer Features:**
- Lazy loading (downloads PDF when tab is clicked)
- Page-by-page rendering for performance
- Zoom modes: Auto, Fit, Width, percentage (50%-200%)
- Fullscreen mode
- Text selection and highlighting
- Annotation overlay (highlights and sticky notes)
- Mobile-optimized touch controls

---

### `form.view.js`
**Purpose:** Add/Edit paper form with DOI fetching and PDF upload.

**Key Functions:**
- **`mount(paperId, appState)`**: 
  - Sets edit mode if paperId provided
  - Resets unsaved changes flag
  - Populates form fields if editing
  - Sets up file upload
  - Sets up DOI fetch
  - Sets up form submission
  - Sets up tag suggestions
- **`unmount(appState)`**: 
  - Removes form event listeners
  - Clears tag suggestions
  - Resets unsaved changes flag
- **`setupFileUpload()`**: 
  - Handles file input click
  - Drag and drop support
  - File validation (PDF only, 10MB limit)
  - File preview display
  - Remove file button
- **`setupDoiFetch(appState)`**: 
  - Fetches metadata from DOI.org or arXiv
  - Auto-fills form fields
  - Shows loading state
  - Error handling with retry option
- **`setupFormSubmit(appState)`**: 
  - Validates form data
  - Handles PDF upload to S3 (if cloud sync enabled)
  - Creates/updates paper via adapter
  - Shows success/error toasts
  - Navigates to details page on success
  - Resets unsaved changes flag
- **`setupTagSuggestions()`**: 
  - Shows tag suggestions as user types
  - Filters existing tags
  - Click to add tag

**Form Fields:**
- Title (required)
- Authors (comma-separated)
- Journal
- Year
- DOI/URL
- Tags (comma-separated)
- Reading Status (dropdown)
- PDF file (drag & drop or click)

---

### `settings.view.js`
**Purpose:** Application settings page with multiple sections.

**Key Functions:**
- **`mount(appState)`**: Sets up all settings sections:
  - Appearance (dark mode toggle)
  - Citation generation
  - Statistics
  - Status reordering
  - Import/Export
  - Cloud sync
  - Danger zone
- **`setupAppearance()`**: 
  - Dark mode toggle
  - Persists theme to localStorage
  - Applies theme immediately
- **`setupStatistics()`**: 
  - Loads all papers
  - Calculates total papers
  - Counts papers by status
  - Renders statistics cards
- **`setupStatusReordering()`**: 
  - Drag-and-drop status reordering
  - Saves order to localStorage
  - Updates sidebar immediately
- **`setupImportExport(appState)`**: 
  - Export all data (JSON with Base64 PDFs)
  - Import data (RIS or JSON)
  - Shows import progress
  - Handles duplicate detection
  - Validates import data
- **`setupCloudSync()`**: 
  - Cloud sync toggle
  - Sync status display
  - Manual sync button
  - Pending changes display
  - De-duplication tool
  - API URL configuration
- **`setupDangerZone(appState)`**: 
  - Clear all data button
  - Confirmation dialog
  - Clears local and cloud data (if authenticated)

**Settings Sections:**
1. **Appearance:** Dark mode toggle
2. **Citation:** Citation format preferences (stored in localStorage)
3. **Statistics:** Paper counts by status
4. **Status Order:** Drag-and-drop reordering
5. **Import/Export:** Data backup and restore
6. **Cloud Sync:** Sync settings and status
7. **Danger Zone:** Data deletion

---

### `auth.view.js`
**Purpose:** Authentication modal UI and user login/registration.

**Key Functions:**
- **`mount()`**: 
  - Injects auth modal HTML
  - Sets up event listeners
  - Updates UI based on auth state
- **`setupEventListeners()`**: 
  - Modal close handlers
  - Tab switching (login/register)
  - Form submissions
  - Real-time validation feedback
- **`open(tab)`**: Opens modal and shows specified tab
- **`close()`**: Closes modal
- **`showLoginTab()`**: Switches to login tab
- **`showRegisterTab()`**: Switches to register tab
- **`handleLogin(e)`**: 
  - Validates form
  - Calls login API
  - Stores tokens
  - Updates UI
  - Closes modal
  - Enables cloud sync if enabled
- **`handleRegister(e)`**: 
  - Validates form
  - Calls register API
  - Shows email verification notice
  - Closes modal
- **`updateUIForAuthenticated(user)`**: 
  - Shows user name/email
  - Shows logout button
  - Hides login button
- **`updateUIForUnauthenticated()`**: 
  - Shows login button
  - Hides user info
- **`validateEmail(email)`**: Email format validation
- **`showFieldError(fieldId, message)`**: Shows inline validation error
- **`clearFieldError(fieldId)`**: Clears inline validation error
- **`render()`**: Opens modal (alias for `open()`)

**Form Validation:**
- Email: Valid format required
- Password: Minimum 8 characters
- Name: Minimum 2 characters (registration only)
- Real-time feedback on blur
- Error messages below fields

---

### `graph.view.js`
**Purpose:** Paper network graph visualization using vis-network.

**Key Functions:**
- **`mount(appState)`**: 
  - Checks authentication
  - Loads papers
  - Fetches user's networks from API
  - Loads latest network or shows empty state
  - Sets up event listeners
- **`mountLocal()`**: 
  - Loads papers from local storage
  - Prepares graph data from paper relationships
  - Renders graph or shows empty state
- **`loadNetwork(networkId)`**: 
  - Fetches network data from API
  - Maps backend data to vis-network format
  - Calculates node sizes based on degree
  - Renders graph
- **`handleGenerate()`**: 
  - Generates new network via API
  - Shows loading state
  - Loads generated network
- **`unmount()`**: 
  - Destroys vis-network instance
  - Removes event listeners
- **`prepareLocalGraphData(papers)`**: 
  - Creates nodes from papers
  - Creates edges from relatedPaperIds
  - Calculates node sizes
  - Applies colors by status
- **`renderGraph(graphData)`**: 
  - Initializes vis-network
  - Sets up physics simulation
  - Handles node clicks (shows paper details)
  - Handles edge clicks
  - Applies filters
- **`setupEventListeners()`**: 
  - Search input filtering
  - Status filter dropdown
  - Tag filter dropdown
  - Generate button
  - Zoom controls
  - Panel open/close
- **`getNodeColor(status)`**: Returns color based on reading status
- **`truncateTitle(title, maxLength)`**: Truncates paper titles for node labels
- **`populateTagFilter()`**: Populates tag filter from papers
- **`populateTagFilterFromNodes(nodes)`**: Populates tag filter from network nodes
- **`applyFilters()`**: Filters graph nodes based on search, status, and tags
- **`showPaperDetails(paperId)`**: Opens side panel with paper details

**Graph Features:**
- Interactive network visualization
- Node colors by reading status
- Node sizes by connection degree
- Search filtering
- Status filtering
- Tag filtering
- Click nodes to view details
- Zoom and pan controls
- Physics simulation
- Mobile-responsive

---

### `docs.view.js`
**Purpose:** Documentation and onboarding view.

**Key Functions:**
- **`mount(appState)`**: 
  - Scrolls to top
  - Sets up anchor link smooth scrolling
- **`unmount()`**: No cleanup needed
- **`setupAnchorLinks()`**: 
  - Handles anchor link clicks
  - Smooth scrolls to sections
  - Updates URL hash

---

## Core Modules

### `core/state.js`
**Purpose:** Application state management.

**Key Functions:**
- **`createAppState()`**: Creates and initializes application state object
  - `allPapersCache`: Array of all papers
  - `collectionsCache`: Array of saved collections
  - `hasUnsavedChanges`: Flag for form unsaved changes
  - `currentSortBy`: Current sort option (from localStorage)
  - `currentSearchTerm`: Current search term (from localStorage)
  - `currentPath`: Current route path
  - `currentView`: Reference to current view module
  - `selectedPaperIds`: Set of selected paper IDs for batch operations
  - `activeFilters`: Object with `status` and `tags` arrays
  - `pagination`: Object with `currentPage`, `itemsPerPage`, `totalItems`, `totalPages`
  - `searchMode`: 'all' or 'notes' (from localStorage)
- **`persistStateToStorage(key, value)`**: Persists state value to localStorage
- **`clearStorageKey(key)`**: Clears state value from localStorage

---

### `core/router.js`
**Purpose:** Client-side routing and navigation.

**Key Functions:**
- **`renderView(app, viewContent, setupFn)`**: 
  - Sets app innerHTML
  - Defers setupFn execution to allow DOM parsing
  - Prevents race conditions
- **`handleBeforeUnload(event, appState)`**: 
  - Warns about unsaved changes
  - Only prompts on add/edit form
- **`createRouter(app, appState, renderSidebarStatusLinks)`**: 
  - Main router function
  - Handles URL hash changes
  - Routes to appropriate view:
    - `/add` → form view (new paper)
    - `/details/:id` → details view
    - `/edit/:id` → form view (edit mode)
    - `/settings` → settings view
    - `/graph` → graph view
    - `/docs` → docs view
    - `/verify-email?token=...` → email verification handler
    - `/`, `/tag/:tag`, `/status/:status`, `/filter/...` → dashboard view
  - Handles unsaved changes confirmation
  - Unmounts previous view
  - Updates current path in state
  - Parses URL hash for filters
- **`initializeRouter(router)`**: 
  - Sets up hashchange event listeners
  - Highlights active sidebar link on route change

**Route Patterns:**
- `#/` - Dashboard (all papers)
- `#/add` - Add new paper
- `#/details/:id` - Paper details
- `#/edit/:id` - Edit paper
- `#/settings` - Settings
- `#/graph` - Paper network graph
- `#/docs` - Documentation
- `#/status/:status` - Filter by status
- `#/tag/:tag` - Filter by tag
- `#/filter/status:Reading/tag:ml` - Compound filters
- `#/collection/:id` - Filter by collection
- `#/verify-email?token=...` - Email verification

---

### `core/filters.js`
**Purpose:** Filter and pagination logic.

**Key Functions:**
- **`getFilteredPapers(papers, appState)`**: 
  - Applies status filter
  - Applies tag filters (AND logic - paper must have ALL selected tags)
  - Applies search filter (title, authors, tags, notes)
  - Supports exact phrase search (quoted strings)
  - Supports notes-only search mode
- **`updateUrlHash(appState)`**: 
  - Updates URL hash based on active filters
  - Format: `#/filter/status:Reading/tag:ml/tag:ai`
  - Falls back to `#/` if no filters
- **`parseUrlHash(appState)`**: 
  - Parses URL hash and updates active filters
  - Supports compound filter format
  - Supports legacy single filter format
- **`renderFilterChips(appState, applyFiltersAndRender)`**: 
  - Renders visual filter chips
  - Shows search term chip
  - Shows status filter chip
  - Shows tag filter chips (one per tag)
  - Provides remove buttons for each filter
  - Provides "Clear all filters" button
- **`calculatePagination(totalItems, appState)`**: 
  - Calculates total pages
  - Ensures current page is valid
- **`getPaginatedPapers(papers, appState)`**: 
  - Returns papers for current page
  - Uses itemsPerPage from state
- **`renderPaginationControls(appState, applyFiltersAndRender)`**: 
  - Renders pagination UI
  - Shows page info ("Showing 1-25 of 100 papers")
  - Generates page number buttons with smart truncation
  - Shows Previous/Next buttons
  - Handles page button clicks
  - Scrolls to top on page change
- **`applyFiltersAndRender(appState)`**: 
  - Main function to apply all filters
  - Filters papers
  - Sorts papers
  - Calculates pagination
  - Gets paginated papers
  - Renders paper list
  - Renders filter chips
  - Renders pagination controls
  - Highlights active sidebar link

---

### `core/commandPalette.js`
**Purpose:** Command palette for quick navigation and search (Ctrl+K).

**Key Functions:**
- **`createCommandPalette(appState)`**: Creates command palette instance
  - `isOpen`: Boolean flag
  - `selectedIndex`: Currently selected result index
  - `results`: Array of search results
- **`init()`**: 
  - Renders command palette HTML
  - Sets up global keyboard listener (Ctrl+K / Cmd+K)
  - Sets up overlay click handler
  - Sets up input event handlers
  - Sets up keyboard navigation (Arrow keys, Enter, Escape)
- **`toggle()`**: Opens or closes palette
- **`open()`**: 
  - Shows overlay
  - Focuses input
  - Shows default state
- **`close()`**: 
  - Hides overlay
  - Clears input
  - Resets to default state
- **`showDefaultState()`**: Shows empty state message
- **`search(query)`**: 
  - Searches papers (title, authors)
  - Searches tags
  - Searches collections
  - Searches status filters
  - Searches actions (Add Paper, Settings, etc.)
  - Groups results by type
  - Renders results
- **`renderResults()`**: 
  - Groups results by type
  - Renders grouped results with icons
  - Highlights selected item
  - Adds click handlers
- **`navigate(direction)`**: 
  - Moves selection up/down
  - Wraps around at edges
  - Scrolls selected item into view
- **`executeSelected()`**: 
  - Executes action of selected result
  - Closes palette
- **`escapeHtml(text)`**: Escapes HTML for safe rendering

**Search Result Types:**
- Papers (with authors and year)
- Tags (with filter action)
- Collections (with apply action)
- Status filters (with filter action)
- Actions (Add Paper, Settings, Export, etc.)

---

### `core/keyboardShortcuts.js`
**Purpose:** Global keyboard shortcuts.

**Key Functions:**
- **`createKeyboardShortcuts(commandPalette, appState)`**: Creates shortcuts instance
- **`init()`**: 
  - Sets up global keydown listener
  - Skips shortcuts when typing in inputs
  - Handles Esc key (always works)
- **Shortcuts:**
  - `Ctrl+K` / `Cmd+K`: Open command palette
  - `N`: New paper
  - `/`: Focus search
  - `?`: Show help modal
  - `G` then `H`: Go to dashboard
  - `G` then `S`: Go to settings
  - `Esc`: Close modals, go back, clear selection
  - `Ctrl+A`: Select all visible papers (dashboard)
  - `Ctrl+D`: Clear selection (dashboard)
  - `Ctrl+Shift+D`: Focus Quick Add DOI (dashboard)
  - `Delete`: Batch delete selected papers (dashboard)
- **`handleEscape()`**: 
  - Closes help modal
  - Closes command palette
  - Clears selection (if on dashboard)
  - Goes back to dashboard (if on details/form)
- **`isOnDashboard()`**: Checks if current route is dashboard
- **`clearSelection()`**: Clears paper selection
- **`selectAllVisible()`**: Selects all visible papers
- **`newPaper()`**: Navigates to add paper form
- **`focusSearch()`**: Focuses search input
- **`focusQuickAddDoi()`**: Focuses Quick Add DOI input
- **`showHelp()`**: Shows keyboard shortcuts help modal
- **`createHelpModal()`**: Creates and shows help modal with all shortcuts

---

### `core/syncManager.js`
**Purpose:** Automatic sync triggers and background synchronization.

**Key Functions:**
- **`shouldAutoSync()`**: Checks if sync should run (cloud enabled + authenticated)
- **`performAutoSync(silent)`**: 
  - Performs silent sync (no notification unless error)
  - Checks if sync in progress
  - Checks rate limits
  - Shows notifications for server changes or conflicts
  - Handles errors gracefully
- **`triggerDebouncedSync()`**: 
  - Triggers sync after delay (2 seconds)
  - Debounces multiple triggers
  - Useful after CRUD operations
- **`initializeAutoSync()`**: 
  - Performs initial sync after app load (2 second delay)
  - Starts periodic sync (every 5 minutes)
  - Sets up network reconnect listener
- **`startPeriodicSync()`**: 
  - Syncs every 5 minutes
  - Only if cloud enabled and authenticated
  - Skips if sync in progress
- **`stopPeriodicSync()`**: Stops periodic sync interval
- **`setupNetworkReconnectListener()`**: 
  - Listens for 'online' event
  - Syncs when network reconnects
  - Shows notification on reconnect
  - Shows warning when offline
- **`stopAutoSync()`**: Stops all automatic sync operations
- **`restartAutoSync()`**: Restarts automatic sync
- **`performManualSync()`**: Performs immediate sync with notification

**Sync Configuration:**
- Periodic interval: 5 minutes
- Debounce delay: 2 seconds
- Initial sync delay: 2 seconds
- Network reconnect delay: 3 seconds

---

## Database Modules

### `db/core.js`
**Purpose:** Database initialization, schema, and migrations.

**Key Constants:**
- `DB_NAME`: 'CitaversDB'
- `DB_VERSION`: 5
- `STORE_NAME_PAPERS`: 'papers'
- `STORE_NAME_COLLECTIONS`: 'collections'
- `STORE_NAME_ANNOTATIONS`: 'annotations'

**Key Functions:**
- **`openDB()`**: 
  - Opens IndexedDB database
  - Handles version upgrades
  - Creates object stores if needed
  - Creates indexes for queries
  - Handles migration from version 3 (adds updatedAt to existing papers)
  - Returns database instance
  - Handles errors (QuotaExceededError, VersionError, etc.)
  - Handles version change events (closes DB if another tab upgrades)

**Database Schema:**
- **Papers Store:**
  - Key: `id` (auto-increment)
  - Indexes: `title`, `authors`, `year`, `tags` (multiEntry), `relatedPaperIds` (multiEntry), `doi`
- **Collections Store:**
  - Key: `id` (auto-increment)
  - Indexes: `name`, `createdAt`
- **Annotations Store:**
  - Key: `id` (auto-increment)
  - Indexes: `paperId`, `type`, `pageNumber`, `createdAt`

**Migrations:**
- Version 3: Adds `updatedAt` field to existing papers (falls back to `createdAt`)

---

### `db/adapter.js`
**Purpose:** Dual-mode database adapter. Routes operations between cloud API and local IndexedDB.

**Key Functions:**
- **`shouldUseCloudSync()`**: Checks if cloud sync should be used
- **`canAttemptCloudSync()`**: Checks if cloud sync can be attempted (not rate limited)
- **`mapPaperDataToApi(paperData)`**: Maps local paper format to API format
  - Maps `readingStatus` → `status`
  - Maps `s3Key` → `pdfUrl`
  - Removes local-only fields
- **`mapPaperDataFromApi(apiPaper)`**: Maps API format to local format
  - Maps `status` → `readingStatus`
  - Maps `pdfUrl` → `s3Key`
  - Sets `hasPdf` flag

**Paper Operations Adapter:**
- **`addPaper(paperData)`**: 
  - If cloud enabled: Creates via API, saves to local
  - Falls back to local if cloud fails
  - Tracks changes for sync
  - Triggers debounced sync
- **`getAllPapers()`**: Always reads from local (offline-first)
- **`getPaperById(id)`**: Always reads from local
- **`getPaperByDoi(doi)`**: Always reads from local
- **`updatePaper(id, updateData)`**: 
  - Updates local first (optimistic UI)
  - Tracks change for sync
  - Triggers debounced sync
- **`deletePaper(id)`**: 
  - Deletes from local first
  - Tracks deletion for sync
  - Triggers debounced sync
- **`batchOperations(operations)`**: 
  - If cloud enabled: Performs batch via API
  - Applies results to local
  - Falls back to local if cloud fails
- **`searchPapers(query, options)`**: Always performs local search
- **`getUploadUrl(options)`**: Requires cloud sync
- **`uploadPdf(uploadUrl, file)`**: Requires cloud sync
- **`getPdfDownloadUrl(paperId)`**: Requires cloud sync

**Collection Operations Adapter:**
- Similar pattern to papers (cloud-first with local fallback)

**Annotation Operations Adapter:**
- Similar pattern to papers (cloud-first with local fallback)

---

### `db/papers.js`
**Purpose:** Local IndexedDB paper CRUD operations.

**Key Functions:**
- **`addPaper(paperData)`**: 
  - Validates paper data (requires title)
  - Sets default values (createdAt, readingProgress)
  - Adds to IndexedDB
  - Returns paper ID
  - Handles errors (QuotaExceededError, ConstraintError, etc.)
- **`getAllPapers()`**: 
  - Retrieves all papers
  - Adds `hasPdf` flag based on pdfData/s3Key/pdfUrl
  - Sorts by creation date (newest first)
- **`getPaperById(id)`**: 
  - Retrieves single paper by ID
  - Adds `hasPdf` flag
- **`getPaperByDoi(doi)`**: 
  - Retrieves paper by DOI
  - Uses DOI index
- **`updatePaper(id, updateData)`**: 
  - Updates paper in IndexedDB
  - Sets `updatedAt` timestamp automatically
  - Merges updateData with existing paper
  - Returns updated paper
- **`deletePaper(id)`**: 
  - Deletes paper from IndexedDB
  - Handles errors gracefully

---

### `db/collections.js`
**Purpose:** Local IndexedDB collection CRUD operations.

**Key Functions:**
- **`addCollection(collectionData)`**: 
  - Validates collection data (requires name)
  - Sets default values (icon: 'folder', color: '#3B82F6', createdAt)
  - Adds to IndexedDB
- **`getAllCollections()`**: 
  - Retrieves all collections
  - Sorts by creation date (newest first)
- **`getCollectionById(id)`**: Retrieves single collection by ID
- **`updateCollection(id, updateData)`**: Updates collection in IndexedDB
- **`deleteCollection(id)`**: Deletes collection from IndexedDB

---

### `db/annotations.js`
**Purpose:** Local IndexedDB annotation CRUD operations.

**Key Functions:**
- **`addAnnotation(annotationData)`**: 
  - Validates annotation data
  - Requires: `paperId`, `type` ('highlight' or 'note'), `pageNumber`
  - Sets `createdAt` and `updatedAt`
  - Adds to IndexedDB
- **`getAnnotationsByPaperId(paperId)`**: 
  - Retrieves all annotations for a paper
  - Uses `paperId` index
  - Sorts by page number, then creation date
- **`getAnnotationById(id)`**: Retrieves single annotation by ID
- **`updateAnnotation(id, updateData)`**: 
  - Updates annotation
  - Sets `updatedAt` timestamp
- **`deleteAnnotation(id)`**: Deletes annotation
- **`deleteAnnotationsByPaperId(paperId)`**: Deletes all annotations for a paper

---

### `db/data.js`
**Purpose:** Data export, import, and clear operations.

**Key Functions:**
- **`exportAllData()`**: 
  - Exports all papers, collections, and annotations
  - Converts PDF Blobs to Base64 strings
  - Converts dates to ISO strings
  - Returns serializable object
- **`importData(data, options)`**: 
  - Imports data from export format
  - Handles both JSON and RIS formats
  - Converts Base64 PDFs back to Blobs
  - Converts ISO date strings back to Date objects
  - Detects duplicates by DOI
  - Shows import progress
  - Options: `skipDuplicates` (default: true)
- **`clearAllData()`**: 
  - Clears all papers, collections, and annotations
  - Clears cloud data if authenticated
  - Shows confirmation dialog
  - Handles errors gracefully

---

### `db/sync.js`
**Purpose:** Sync operations for cloud synchronization.

**Key Functions:**
- **`performSync()`**: Performs incremental sync
- **`performFullSync()`**: Performs full sync (all data)
- **`performIncrementalSync()`**: Syncs only changed items
- **`getSyncStatusInfo()`**: Returns sync status information
- **`getPendingChanges()`**: Returns pending local changes
- **`trackPaperCreated(paper)`**: Tracks paper creation for sync
- **`trackPaperUpdated(id, updateData)`**: Tracks paper update for sync
- **`trackPaperDeleted(id)`**: Tracks paper deletion for sync
- **`trackCollectionCreated(collection)`**: Tracks collection creation
- **`trackCollectionUpdated(id, updateData)`**: Tracks collection update
- **`trackCollectionDeleted(id)`**: Tracks collection deletion
- **`trackAnnotationCreated(annotation)`**: Tracks annotation creation
- **`trackAnnotationUpdated(id, updateData)`**: Tracks annotation update
- **`trackAnnotationDeleted(id)`**: Tracks annotation deletion
- **`deduplicateLocalPapers()`**: Removes duplicate papers (by DOI)

---

## API Modules

### `api/auth.js`
**Purpose:** Authentication API service.

**Key Functions:**
- **`getAccessToken()`**: Gets stored access token
- **`getUser()`**: Gets stored user data
- **`setAuth(accessToken, user)`**: Stores tokens and user data
- **`clearAuth()`**: Clears all auth data
- **`isAuthenticated()`**: Checks if user is authenticated
- **`login(email, password)`**: 
  - Logs in user
  - Stores tokens
  - Returns user data
- **`register(name, email, password)`**: 
  - Registers new user
  - Returns user data
  - Shows email verification notice
- **`logout()`**: 
  - Logs out user
  - Clears auth data
  - Disables cloud sync
- **`refreshToken()`**: 
  - Refreshes access token
  - Uses refresh token from cookie
  - Updates stored access token
- **`verifyEmail(token)`**: Verifies email address
- **`resendVerificationEmail()`**: Resends verification email
- **`parseApiError(response, result)`**: Extracts user-friendly error messages

---

### `api/papers.js`
**Purpose:** Papers API service.

**Key Functions:**
- **`apiRequest(url, options)`**: 
  - Makes authenticated API request
  - Handles token refresh automatically
  - Includes Authorization header
- **`getAllPapers(options)`**: 
  - Gets all papers with filtering and pagination
  - Options: `page`, `limit`, `status`, `tag`, `sortBy`, `sortOrder`
- **`getPaperById(id)`**: Gets single paper by ID
- **`createPaper(paperData)`**: Creates new paper
- **`updatePaper(id, updateData)`**: Updates paper
- **`deletePaper(id)`**: Deletes paper
- **`batchOperations(operations)`**: Performs batch operations
- **`getUploadUrl(options)`**: Gets S3 presigned upload URL
- **`uploadPdf(uploadUrl, file)`**: Uploads PDF to S3
- **`getPdfDownloadUrl(paperId)`**: Gets S3 presigned download URL
- **`getPdfViewUrl(paperId)`**: Gets S3 presigned view URL

---

### `api/collections.js`
**Purpose:** Collections API service.

**Key Functions:**
- Similar pattern to papers API
- `getAllCollections()`, `getCollectionById()`, `createCollection()`, `updateCollection()`, `deleteCollection()`

---

### `api/annotations.js`
**Purpose:** Annotations API service.

**Key Functions:**
- Similar pattern to papers API
- `getAnnotationsByPaperId(paperId)`, `getAnnotationById()`, `createAnnotation()`, `updateAnnotation()`, `deleteAnnotation()`

---

### `api/user.js`
**Purpose:** User data API service.

**Key Functions:**
- **`clearAllUserData()`**: Clears all user data from cloud

---

### `api/network.js`
**Purpose:** Paper network graph API service.

**Key Functions:**
- **`generateNetwork()`**: Generates paper network graph
- **`getNetwork(networkId)`**: Gets network data
- **`getUserNetworks()`**: Gets all user's networks

---

### `api/utils.js`
**Purpose:** API utility functions.

**Key Functions:**
- **`parseJsonResponse(response)`**: Parses JSON response with error handling
- **`withRateLimitCheck(fn)`**: Wraps API call with rate limit checking
- **`isRateLimited()`**: Checks if currently rate limited
- **`getRateLimitRemainingTime()`**: Gets remaining time until rate limit resets

---

## Dashboard Modules

### `dashboard/handlers/batch-operations.js`
**Purpose:** Batch operation handlers (delete, status change).

**Key Functions:**
- **`registerBatchOperationHandlers(appState, applyFiltersAndRender, updateBatchToolbar)`**: 
  - Registers batch delete handler
  - Registers batch status change handler
  - Returns handler references for cleanup
- **`unregisterBatchOperationHandlers(handlers)`**: Removes event listeners

---

### `dashboard/handlers/search-mode.js`
**Purpose:** Search mode toggle handlers.

**Key Functions:**
- **`registerSearchModeHandlers(appState, applyFiltersAndRender)`**: 
  - Registers search mode toggle buttons
  - Updates appState.searchMode
  - Re-applies filters
- **`unregisterSearchModeHandlers(handlers)`**: Removes event listeners

---

### `dashboard/handlers/quick-add.js`
**Purpose:** Quick add by DOI handler.

**Key Functions:**
- **`registerQuickAddHandler(appState, applyFiltersAndRender)`**: 
  - Registers quick add form submission
  - Fetches DOI metadata
  - Creates paper
  - Refreshes dashboard
- **`unregisterQuickAddHandler(handlers)`**: Removes event listeners

---

### `dashboard/handlers/paper-list.js`
**Purpose:** Paper list interaction handlers.

**Key Functions:**
- **`registerPaperListHandlers(appState, applyFiltersAndRender, updateBatchToolbar)`**: 
  - Registers checkbox click handlers
  - Registers status change dropdown handlers
  - Registers edit button handlers
  - Registers delete button handlers
  - Registers notes expand/collapse handlers
- **`unregisterPaperListHandlers(handlers)`**: Removes event listeners

---

### `dashboard/handlers/pagination.js`
**Purpose:** Pagination handlers.

**Key Functions:**
- **`registerPaginationHandlers(appState, applyFiltersAndRender)`**: 
  - Handles pagination button clicks
  - Updates currentPage in state
  - Re-applies filters
- **`unregisterPaginationHandlers(handlers)`**: Removes event listeners

---

### `dashboard/handlers/collections.js`
**Purpose:** Collection management handlers.

**Key Functions:**
- **`registerCollectionHandlers(appState, applyFiltersAndRender)`**: 
  - Registers collection item click handlers
  - Registers save collection button handler
  - Registers edit collection button handler
- **`unregisterCollectionHandlers(handlers)`**: Removes event listeners

---

### `dashboard/services/tag-manager.js`
**Purpose:** Tag suggestion and management service.

**Key Functions:**
- Tag extraction from papers
- Tag suggestion filtering
- Tag autocomplete

---

### `dashboard/services/modal-manager.js`
**Purpose:** Modal management service.

**Key Functions:**
- Modal open/close
- Modal state management
- Overlay handling

---

### `dashboard/services/error-handler.js`
**Purpose:** Error handling service.

**Key Functions:**
- Error logging
- User-friendly error messages
- Error recovery

---

### `dashboard/ui/batch-toolbar.js`
**Purpose:** Batch operation toolbar UI.

**Key Functions:**
- **`updateBatchToolbar(appState)`**: 
  - Shows/hides toolbar based on selection
  - Updates selection count
  - Enables/disables buttons
- **`populateBatchStatusSelect()`**: Populates status dropdown
- **`registerBatchToolbarHandlers(appState, applyFiltersAndRender, updateBatchToolbar)`**: Registers toolbar button handlers
- **`unregisterBatchToolbarHandlers(handlers)`**: Removes event listeners

---

### `dashboard/utils/batch-operations-utils.js`
**Purpose:** Batch operation utility functions.

**Key Functions:**
- Batch operation validation
- Batch operation execution
- Result aggregation

---

## UI and Utility Modules

### `views/index.js`
**Purpose:** Views module aggregator. Exports all view templates.

**Exports:**
- **Pages:** `home`, `add`, `details`, `settings`, `graph`
- **Modals:** `authModal`, `linkModal`, `citationModal`, `bibliographyExportModal`
- **Components:** `commandPalette`

**Maintains backward compatibility** with existing code that uses `views.home`, `views.add`, etc.

---

### `views/pages/home.js`
**Purpose:** Dashboard/home page template.

**Contains:** HTML template for dashboard view with paper list, filters, pagination, batch toolbar, quick add form.

---

### `views/pages/add.js`
**Purpose:** Add/Edit paper form template.

**Contains:** HTML template for paper form with all fields, file upload, DOI fetch button.

---

### `views/pages/details.js`
**Purpose:** Paper details page template.

**Contains:** HTML template for paper details with sidebar, notes editor, PDF viewer tabs.

---

### `views/pages/settings.js`
**Purpose:** Settings page template.

**Contains:** HTML template for all settings sections.

---

### `views/pages/graph.js`
**Purpose:** Paper network graph page template.

**Contains:** HTML template for graph view with canvas, filters, controls, side panel.

---

### `views/modals/auth.js`
**Purpose:** Authentication modal template.

**Contains:** HTML template for login/register modal with tabs, forms, validation.

---

### `views/modals/link.js`
**Purpose:** Link papers modal template.

**Contains:** HTML template for linking related papers.

---

### `views/modals/citation.js`
**Purpose:** Citation generation modal template.

**Contains:** HTML template for citation format selection and display.

---

### `views/modals/bibliography.js`
**Purpose:** Bibliography export modal template.

**Contains:** HTML template for bibliography generation and export.

---

### `views/components/commandPalette.js`
**Purpose:** Command palette component template.

**Contains:** HTML template for command palette overlay, input, results list.

---

## Configuration Files

### `package.json`
**Purpose:** Node.js package configuration.

**Scripts:**
- `test`: Run tests once
- `test:watch`: Run tests in watch mode
- `test:ui`: Run tests with UI
- `test:coverage`: Run tests with coverage

**DevDependencies:**
- `vitest`: Test framework
- `@vitest/coverage-v8`: Coverage tool
- `@vitest/ui`: Test UI
- `happy-dom`: DOM implementation for tests
- `fake-indexeddb`: IndexedDB mock for tests

---

## Backend Files

The backend is a separate Node.js + Express + PostgreSQL application located in the `backend/` directory.

**Key Backend Files:**
- `backend/src/server.js`: Express server setup
- `backend/src/routes/`: API route handlers
- `backend/src/controllers/`: Business logic controllers
- `backend/src/lib/`: Utility libraries (JWT, S3, Prisma, etc.)
- `backend/src/middleware/`: Express middleware (auth, error handling)
- `backend/prisma/schema.prisma`: Database schema (PostgreSQL)

**Backend Architecture:**
- RESTful API
- JWT authentication
- PostgreSQL database (via Prisma ORM)
- S3-compatible storage (for PDFs)
- Rate limiting
- Email verification

---

## Extension Files

Browser extension files are located in the `extension/` directory.

**Key Files:**
- `extension/manifest.json`: Extension manifest (Chrome)
- `extension/manifest.firefox.json`: Extension manifest (Firefox)
- `extension/background.js`: Background service worker
- `extension/content.js`: Content script
- `extension/popup.js`: Popup UI script
- `extension/popup.html`: Popup UI HTML
- `extension/popup.css`: Popup UI styles
- `extension/build.js`: Build script for extension

**Extension Features:**
- Quick paper addition from web pages
- DOI extraction from current page
- Metadata fetching
- Integration with main app

---

## Test Files

Test files are located in the `tests/` directory.

**Test Structure:**
- `tests/setup.js`: Test setup and configuration
- `tests/helpers.js`: Test helper functions
- `tests/*.test.js`: Test files for various modules
- `tests/dashboard/`: Dashboard-specific tests
- `tests/db/`: Database operation tests
- `tests/sync/`: Sync operation tests

**Test Coverage:**
- Unit tests for all modules
- Integration tests
- Database operation tests
- API operation tests
- UI component tests

---

## Documentation Files

**Key Documentation:**
- `README.md`: Project overview and setup
- `docs/API_REFERENCE.md`: API documentation
- `docs/EXTENSION_DOCUMENTATION.md`: Extension usage guide
- `plans/`: Planning documents for future features
- `PROJECT_EXPLANATION.md`: Project explanation
- `explanation.md`: Additional explanations

---

## Architecture Overview

### Application Flow

1. **Initialization (`app.js`):**
   - DOMContentLoaded event fires
   - Theme applied
   - Sidebar rendered
   - Auth view initialized
   - App state created
   - Command palette initialized
   - Keyboard shortcuts initialized
   - Router initialized
   - Database opened
   - Initial route rendered

2. **Routing (`core/router.js`):**
   - Hash change detected
   - Previous view unmounted
   - New view template injected
   - New view mounted
   - Filters parsed from URL
   - View rendered

3. **Data Flow:**
   - User action → View handler → Database adapter → Local DB or Cloud API
   - Local-first: Always read from local, sync to cloud in background
   - Optimistic UI: Update local immediately, sync later

4. **Sync Flow:**
   - CRUD operation → Change tracked → Debounced sync triggered
   - Periodic sync every 5 minutes
   - Network reconnect triggers sync
   - Manual sync available in settings

### Design Patterns

1. **Repository Pattern:** `db.js` abstracts database operations
2. **Adapter Pattern:** `db/adapter.js` routes between local and cloud
3. **View-based Architecture:** Each view has mount/unmount lifecycle
4. **State Management:** Centralized state in `core/state.js`
5. **Event-driven:** Event listeners for user interactions
6. **Offline-first:** Local IndexedDB as primary storage

### Key Technologies

- **Frontend:** Vanilla JavaScript (ES6+), HTML5, CSS3, Tailwind CSS
- **Storage:** IndexedDB (local), PostgreSQL (cloud)
- **PDF:** PDF.js library
- **Graph:** vis-network library
- **API:** RESTful API with JWT authentication
- **Cloud Storage:** S3-compatible (for PDFs)
- **Testing:** Vitest
- **Build:** No build step (browser-native ES6 modules)

---

## Summary

This is a comprehensive, production-ready research paper management application with:

- **Local-first architecture** for offline functionality
- **Dual-mode database** (local IndexedDB + cloud API)
- **Rich feature set:** Papers, collections, annotations, citations, PDF viewing, network graphs
- **Modern UI:** Responsive design, dark mode, keyboard shortcuts, command palette
- **Robust error handling** and user feedback
- **Comprehensive testing** with 167 automated tests
- **Well-documented codebase** with clear separation of concerns

The application is fully functional and ready for deployment.

---

**End of Documentation**

