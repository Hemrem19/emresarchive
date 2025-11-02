# citavErs: Comprehensive Project Explanation

## Table of Contents

1. [Overview](#overview)
2. [Problem Statement](#problem-statement)
3. [Solution & Philosophy](#solution--philosophy)
4. [Core Architecture](#core-architecture)
5. [Technical Stack](#technical-stack)
6. [Key Features](#key-features)
7. [Project Structure](#project-structure)
8. [Data Flow & State Management](#data-flow--state-management)
9. [Database Schema](#database-schema)
10. [Authentication & Cloud Sync](#authentication--cloud-sync)
11. [Development Workflow](#development-workflow)
12. [Testing Strategy](#testing-strategy)
13. [Deployment Architecture](#deployment-architecture)
14. [Future Roadmap](#future-roadmap)
15. [Contributing](#contributing)

---

## Overview

**citavErs** is a modern, privacy-focused research paper management application designed for academics, researchers, and students. It combines the simplicity of local-first storage with the convenience of optional cloud synchronization, providing users with complete control over their research data.

### Key Characteristics

- **Local-First Architecture**: All data is stored locally in the browser (IndexedDB) by default
- **Offline-Capable**: Full functionality without an internet connection
- **Privacy-Focused**: No user tracking, no analytics, complete data ownership
- **Modern UI/UX**: Clean, responsive interface with dark mode support
- **Feature-Rich**: Comprehensive paper management with advanced search, filtering, and organization tools
- **Open Source**: MIT licensed, fully open source

### Project Status

- **Version**: 2.2
- **Status**: Production Ready ✅
- **Deployment**: Live at https://citavers.com
- **Test Coverage**: 167 tests passing (100% pass rate)
- **Database Version**: 5

---

## Problem Statement

Researchers, academics, and students face significant challenges in managing their growing collection of research papers:

1. **Data Fragmentation**: Papers scattered across folders, note-taking apps, and browser bookmarks
2. **Lack of Organization**: Difficulty finding specific papers among hundreds or thousands
3. **Note-Taking Disconnection**: Notes often stored separately from papers
4. **Multi-Device Access**: Need to access papers from different devices
5. **Privacy Concerns**: Existing solutions often require cloud accounts with data privacy concerns
6. **Limited Customization**: Rigid organizational structures that don't fit individual workflows
7. **Citation Management**: Difficulty generating properly formatted citations
8. **PDF Management**: PDFs stored separately from metadata, making organization difficult

### Target Users

- **Graduate Students**: Managing thesis research and coursework papers
- **Academics & Professors**: Organizing research for multiple projects
- **Industry Researchers**: Keeping track of relevant publications in their field
- **PhD Candidates**: Comprehensive literature review management
- **Anyone**: Who regularly reads and references academic papers

---

## Solution & Philosophy

### Local-First Philosophy

citavErs is built on the principle of **local-first computing**:

1. **Data Ownership**: All data belongs to the user, stored locally in their browser
2. **Offline First**: Core functionality works without internet connection
3. **Privacy by Default**: No telemetry, no tracking, no data sent to servers unless explicitly syncing
4. **User Control**: Users can export all data anytime, delete it, or migrate it
5. **Progressive Enhancement**: Cloud sync is optional and enhances, not replaces, local functionality

### Design Principles

1. **Simplicity**: Intuitive interface that doesn't require training
2. **Speed**: Fast performance even with thousands of papers
3. **Flexibility**: Multiple ways to organize (tags, statuses, collections)
4. **Accessibility**: Keyboard shortcuts, screen reader support, responsive design
5. **Extensibility**: Modular architecture allows easy feature additions

---

## Core Architecture

### Single-Page Application (SPA)

citavErs is a **Single-Page Application** built with vanilla JavaScript (no frameworks). The application uses:

- **Client-Side Routing**: Hash-based routing (`#/`, `#/details/:id`, `#/settings`)
- **View-Based Architecture**: Each major view (Dashboard, Details, Form, Settings) is a separate module
- **Dynamic Content Injection**: Views are rendered by injecting HTML templates into the main container
- **Lifecycle Management**: Each view has `mount()` and `unmount()` methods for proper setup/cleanup

### Architectural Patterns

#### 1. Repository Pattern (Database Layer)

All database operations are abstracted through a repository layer (`db/` directory):

```
db/
├── core.js          # Database initialization, migrations, openDB
├── papers.js        # Paper CRUD operations
├── collections.js   # Collections CRUD
├── annotations.js   # Annotations CRUD
├── data.js          # Export/Import/Clear operations
└── sync.js          # Sync operations
```

**Benefits:**
- Clean separation between data access and business logic
- Easy to test database operations independently
- Can swap IndexedDB for another storage solution without changing application code
- Single source of truth for data operations

#### 2. View-Based Modular Architecture

Each primary view is a self-contained module:

```
*.view.js files:
- dashboard.view.js   # Main paper list view
- details.view.js     # Paper details and PDF viewer
- form.view.js        # Add/Edit paper form
- settings.view.js    # Settings and data management
- graph.view.js       # Network graph visualization
- docs.view.js        # User documentation
```

**Each view module provides:**
- `mount(state)` - Sets up the view, attaches event listeners
- `unmount(state)` - Cleans up event listeners, prevents memory leaks
- View-specific logic isolated from other views

#### 3. Core Modules Separation

Application core functionality is separated into focused modules:

```
core/
├── state.js              # Application state management
├── filters.js            # Filtering, search, pagination logic
├── router.js             # Client-side routing
├── commandPalette.js     # Command palette functionality
└── keyboardShortcuts.js   # Global keyboard shortcuts
```

**Benefits:**
- Single Responsibility Principle
- Easy to test individual components
- Clear dependencies
- Reduced code complexity (87% reduction from monolithic files)

#### 4. Deferred View Mounting

To prevent race conditions where view logic tries to access DOM elements before they exist:

```javascript
// Views are mounted asynchronously after DOM injection
setTimeout(() => {
    view.mount(appState);
}, 0);
```

This ensures the browser has parsed the new HTML and created DOM elements before view setup code runs.

---

## Technical Stack

### Frontend

#### Core Technologies

- **HTML5**: Semantic markup, accessibility features
- **CSS3**: Modern styling with Tailwind CSS utility classes
- **JavaScript (ES6+)**: 
  - ES6 Modules (`import`/`export`)
  - Async/await for asynchronous operations
  - Classes and modern syntax
  - No transpilation required (browser-native)

#### CSS Framework

- **Tailwind CSS**: Utility-first CSS framework via CDN
- **JIT Compiler**: Just-in-time compilation for optimal bundle size
- **Custom CSS**: `style.css` for styles not easily handled by Tailwind

#### Key Libraries (CDN-Hosted)

- **PDF.js** (v3.11.174): PDF rendering and text extraction
- **vis-network** (v9.1.9): Interactive network graph visualization
- **Material Symbols**: Google's Material Symbols icon font
- **Google Fonts**: Manrope font family

#### No Build Tools

- **Zero Build Step**: No webpack, Vite, or other bundlers
- **Browser-Native ES6 Modules**: Direct `import`/`export` support
- **CDN Libraries**: All external dependencies loaded via CDN
- **Development**: Simple HTTP server (Python's `http.server`, `npx serve`, etc.)

### Backend (Optional Cloud Sync)

#### Runtime & Framework

- **Node.js** 20.x (ES modules)
- **Express.js** 4.18.2: Web server framework
- **PostgreSQL**: Production database (Neon.tech)

#### ORM & Database

- **Prisma** 5.7.1: Type-safe database ORM
- **Database**: PostgreSQL (managed by Neon.tech)
- **Migrations**: Prisma Migrate for schema versioning

#### Authentication

- **JWT** (jsonwebtoken 9.0.2): Access tokens (15min) and refresh tokens (7 days)
- **bcrypt** 5.1.1: Password hashing (cost factor 12)
- **HTTP-only Cookies**: Secure refresh token storage

#### Storage

- **Cloudflare R2**: S3-compatible object storage for PDFs
- **Presigned URLs**: Secure, time-limited upload/download URLs
- **@aws-sdk/client-s3**: AWS SDK for S3-compatible operations

#### Validation & Security

- **Zod** 3.22.4: Schema validation for API requests
- **Helmet** 7.1.0: Security headers
- **express-rate-limit** 7.1.5: API rate limiting
- **CORS** 2.8.5: Cross-origin resource sharing configuration

#### Email

- **Resend**: Primary email service (for verification emails)
- **Nodemailer**: Fallback SMTP email service
- **Email Verification**: Token-based email verification flow

### Testing

- **Vitest** 1.6.1: Fast test runner
- **happy-dom**: DOM implementation for Node.js
- **fake-indexeddb**: Complete IndexedDB mock for testing
- **Test Coverage**: 167 tests, 100% pass rate

### Deployment

- **Frontend**: Cloudflare Pages (static hosting)
- **Backend**: Railway.app (Node.js hosting)
- **Database**: Neon.tech (PostgreSQL)
- **Storage**: Cloudflare R2 (S3-compatible)
- **Domain**: citavers.com (custom domain)

---

## Key Features

### 1. Paper Management

#### Adding Papers

- **Manual Entry**: Full form with all paper metadata fields
- **Quick Add by DOI**: Paste DOI or DOI URL, automatically fetches metadata from doi.org API
- **URL Auto-Detection**: Detects DOI from various URL formats (doi.org, publisher URLs)
- **PDF Upload**: Attach PDF files directly (stored in IndexedDB or S3)

#### Paper Metadata

- Title, Authors, Journal/Conference, Year, DOI, URL
- Custom tags (unlimited)
- Reading status (To Read, Reading, Finished, Archived)
- Custom notes (rich text editor)
- Reading progress tracking (current page / total pages)
- Related papers (linking)

#### Editing & Organization

- Edit any paper's metadata at any time
- Bulk operations (select multiple papers)
- Tag management (add/remove tags in batch)
- Status changes in bulk
- Delete papers (with confirmation)

### 2. Advanced Search & Filtering

#### Search Modes

- **All Fields**: Searches across title, authors, and notes
- **Notes Only**: Dedicated search within paper notes
- **Exact Phrase**: Use double quotes for exact matches (e.g., "machine learning")
- **Multi-Word**: Multiple keywords searched independently

#### Filtering System

- **Status Filters**: Filter by reading status (To Read, Reading, Finished, Archived)
- **Tag Filters**: Select multiple tags (AND logic - papers must match all selected tags)
- **Combined Filters**: Combine status + multiple tags for precise results
- **Filter Chips**: Visual representation of active filters with remove buttons
- **URL-Based Filters**: Filter state saved in URL hash for bookmarking

#### Search Highlighting

- Matching terms highlighted in search results
- Note snippets shown when matches found in notes
- Visual indicators for note matches

### 3. Collections

- **Saved Filters**: Save filter combinations as named collections
- **Quick Access**: One-click filter restoration from sidebar
- **Custom Icons**: Choose icon and color for each collection
- **Edit/Delete**: Manage collections from sidebar

### 4. Rich Notes & Annotations

#### Notes Editor

- **Rich Text Formatting**: Bold, italic, lists (bulleted and numbered)
- **Auto-Save**: Notes saved automatically as you type
- **Full HTML Support**: Rich formatting preserved
- **Searchable**: Notes included in full-text search

#### Reading Progress

- Track current page and total pages for papers with "Reading" status
- Progress bars on paper cards and details view
- Sort papers by reading progress
- Automatic percentage calculation

### 5. PDF Viewer

#### Professional PDF Viewing

- **Built-in Viewer**: Canvas-based PDF rendering with PDF.js
- **Search in PDF**: Find text within PDF documents with highlighting
- **Zoom Controls**: 25% to 300% zoom with crisp rendering
- **Page Navigation**: Previous/Next buttons, direct page jump
- **Rotation**: Rotate pages in 90° increments
- **Fullscreen Mode**: Immersive reading experience
- **Dark Mode**: PDF viewer adapts to theme

#### PDF Features

- Text extraction and caching for search performance
- Match highlighting with navigation (prev/next)
- Match counter display
- Adaptive quality rendering at all zoom levels

### 6. Paper Network Graph

#### Interactive Visualization

- **Network Graph**: Visual representation of paper relationships
- **Nodes**: Papers (sized by connection count)
- **Edges**: Connections between related papers
- **Color Coding**: Papers colored by reading status
- **Interactive Navigation**: Click nodes to view paper details
- **Hover Tooltips**: See paper info on hover
- **Filters**: Filter graph by status, tags, or search terms

### 7. Batch Operations

- **Multi-Select**: Checkboxes on paper cards
- **Select All**: Quickly select all visible papers
- **Batch Status Change**: Change reading status for multiple papers
- **Batch Tag Management**: Add/remove tags from multiple papers
- **Batch Delete**: Delete multiple papers with confirmation
- **Batch Bibliography Export**: Export citations for selected papers

### 8. Citation Export

#### Citation Formats

- **6 Formats Supported**: APA, IEEE, MLA, Chicago, Harvard, Vancouver
- **Bibliography Styles**: Numbered (1, 2, 3...) or alphabetical (A, B, C...)
- **Batch Export**: Export citations for multiple selected papers
- **Export Options**: Download as .txt file or copy to clipboard
- **Live Preview**: See formatted citations before export

### 9. Keyboard Shortcuts

#### Global Shortcuts

- `n` - New Paper
- `/` - Focus search bar
- `?` - Show keyboard shortcuts help
- `g h` - Go to Home/Dashboard (vim-style sequence)
- `g s` - Go to Settings
- `Esc` - Smart escape (context-aware)

#### Dashboard Shortcuts

- `Ctrl+A` - Select all visible papers
- `Ctrl+D` - Clear selection
- `Delete` - Delete selected papers
- `Esc` - Clear selection
- `Ctrl+Shift+D` - Focus Quick Add by DOI input

### 10. Command Palette

- **Quick Access**: Press `Ctrl+K` (or `Cmd+K` on Mac) from anywhere
- **Universal Search**: Search across papers, tags, collections, statuses, actions
- **Keyboard Navigation**: Arrow keys to navigate, Enter to execute
- **Grouped Results**: Results organized by category
- **Fuzzy Search**: Case-insensitive substring matching

### 11. Data Management

#### Export

- **Full Export**: All papers, notes, PDFs, collections in single JSON file
- **Backup Format**: Complete data backup for safekeeping
- **Portable**: JSON format is human-readable and portable

#### Import

- **Restore from Backup**: Import exported JSON files
- **Zotero/Mendeley Import**: Import RIS files (.ris) from other tools
- **Warning System**: Clear warnings about data replacement
- **Partial Import**: Handles import errors gracefully

#### Privacy & Ownership

- **Local Storage**: All data stored in browser (IndexedDB)
- **No Tracking**: Zero analytics, no user tracking
- **Full Control**: Users own and control all their data
- **Export Anytime**: Export all data including PDFs

### 12. Cloud Sync (Optional)

#### Account System

- **User Registration**: Create account with email and password
- **Email Verification**: Token-based email verification
- **Secure Authentication**: JWT tokens with HTTP-only cookies

#### Sync Features

- **Automatic Sync**: Changes sync automatically when enabled
- **Manual Sync**: Trigger sync on-demand from settings
- **Multi-Device**: Access papers from any device
- **Conflict Resolution**: Last-write-wins strategy
- **Offline Support**: Works offline, syncs when online

#### Sync Status

- Last sync time display
- Pending changes indicator
- Sync status visualization
- Error reporting

---

## Project Structure

```
research/
├── index.html              # Main application shell
├── app.js                  # Application initialization (theme, sidebar, router setup)
├── views.js                # HTML string templates for all views
├── ui.js                   # Global UI helper functions (toast, rendering helpers)
├── api.js                  # External API calls (DOI.org)
├── citation.js             # Citation generation (6 formats)
├── config.js               # Configuration constants
├── style.css               # Custom CSS styles
│
├── core/                   # Core application modules
│   ├── state.js           # Application state management
│   ├── filters.js         # Filtering, search, pagination logic
│   ├── router.js          # Client-side routing
│   ├── commandPalette.js  # Command palette functionality
│   └── keyboardShortcuts.js # Global keyboard shortcuts
│
├── db/                     # Database layer (Repository Pattern)
│   ├── core.js            # Database initialization, migrations, openDB
│   ├── papers.js          # Paper CRUD operations
│   ├── collections.js     # Collections CRUD operations
│   ├── annotations.js     # Annotations CRUD (for future use)
│   ├── data.js            # Export/Import/Clear operations
│   └── sync.js            # Sync operations
│
├── api/                    # API client modules
│   ├── auth.js            # Authentication API client
│   └── sync.js            # Sync API client
│
├── *.view.js              # View modules (lifecycle management)
│   ├── dashboard.view.js  # Main paper list view
│   ├── details.view.js    # Paper details and PDF viewer
│   ├── form.view.js       # Add/Edit paper form
│   ├── settings.view.js   # Settings and data management
│   ├── graph.view.js      # Network graph visualization
│   └── docs.view.js       # User documentation
│
├── backend/                # Backend server (Node.js + Express)
│   ├── src/
│   │   ├── server.js      # Express server setup
│   │   ├── routes/        # API route definitions
│   │   │   ├── auth.js    # Authentication routes
│   │   │   ├── papers.js  # Papers routes
│   │   │   ├── collections.js # Collections routes
│   │   │   ├── annotations.js # Annotations routes
│   │   │   └── sync.js    # Sync routes
│   │   ├── controllers/   # Request handlers
│   │   │   ├── auth.js    # Auth controller (register, login, etc.)
│   │   │   ├── papers.js  # Papers controller (CRUD)
│   │   │   ├── collections.js # Collections controller
│   │   │   ├── annotations.js # Annotations controller
│   │   │   └── sync.js    # Sync controller
│   │   ├── middleware/    # Express middleware
│   │   │   ├── auth.js    # JWT authentication middleware
│   │   │   └── errorHandler.js # Error handling middleware
│   │   └── lib/           # Utility modules
│   │       ├── jwt.js     # JWT token utilities
│   │       ├── password.js # Password hashing
│   │       ├── validation.js # Zod schemas
│   │       ├── email.js   # Email service (Resend/SMTP)
│   │       ├── s3.js       # S3 storage utilities
│   │       └── prisma.js   # Prisma client singleton
│   └── prisma/            # Database schema and migrations
│       ├── schema.prisma  # Prisma schema definition
│       └── migrations/    # Database migration files
│
└── tests/                 # Test suite
    ├── setup.js           # Test setup and mocks
    ├── helpers.js         # Test helper utilities
    ├── *.test.js          # Test files (167 tests total)
    └── vitest.config.js   # Vitest configuration
```

---

## Data Flow & State Management

### Application State

The application maintains a centralized state object (`appState`) that tracks:

```javascript
appState = {
    currentPath: '/',              // Current route
    currentView: null,             // Current view module
    papers: [],                    // Cached paper list
    collections: [],               // Cached collections
    activeFilters: {               // Current filter state
        status: null,
        tags: [],
        searchTerm: ''
    },
    pagination: {                  // Pagination state
        currentPage: 1,
        itemsPerPage: 25,
        totalItems: 0,
        totalPages: 0
    },
    selectedPaperIds: new Set(),    // Selected papers for batch ops
    hasUnsavedChanges: false,      // Form dirty state
    searchMode: 'all'              // 'all' or 'notes'
}
```

### Data Flow Pattern

1. **User Action** → Event listener in view module
2. **View Logic** → Calls database function (db/papers.js, etc.)
3. **Database Layer** → IndexedDB operation
4. **State Update** → Updates appState
5. **UI Update** → Re-renders affected UI components

### Example: Adding a Paper

```
User clicks "Add Paper"
  ↓
form.view.js: mount() sets up form
  ↓
User fills form, clicks "Save"
  ↓
form.view.js: handleSubmit()
  ↓
db/papers.js: addPaper(paperData)
  ↓
IndexedDB: Stores paper in 'papers' object store
  ↓
appState.papers.push(newPaper) [cache update]
  ↓
ui.js: renderPaperList() [re-render dashboard]
  ↓
Router: Navigate to dashboard (#/)
```

### State Persistence

- **IndexedDB**: All data persisted in browser database
- **localStorage**: Preferences (theme, search mode, pagination settings)
- **URL Hash**: Filter state persisted in URL for bookmarking
- **Cloud Sync**: Optional persistence to server database

---

## Database Schema

### Frontend (IndexedDB)

#### Papers Object Store

```javascript
{
    id: number,                    // Auto-increment primary key
    title: string,
    authors: string[],             // Array of author names
    journal: string,
    year: number,
    doi: string,
    url: string,
    tags: string[],                // Array of tag strings
    status: string,                // "To Read", "Reading", "Finished", "Archived"
    notes: string,                 // HTML-formatted notes
    pdfData: Blob,                 // PDF file as Blob
    relatedPaperIds: number[],     // Array of related paper IDs
    readingProgress: {              // Optional progress tracking
        currentPage: number,
        totalPages: number
    },
    createdAt: Date,
    updatedAt: Date,
    // Sync fields (when cloud sync enabled)
    clientId: string,
    version: number,
    deletedAt: Date|null
}
```

#### Collections Object Store

```javascript
{
    id: number,
    name: string,
    icon: string,                  // Material Symbol name
    color: string,                  // Tailwind color class
    filters: {
        status: string|null,
        tag: string|null,
        searchTerm: string
    },
    createdAt: Date
}
```

#### Annotations Object Store (for future use)

```javascript
{
    id: number,
    paperId: number,
    type: string,                   // "highlight", "note", etc.
    content: string,
    coordinates: object,             // PDF coordinates
    createdAt: Date
}
```

### Backend (PostgreSQL)

#### Users Table

```sql
id: UUID (primary key)
email: string (unique, indexed)
passwordHash: string (bcrypt)
name: string|null
emailVerified: boolean
verificationToken: string|null (unique, indexed)
verificationTokenExpiry: timestamp|null
createdAt: timestamp
updatedAt: timestamp
stripeCustomerId: string|null (for future subscriptions)
```

#### Papers Table

```sql
id: UUID (primary key)
userId: UUID (foreign key, indexed)
title: string
authors: jsonb (array)
journal: string|null
year: number|null
doi: string|null (unique per user)
url: string|null
tags: jsonb (array)
status: string
notes: text|null
pdfUrl: string|null (S3 URL)
relatedPaperIds: jsonb (array of UUIDs)
readingProgress: jsonb|null
clientId: string
version: number
deletedAt: timestamp|null
createdAt: timestamp
updatedAt: timestamp
```

#### Collections Table

```sql
id: UUID (primary key)
userId: UUID (foreign key, indexed)
name: string
icon: string
color: string
filters: jsonb
clientId: string
version: number
deletedAt: timestamp|null
createdAt: timestamp
updatedAt: timestamp
```

---

## Authentication & Cloud Sync

### Authentication Flow

#### Registration

1. User fills registration form (email, password, optional name)
2. Frontend sends POST to `/api/auth/register`
3. Backend hashes password (bcrypt, cost 12)
4. Backend creates user in database
5. Backend generates verification token
6. Backend sends verification email (Resend/SMTP)
7. Frontend shows success message with verification instructions

#### Email Verification

1. User clicks verification link in email
2. Link contains token: `/#/verify-email?token=...`
3. Frontend extracts token and sends POST to `/api/auth/verify-email`
4. Backend validates token and expiry
5. Backend updates `emailVerified = true`, clears token
6. Frontend updates user object and UI

#### Login

1. User enters email and password
2. Frontend sends POST to `/api/auth/login`
3. Backend validates credentials
4. Backend generates JWT access token (15min) and refresh token (7 days)
5. Backend sets refresh token as HTTP-only cookie
6. Frontend stores access token and user data in localStorage
7. Frontend updates UI to show authenticated state

#### Token Refresh

1. Access token expires (15min)
2. Frontend detects expired token on API call
3. Frontend sends POST to `/api/auth/refresh` with refresh token (from cookie)
4. Backend validates refresh token
5. Backend generates new access token
6. Frontend updates stored access token

### Cloud Sync Architecture

#### Sync Modes

1. **Full Sync**: Initial sync when cloud sync first enabled
   - Downloads all data from server
   - Replaces local data with server data
   - Used when no previous sync exists

2. **Incremental Sync**: Subsequent syncs
   - Sends local changes to server
   - Receives server changes since last sync
   - Applies changes locally
   - Conflict resolution: last-write-wins

#### Change Tracking

- All CRUD operations track changes when cloud sync enabled
- Changes stored in `pendingChanges` (localStorage)
- Each change includes: operation type, entity type, data, timestamp
- Changes batched and sent on sync

#### Conflict Resolution

- **Strategy**: Last-write-wins (based on `updatedAt` timestamp)
- **Version Tracking**: Each entity has a `version` number
- **Client IDs**: Each device/browser has unique `clientId`
- **Soft Deletes**: Entities marked with `deletedAt` instead of hard delete

#### Sync Flow

```
Local Change (e.g., update paper)
  ↓
db/adapter.js: Tracks change in pendingChanges
  ↓
User triggers sync (manual or automatic)
  ↓
db/sync.js: performIncrementalSync()
  ↓
api/sync.js: incrementalSync(localChanges)
  ↓
POST /api/sync/incremental
  ↓
Backend: Applies local changes, returns server changes
  ↓
Frontend: Applies server changes locally
  ↓
Update last synced timestamp
```

---

## Development Workflow

### Local Development Setup

1. **Clone Repository**
   ```bash
   git clone https://github.com/Hemrem19/emresarchive.git
   cd emresarchive
   ```

2. **Serve Frontend**
   ```bash
   # Option 1: Python HTTP server
   python -m http.server 8000
   
   # Option 2: Node.js serve
   npx serve
   
   # Option 3: Any static file server
   ```

3. **Open Browser**
   ```
   http://localhost:8000
   ```

4. **Backend Development** (optional, for cloud sync)
   ```bash
   cd backend
   npm install
   cp .env.example .env
   # Edit .env with your database URL and keys
   npm run dev  # Starts server on port 8080
   ```

### Testing

```bash
# Install dependencies
npm install

# Run all tests
npm test

# Watch mode (for development)
npm run test:watch

# Interactive UI
npm run test:ui

# Coverage report
npm run test:coverage
```

### Code Organization Principles

1. **Separation of Concerns**: Each module has a single responsibility
2. **View Modules**: Isolated view logic with lifecycle methods
3. **Database Layer**: All IndexedDB operations abstracted
4. **No Global State**: State passed as parameters
5. **Event Cleanup**: All event listeners cleaned up in `unmount()`

### Git Workflow

- **Main Branch**: Production-ready code
- **Commits**: Semantic commit messages (feat, fix, docs, etc.)
- **CI/CD**: GitHub Actions run tests on every push

---

## Testing Strategy

### Test Framework

- **Vitest**: Fast, modern test runner
- **happy-dom**: DOM implementation for Node.js
- **fake-indexeddb**: Complete IndexedDB mock

### Test Coverage

- **Total Tests**: 167 tests, 100% pass rate
- **Coverage Areas**:
  - Core state management (12 tests)
  - Filtering & search (30 tests)
  - UI helpers (26 tests)
  - Database operations (36 tests)
  - API integration (28 tests)
  - End-to-end workflows (12 tests)

### Test Files

```
tests/
├── setup.js              # Global mocks and setup
├── helpers.js            # Test utility functions
├── core-state.test.js    # State management tests
├── core-filters.test.js  # Filtering logic tests
├── ui-helpers.test.js    # UI helper tests
├── db-papers.test.js     # Paper CRUD tests
├── db-collections.test.js # Collections tests
├── db-data.test.js       # Export/Import tests
├── api.test.js           # DOI API tests
└── integration.test.js   # End-to-end tests
```

### Testing Principles

1. **Unit Tests**: Test individual functions in isolation
2. **Integration Tests**: Test multiple modules working together
3. **Mock Dependencies**: Mock IndexedDB, localStorage, fetch
4. **Edge Cases**: Test error conditions, empty states, invalid input
5. **Performance**: Test with large datasets (1000+ papers)

---

## Deployment Architecture

### Frontend Deployment (Cloudflare Pages)

- **Platform**: Cloudflare Pages
- **Build**: No build step (static files)
- **Domain**: citavers.com
- **SSL**: Automatic HTTPS
- **CDN**: Global content delivery
- **Deploy**: Git push triggers automatic deployment

### Backend Deployment (Railway)

- **Platform**: Railway.app
- **Runtime**: Node.js 20.x
- **Build**: `npm install` + `npx prisma migrate deploy`
- **Start**: `npm start` (from `backend/` directory)
- **Environment**: Production with environment variables
- **URL**: `https://emresarchive-production.up.railway.app`

### Database (Neon.tech)

- **Platform**: Neon.tech (serverless PostgreSQL)
- **Plan**: Free tier (upgrades available)
- **Connection**: Connection pooling enabled
- **Backups**: Automatic backups
- **Migrations**: Prisma Migrate for schema changes

### Storage (Cloudflare R2)

- **Platform**: Cloudflare R2 (S3-compatible)
- **Use Case**: PDF file storage for cloud sync users
- **Access**: Presigned URLs (time-limited)
- **Cost**: Pay-as-you-go pricing

### Environment Variables

#### Frontend
- `API_BASE_URL`: Backend API URL

#### Backend
- `DATABASE_URL`: PostgreSQL connection string
- `JWT_SECRET`: JWT signing secret
- `JWT_REFRESH_SECRET`: Refresh token secret
- `FRONTEND_URL`: Frontend URL for CORS
- `RESEND_API_KEY`: Resend API key (for emails)
- `EMAIL_FROM`: Sender email address
- `S3_ENDPOINT`: Cloudflare R2 endpoint
- `S3_ACCESS_KEY_ID`: R2 access key
- `S3_SECRET_ACCESS_KEY`: R2 secret key
- `S3_BUCKET_NAME`: R2 bucket name

---

## Future Roadmap

### Planned Features

1. **Membership System** (Planning Phase)
   - 7 user tiers (Guest, Free, Premium, Admin, Tester, Gifted)
   - Subscription management with Stripe
   - Feature gating based on tier
   - Usage limits enforcement

2. **Enhanced PDF Features**
   - PDF annotations (highlighting, sticky notes)
   - PDF text extraction and indexing
   - Full-text search within PDFs

3. **Collaboration Features**
   - Share collections with other users
   - Shared reading lists
   - Comments on papers

4. **Mobile App**
   - Native iOS/Android apps
   - Offline-first mobile experience
   - Sync with web app

5. **Advanced Analytics**
   - Reading statistics and insights
   - Paper recommendations
   - Research trend analysis

### Technical Improvements

1. **Performance Optimization**
   - Lazy loading for large libraries
   - Virtual scrolling for paper list
   - PDF thumbnails caching

2. **Accessibility Enhancements**
   - ARIA labels and roles
   - Keyboard navigation improvements
   - Screen reader optimization

3. **Internationalization**
   - Multi-language support
   - Localized date/time formats
   - RTL language support

---

## Contributing

### Getting Started

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes
4. Run tests (`npm test`)
5. Commit changes (`git commit -m 'Add amazing feature'`)
6. Push to branch (`git push origin feature/amazing-feature`)
7. Open a Pull Request

### Code Style

- **JavaScript**: ES6+ with modern syntax
- **Formatting**: No enforced formatter (use consistent style)
- **Comments**: JSDoc comments for functions
- **Naming**: camelCase for variables/functions, PascalCase for classes

### Testing Requirements

- All new features should include tests
- Maintain 100% test pass rate
- Tests should be fast (< 5 seconds total)

### Documentation

- Update `PROJECT_EXPLANATION.md` for architectural changes
- Update `README.md` for user-facing features
- Add inline comments for complex logic

---

## License

This project is licensed under the MIT License. See LICENSE file for details.

---

## Acknowledgments

- Built with ❤️ for researchers everywhere
- Inspired by the need for a simple, privacy-focused research tool
- Open source and community-driven
- Special thanks to all contributors and users

---

**Last Updated**: Current Session  
**Version**: 2.2  
**Status**: Production Ready ✅

