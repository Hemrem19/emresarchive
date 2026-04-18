
## Context

The current "collections" system stores **saved filter criteria** (status, tags, searchTerm) — papers are never directly assigned to a collection. This is confusing: users don't understand how to "add a paper" to a collection after creating one. We're replacing it with an explicit **folders** system where papers are directly placed into folders, much simpler and aligned with the future Zotero Groups (shared workspace) goal.

## Design Decisions

- **Many-to-many**: A paper can belong to multiple folders (junction table). Matches Zotero's model and is required for future shared workspaces.
- **Full replacement**: Collections code/UI/API removed entirely — no migration needed since collections held filter criteria, not paper assignments.
- **Paper assignment UX**: A folder icon button on each paper card's hover actions opens a checkbox dropdown of folders. Batch "Add to folder" also supported.
- **Inline creation & rename**: Click "+" in sidebar header → inline text input → Enter to create. Double-click or edit button on folder name → inline input to rename.

## Data Model

### Folder entity
```
{
  id, name, color (nullable), position (int, for sidebar ordering),
  createdAt, updatedAt,
  // Backend-only: userId, deletedAt, version, workspaceId (null), isShared (false)
}
```

### Paper-Folder junction
```
{
  id, paperId, folderId, addedAt
  // Backend-only: userId, deletedAt
}
```

---

## Implementation Plan

### Phase 1 — IndexedDB schema (`db/core.js`)

- Bump `DB_VERSION` from 6 to 7
- Add constants `STORE_NAME_FOLDERS = 'folders'` and `STORE_NAME_PAPER_FOLDERS = 'paper_folders'`
- In `onupgradeneeded` version 7 block:
  - Create `folders` store (keyPath: `id`, autoIncrement) with indexes on `name`, `createdAt`
  - Create `paper_folders` store (keyPath: `id`, autoIncrement) with indexes on `paperId`, `folderId`, and compound `['paperId', 'folderId']`

### Phase 2 — Local DB modules

**New file `db/folders.js`** — CRUD following `db/collections.js` pattern:
- `addFolder(data)` — validate name, set defaults (color: null, position: 0), return id
- `getAllFolders()` — sorted by position then createdAt
- `getFolderById(id)`
- `updateFolder(id, data)` — merge update with updatedAt
- `deleteFolder(id)`

**New file `db/paperFolders.js`** — junction CRUD:
- `addPaperToFolder(paperId, folderId)` — check compound index for duplicates first
- `removePaperFromFolder(paperId, folderId)` — find via compound index, delete
- `getFolderIdsByPaperId(paperId)` — via paperId index
- `getPaperIdsByFolderId(folderId)` — via folderId index
- `removeAllForFolder(folderId)` — bulk delete (used when folder deleted)
- `removeAllForPaper(paperId)` — bulk delete (used when paper deleted)
- `getPaperCountByFolderId(folderId)` — count via index

### Phase 3 — API clients

**New file `api/folders.js`** — REST client (clone `api/collections.js` structure):
- `getAllFolders()` → GET `/api/folders`
- `getFolder(id)` → GET `/api/folders/:id`
- `createFolder(data)` → POST `/api/folders`
- `updateFolder(id, data)` → PUT `/api/folders/:id`
- `deleteFolder(id)` → DELETE `/api/folders/:id`

**New file `api/paperFolders.js`** — junction REST client:
- `addPaperToFolder(folderId, paperId)` → POST `/api/folders/:folderId/papers`
- `removePaperFromFolder(folderId, paperId)` → DELETE `/api/folders/:folderId/papers/:paperId`
- `getPapersInFolder(folderId)` → GET `/api/folders/:folderId/papers`

### Phase 4 — Adapter & sync

**`db/adapter.js`** — replace collections adapter block with:
- `folders` adapter (same cloud-first-with-local-fallback pattern)
- `paperFolders` adapter for junction operations
- Update `seedLocalFromCloud()` to seed folders + paper_folders instead of collections

**`db/sync.js`** — replace collection tracking:
- `trackFolderCreated/Updated/Deleted` replacing `trackCollectionCreated/Updated/Deleted`
- Add `trackPaperFolderCreated/Deleted` (junctions only create/delete, never update)
- Update `_pending` buckets: `folders` and `paperFolders` replacing `collections`

**`db.js`** — replace collection exports with folder + paperFolder exports

### Phase 5 — App state (`core/state.js`)

Replace `collectionsCache: []` with:
- `foldersCache: []` — all folders
- `activeFolderId: null` — currently selected folder for filtering
- `paperFoldersMap: {}` — `{ [paperId]: Set([folderId, ...]) }` for O(1) lookup

### Phase 6 — Routing & filtering

**`core/router.js`** (line 262):
- Add `requestedPath.startsWith('/app/folder/')` to the dashboard route condition

**`core/filters.js`**:
- `parseUrlHash`: add `#/app/folder/:id` parsing → sets `appState.activeFolderId`
- `updateUrlHash`: include folder in URL when active
- `getFilteredPapers`: if `activeFolderId` is set, filter papers to those in `appState.paperFoldersMap`
- `renderFilterChips`: show active folder as a removable chip

### Phase 7 — Sidebar UI (`ui.js`, `index.html`)

**`index.html`**:
- Rename `sidebar-collections-section` → `sidebar-folders-section` (line 597)
- Rename `mobile-sidebar-collections-section` → `mobile-sidebar-folders-section` (line 558)

**`ui.js`** — replace `renderSidebarCollections` with `renderSidebarFolders(folders, paperFoldersMap, activeFolderId)`:
- Header: "Folders" with "+" button (`id="create-folder-btn"`)
- Each folder item: icon, name (with inline rename support), paper count badge, edit/rename button
- Empty state: "No folders yet. Click + to create one."
- Active folder gets highlight styling (reuse existing `highlightActiveSidebarLink` pattern)
- Clicking a folder navigates to `#/app/folder/:id`

**`ui.js`** — update `highlightActiveSidebarLink`:
- Replace `#/collection/` handling with `#/app/folder/` handling using `.folder-item` selector

**`ui.js`** — add folder button to paper card in `renderPaperList` (line 357, in the hover actions div):
- Add a `folder_copy` icon button (class `assign-folder-btn`) between the status select and edit link

### Phase 8 — Folder handlers

**New file `dashboard/handlers/folders.js`** — replacing `dashboard/handlers/collections.js`:
- `handleCreateFolder(appState)` — insert inline `<input>` in sidebar, Enter creates folder, Escape cancels
- `handleRenameFolder(folderId, appState)` — replace folder name span with `<input>`, Enter saves, Escape cancels
- `handleDeleteFolder(folderId, appState, applyFiltersAndRender)` — confirm dialog, delete folder + junction entries
- `handleSelectFolder(folderId, appState, applyFiltersAndRender)` — set `activeFolderId`, navigate to `#/app/folder/:id`
- `handleAssignFolder(paperId, appState)` — show dropdown popover with folder checkboxes, toggle assignments
- `registerFolderHandlers(appState, applyFiltersAndRender)` / `unregisterFolderHandlers(handlers)`

### Phase 9 — Batch operations

**`dashboard/handlers/batch-operations.js`**:
- Add "Add to folder" batch action — shows folder picker, assigns all selected papers

### Phase 10 — Dashboard wiring (`dashboard.view.js`)

- Replace `getAllCollections` import → `getAllFolders` + paper folder loading
- Mount: load folders into `foldersCache`, build `paperFoldersMap`, call `renderSidebarFolders`
- Replace `registerCollectionHandlers` → `registerFolderHandlers`
- Unmount: replace `unregisterCollectionHandlers` → `unregisterFolderHandlers`
- Cloud sync handler: refresh folders + paperFolders instead of collections

### Phase 11 — Data export/import (`db/data.js`)

- Export `folders` and `paper_folders` stores instead of `collections`
- Import: support new format (folders) with graceful handling of old format (collections ignored)

### Phase 12 — Backend

**`backend/drizzle/schema.ts`**:
- Add `folders` table: id, userId (FK), name, icon, color, position, workspaceId (nullable), isShared (default false), createdAt, updatedAt, deletedAt, version
- Add `paperFolders` junction table: id, paperId (FK cascade), folderId (FK cascade), userId (FK cascade), addedAt, deletedAt
- Add relations for both tables
- Remove `collections` table definition and `collectionsRelations`

**New file `backend/src/routes/folders.js`**:
- `GET /` — list folders for user (with paper counts via subquery)
- `GET /:id` — single folder with paper count
- `POST /` — create folder (validate name)
- `PUT /:id` — update folder (name, color, position)
- `DELETE /:id` — soft delete folder + associated paper_folders
- `GET /:id/papers` — list paper IDs in folder
- `POST /:id/papers` — add paper to folder `{ paperId }`
- `DELETE /:id/papers/:paperId` — remove paper from folder

**`backend/src/worker.js`**:
- Replace `collectionsRoutes` import/mount with `foldersRoutes`

Generate Drizzle migration: `npm run db:migrate`

### Phase 13 — Cleanup

- Delete `dashboard/handlers/collections.js`
- Delete `api/collections.js`
- Delete `db/collections.js`
- Delete `backend/src/routes/collections.js`, `backend/src/controllers/collections.js`
- Remove collection imports from `dashboard.view.js`, `db/adapter.js`, `db/sync.js`, `db.js`, `ui.js`

### Phase 14 — Tests

- Update `tests/` to replace collection tests with folder tests
- Add tests for `db/folders.js` and `db/paperFolders.js` CRUD
- Add tests for folder filtering in `core/filters.js`
- Update `dashboard/` test files that reference collections
- Backend: add tests for folder routes

---

## Key Files

| Action | File |
|--------|------|
| Modify | `db/core.js` — IndexedDB v7 migration |
| Create | `db/folders.js` — local folder CRUD |
| Create | `db/paperFolders.js` — local junction CRUD |
| Create | `api/folders.js` — REST client |
| Create | `api/paperFolders.js` — REST client |
| Modify | `db/adapter.js` — replace collections adapter |
| Modify | `db/sync.js` — replace collection tracking |
| Modify | `db.js` — replace exports |
| Modify | `core/state.js` — new state shape |
| Modify | `core/router.js` — add folder route (line 262) |
| Modify | `core/filters.js` — folder filtering + URL parsing |
| Modify | `index.html` — rename sidebar containers (lines 558, 597) |
| Modify | `ui.js` — `renderSidebarFolders`, paper card folder button, sidebar highlighting |
| Create | `dashboard/handlers/folders.js` — folder interaction handlers |
| Modify | `dashboard/handlers/batch-operations.js` — batch folder assignment |
| Modify | `dashboard.view.js` — mount/unmount wiring |
| Modify | `db/data.js` — export/import |
| Create | `backend/src/routes/folders.js` — API routes |
| Modify | `backend/drizzle/schema.ts` — new tables |
| Modify | `backend/src/worker.js` — route registration |
| Delete | `dashboard/handlers/collections.js`, `api/collections.js`, `db/collections.js` |
| Delete | `backend/src/routes/collections.js`, `backend/src/controllers/collections.js` |

## Verification

1. `npm test` — run all frontend tests after changes
2. `cd backend && npm test` — run backend tests
3. Open browser → create a folder from sidebar "+" → verify it appears
4. Add papers to the folder via paper card button → click folder → verify only those papers show
5. Rename a folder inline → verify persisted after refresh
6. Delete a folder → verify papers are unaffected, just unlinked
7. Batch select papers → "Add to folder" → verify assignment
8. Test offline (no backend) → verify folders work in local-only mode
