# Volume 3: Technical Architecture

**Generated from Code Audit** | **Date:** 2025-01-XX  
**Status:** Verified Against Source Code

---

## 3.1 Directory & File Map

### Root Directory Structure

```
emresarchive/
├── index.html                 # Main application shell (entry point)
├── app.js                     # Application initialization and orchestration
├── config.js                  # Configuration (API URLs, status order, sync mode)
├── db.js                      # Database adapter entry point (routes to cloud/local)
├── ui.js                      # UI helper functions (toasts, DOM manipulation, formatting)
├── citation.js                # Citation generation (APA, MLA, Chicago, BibTeX)
├── api.js                     # Legacy DOI API (may be deprecated)
├── service-worker.js          # PWA service worker (caching, offline support)
├── debug.js                   # Debug utilities (if enabled)
├── build.js                   # Build script (copies files to dist/)
├── tailwind.js                # Tailwind CSS configuration (if needed)
├── style.css                  # Custom CSS styles
├── package.json               # Frontend dependencies and scripts
├── vitest.config.js           # Test configuration
├── capacitor.config.json      # Capacitor mobile app configuration
│
├── core/                      # Core application modules
│   ├── state.js               # Application state management
│   ├── router.js              # Client-side routing (hash-based)
│   ├── filters.js             # Filtering, sorting, pagination logic
│   ├── commandPalette.js      # Command palette functionality
│   ├── keyboardShortcuts.js   # Global keyboard shortcuts
│   └── syncManager.js         # Automatic background sync management
│
├── db/                        # Database layer (IndexedDB + adapter)
│   ├── core.js                # IndexedDB initialization, migrations, schema
│   ├── adapter.js             # Dual-mode adapter (routes cloud/local)
│   ├── papers.js              # Local paper CRUD operations
│   ├── collections.js         # Local collections CRUD operations
│   ├── annotations.js         # Local annotations CRUD operations
│   ├── data.js                # Import/Export/Clear operations
│   └── sync.js                # Sync change tracking and operations
│
├── api/                       # API client modules (frontend)
│   ├── auth.js                # Authentication API (login, register, tokens)
│   ├── papers.js              # Papers API (CRUD, PDF upload/download)
│   ├── collections.js         # Collections API
│   ├── annotations.js         # Annotations API
│   ├── sync.js                # Sync API (full/incremental sync)
│   ├── user.js                # User management API (stats, clear data)
│   ├── import.js              # Import API (batch import)
│   ├── network.js             # Network graph API
│   ├── arxiv.js               # ArXiv metadata fetching
│   └── utils.js               # API utilities (rate limiting, error handling)
│
├── views/                      # View templates and components (modular)
│   ├── index.js               # Views aggregator (exports all views)
│   ├── pages/                 # Page views
│   │   ├── home.js            # Dashboard/home page
│   │   ├── add.js             # Add/Edit paper form
│   │   ├── details.js         # Paper details page
│   │   ├── settings.js        # Settings page
│   │   ├── graph.js            # Network graph page
│   │   └── docs.js            # Documentation page
│   ├── modals/                # Modal components
│   │   ├── auth.js            # Authentication modal
│   │   ├── link.js            # Link papers modal
│   │   ├── citation.js       # Citation modal
│   │   └── bibliography.js    # Bibliography export modal
│   └── components/            # Reusable components
│       └── commandPalette.js  # Command palette component
│
├── *.view.js                  # Legacy view modules (backward compatibility)
│   ├── dashboard.view.js      # Dashboard view (uses views/pages/home.js)
│   ├── form.view.js           # Form view (uses views/pages/add.js)
│   ├── details.view.js        # Details view (uses views/pages/details.js)
│   ├── settings.view.js       # Settings view (uses views/pages/settings.js)
│   ├── graph.view.js          # Graph view (uses views/pages/graph.js)
│   ├── docs.view.js           # Docs view (uses views/pages/docs.js)
│   └── auth.view.js           # Auth view (uses views/modals/auth.js)
│
├── dashboard/                 # Dashboard-specific modules (refactored)
│   ├── handlers/              # Event handlers
│   ├── services/              # Business logic
│   ├── ui/                    # UI components
│   └── utils/                 # Utility functions
│
├── details/                   # Details view modules
│   ├── index.js               # Details view entry point
│   ├── notes.manager.js       # Notes management
│   ├── related.manager.js     # Related papers management
│   └── summary.manager.js     # Summary management
│
├── import/                    # Import utilities
│   └── ris-parser.js          # RIS file parser (if implemented)
│
├── components/                # Reusable UI components
│   └── rating-input.js        # Rating input component
│
├── assets/                    # Static assets
│   └── logos/                 # Logo files, favicons, app icons
│       ├── favicon.png
│       ├── icon-192.png
│       ├── icon-512.png
│       └── site.webmanifest
│
├── tests/                     # Test suite
│   ├── setup.js               # Test setup (IndexedDB mock, etc.)
│   ├── helpers.js             # Test helpers
│   ├── *.test.js              # Test files (167 tests total)
│   └── [subdirectories]/     # Organized test files
│
├── backend/                   # Backend server (Node.js + Express)
│   ├── src/
│   │   ├── server.js          # Express server entry point
│   │   ├── routes/            # API route definitions
│   │   │   ├── auth.js        # Authentication routes
│   │   │   ├── papers.js      # Papers routes
│   │   │   ├── collections.js # Collections routes
│   │   │   ├── annotations.js # Annotations routes
│   │   │   ├── sync.js        # Sync routes
│   │   │   ├── user.js        # User routes
│   │   │   ├── import.js      # Import routes
│   │   │   ├── extension.js   # Browser extension routes
│   │   │   └── network.js     # Network graph routes
│   │   ├── controllers/       # Request handlers
│   │   │   ├── auth.js
│   │   │   ├── papers.js
│   │   │   ├── collections.js
│   │   │   ├── annotations.js
│   │   │   ├── sync.js
│   │   │   ├── user.js
│   │   │   ├── import.js
│   │   │   ├── extension.js
│   │   │   └── network.js
│   │   ├── middleware/        # Express middleware
│   │   │   ├── auth.js        # JWT authentication middleware
│   │   │   ├── errorHandler.js # Error handling middleware
│   │   │   └── notFound.js    # 404 handler
│   │   └── lib/               # Utilities
│   │       ├── prisma.js      # Prisma client
│   │       ├── jwt.js         # JWT token utilities
│   │       ├── password.js    # Password hashing (bcrypt)
│   │       ├── email.js       # Email sending (Nodemailer/Resend)
│   │       ├── s3.js          # AWS S3 utilities
│   │       ├── validation.js  # Zod validation schemas
│   │       └── metadata.js     # DOI/ArXiv metadata fetching
│   ├── prisma/
│   │   ├── schema.prisma      # Database schema (Prisma)
│   │   └── migrations/        # Database migrations
│   ├── package.json           # Backend dependencies
│   └── [config files]         # Railway, Render, Nixpacks configs
│
├── extension/                 # Browser extension (Chrome/Firefox)
│   ├── manifest.json          # Extension manifest
│   ├── manifest.firefox.json  # Firefox-specific manifest
│   ├── background.js          # Background script
│   ├── content.js             # Content script
│   ├── popup.html/js/css      # Extension popup
│   └── icons/                 # Extension icons
│
├── android/                   # Android native app (Capacitor)
├── ios/                       # iOS native app (Capacitor)
├── dist/                      # Build output directory
├── coverage/                  # Test coverage reports
├── docs/                      # Documentation
├── plans/                     # Planning documents
└── [other files]             # Config, licenses, etc.
```

---

## 3.2 File Inter-dependencies

### Entry Point Flow

```
index.html
  → Loads: Tailwind CSS (CDN), PDF.js (CDN), vis-network (CDN)
  → Loads: style.css, app.js (type="module")
  → app.js initializes:
      → openDB() (db.js → db/core.js)
      → createAppState() (core/state.js)
      → createRouter() (core/router.js)
      → createCommandPalette() (core/commandPalette.js)
      → createKeyboardShortcuts() (core/keyboardShortcuts.js)
      → initializeAutoSync() (core/syncManager.js)
      → authView.mount() (auth.view.js)
```

### Database Layer Dependencies

```
db.js (entry point)
  → db/adapter.js (dual-mode routing)
    → If cloud sync:
        → api/papers.js, api/collections.js, api/annotations.js
          → Backend API (Express routes)
    → If local-only:
        → db/papers.js, db/collections.js, db/annotations.js
          → db/core.js (IndexedDB operations)
  → db/data.js (import/export)
  → db/sync.js (sync tracking)
```

### View Module Dependencies

```
*.view.js (legacy views)
  → views/index.js (templates)
    → views/pages/*.js (page templates)
    → views/modals/*.js (modal templates)
  → db.js (database operations)
  → ui.js (UI helpers)
  → config.js (configuration)
```

### Router Dependencies

```
core/router.js
  → dashboard.view.js (for #/)
  → details/index.js (for #/details/:id)
  → form.view.js (for #/add, #/edit/:id)
  → settings.view.js (for #/settings)
  → graph.view.js (for #/graph)
  → docs.view.js (for #/docs)
  → views/index.js (HTML templates)
  → core/filters.js (filter parsing)
  → ui.js (sidebar highlighting)
```

### API Client Dependencies

```
api/*.js
  → config.js (API_CONFIG.BASE_URL)
  → api/utils.js (rate limiting, error handling)
  → ui.js (toast notifications)
  → api/auth.js (authentication tokens)
```

### Core Module Dependencies

```
core/state.js
  → localStorage (persistence)

core/filters.js
  → core/state.js (appState)
  → db.js (getAllPapers)

core/router.js
  → core/state.js (appState)
  → *.view.js (view modules)
  → views/index.js (templates)

core/syncManager.js
  → db/sync.js (sync operations)
  → api/sync.js (API calls)
  → config.js (isCloudSyncEnabled)
  → api/auth.js (isAuthenticated)
```

---

## 3.3 True Stack Analysis

### Frontend Dependencies (package.json)

#### Production Dependencies
```json
{
  "@capacitor/browser": "^7.0.2",      // Capacitor browser plugin
  "@capacitor/filesystem": "^7.1.5"   // Capacitor filesystem plugin
}
```

**Note**: Frontend has minimal production dependencies. Most functionality uses:
- Browser-native APIs (IndexedDB, Fetch, Service Worker)
- CDN libraries (Tailwind, PDF.js, vis-network)

#### Development Dependencies
```json
{
  "@capacitor/android": "^7.4.4",           // Android native app
  "@capacitor/cli": "^7.4.4",              // Capacitor CLI
  "@capacitor/core": "^7.4.4",              // Capacitor core
  "@capacitor/ios": "^7.4.4",              // iOS native app
  "@vitest/coverage-v8": "^1.6.0",         // Test coverage
  "@vitest/ui": "^1.0.4",                  // Test UI
  "adm-zip": "^0.5.16",                    // ZIP utility (build)
  "fake-indexeddb": "^5.0.2",             // IndexedDB mock for tests
  "happy-dom": "^12.10.3",                // DOM implementation for tests
  "patch-package": "^8.0.1",              // Patch node_modules
  "sharp": "^0.34.5",                     // Image processing (build)
  "vitest": "^1.0.4"                      // Test framework
}
```

### Backend Dependencies (backend/package.json)

#### Production Dependencies
```json
{
  "@aws-sdk/client-s3": "^3.490.0",              // AWS S3 client
  "@aws-sdk/s3-presigned-post": "^3.922.0",     // S3 presigned URLs
  "@aws-sdk/s3-request-presigner": "^3.490.0",  // S3 request signing
  "@prisma/client": "^5.7.1",                    // Prisma ORM client
  "bcrypt": "^5.1.1",                            // Password hashing
  "cookie-parser": "^1.4.7",                     // Cookie parsing
  "cors": "^2.8.5",                              // CORS middleware
  "dotenv": "^16.3.1",                           // Environment variables
  "express": "^4.18.2",                          // Web framework
  "express-rate-limit": "^7.1.5",               // Rate limiting
  "helmet": "^7.1.0",                            // Security headers
  "jsonwebtoken": "^9.0.2",                     // JWT tokens
  "multer": "^1.4.5-lts.1",                     // File uploads
  "nodemailer": "^6.9.8",                        // Email sending
  "resend": "^3.2.0",                           // Email service (alternative)
  "zod": "^3.22.4"                              // Schema validation
}
```

#### Development Dependencies
```json
{
  "@types/node": "^20.10.6",              // TypeScript types
  "@vitest/coverage-v8": "^1.6.0",       // Test coverage
  "patch-package": "^8.0.1",             // Patch node_modules
  "prisma": "^5.7.1",                    // Prisma CLI
  "supertest": "^6.1.6",                 // HTTP testing
  "vitest": "^1.0.4"                     // Test framework
}
```

### CDN Libraries (Loaded in index.html)

1. **Tailwind CSS**
   - URL: `https://cdn.tailwindcss.com?plugins=forms,container-queries`
   - Purpose: Utility-first CSS framework
   - Version: Latest (CDN)

2. **PDF.js**
   - CSS: `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf_viewer.min.css`
   - JS: `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js`
   - Worker: `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js`
   - Purpose: PDF rendering and viewing
   - Version: 3.11.174

3. **vis-network**
   - URL: `https://unpkg.com/vis-network@9.1.9/standalone/umd/vis-network.min.js`
   - Purpose: Network graph visualization
   - Version: 9.1.9

4. **Google Fonts**
   - Manrope: `https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;700;800`
   - Material Symbols: `https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined`
   - Purpose: Typography and icons

### External APIs

1. **DOI.org API**
   - Endpoint: `https://doi.org/api/handles/{doi}`
   - Purpose: Fetch paper metadata from DOI
   - Used in: `api.js` (legacy) or direct fetch

2. **ArXiv API**
   - Endpoint: `https://export.arxiv.org/api/query?id_list={arxivId}`
   - Purpose: Fetch ArXiv paper metadata
   - Used in: `api/arxiv.js`

3. **Backend API** (when cloud sync enabled)
   - Base URL: `https://emresarchive-production.up.railway.app` (configurable)
   - Purpose: Cloud sync, authentication, PDF storage
   - Used in: All `api/*.js` modules

---

## 3.4 Architecture Patterns

### 1. Repository Pattern
**Location**: `db/adapter.js`, `db/papers.js`, `db/collections.js`, `db/annotations.js`

**Pattern**: Database operations abstracted through adapter layer. Views call `db.addPaper()`, adapter routes to cloud API or local IndexedDB based on sync mode.

**Benefits**:
- Views don't need to know about cloud vs local
- Easy to switch between modes
- Consistent API across storage backends

### 2. Adapter Pattern
**Location**: `db/adapter.js`

**Pattern**: Dual-mode adapter routes operations to cloud API or local IndexedDB based on `isCloudSyncEnabled()` and `isAuthenticated()`.

**Flow**:
```
View → db.addPaper()
  → adapter.js (papers.addPaper)
    → If cloud: api/papers.js → Backend API
    → If local: db/papers.js → IndexedDB
    → Fallback: If cloud fails, use local
```

### 3. View-Based Routing
**Location**: `core/router.js`, `*.view.js`

**Pattern**: Each view is a module with `mount()` and `unmount()` methods. Router renders view template and calls `mount()`.

**Lifecycle**:
```
Router → renderView(template, mountFn)
  → setTimeout(mountFn, 0)  // Deferred mounting
    → view.mount(params, appState)
      → View sets up event listeners
        → User interacts
          → Router navigates away
            → view.unmount(appState)  // Cleanup
```

### 4. State Management (Centralized)
**Location**: `core/state.js`, `app.js`

**Pattern**: Single `appState` object holds all application state. No framework state management (Redux, Vuex, etc.).

**State Structure**:
```javascript
{
  allPapersCache: [],
  collectionsCache: [],
  hasUnsavedChanges: false,
  currentSortBy: 'date_added',
  currentSearchTerm: '',
  currentPath: '/',
  currentView: null,
  selectedPaperIds: new Set(),
  activeFilters: { status: null, tags: [] },
  pagination: { currentPage: 1, itemsPerPage: 25, ... },
  searchMode: 'all'
}
```

### 5. Optimistic UI Updates
**Location**: `db/adapter.js`

**Pattern**: Local updates happen immediately, cloud sync happens in background. User sees instant feedback.

**Flow**:
```
User Action → Local Update (immediate)
  → Track Change (for sync)
    → Background Sync (debounced)
      → Cloud Update
        → Merge Results (if needed)
```

### 6. Progressive Enhancement
**Location**: Entire application

**Pattern**: Application works offline-first. Cloud sync is an optional enhancement layer.

**Layers**:
1. **Base**: IndexedDB (always works)
2. **Enhancement**: Cloud sync (optional, requires auth)
3. **Enhancement**: PWA (service worker caching)

### 7. Deferred View Mounting
**Location**: `core/router.js`

**Pattern**: Views mounted with `setTimeout(fn, 0)` to prevent DOM race conditions.

**Why**: Browser needs to parse HTML and create DOM elements before view code can access them.

### 8. Event-Driven Architecture
**Location**: `app.js`, view modules

**Pattern**: Views set up event listeners in `mount()`, remove them in `unmount()`. Prevents memory leaks.

**Example**:
```javascript
mount() {
  this.handleClick = (e) => { ... };
  document.addEventListener('click', this.handleClick);
}

unmount() {
  document.removeEventListener('click', this.handleClick);
}
```

---

## 3.5 Database Schema

### IndexedDB Schema (Local)

**Database Name**: `CitaversDB`  
**Version**: 6

#### Object Stores:

1. **papers**
   - Key: `id` (auto-increment)
   - Indexes:
     - `title` (non-unique)
     - `authors` (non-unique)
     - `year` (non-unique)
     - `tags` (non-unique, multiEntry)
     - `relatedPaperIds` (non-unique, multiEntry)
     - `doi` (non-unique)
     - `rating` (non-unique)
   - Fields: `id`, `title`, `authors[]`, `year`, `journal`, `doi`, `url`, `abstract`, `tags[]`, `readingStatus`, `relatedPaperIds[]`, `notes`, `summary`, `rating`, `pdfData` (Blob), `hasPdf`, `createdAt`, `updatedAt`, `version`, `clientId`, `s3Key`, `pdfSizeBytes`

2. **collections**
   - Key: `id` (auto-increment)
   - Indexes:
     - `name` (non-unique)
     - `createdAt` (non-unique)
   - Fields: `id`, `name`, `icon`, `color`, `filters` (JSON), `createdAt`, `updatedAt`, `version`, `deletedAt`

3. **annotations**
   - Key: `id` (auto-increment)
   - Indexes:
     - `paperId` (non-unique)
     - `type` (non-unique)
     - `pageNumber` (non-unique)
     - `createdAt` (non-unique)
   - Fields: `id`, `paperId`, `type`, `pageNumber`, `position` (JSON), `content`, `color`, `createdAt`, `updatedAt`, `version`, `deletedAt`

### PostgreSQL Schema (Cloud - Prisma)

**See**: `backend/prisma/schema.prisma`

**Tables**:
- `users` - User accounts
- `papers` - Paper records
- `collections` - Saved filter collections
- `annotations` - PDF annotations
- `sessions` - JWT refresh token sessions
- `sync_logs` - Sync operation logs
- `paper_connections` - Paper relationship graph
- `citation_cache` - Cached citation data
- `network_graphs` - Saved network graphs

**Relationships**:
- User → Papers (1:N)
- User → Collections (1:N)
- User → Annotations (1:N)
- Paper → Annotations (1:N)
- Paper → Paper (N:M via `paper_connections`)

---

## 3.6 Build System

### Frontend Build
**Script**: `build.js` (Node.js)

**Process**:
1. Clean `dist/` directory
2. Copy files to `dist/`:
   - Root files: `index.html`, `app.js`, `style.css`, etc.
   - Directories: `api/`, `core/`, `db/`, `views/`, `assets/`, etc.
3. No compilation/transpilation (vanilla JS)
4. No bundling (ES6 modules used as-is)

**Output**: `dist/` directory ready for static hosting

### Backend Build
**No build step** - Node.js runs source files directly

**Deployment**:
- Railway: Uses `nixpacks.toml` or `railway.json`
- Render: Uses `render.yaml`
- Runs: `npm run db:migrate:deploy && node src/server.js`

---

## 3.7 Testing Architecture

### Test Framework
- **Framework**: Vitest
- **Environment**: happy-dom (DOM implementation)
- **Mock**: fake-indexeddb (IndexedDB mock)

### Test Structure
```
tests/
├── setup.js              # Test setup (IndexedDB mock, etc.)
├── helpers.js            # Test helpers
├── *.test.js            # Test files
└── [subdirectories]/    # Organized by feature
```

### Test Coverage
- **167 tests** (100% pass rate)
- **Coverage**: 93% state, 87% filter branches, 74% database
- **CI/CD**: GitHub Actions

---

## 3.8 Deployment Architecture

### Frontend Deployment
- **Platform**: Cloudflare Pages
- **URL**: https://citavers.com
- **Build**: Static files from `dist/` directory
- **CDN**: Cloudflare CDN

### Backend Deployment
- **Platform**: Railway.app
- **URL**: https://emresarchive-production.up.railway.app
- **Database**: PostgreSQL (Railway managed)
- **Storage**: AWS S3 (for PDFs)
- **Environment**: Node.js 20+

### Mobile Deployment
- **Platform**: Capacitor
- **Android**: Google Play Store (if published)
- **iOS**: App Store (if published)
- **Build**: `npm run cap:sync` → `npm run cap:open`

---

**End of Volume 3**


