# Volume 1: General Project Overview (The Vision)

**Generated from Code Audit** | **Date:** 2025-01-XX  
**Status:** Verified Against Source Code

---

## 1.1 Verified Purpose & Scope

### Current Reality: What the Project Actually Does

**citavErs** (formerly "Emre's Archive") is a **local-first research paper management web application** that runs entirely in the browser. The application provides researchers with a complete toolset for organizing, annotating, and managing academic papers without requiring server-side storage (though optional cloud sync is available).

#### Core Functionality (As Implemented):

1. **Paper Management**
   - Add papers manually or via DOI lookup
   - Edit paper metadata (title, authors, year, journal, DOI, URL, abstract, tags, status, notes, summary, rating)
   - Delete papers individually or in batches
   - Link related papers together
   - Track reading status (Reading, To Read, Finished, Archived)
   - Store PDF files locally in IndexedDB as Blobs

2. **Search & Filtering**
   - Full-text search across titles, authors, and notes
   - Filter by reading status
   - Filter by tags (multiple tags supported)
   - Combine status + tag filters simultaneously
   - Search mode toggle: "All Fields" vs "Notes Only"
   - Sort by: Date Added, Last Updated, Title, Year, Rating

3. **Collections**
   - Save filter combinations as named collections
   - Quick access to saved filter sets
   - Collections sync to cloud when enabled

4. **Rich Notes & Annotations**
   - Rich text notes editor (HTML content)
   - PDF annotations (highlights, notes, bookmarks)
   - Page-specific annotations with position data
   - Summary field for paper summaries
   - Rating system (1-10 scale, nullable)

5. **PDF Management**
   - Upload PDFs (stored locally in IndexedDB)
   - Built-in PDF viewer with zoom, rotation, search
   - PDF proxy endpoint for cloud-synced PDFs
   - PDF download/streaming support

6. **Paper Network Graph**
   - Interactive visualization of paper relationships
   - Visual linking between related papers
   - Network graph generation and storage

7. **Citation & Bibliography**
   - Generate citations in multiple formats
   - Export bibliography
   - Citation modal for quick copying

8. **Data Portability**
   - Export all data as JSON (papers, collections, annotations)
   - Import data from JSON files
   - Clear all data (local + cloud when sync enabled)
   - Conflict-free cloud restore workflow

9. **Cloud Sync (Optional)**
   - User authentication (email/password with JWT)
   - Email verification
   - Automatic background sync
   - Incremental sync (only changed items)
   - Full sync capability
   - Conflict resolution (last-write-wins with versioning)
   - PDF storage in S3 (AWS)
   - Multi-device access

10. **Progressive Web App (PWA)**
    - Service worker for offline functionality
    - Installable on mobile/desktop
    - App icons and manifest
    - Offline-first architecture

11. **Mobile Support**
    - Responsive design (mobile, tablet, desktop)
    - Touch gestures (swipe to open sidebar)
    - Mobile-optimized UI
    - Capacitor integration for native apps (Android/iOS)

12. **Command Palette & Keyboard Shortcuts**
    - Global command palette (Ctrl+K / Cmd+K)
    - Keyboard shortcuts for common actions
    - Quick navigation

13. **Dark Mode**
    - System preference detection
    - Manual toggle
    - Persistent theme selection

### Solved Problems

The application addresses the following research management challenges:

1. **Data Ownership**: All data stored locally in browser (IndexedDB), user has full control
2. **Offline Access**: Works completely offline, no internet required for core features
3. **Privacy**: No server-side data storage unless user explicitly enables cloud sync
4. **Multi-Device Sync**: Optional cloud sync enables access across devices
5. **PDF Management**: Store and view PDFs directly in the application
6. **Organization**: Flexible tagging, status tracking, and collections system
7. **Search**: Fast, client-side search across all paper data
8. **Paper Relationships**: Visual linking and network graph visualization
9. **Citation Generation**: Quick citation export for academic writing
10. **Import/Export**: Full data portability for backup and migration
11. **No Vendor Lock-in**: Export all data anytime, switch tools freely

### Architecture Philosophy

- **Local-First**: All operations default to local IndexedDB
- **Progressive Enhancement**: Cloud sync is an optional layer on top
- **No Build Tools**: Pure vanilla JavaScript, ES6 modules, CDN libraries
- **Framework-Free**: No React, Vue, or Angular dependencies
- **Repository Pattern**: Database operations abstracted through adapter layer
- **View-Based Routing**: Clean separation of views with mount/unmount lifecycle
- **Offline-First**: Service worker caches assets, IndexedDB stores all data

---

## 1.2 Project Status

### Version
- **Current Version**: 2.2 (as per package.json)
- **Package Name**: `citavers` (npm package name)

### Deployment
- **Frontend**: Live at https://citavers.com (Cloudflare Pages)
- **Backend**: Railway.app (https://emresarchive-production.up.railway.app)
- **Repository**: https://github.com/Hemrem19/citavers

### Test Coverage
- **167 automated tests** (100% pass rate)
- **Coverage**: 93% state, 87% filter branches, 74% database
- **Test Framework**: Vitest with happy-dom
- **CI/CD**: GitHub Actions

### Production Readiness
- ✅ **Feature Complete**: All planned features implemented
- ✅ **Tested**: Comprehensive test suite passing
- ✅ **Deployed**: Live in production
- ✅ **Documented**: API reference, testing guides, setup docs

---

## 1.3 Technology Stack (Verified)

### Frontend
- **Language**: Vanilla JavaScript (ES6+ modules)
- **HTML**: HTML5 with semantic markup
- **CSS**: Tailwind CSS (CDN), custom CSS
- **Icons**: Material Symbols (Google Fonts)
- **Fonts**: Manrope (Google Fonts)
- **PDF Viewer**: PDF.js (CDN)
- **Graph Visualization**: vis-network (CDN)
- **Storage**: IndexedDB (browser-native)
- **PWA**: Service Worker API

### Backend (Optional Cloud Sync)
- **Runtime**: Node.js 20+
- **Framework**: Express.js
- **Database**: PostgreSQL (via Prisma ORM)
- **File Storage**: AWS S3
- **Authentication**: JWT (access + refresh tokens)
- **Email**: Nodemailer / Resend
- **Validation**: Zod
- **Security**: Helmet, CORS, rate limiting

### Development Tools
- **Testing**: Vitest, fake-indexeddb, happy-dom
- **Mobile**: Capacitor (Android/iOS)
- **Build**: Node.js script (build.js)
- **CI/CD**: GitHub Actions

### External Services
- **DOI Lookup**: DOI.org API
- **ArXiv Metadata**: ArXiv API
- **PDF Storage**: AWS S3 (when cloud sync enabled)
- **Email Service**: Resend or Nodemailer (configurable)

---

## 1.4 File Organization Summary

### Active Core Files
- `index.html` - Main application shell
- `app.js` - Application initialization and orchestration
- `config.js` - Configuration (API URLs, status order, sync mode)
- `db.js` - Database adapter (routes to cloud/local)
- `ui.js` - UI helper functions (toasts, DOM manipulation)
- `citation.js` - Citation generation
- `service-worker.js` - PWA service worker

### Core Modules (`core/`)
- `state.js` - Application state management
- `router.js` - Client-side routing
- `filters.js` - Filtering and pagination logic
- `commandPalette.js` - Command palette functionality
- `keyboardShortcuts.js` - Global keyboard shortcuts
- `syncManager.js` - Automatic sync management

### Database Layer (`db/`)
- `core.js` - IndexedDB initialization and migrations
- `adapter.js` - Dual-mode adapter (cloud/local routing)
- `papers.js` - Local paper CRUD operations
- `collections.js` - Local collections CRUD
- `annotations.js` - Local annotations CRUD
- `data.js` - Import/Export/Clear operations
- `sync.js` - Sync change tracking and operations

### API Clients (`api/`)
- `auth.js` - Authentication API
- `papers.js` - Papers API
- `collections.js` - Collections API
- `annotations.js` - Annotations API
- `sync.js` - Sync API
- `user.js` - User management API
- `import.js` - Import API
- `network.js` - Network graph API
- `arxiv.js` - ArXiv metadata fetching
- `utils.js` - API utilities (rate limiting, error handling)

### View Modules (`*.view.js` and `views/`)
- `dashboard.view.js` - Dashboard view
- `form.view.js` - Add/Edit paper form
- `details.view.js` - Paper details view
- `settings.view.js` - Settings view
- `graph.view.js` - Network graph view
- `docs.view.js` - Documentation view
- `auth.view.js` - Authentication modal
- `views/pages/` - Modular page views
- `views/modals/` - Modal components
- `views/components/` - Reusable components

### Backend (`backend/`)
- `src/server.js` - Express server
- `src/routes/` - API route definitions
- `src/controllers/` - Request handlers
- `src/middleware/` - Express middleware
- `src/lib/` - Utilities (auth, email, S3, validation)
- `prisma/schema.prisma` - Database schema
- `prisma/migrations/` - Database migrations

### Dead Code / Legacy Files
- `app.js.backup` - Backup file (not used)
- `db.js.backup` - Backup file (not used)
- `views.js.backup` - Backup file (not used)
- `main_dashbord_draft.html` - Draft file (not used)
- `paper_details_draft.html` - Draft file (not used)
- `add_edit_paper.html` - Draft file (not used)
- `settings_draft.html` - Draft file (not used)

---

## 1.5 Key Design Decisions

1. **No Build Tools**: Browser-native ES6 modules, no webpack/vite/babel
2. **CDN Libraries**: Tailwind, PDF.js, vis-network loaded from CDN
3. **Dual-Mode Database**: Adapter pattern routes operations to cloud or local
4. **Optimistic UI**: Local updates happen immediately, cloud sync in background
5. **View Lifecycle**: Each view has mount/unmount methods for cleanup
6. **Deferred Mounting**: setTimeout(fn, 0) prevents DOM race conditions
7. **Repository Pattern**: Database operations abstracted from views
8. **State Management**: Centralized appState object, not a framework
9. **Hash Routing**: Uses window.location.hash for client-side routing
10. **Service Worker**: Caches static assets, doesn't intercept API calls

---

**End of Volume 1**



