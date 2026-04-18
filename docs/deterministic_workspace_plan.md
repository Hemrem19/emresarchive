Deterministic ID + Shared Workspace Migration Plan                                                              
                                                                                                                 
 Context                                                                                                         

 citavErs is currently transitioning from a LWW REST sync model to a Yjs-over-WebSocket CRDT model, per
 docs/comprehensive_refactoring.md. The next milestones in that doc are:

 - Sections 13–14: Deterministic paper IDs via hash(DOI) so CRDT merges dedupe the same paper across devices and
  users, and the Tripartite Membership Architecture (Platform → Workspace → Collection) that lets multiple users
  share a workspace without polluting each other's private metadata.
 - Section 18: Schema migration — the doc still references Prisma, but this repo already runs Drizzle + D1 (see
 backend/drizzle/schema.ts). The migration target is Drizzle.

 At the same time the app is bleeding in production: ~287 requests in 1.4s, WebSocket refuses, and a
 duplicate-Yjs console warning. Root cause (verified in code) is a three-way Yjs instance collision plus sync
 triggers wired into read paths — none of that is fixed by the refactor itself, so we stabilize first, then
 layer the architecture on top.

 User decisions (confirmed):

 1. Sequence: Stage 0 stabilization PR first, then the architectural migration stages.
 2. Migration mode: Big-bang cutover with a temporary id_map table; IndexedDB bumps to v8 and re-seeds from
 cloud on first load.
 3. ID scope: Deterministic IDs for papers only. Folders/annotations keep UUIDs (they have no natural key;
 hashing name/position would make renames and edits break identity).

 Final deliverable: this plan, copied verbatim into docs/deterministic_workspace_plan.md as the first execution
 step (plan mode restricts edits to the plan file only).

 ---
 Root-cause summary of the logs

 Symptom: "Yjs was already imported" warning
 Root cause: Frontend pulls Yjs v13.6.14 from esm.sh CDN at runtime, but npm has yjs@^13.6.30 locked in
   package.json (backend DO uses the npm one). y-protocols sees two Y.Doc constructors.
 Evidence: core/syncManager.js:12-13 imports from https://esm.sh/yjs@13.6.14 and
   https://esm.sh/y-websocket@1.5.0; package.json:42-43 locks yjs@^13.6.30 and y-websocket@^3.0.0.
 ────────────────────────────────────────
 Symptom: NS_ERROR_WEBSOCKET_CONNECTION_REFUSED (repeated)
 Root cause: y-websocket v1.5.0 (CDN) ↔ backend y-protocols (from yjs@13.6.30 on Workers) = protocol mismatch.
   Handshake succeeds, sync step fails, socket closes, y-websocket retries forever with no backoff cap. URL
   construction itself is correct — y-websocket appends room 'default' producing /api/sync/workspace/default,
   which matches worker.js:61, and middleware/auth.js:12 accepts ?token= via query param.
 Evidence: Symptom pattern (immediate reject, not 401) + version drift above.
 ────────────────────────────────────────
 Symptom: ~287 requests / 1.4s
 Root cause: syncFromCloud() is called without a mutex from: the 30 s setInterval (syncManager.js:97),
   online/focus handlers (:82, :92), and every WS sync event (:134). Worse, read-path calls trigger  sync:
   adapter.js:466 in folders.getAllFolders() unconditionally fires triggerDebouncedSync() every render, and
   papers.getAllPapers() resets _localSeededFromCloud=false on any error (line 253). Each seedLocalFromCloud()
   pass issues GET /papers + GET /folders + N × GET /folders/{id}/papers with CORS preflights — 10+ HTTP txns
 per
    pass. When the WS reconnect storm above hammers the sync event handler, that pass fires in parallel on every

   reconnect.
 Evidence: core/syncManager.js:97-134, db/adapter.js:59-108, 247-261, 464-469.

 Stage 0 below fixes all three without touching schemas.

 ---
 Stage 0 — Stabilization (bug fixes, ship first)

 Goal: stop the bleeding. One PR, reversible, no schema changes.

 1. Drop the CDN Yjs imports. In core/syncManager.js:12-13, replace
 import * as Y from 'https://esm.sh/yjs@13.6.14';
 import { WebsocketProvider } from 'https://esm.sh/y-websocket@1.5.0';
 1. with bare specifiers:
 import * as Y from 'yjs';
 import { WebsocketProvider } from 'y-websocket';
 1. Because this project has no bundler (per CLAUDE.md: "No build step — Tailwind loaded from CDN, ES6 modules
 loaded natively"), add an import map to index.html mapping yjs and y-websocket to a single pinned esm.sh URL
 that matches the backend lock (yjs@13.6.30, y-websocket@3.0.0). Every future import 'yjs' then resolves to the
 same module instance, killing the duplicate-constructor warning. Verify node_modules/yjs/package.json version
 matches backend.
 2. Add a singleflight mutex around syncFromCloud(). In db/adapter.js, add a module-level _syncInFlight promise.
  If a call arrives while one is pending, return the in-flight promise instead of starting a new one. Entry
 point:
 let _syncInFlight = null;
 export function syncFromCloud() {
   if (_syncInFlight) return _syncInFlight;
   _syncInFlight = (async () => {
     try { await seedLocalFromCloud(); _localSeededFromCloud = true; window.dispatchEvent(...); }
     finally { _syncInFlight = null; }
   })();
   return _syncInFlight;
 }
 3. Remove sync triggers from read paths. In db/adapter.js:
   - folders.getAllFolders() (:464-469): delete the triggerDebouncedSync() call. Reads must not write.
   - papers.getAllPapers() (:247-261): keep the one-time seed, but remove the _localSeededFromCloud = false
 retry-on-failure reset (line 253) — on failure, log and move on; the 30 s poller will catch up.
 4. Disable the 30 s REST poller while the WS is connected. The poller in syncManager.js:97 exists as a pre-CRDT
  fallback. Wrap its body:
 _pollInterval = setInterval(() => {
   if (provider?.wsconnected) return; // WS is the source of truth; REST is fallback only
   syncFromCloud().catch(...);
 }, POLL_INTERVAL_MS);
 5. Cap WebSocket reconnection. Pass maxBackoffTime: 30_000 in the WebsocketProvider options at
 syncManager.js:115 so failed reconnects don't thrash.
 6. Add provider.on('connection-error', …) logging so the next regression is visible in one line instead of
 symptom-diagnosed from request counts.

 Exit criteria for Stage 0: dashboard load issues ≤10 requests, no duplicate-Yjs warning, WS either connects
 once or fails with a single diagnostic line.

 Files touched: index.html (new import map), core/syncManager.js, db/adapter.js. No backend changes.

 ---
 Stage 1 — Workspace schema foundation

 Goal: introduce the Workspace layer that the Tripartite Architecture requires, without yet touching IDs.

 1. New D1 tables (backend/drizzle/schema.ts):
 export const workspaces = sqliteTable('workspaces', {
   id: text('id').primaryKey(),            // uuid
   ownerId: integer('owner_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
   name: text('name').notNull(),
   kind: text('kind').notNull(),            // 'private' | 'shared'
   createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`).notNull(),
   deletedAt: text('deleted_at'),
 });
 export const workspaceMembers = sqliteTable('workspace_members', {
   workspaceId: text('workspace_id').notNull().references(() => workspaces.id, { onDelete: 'cascade' }),
   userId: integer('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
   role: text('role').notNull(),            // 'owner' | 'editor' | 'viewer'
   joinedAt: text('joined_at').default(sql`CURRENT_TIMESTAMP`).notNull(),
 }, (t) => ({ pk: primaryKey({ columns: [t.workspaceId, t.userId] }) }));
 2. Drizzle migration auto-creates one private workspace per existing user and populates workspaceMembers with
 role='owner'. Store the resulting UUID in a new users.defaultWorkspaceId column.
 3. Backfill existing rows: add a workspaceId TEXT column to papers, folders, annotations, paperFolders,
 backfill to the owner's defaultWorkspaceId, then set NOT NULL. Reuse the existing folders.workspaceId column
 (already present at schema.ts:80).
 4. New /api/workspaces routes (backend/src/routes/workspaces.js): GET /me (list memberships), POST / (create
 shared), POST /:id/members (invite). Stub out invite delivery using the existing Resend helper in lib/.
 5. Frontend state: add core/workspace.js exporting getCurrentWorkspaceId() / setCurrentWorkspaceId(), backed by
  localStorage.currentWorkspaceId with fallback to the server's users.defaultWorkspaceId on login. Store in the
 shared appState from core/state.js.
 6. WebSocket room name becomes dynamic — replace the hardcoded 'default' in core/syncManager.js:115 with
 getCurrentWorkspaceId(). The backend route /api/sync/workspace/:id (worker.js:61) already resolves the DO by
 name, so no backend change is required; add an authorization check in that handler to reject if the requester
 is not a member of the requested workspace.

 Stage 1 is independently shippable once Stage 0 lands. All IDs remain integers; this is purely additive.

 ---
 Stage 2 — Deterministic ID utility (client + server)

 Goal: build and test the hashing helpers, used by Stage 3's data migration.

 Create core/deterministicId.js:

 // SHA-256, truncated to 16 hex chars (64 bits) — collision-resistant enough for
 // a personal library; full 64 is overkill and bloats CRDT key size.
 export async function paperIdFromDoi(doi) {
   const norm = normalizeDoi(doi); // lowercase, strip "https://doi.org/", trim
   return 'paper:' + await sha256Hex(norm, 16);
 }
 export async function paperIdFromTitleAuthor(title, firstAuthor) {
   const norm = normalizeTitle(title) + '|' + normalizeAuthor(firstAuthor);
   return 'paper:t_' + await sha256Hex(norm, 16); // 't_' prefix = fallback hash
 }
 export async function paperId(paper) {
   return paper.doi ? paperIdFromDoi(paper.doi) : paperIdFromTitleAuthor(paper.title, paper.authors?.[0]);
 }

 Use crypto.subtle.digest('SHA-256', ...) so it works identically in the browser and in Cloudflare Workers (both
  expose Web Crypto). Mirror the file into backend/src/lib/deterministicId.js — same code, same output, so
 client and server agree on a paper's canonical ID.

 Tests (tests/core-deterministicId.test.js): same DOI → same hash; DOI case/whitespace variants → same hash;
 title-author fallback when no DOI; t_-prefixed IDs don't collide with DOI IDs.

 No database changes in this stage. Pure utility.

 ---
 Stage 3 — Big-bang schema cutover

 Goal: flip papers.id from integer to deterministic text, flip folders.id/annotations.id/paperFolders.id to UUID
  text. This is one coordinated backend + frontend PR behind a feature flag.

 3a. D1 migration (new file in backend/drizzle/migrations/)

 -- 1. Create the mapping scratch table.
 CREATE TABLE id_map (
   entity TEXT NOT NULL,          -- 'paper' | 'folder' | 'annotation' | 'paperFolder'
   oldId  INTEGER NOT NULL,
   newId  TEXT NOT NULL,
   PRIMARY KEY (entity, oldId)
 );

 -- 2. Rename existing tables to *_legacy.
 ALTER TABLE papers         RENAME TO papers_legacy;
 ALTER TABLE folders        RENAME TO folders_legacy;
 ALTER TABLE annotations    RENAME TO annotations_legacy;
 ALTER TABLE paper_folders  RENAME TO paper_folders_legacy;

 -- 3. Create new tables with TEXT primary keys + NOT NULL workspace_id.
 -- (Full DDL mirrors current schema but with id TEXT PRIMARY KEY and
 --  workspaceId TEXT NOT NULL REFERENCES workspaces(id).)

 -- 4. Backfill papers: hash DOI or title+author in a Workers script (D1 has no
 --    crypto SQL function). Pseudocode: SELECT * FROM papers_legacy → compute
 --    id via backend/src/lib/deterministicId.js → INSERT INTO papers +
 --    INSERT INTO id_map. On hash collision (rare), keep the older row's
 --    contextual data and merge tags/notes.

 -- 5. Backfill folders/annotations/paperFolders with crypto.randomUUID(),
 --    recording the old→new mapping. For paper_folders, also translate the
 --    foreign keys through id_map.

 -- 6. Drop *_legacy tables and id_map.

 A standalone Wrangler script backend/scripts/migrate-deterministic-ids.js runs steps 4–5 against the live D1
 (read from _legacy, write via Drizzle). Keep id_map alive in staging for a week before dropping in case
 rollback is needed.

 3b. Backend route updates

 - backend/src/routes/papers.js: accept text id from client, validate format (^paper:[a-f0-9]{16}$ or
 ^paper:t_[a-f0-9]{16}$), reject mismatches. On POST /papers, compute the ID server-side and echo it — never
 trust the client's hash without verification against the payload.
 - folders.js, annotations.js: accept client-supplied UUID; validate UUID v4 format.
 - All routes add a workspaceId check: reject if the paper/folder doesn't belong to a workspace the caller is a
 member of.

 3c. Frontend IndexedDB v8 migration (db/core.js)

 Bump DB_VERSION = 8. In onupgradeneeded, when oldVersion < 8, delete and recreate papers, folders, annotations,
  paper_folders with keyPath: 'id' (no autoIncrement). Do not migrate local data in place — after the schema
 bump, call syncFromCloud() to re-seed from the (now-migrated) backend. The migration doc's "field expedition"
 edge case applies: users with pending offline writes see them lost on this upgrade; surface a warning dialog on
  first v8 open if db/sync.js has tracked but unflushed changes.

 3d. Frontend call-site updates

 All of these currently pass id as an integer; switch to string:

 - db/papers.js, db/folders.js, db/annotations.js, db/paperFolders.js — drop autoIncrement assumptions; callers
 must supply id (computed via core/deterministicId.js for papers, crypto.randomUUID() for the rest) before
 store.add().
 - db/adapter.js:181-244 (papers.addPaper): compute paperId(paper) before both the cloud POST and the local
 write; also remove delete apiData.id at line 150 so the server receives the deterministic ID.
 - api/papers.js, api/folders.js, api/annotations.js, api/paperFolders.js — adjust URL builders; no more
 /papers/:intId casts.
 - Anywhere that compares IDs with === to a number: search grep -rn 'paper\.id\s*===' . and friends; convert to
 string comparison.

 3e. Feature flag

 Gate Stage 3 on localStorage.citavers_det_ids === '1' for the first internal release, flipping the default once
  the backend migration is confirmed idempotent on prod D1.

 ---
 Stage 4 — Yjs workspace document structure

 Goal: wire the deterministic IDs and workspace room names into the CRDT shape the doc specifies.

 Per Section 14 the contextual (per-workspace) data — tags, status, rating, notes, discussion drawer text —
 moves into the workspace's Y.Doc. The authoritative relational copy (papers.tags, papers.status, etc. in
 schema.ts:54-59) stays temporarily as a read cache; writes go to Yjs and a DO hook persists a flattened
 projection back to D1 for REST fallback/search.

 In each workspace's Y.Doc:

 - yDoc.getMap('papers') — key = deterministic paper ID, value = Y.Map of { status, rating, tags: Y.Array,
 notes: Y.Text, discussion: Y.Text }.
 - yDoc.getMap('folders') — key = folder UUID, value = Y.Map of { name, icon, color, position }.
 - yDoc.getMap('folderMembership') — key = paperId, value = Y.Array<folderId>. Deterministic paper IDs mean that
  when two devices claim the same DOI, both edits land on the same Y.Map entry, and Yjs merges tags/notes
 losslessly — exactly the dedupe property Section 13-B calls for.

 Update core/schemaUpgrade.js (already imported at syncManager.js:14) to migrate any stale data from the old
 flat structure into this shape on first v8 boot.

 ---
 Stage 5 — Cleanup

 Once two releases pass on Stage 4 without incidents:

 - Delete db/sync.js's tracked-change queue and its trackPaper* / trackFolder* / trackAnnotation* exports
 (imported at db/adapter.js:23-35). Pure Yjs handles offline writes via its own pending-update buffer.
 - Delete the REST polling interval in syncManager.js entirely (keep only a WS reconnect path).
 - Delete id_map from D1 and papers_legacy / folders_legacy / annotations_legacy / paper_folders_legacy.
 - Delete syncLogs (schema.ts:128) — comment says "Legacy - kept for temporary telemetry", it's no longer
 relevant.

 ---
 Critical files

 Frontend:
 - index.html — add import map (Stage 0)
 - core/syncManager.js — CDN→bare imports, dynamic room name, WS-connected guard on poller, reconnect cap
 (Stages 0, 1)
 - core/deterministicId.js — new (Stage 2)
 - core/workspace.js — new (Stage 1)
 - core/schemaUpgrade.js — Yjs shape migration (Stage 4)
 - db/core.js — bump to v8, recreate stores with string keyPath (Stage 3c)
 - db/papers.js / db/folders.js / db/annotations.js / db/paperFolders.js — accept string IDs (Stage 3d)
 - db/adapter.js — singleflight mutex, remove read-path sync triggers, workspace-scoped calls (Stages 0, 1, 3d)
 - api/papers.js / api/folders.js / api/annotations.js / api/paperFolders.js — string IDs (Stage 3d)

 Backend:
 - backend/drizzle/schema.ts — workspaces, workspace_members, users.defaultWorkspaceId, flip id + workspaceId
 NOT NULL on core tables (Stages 1, 3a)
 - backend/drizzle/migrations/NNNN_workspaces.sql — new (Stage 1)
 - backend/drizzle/migrations/NNNN_deterministic_ids.sql — new (Stage 3a)
 - backend/scripts/migrate-deterministic-ids.js — new, one-shot Wrangler script (Stage 3a)
 - backend/src/lib/deterministicId.js — new, mirrors client (Stage 2)
 - backend/src/routes/workspaces.js — new (Stage 1)
 - backend/src/routes/papers.js / folders.js / annotations.js — text IDs, workspace membership check (Stage 3b)
 - backend/src/worker.js:61 — add workspace-membership assertion before handing off to DO (Stage 1)
 - backend/src/WorkspaceDurableObject.js — no structural change; optionally project Yjs state back to D1 for
 search (Stage 4)

 Tests:
 - tests/core-deterministicId.test.js — new (Stage 2)
 - Existing tests/db-*.test.js — update fixtures for string IDs (Stage 3)
 - Backend backend/tests/routes/papers.test.js et al. — update for text IDs (Stage 3)

 ---
 Verification

 Stage 0 exit checks:
 - Open dashboard in a fresh Firefox profile with Network tab filtered to the backend host: ≤10 HTTP requests in
  the first 5 s, no request bursts on focus/blur.
 - Console shows no "Yjs was already imported" warning.
 - WS attempts exactly one connection; on failure, one [Sync Manager] connection-error line, no retry storm.
 - npm test passes.

 Stage 1 exit checks:
 - POST /api/auth/register then GET /api/workspaces/me returns exactly one private workspace.
 - WebSocket URL in DevTools reads …/api/sync/workspace/<uuid>, not default.
 - A user not in a workspace gets a 403 on that WS path (manual cURL with a foreign token).

 Stage 2 exit checks:
 - npm test -- tests/core-deterministicId.test.js passes for: identical DOI → identical hash across 1000
 iterations; DOI 10.1038/X, 10.1038/x, 10.1038/X collapse to the same ID; missing-DOI fallback is stable across
 equivalent title/author casings.

 Stage 3 exit checks:
 - Wrangler migration runs on a local D1 clone with the existing dev fixtures; SELECT COUNT(*) FROM papers
 matches papers_legacy; all paperFolders FK references resolve.
 - Browser: fresh IDB + existing backend account loads dashboard successfully; import the same DOI twice from
 two tabs — only one paper appears in the list, tags merge.
 - npm test and cd backend && npm test both pass.

 Stage 4 exit checks:
 - Two tabs on the same workspace: tag edits in one appear in the other within 500 ms via WS.
 - Kill the WS (DevTools offline), edit in tab A, reconnect: changes land with no duplicates.
 - Log out of tab A, log into a second account that's a member of a shared workspace on tab B: edits propagate;
 private-workspace state does not leak.

 Stage 5 exit checks:
 - Search for trackPaper, trackFolder, trackAnnotation, _legacy in the repo — zero results.
 - Coverage report (npm run test:coverage) shows no lingering sync-queue branches.

 ---
 First execution step

 Because plan mode restricts edits to this planning file, the very first action once the plan is approved is to
 copy this document verbatim into docs/deterministic_workspace_plan.md, as the user requested in the original
 brief. No other change ships in that commit.
