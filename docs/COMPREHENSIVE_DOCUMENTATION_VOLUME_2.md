# Volume 2: Feature Documentation (The Functional Spec)

**Generated from Code Audit** | **Date:** 2025-01-XX  
**Status:** Verified Against Source Code

---

## 2.1 The "As-Is" Feature Catalog

### Complete Inventory of Features

This section documents every feature found in the codebase, organized by functional area.

---

## 2.1.1 Paper Management Features

### Feature: Add Paper
**Location**: `form.view.js`, `views/pages/add.js`, `db/adapter.js`

**User Flow**:
1. User clicks "Add Paper" button (header or sidebar)
2. Router navigates to `#/add`
3. Form view mounts and renders empty form
4. User fills in paper metadata:
   - Title (required)
   - Authors (comma-separated, converted to array)
   - Year (optional)
   - Journal (optional)
   - DOI (optional, triggers metadata fetch)
   - URL (optional)
   - Abstract (optional)
   - Tags (comma-separated, converted to array)
   - Status (dropdown: Reading, To Read, Finished, Archived)
   - Notes (rich text editor)
   - Summary (optional)
   - Rating (1-10, optional)
   - PDF file (optional, File input)
5. User clicks "Save"
6. Form validates input
7. If PDF present and cloud sync enabled:
   - Get S3 upload URL from backend
   - Upload PDF to S3
   - Store S3 key in paper data
8. Paper saved via `db.addPaper()`:
   - If cloud sync: API call → save to cloud → also save locally
   - If local-only: save to IndexedDB
9. Success toast shown
10. Router navigates to `#/details/{id}`

**Code Flow**:
```
Button Click (index.html)
  → Router (#/add)
    → formView.mount(null, appState)
      → Form rendered (views/pages/add.js)
        → User submits
          → formView.handleSubmit()
            → db.addPaper() (db.js)
              → db/adapter.js (papers.addPaper)
                → If cloud: api/papers.js (createPaper)
                  → Backend: POST /api/papers
                → If local: db/papers.js (addPaper)
                  → IndexedDB put()
            → Router navigate to #/details/{id}
```

**Dependencies**:
- `db.js` → `db/adapter.js` → `api/papers.js` or `db/papers.js`
- `api.js` (DOI lookup)
- `ui.js` (toast notifications)

---

### Feature: Edit Paper
**Location**: `form.view.js`, `views/pages/add.js`, `db/adapter.js`

**User Flow**:
1. User clicks "Edit" button on paper details page
2. Router navigates to `#/edit/{id}`
3. Form view mounts with paper ID
4. Form loads existing paper data via `db.getPaperById(id)`
5. Form pre-fills all fields with existing data
6. User modifies fields
7. User clicks "Save"
8. Paper updated via `db.updatePaper(id, updateData)`:
   - Optimistic UI: Update local IndexedDB immediately
   - If cloud sync: Track change → trigger background sync
9. Success toast shown
10. Router navigates back to `#/details/{id}`

**Code Flow**:
```
Edit Button Click (details view)
  → Router (#/edit/{id})
    → formView.mount(id, appState)
      → db.getPaperById(id)
        → Form pre-filled
          → User submits
            → db.updatePaper(id, updateData)
              → db/adapter.js (papers.updatePaper)
                → Local: db/papers.js (updatePaper) - immediate
                → If cloud: trackPaperUpdated() → triggerDebouncedSync()
```

**Unsaved Changes Protection**:
- `appState.hasUnsavedChanges` flag set when form modified
- `beforeunload` event listener warns on navigation
- Router checks flag before navigation, shows confirm dialog

---

### Feature: Delete Paper
**Location**: `dashboard.view.js`, `db/adapter.js`, `views/pages/home.js`

**User Flow**:
1. User clicks delete button on paper card (dashboard) or details page
2. Confirm dialog shown
3. If confirmed:
   - Paper deleted via `db.deletePaper(id)`:
     - Optimistic UI: Delete from local IndexedDB immediately
     - If cloud sync: Track deletion → trigger background sync
   - Success toast shown
   - UI updates (paper removed from view)

**Code Flow**:
```
Delete Button Click
  → Confirm dialog
    → db.deletePaper(id)
      → db/adapter.js (papers.deletePaper)
        → Local: db/papers.js (deletePaper) - immediate
        → If cloud: trackPaperDeleted() → triggerDebouncedSync()
      → UI updates (remove from DOM)
```

---

### Feature: Batch Operations
**Location**: `dashboard.view.js`, `db/adapter.js`, `api/papers.js`

**User Flow**:
1. User enables batch mode (checkbox on dashboard)
2. User selects multiple papers (checkboxes)
3. User chooses action:
   - Change status (bulk)
   - Add/remove tags (bulk)
   - Delete (bulk)
4. Batch operation executed via `db.batchOperations(operations)`
5. If cloud sync: Single API call with all operations
6. If local-only: Operations executed sequentially
7. Results shown (success/failure per paper)
8. UI updates

**Code Flow**:
```
Batch Mode Enabled
  → Papers selected (appState.selectedPaperIds)
    → User chooses action
      → db.batchOperations([{type, id, data}, ...])
        → db/adapter.js (papers.batchOperations)
          → If cloud: api/papers.js (batchOperations)
            → Backend: POST /api/papers/batch
          → If local: _performLocalBatch()
            → Loop: db/papers.js operations
```

**Operations Format**:
```javascript
[
  { type: 'update', id: 1, data: { status: 'Finished' } },
  { type: 'delete', id: 2 },
  { type: 'update', id: 3, data: { tags: ['ml', 'ai'] } }
]
```

---

### Feature: Paper Linking
**Location**: `details/index.js`, `views/modals/link.js`, `db/papers.js`

**User Flow**:
1. User clicks "Link Papers" button on details page
2. Link modal opens
3. Modal shows searchable list of all papers
4. User selects papers to link
5. User clicks "Link"
6. Paper's `relatedPaperIds` array updated via `db.updatePaper()`
7. Bidirectional links created (both papers reference each other)
8. Success toast shown
9. Related papers section updates on details page

**Code Flow**:
```
Link Button Click
  → views/modals/link.js (linkModalView.render)
    → User selects papers
      → db.updatePaper(id, { relatedPaperIds: [...] })
        → Related papers section re-renders
```

---

## 2.1.2 Search & Filtering Features

### Feature: Full-Text Search
**Location**: `core/filters.js`, `app.js`, `dashboard.view.js`

**User Flow**:
1. User types in search input (header)
2. `appState.currentSearchTerm` updated on each keystroke
3. URL hash updated: `#/?search=query`
4. `applyFiltersAndRender()` called
5. Papers filtered by search term:
   - If "All Fields" mode: Search title, authors, notes
   - If "Notes Only" mode: Search notes field only
6. Filtered results displayed
7. Pagination reset to page 1

**Code Flow**:
```
Search Input (index.html)
  → app.js (input event listener)
    → appState.currentSearchTerm = value
      → updateUrlHash(appState)
        → applyFiltersAndRender(appState)
          → core/filters.js (filterPapers)
            → Papers filtered by search term
              → Dashboard re-renders filtered results
```

**Search Mode Toggle**:
- Toggle buttons in header: "All Fields" vs "Notes Only"
- Stored in `appState.searchMode` and `localStorage`
- Affects which fields are searched

---

### Feature: Status Filtering
**Location**: `core/filters.js`, `app.js`, sidebar

**User Flow**:
1. User clicks status link in sidebar (e.g., "Reading")
2. Click handler toggles filter:
   - If same status clicked: Remove filter
   - If different status: Set/change filter
3. `appState.activeFilters.status` updated
4. URL hash updated: `#/status/Reading`
5. `applyFiltersAndRender()` called
6. Papers filtered by status
7. Active filter highlighted in sidebar

**Code Flow**:
```
Sidebar Status Link Click
  → app.js (click event listener)
    → Toggle appState.activeFilters.status
      → updateUrlHash(appState)
        → applyFiltersAndRender(appState)
          → Papers filtered by status
```

---

### Feature: Tag Filtering
**Location**: `core/filters.js`, `app.js`, sidebar

**User Flow**:
1. User clicks tag link in sidebar
2. Click handler toggles tag:
   - If tag already selected: Remove from filter
   - If tag not selected: Add to filter
3. `appState.activeFilters.tags` array updated
4. URL hash updated: `#/tag/ml` or `#/filter?tags=ml,ai`
5. `applyFiltersAndRender()` called
6. Papers filtered by tags (AND logic: paper must have all selected tags)
7. Active tags highlighted

**Code Flow**:
```
Sidebar Tag Link Click
  → app.js (click event listener)
    → Toggle appState.activeFilters.tags array
      → updateUrlHash(appState)
        → applyFiltersAndRender(appState)
          → Papers filtered by tags (AND logic)
```

---

### Feature: Combined Filtering
**Location**: `core/filters.js`

**User Flow**:
1. User applies multiple filters (status + tags + search)
2. All filters combined with AND logic:
   - Paper must match status
   - Paper must have all selected tags
   - Paper must match search term
3. Results displayed
4. URL hash reflects all filters: `#/status/Reading?tags=ml&search=neural`

**Code Flow**:
```
Multiple Filters Applied
  → applyFiltersAndRender(appState)
    → core/filters.js (filterPapers)
      → Filter by status
        → Filter by tags (AND)
          → Filter by search term
            → Results displayed
```

---

### Feature: Sorting
**Location**: `core/filters.js`, `dashboard.view.js`

**User Flow**:
1. User selects sort option from dropdown:
   - Date Added (newest first)
   - Last Updated (most recent first)
   - Title (A-Z)
   - Year (newest first)
   - Rating (highest first)
2. `appState.currentSortBy` updated
3. Papers sorted accordingly
4. Results re-rendered

**Code Flow**:
```
Sort Dropdown Change
  → appState.currentSortBy = value
    → applyFiltersAndRender(appState)
      → core/filters.js (sortPapers)
        → Papers sorted
          → Dashboard re-renders
```

---

### Feature: Pagination
**Location**: `core/filters.js`, `dashboard.view.js`

**User Flow**:
1. Papers displayed in pages (default: 25 per page)
2. User clicks page number or next/prev
3. `appState.pagination.currentPage` updated
4. URL hash updated: `#/?page=2`
5. Papers for current page displayed
6. Pagination controls show: current page, total pages, page numbers

**Code Flow**:
```
Page Navigation
  → appState.pagination.currentPage = pageNum
    → updateUrlHash(appState)
      → applyFiltersAndRender(appState)
        → core/filters.js (paginatePapers)
          → Papers sliced for current page
            → Dashboard renders page
```

**Pagination Settings**:
- Items per page: Configurable in settings (default: 25)
- Stored in `localStorage` and `appState.pagination.itemsPerPage`

---

## 2.1.3 Collections Features

### Feature: Create Collection
**Location**: `settings.view.js`, `db/adapter.js`

**User Flow**:
1. User navigates to Settings
2. User goes to "Collections" section
3. User clicks "Create Collection"
4. Modal opens with form:
   - Name (required)
   - Icon (dropdown: folder, bookmark, etc.)
   - Color (dropdown: text-primary, etc.)
   - Current filter state auto-populated
5. User clicks "Save"
6. Collection created via `db.addCollection(collectionData)`
7. Collection saved with current filter criteria
8. Success toast shown
9. Collection appears in sidebar

**Code Flow**:
```
Create Collection Button
  → Modal opens with current filters
    → User fills name/icon/color
      → db.addCollection({ name, icon, color, filters })
        → db/adapter.js (collections.addCollection)
          → If cloud: api/collections.js (createCollection)
          → If local: db/collections.js (addCollection)
        → Sidebar updates
```

**Collection Filter Format**:
```javascript
{
  status: 'Reading',
  tags: ['ml', 'ai'],
  search: 'neural'
}
```

---

### Feature: Apply Collection
**Location**: Sidebar, `app.js`, `core/filters.js`

**User Flow**:
1. User clicks collection name in sidebar
2. Collection's filter criteria applied to `appState.activeFilters`
3. URL hash updated to reflect filters
4. Dashboard re-renders with filtered papers

**Code Flow**:
```
Collection Click
  → db.getCollectionById(id)
    → appState.activeFilters = collection.filters
      → updateUrlHash(appState)
        → applyFiltersAndRender(appState)
```

---

### Feature: Edit/Delete Collection
**Location**: `settings.view.js`, `db/adapter.js`

**User Flow**:
1. User navigates to Settings → Collections
2. User clicks edit/delete on collection
3. If edit: Modal opens with existing data, user modifies, saves
4. If delete: Confirm dialog, then collection deleted
5. Collection updated/deleted via `db.updateCollection()` / `db.deleteCollection()`
6. Sidebar updates

**Code Flow**:
```
Edit/Delete Collection
  → db.updateCollection(id, data) or db.deleteCollection(id)
    → db/adapter.js (collections.updateCollection/deleteCollection)
      → Sidebar re-renders
```

---

## 2.1.4 Notes & Annotations Features

### Feature: Rich Text Notes
**Location**: `form.view.js`, `details/index.js`, `details/notes.manager.js`

**User Flow**:
1. User edits notes field in form or details page
2. Rich text editor (contentEditable div) allows formatting
3. User types and formats text (bold, italic, lists, etc.)
4. HTML content stored in paper's `notes` field
5. Notes saved on paper update

**Code Flow**:
```
Notes Editor
  → contentEditable div
    → User types/formats
      → HTML content extracted
        → db.updatePaper(id, { notes: htmlContent })
```

**Notes Display**:
- Notes rendered as HTML in details view
- Sanitized for XSS protection (escapeHtml in ui.js)

---

### Feature: PDF Annotations
**Location**: `details/index.js`, `db/adapter.js`, `api/annotations.js`

**User Flow**:
1. User opens paper with PDF
2. PDF viewer loads (PDF.js)
3. User highlights text or adds note on page
4. Annotation created via `db.addAnnotation(annotationData)`
5. Annotation stored with:
   - Type: 'highlight', 'note', 'bookmark'
   - Page number
   - Position: {x, y, width, height}
   - Content (for notes)
   - Color (for highlights)
6. Annotation displayed on PDF viewer
7. Annotations list shown in sidebar

**Code Flow**:
```
PDF Annotation
  → PDF.js viewer
    → User highlights/adds note
      → db.addAnnotation({ paperId, type, pageNumber, position, content })
        → db/adapter.js (annotations.addAnnotation)
          → If cloud: api/annotations.js (createAnnotation)
          → If local: db/annotations.js (addAnnotation)
        → Annotation displayed on PDF
```

**Annotation Types**:
- `highlight`: Text highlight with color
- `note`: Text note attached to position
- `bookmark`: Page bookmark

---

### Feature: Summary Field
**Location**: `form.view.js`, `details/index.js`, `details/summary.manager.js`

**User Flow**:
1. User adds/edits summary in form or details page
2. Summary stored in paper's `summary` field (plain text)
3. Summary displayed in details view
4. Summary can be generated/edited via summary manager

**Code Flow**:
```
Summary Edit
  → Summary input/textarea
    → db.updatePaper(id, { summary: text })
      → Summary displayed in details view
```

---

### Feature: Rating System
**Location**: `form.view.js`, `components/rating-input.js`, `dashboard.view.js`

**User Flow**:
1. User sets rating (1-10) in form or details page
2. Rating component (`rating-input.js`) provides star/scale input
3. Rating stored in paper's `rating` field (nullable)
4. Rating displayed as stars/badge on paper cards
5. Papers can be sorted by rating

**Code Flow**:
```
Rating Input
  → components/rating-input.js
    → User selects rating (1-10)
      → db.updatePaper(id, { rating: value })
        → Rating displayed on paper card
```

---

## 2.1.5 PDF Management Features

### Feature: PDF Upload
**Location**: `form.view.js`, `api/papers.js`, `db/adapter.js`

**User Flow**:
1. User selects PDF file in form (File input)
2. File stored in `paperData.pdfData` (File object)
3. On save:
   - If cloud sync: Get S3 upload URL → Upload to S3 → Store S3 key
   - If local-only: Convert File to Blob → Store in IndexedDB
4. PDF available for viewing

**Code Flow**:
```
PDF Upload
  → File input (form)
    → File selected
      → On save:
        → If cloud: api/papers.js (getUploadUrl → uploadPdf)
          → Backend: POST /api/papers/upload-url
            → S3 presigned URL
              → Upload to S3
                → Store s3Key in paper
        → If local: File → Blob → IndexedDB
```

**PDF Storage**:
- **Local**: Stored as Blob in IndexedDB `papers` store
- **Cloud**: Stored in S3, referenced by `s3Key` in paper record

---

### Feature: PDF Viewer
**Location**: `details/index.js`, PDF.js integration

**User Flow**:
1. User opens paper with PDF
2. PDF viewer loads:
   - If local: Load from IndexedDB Blob
   - If cloud: Load from S3 via proxy endpoint
3. PDF.js renders PDF
4. User can:
   - Zoom in/out
   - Rotate pages
   - Navigate pages
   - Search text in PDF
   - Add annotations (highlights, notes)

**Code Flow**:
```
PDF Viewer
  → details/index.js
    → If local: db.getPaperById(id) → pdfData (Blob)
      → PDF.js loads Blob
    → If cloud: api/papers.js (getPdfViewUrl)
      → Backend: GET /api/papers/{id}/pdf-proxy
        → S3 stream → PDF.js
```

**PDF.js Integration**:
- Loaded from CDN: `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js`
- Worker: `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js`

---

## 2.1.6 Paper Network Graph Features

### Feature: Network Graph Visualization
**Location**: `graph.view.js`, `views/pages/graph.js`, `api/network.js`

**User Flow**:
1. User navigates to "Paper Network" (sidebar)
2. Graph view loads
3. Network generated:
   - Nodes: Papers
   - Edges: Relationships (relatedPaperIds)
4. vis-network renders interactive graph
5. User can:
   - Zoom (mouse wheel)
   - Pan (drag)
   - Click node → Navigate to paper details
   - Filter by status/tags
6. Graph layout auto-calculated (physics simulation)

**Code Flow**:
```
Graph View
  → graph.view.js (mount)
    → db.getAllPapers()
      → Build nodes and edges
        → vis-network renders graph
          → User interacts
            → Click node → Router (#/details/{id})
```

**Graph Filters**:
- Filter nodes by status
- Filter nodes by tags
- Filter updates graph in real-time

---

### Feature: Network Graph Generation (Cloud)
**Location**: `api/network.js`, `backend/src/routes/network.js`

**User Flow**:
1. User clicks "Generate Network" (if cloud sync enabled)
2. API call to `POST /api/networks/generate`
3. Backend analyzes papers and creates connections
4. Network graph stored in database
5. Graph displayed

**Code Flow**:
```
Generate Network
  → api/network.js (generateNetwork)
    → Backend: POST /api/networks/generate
      → Backend analyzes papers
        → Creates PaperConnection records
          → Returns network graph
```

---

## 2.1.7 Citation & Bibliography Features

### Feature: Generate Citation
**Location**: `citation.js`, `views/modals/citation.js`

**User Flow**:
1. User clicks "Cite" button on paper details
2. Citation modal opens
3. User selects citation format:
   - APA
   - MLA
   - Chicago
   - BibTeX
4. Citation generated from paper metadata
5. Citation displayed, user can copy

**Code Flow**:
```
Cite Button
  → views/modals/citation.js
    → citation.js (generateCitation)
      → Format paper metadata
        → Display citation
```

**Citation Formats**:
- APA: Author (Year). Title. Journal, Volume(Issue), Pages.
- MLA: Author. "Title." Journal, Volume, Issue, Year, Pages.
- Chicago: Author. "Title." Journal Volume, no. Issue (Year): Pages.
- BibTeX: `@article{key, ...}`

---

### Feature: Export Bibliography
**Location**: `views/modals/bibliography.js`, `citation.js`

**User Flow**:
1. User clicks "Export Bibliography" (settings or details)
2. Bibliography modal opens
3. User selects:
   - Papers to include (all or filtered)
   - Citation format
4. Bibliography generated
5. User can copy or download as text file

**Code Flow**:
```
Export Bibliography
  → views/modals/bibliography.js
    → User selects papers/format
      → citation.js (generateBibliography)
        → Generate citations for all papers
          → Display/download
```

---

## 2.1.8 Data Management Features

### Feature: Export Data
**Location**: `settings.view.js`, `db/data.js`

**User Flow**:
1. User navigates to Settings → Data Management
2. User clicks "Export Data"
3. All data exported:
   - Papers (metadata, notes, but not PDFs)
   - Collections
   - Annotations
4. JSON file generated and downloaded
5. Success toast shown

**Code Flow**:
```
Export Data
  → settings.view.js
    → db/data.js (exportAllData)
      → db/papers.js (getAllPapers)
      → db/collections.js (getAllCollections)
      → db/annotations.js (getAllAnnotations)
        → Combine into JSON
          → Download file
```

**Export Format**:
```json
{
  "version": "2.2",
  "exportedAt": "2025-01-XX",
  "papers": [...],
  "collections": [...],
  "annotations": [...]
}
```

---

### Feature: Import Data
**Location**: `settings.view.js`, `db/data.js`, `api/import.js`

**User Flow**:
1. User navigates to Settings → Data Management
2. User clicks "Import Data"
3. File picker opens
4. User selects JSON file
5. File parsed and validated
6. Data imported:
   - If cloud sync: `api/import.js (batchImport)` → Backend processes
   - If local-only: `db/data.js (importData)` → IndexedDB
7. Success toast shown
8. Dashboard refreshes

**Code Flow**:
```
Import Data
  → File picker
    → File selected
      → If cloud: api/import.js (batchImport)
        → Backend: POST /api/import
          → Backend processes and creates papers
      → If local: db/data.js (importData)
        → Loop: db.addPaper(), db.addCollection(), etc.
          → Dashboard refreshes
```

**Import Validation**:
- Checks JSON structure
- Validates required fields
- Handles duplicate DOIs (if cloud sync)

---

### Feature: Clear All Data
**Location**: `settings.view.js`, `db/data.js`, `api/user.js`

**User Flow**:
1. User navigates to Settings → Data Management
2. User clicks "Clear All Data"
3. Confirm dialog shown (destructive action)
4. If confirmed:
   - If cloud sync: `api/user.js (clearAllUserData)` → Backend deletes all user data
   - Local: `db/data.js (clearAllData)` → IndexedDB cleared
5. Success toast shown
6. Dashboard shows empty state

**Code Flow**:
```
Clear All Data
  → Confirm dialog
    → If cloud: api/user.js (clearAllUserData)
      → Backend: DELETE /api/user/data
        → All user data deleted (papers, collections, annotations, PDFs)
    → Local: db/data.js (clearAllData)
      → IndexedDB cleared (all object stores)
    → Dashboard shows empty state
```

**Cloud Restore Workflow**:
1. Clear All Data (wipes cloud + local)
2. Import Data (restores from backup)
3. Automatic sync pushes imported data to cloud
4. No duplicate DOI conflicts (cloud was cleared first)

---

## 2.1.9 Authentication Features

### Feature: User Registration
**Location**: `auth.view.js`, `api/auth.js`, `backend/src/routes/auth.js`

**User Flow**:
1. User clicks "Sign Up" (auth button in header)
2. Auth modal opens (registration form)
3. User enters:
   - Email (required, validated)
   - Password (required, min length)
   - Name (optional)
4. User clicks "Register"
5. API call: `api/auth.js (register)` → `POST /api/auth/register`
6. Backend creates user account:
   - Password hashed (bcrypt)
   - Email verification token generated
   - Verification email sent
7. Success message shown
8. User prompted to verify email

**Code Flow**:
```
Register
  → auth.view.js (open('register'))
    → api/auth.js (register)
      → Backend: POST /api/auth/register
        → Backend: hash password, create user, send email
          → Success: User created, verification email sent
```

**Email Verification**:
- Token generated and stored in database
- Email sent with verification link
- Link: `#/verify-email?token=...`
- Router handles verification automatically

---

### Feature: User Login
**Location**: `auth.view.js`, `api/auth.js`, `backend/src/routes/auth.js`

**User Flow**:
1. User clicks "Log In" (auth button)
2. Auth modal opens (login form)
3. User enters email and password
4. User clicks "Log In"
5. API call: `api/auth.js (login)` → `POST /api/auth/login`
6. Backend validates credentials:
   - Check email exists
   - Verify password hash
   - Generate JWT tokens (access + refresh)
7. Tokens stored in localStorage
8. User data stored
9. Auth button updates (shows user email/logout)
10. Cloud sync enabled automatically

**Code Flow**:
```
Login
  → auth.view.js (open('login'))
    → api/auth.js (login)
      → Backend: POST /api/auth/login
        → Backend: validate credentials, generate tokens
          → api/auth.js (setAuth) → localStorage
            → auth.view.js (updateUIForAuthenticated)
              → Cloud sync enabled
```

**Token Storage**:
- Access token: `localStorage.citavers_access_token`
- Refresh token: `localStorage.citavers_refresh_token` (or cookie)
- User data: `localStorage.citavers_user`

---

### Feature: User Logout
**Location**: `auth.view.js`, `api/auth.js`

**User Flow**:
1. User clicks "Logout" (auth button)
2. API call: `api/auth.js (logout)` → `POST /api/auth/logout`
3. Backend invalidates refresh token
4. LocalStorage cleared
5. Auth button updates (shows login)
6. Cloud sync disabled
7. Router may redirect to home

**Code Flow**:
```
Logout
  → auth.view.js (logout)
    → api/auth.js (logout)
      → Backend: POST /api/auth/logout
        → api/auth.js (clearAuth) → localStorage cleared
          → Cloud sync disabled
```

---

### Feature: Email Verification
**Location**: `core/router.js`, `api/auth.js`

**User Flow**:
1. User clicks verification link in email
2. Link: `#/verify-email?token=...`
3. Router detects verification route
4. Loading state shown
5. API call: `api/auth.js (verifyEmail)` → `POST /api/auth/verify-email`
6. Backend validates token and marks email as verified
7. Success message shown
8. Router redirects to home after 2 seconds

**Code Flow**:
```
Verification Link
  → Router (#/verify-email?token=...)
    → api/auth.js (verifyEmail)
      → Backend: POST /api/auth/verify-email
        → Backend: validate token, update user.emailVerified
          → Success: Email verified
            → Router redirects to home
```

---

## 2.1.10 Cloud Sync Features

### Feature: Automatic Background Sync
**Location**: `core/syncManager.js`, `db/sync.js`, `api/sync.js`

**User Flow**:
1. User makes change (add/edit/delete paper)
2. Change tracked in `db/sync.js` (trackPaperCreated, etc.)
3. `core/syncManager.js` triggers debounced sync (500ms delay)
4. Sync executes:
   - Collects pending changes
   - Calls `api/sync.js (incrementalSync)` → `POST /api/sync/incremental`
   - Backend processes changes
   - Local data updated with server responses
5. Sync status shown in toast (optional)

**Code Flow**:
```
User Action (add/edit/delete)
  → db/sync.js (trackPaperCreated/Updated/Deleted)
    → core/syncManager.js (triggerDebouncedSync)
      → Wait 500ms (debounce)
        → api/sync.js (incrementalSync)
          → Backend: POST /api/sync/incremental
            → Backend processes changes
              → Local data updated
```

**Sync Triggers**:
- Paper created/updated/deleted
- Collection created/updated/deleted
- Annotation created/updated/deleted
- Debounced to batch multiple changes

---

### Feature: Full Sync
**Location**: `settings.view.js`, `api/sync.js`, `db/sync.js`

**User Flow**:
1. User navigates to Settings → Sync
2. User clicks "Sync Now" or "Full Sync"
3. API call: `api/sync.js (fullSync)` → `GET /api/sync/full`
4. Backend returns all user data (papers, collections, annotations)
5. Local IndexedDB updated with server data
6. Conflict resolution: Last-write-wins (based on `updatedAt` timestamp)
7. Success toast shown

**Code Flow**:
```
Full Sync
  → settings.view.js
    → api/sync.js (fullSync)
      → Backend: GET /api/sync/full
        → Backend returns all data
          → db/sync.js (performFullSync)
            → Update local IndexedDB
              → Conflict resolution
```

**Conflict Resolution**:
- Compare `updatedAt` timestamps
- Keep version with later timestamp
- Version field used for optimistic locking

---

### Feature: Sync Status
**Location**: `settings.view.js`, `api/sync.js`

**User Flow**:
1. User navigates to Settings → Sync
2. Sync status displayed:
   - Last synced time
   - Pending changes count
   - Sync mode (local/cloud)
3. Status updates automatically

**Code Flow**:
```
Sync Status
  → settings.view.js
    → api/sync.js (getSyncStatus)
      → Backend: GET /api/sync/status
        → Returns: { lastSyncedAt, pendingChanges, ... }
          → Display in UI
```

---

## 2.1.11 UI/UX Features

### Feature: Dark Mode
**Location**: `app.js`, `settings.view.js`

**User Flow**:
1. User toggles dark mode (settings or system preference)
2. `localStorage.theme` updated ('dark' or 'light')
3. `document.documentElement.classList.toggle('dark')`
4. Tailwind dark mode classes activate
5. UI updates immediately

**Code Flow**:
```
Dark Mode Toggle
  → settings.view.js or system preference
    → localStorage.theme = 'dark'/'light'
      → app.js (applyTheme)
        → document.documentElement.classList.toggle('dark')
          → Tailwind dark mode activates
```

---

### Feature: Command Palette
**Location**: `core/commandPalette.js`, `views/components/commandPalette.js`

**User Flow**:
1. User presses `Ctrl+K` (or `Cmd+K` on Mac)
2. Command palette opens
3. User types to search commands:
   - "Add paper"
   - "Go to settings"
   - "Toggle dark mode"
   - etc.
4. User selects command (Enter or click)
5. Command executed
6. Palette closes

**Code Flow**:
```
Command Palette
  → core/keyboardShortcuts.js (Ctrl+K)
    → core/commandPalette.js (open)
      → views/components/commandPalette.js (render)
        → User types/search
          → Command selected
            → Action executed
              → Palette closes
```

---

### Feature: Keyboard Shortcuts
**Location**: `core/keyboardShortcuts.js`

**Global Shortcuts**:
- `Ctrl+K` / `Cmd+K`: Open command palette
- `Ctrl+/` / `Cmd+/`: Show keyboard shortcuts help
- `Esc`: Close modals/palette

**View-Specific Shortcuts**:
- Dashboard: Arrow keys for navigation (if implemented)
- Form: `Ctrl+S` / `Cmd+S`: Save (if implemented)

**Code Flow**:
```
Keyboard Event
  → core/keyboardShortcuts.js (init)
    → document.addEventListener('keydown')
      → Check key combination
        → Execute action
```

---

### Feature: Toast Notifications
**Location**: `ui.js`

**User Flow**:
1. Action occurs (save, delete, error, etc.)
2. `ui.js (showToast)` called with message and type
3. Toast element created and added to DOM
4. Toast displays for duration (default: 3000ms)
5. Toast auto-removes or user clicks close

**Code Flow**:
```
Toast
  → ui.js (showToast(message, type, options))
    → Create toast element
      → Add to #toast-container
        → Display for duration
          → Auto-remove or user closes
```

**Toast Types**:
- `success`: Green background, check icon
- `error`: Red background, error icon
- `warning`: Yellow background, warning icon
- `info`: Blue background, info icon

---

### Feature: Mobile Sidebar
**Location**: `app.js`, `index.html`

**User Flow**:
1. On mobile (< 1024px), sidebar hidden by default
2. User swipes from left edge (or clicks hamburger menu)
3. Sidebar slides in from left
4. Overlay shown (dark background)
5. User clicks link or overlay → Sidebar closes

**Code Flow**:
```
Mobile Sidebar
  → Touch gesture (swipe from left edge)
    → app.js (openMobileMenu)
      → Sidebar.classList.remove('-translate-x-full')
        → Overlay shown
          → User clicks link/overlay
            → app.js (closeMobileMenu)
```

**Swipe Gesture**:
- Detects touch start from left edge (< 20px)
- Tracks horizontal movement
- If swipe right > 50px: Open sidebar
- Velocity threshold: 0.3 px/ms

---

## 2.1.12 Hidden Features / Debug Features

### Feature: Debug Console
**Location**: `debug.js`

**User Flow**:
1. Debug mode enabled (if implemented)
2. Debug console shows:
   - Database operations
   - API calls
   - Sync status
   - Error logs

**Code Flow**:
```
Debug Mode
  → debug.js (if enabled)
    → Console logs database/API operations
      → Debug panel shows logs
```

---

### Feature: Rate Limit Handling
**Location**: `api/utils.js`

**User Flow**:
1. API call fails with 429 (rate limited)
2. `api/utils.js (setRateLimit)` called
3. Rate limit state stored in localStorage
4. Subsequent API calls check rate limit
5. If rate limited: Skip cloud sync, show warning (optional)
6. Rate limit clears after retry-after time

**Code Flow**:
```
Rate Limit
  → API call fails (429)
    → api/utils.js (setRateLimit)
      → localStorage.rateLimitUntil = timestamp
        → api/utils.js (isRateLimited) checks
          → If rate limited: Skip cloud sync
```

---

## 2.2 Workflow Logic Summary

### Paper Creation Workflow
```
User Input → Form Validation → PDF Upload (if cloud) → db.addPaper() → 
  → Adapter routes to cloud/local → Success → Navigate to details
```

### Search & Filter Workflow
```
User Input → appState Update → URL Hash Update → applyFiltersAndRender() → 
  → Filter Papers → Sort Papers → Paginate Papers → Render Dashboard
```

### Cloud Sync Workflow
```
User Action → Track Change → Debounced Sync Trigger → Collect Pending Changes → 
  → API Call → Backend Processes → Update Local Data → Success Toast
```

### Authentication Workflow
```
User Action → Auth Modal → API Call → Backend Validates → Tokens Stored → 
  → UI Updates → Cloud Sync Enabled (if login)
```

---

**End of Volume 2**





