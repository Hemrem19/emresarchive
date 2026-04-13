# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What This Project Is

**citavErs** — a local-first research paper manager (v2.2). Vanilla JS SPA with no build step; all data lives in IndexedDB. An optional Cloudflare Workers backend adds cloud sync via Yjs/WebSocket CRDT.

## Commands

### Frontend
```bash
npm test                   # Run all tests (Vitest + happy-dom)
npm run test:watch         # Watch mode
npm run test:coverage      # Coverage report
npm test -- tests/core-state.test.js   # Single test file
npm test -- --run -t "search"          # Test by name pattern
npm run build              # Icon/asset processing (node build.js)
```

### Backend
```bash
cd backend
npm test                   # Run all backend tests
npm run dev                # Local wrangler dev on port 8787
npm run db:migrate         # Generate Drizzle migrations
npm run db:studio          # Drizzle Studio (inspect D1)
```

No linter is configured. No build step for the frontend — reload the browser to pick up JS changes.

## Architecture

### Frontend (Vanilla JS, no framework)

The app is structured around **views** and a **centralized state** object. Each view is a module with `mount(appState)` / `unmount(appState)` lifecycle methods. The router (`core/router.js`) swaps views via hash-based navigation (`#/`, `#/details/:id`, etc.) and calls `mount`/`unmount` on each transition. Views are injected asynchronously (`setTimeout(..., 0)`) to avoid race conditions with DOM readiness.

Key layers:
- **`core/state.js`** — Single shared state object (papers, collections, filters, pagination). All views read from and write to this.
- **`db/`** — IndexedDB abstraction. `db/papers.js`, `db/collections.js`, etc. are the only place raw IndexedDB calls happen.
- **`api/`** — REST client modules for the backend. Mirrors the `db/` structure but talks to the cloud.
- **`core/syncManager.js`** — Orchestrates Yjs WebSocket sync plus a debounced `performSync` wrapper for explicit save triggers.
- **`db/sync.js`** — In-memory change-tracking queue (`trackPaper*`, `trackCollection*`, `trackAnnotation*`), sync lock helpers, and `performFullSync`/`performIncrementalSync`/`deduplicateLocalPapers`. Imported by both `db/adapter.js` and `core/syncManager.js`.
- **`api/sync.js`** — REST batch-sync client (`fullSync`, `incrementalSync`, `getSyncStatus`) plus `apiRequest` (authenticated fetch returning raw `Response`) and data-mapping helpers.
- **`app.js`** — Entry point: initializes state, registers service worker, sets up router and keyboard shortcuts.
- **`views.js`** — All HTML template strings as JS exports (not separate HTML files).

### Backend (Hono on Cloudflare Workers)

- **`backend/src/worker.js`** — Hono server entry point; mounts routes, handles WebSocket upgrade to Durable Objects.
- **`backend/src/WorkspaceDurableObject.js`** — Durable Object for real-time Yjs state; one per workspace.
- **`backend/src/routes/`** — Route handlers (auth, papers, collections, annotations, network, import, user).
- **`backend/src/lib/`** — Shared utilities: JWT (15m access / 7d refresh), bcrypt (cost 12), Resend email, Zod validation, R2 (S3-compatible PDF storage).
- ORM: **Drizzle** over **Cloudflare D1** (SQLite). Schema in `backend/drizzle/`.

### Data flow (example: add paper)
```
form.view.js (user submits)
  → db/papers.js (write to IndexedDB)
  → db/adapter.js (stage change in Yjs doc)
  → core/state.js updated
  → dashboard re-renders
  → syncManager pushes via WebSocket to Durable Object
```

## Key Design Decisions

- **No build step** — Tailwind loaded from CDN (JIT in browser), ES6 modules loaded natively. No bundler.
- **Backend is optional** — The app is fully functional offline. Cloud sync is an add-on.
- **Dark mode only** — Light mode was removed; always dark UI.
- **CRDT conflict resolution** — Yjs documents with last-write-wins semantics; `db/adapter.js` is the integration point.
- **JWT in localStorage** — Access tokens in localStorage, refresh tokens via HTTP-only cookie on the backend.
- **IndexedDB migrations** — Versioned in `db/core.js`. Schema upgrades run automatically on open.
- **Mobile** — Capacitor configured for iOS/Android. Run `npm run cap:sync` after JS changes to update native code.

## Test Structure

```
tests/
├── setup.js              # Global mocks (fake-indexeddb, happy-dom, localStorage, FileReader)
├── __mocks__/            # Module mocks (Yjs, DOMPurify)
├── core-state.test.js
├── api-*.test.js
├── db-*.test.js
└── dashboard/            # Grouped dashboard tests (pagination, search, batch ops)
```

Backend tests are in `backend/tests/` with fixtures and mocks for email and S3 in `backend/tests/setup.js`.

## Deployment

- Frontend → Cloudflare Pages (static, git-deployed from `main`)
- Backend → Cloudflare Workers (`wrangler.toml` configures D1 bindings and Durable Objects)
- CI runs frontend + backend tests on Node 18 and 20 via `.github/workflows/test.yml`
