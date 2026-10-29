import { sqliteTable, text, integer, blob, real, primaryKey } from 'drizzle-orm/sqlite-core';
import { sql, relations } from 'drizzle-orm';

// Users Table
export const users = sqliteTable('users', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  email: text('email').unique().notNull(),
  passwordHash: text('password_hash').notNull(),
  name: text('name'),
  createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`).notNull(),
  updatedAt: text('updated_at').default(sql`CURRENT_TIMESTAMP`).notNull(),
  emailVerified: integer('email_verified', { mode: 'boolean' }).default(false).notNull(),
  verificationToken: text('verification_token').unique(),
  verificationTokenExpiry: text('verification_token_expiry'),
  lastLoginAt: text('last_login_at'),
  lastSyncedAt: text('last_synced_at'),
  storageUsedBytes: integer('storage_used_bytes', { mode: 'number' }).default(0).notNull(),
  storageLimitBytes: integer('storage_limit_bytes', { mode: 'number' }).default(2147483648).notNull(), // unused: the limit is STORAGE_LIMIT in wrangler.toml
  settings: text('settings', { mode: 'json' }).default('{}').notNull(),
});

// CRDT Real-time Sync Documents
export const crdtDocuments = sqliteTable('crdt_documents', {
  id: text('id').primaryKey(),
  workspaceId: text('workspace_id').notNull(),
  snapshot: blob('snapshot'), // Flattened Yjs binary state
  updates: blob('updates'),   // Delta append log
  createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`).notNull(),
  updatedAt: text('updated_at').default(sql`CURRENT_TIMESTAMP`).notNull(),
});

// Sync Vector Clocks
export const clientSyncStates = sqliteTable('client_sync_states', {
  id: text('id').primaryKey(), // Usually client_id
  userId: integer('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  documentId: text('document_id').notNull().references(() => crdtDocuments.id, { onDelete: 'cascade' }),
  stateVector: blob('state_vector').notNull(),
  lastSynced: text('last_synced').default(sql`CURRENT_TIMESTAMP`).notNull(),
});

// Groups (private shared libraries). Rows with group_id belong to the group's
// library; user_id on them is the member who added them. See src/lib/access.js.
export const groups = sqliteTable('groups', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  ownerId: integer('owner_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`).notNull(),
  updatedAt: text('updated_at').default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export const groupMembers = sqliteTable('group_members', {
  groupId: integer('group_id').notNull().references(() => groups.id, { onDelete: 'cascade' }),
  userId: integer('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  role: text('role').notNull(), // 'owner' | 'admin' | 'member'
  joinedAt: text('joined_at').default(sql`CURRENT_TIMESTAMP`).notNull(),
}, (t) => ({ pk: primaryKey({ columns: [t.groupId, t.userId] }) }));

export const groupInvites = sqliteTable('group_invites', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  groupId: integer('group_id').notNull().references(() => groups.id, { onDelete: 'cascade' }),
  email: text('email').notNull(),
  role: text('role').notNull(),
  invitedBy: integer('invited_by').references(() => users.id, { onDelete: 'set null' }),
  createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`).notNull(),
  expiresAt: text('expires_at').notNull(),
});

// Papers Table
export const papers = sqliteTable('papers', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  userId: integer('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  groupId: integer('group_id').references(() => groups.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  authors: text('authors', { mode: 'json' }).default('[]').notNull(),
  year: integer('year'),
  journal: text('journal'),
  doi: text('doi'),
  url: text('url'),
  abstract: text('abstract'),
  
  // Collaborative content that will eventually bridge/migrate entirely to crdtDocuments
  tags: text('tags', { mode: 'json' }).default('[]').notNull(),
  status: text('status').default('To Read').notNull(),
  relatedPaperIds: text('related_paper_ids', { mode: 'json' }).default('[]').notNull(),
  notes: text('notes'),
  summary: text('summary'),
  rating: integer('rating'),
  
  pdfUrl: text('pdf_url'),
  pdfSizeBytes: integer('pdf_size_bytes', { mode: 'number' }),
  readingProgress: text('reading_progress', { mode: 'json' }),
  
  createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`).notNull(),
  updatedAt: text('updated_at').default(sql`CURRENT_TIMESTAMP`).notNull(),
  clientId: text('client_id'),
  version: integer('version').default(1).notNull(),
  deletedAt: text('deleted_at'),
});

// Folders Table (replaces Collections)
export const folders = sqliteTable('folders', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  userId: integer('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  groupId: integer('group_id').references(() => groups.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  icon: text('icon').default('folder'),
  color: text('color'),
  position: integer('position').default(0).notNull(),
  workspaceId: text('workspace_id'),  // Future: shared workspace support
  isShared: integer('is_shared', { mode: 'boolean' }).default(false).notNull(),
  createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`).notNull(),
  updatedAt: text('updated_at').default(sql`CURRENT_TIMESTAMP`).notNull(),
  deletedAt: text('deleted_at'),
  version: integer('version').default(1).notNull(),
});

// Paper-Folders Junction Table
export const paperFolders = sqliteTable('paper_folders', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  paperId: integer('paper_id').notNull().references(() => papers.id, { onDelete: 'cascade' }),
  folderId: integer('folder_id').notNull().references(() => folders.id, { onDelete: 'cascade' }),
  userId: integer('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  groupId: integer('group_id').references(() => groups.id, { onDelete: 'cascade' }),
  addedAt: text('added_at').default(sql`CURRENT_TIMESTAMP`).notNull(),
  deletedAt: text('deleted_at'),
});

// Annotations Table
export const annotations = sqliteTable('annotations', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  paperId: integer('paper_id').notNull().references(() => papers.id, { onDelete: 'cascade' }),
  userId: integer('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  groupId: integer('group_id').references(() => groups.id, { onDelete: 'cascade' }),
  type: text('type').notNull(), // 'comment' (paper discussion); 'highlight', 'note', 'bookmark' unused
  // A reply's top-level comment (FK to annotations.id in migration 0004)
  parentId: integer('parent_id'),
  clientId: text('client_id'),
  // User ids the comment @mentions (migration 0005)
  mentions: text('mentions', { mode: 'json' }),
  pageNumber: integer('page_number'),
  position: text('position', { mode: 'json' }),
  content: text('content'),
  color: text('color'),
  createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`).notNull(),
  updatedAt: text('updated_at').default(sql`CURRENT_TIMESTAMP`).notNull(),
  deletedAt: text('deleted_at'),
  version: integer('version').default(1).notNull(),
});

// Notifications: something to tell one person (a mention, or a reply to their comment)
export const notifications = sqliteTable('notifications', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  userId: integer('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  type: text('type').notNull(), // 'mention' | 'reply'
  actorId: integer('actor_id').references(() => users.id, { onDelete: 'set null' }),
  groupId: integer('group_id').references(() => groups.id, { onDelete: 'cascade' }),
  paperId: integer('paper_id').references(() => papers.id, { onDelete: 'cascade' }),
  // FK to annotations.id in migration 0005
  commentId: integer('comment_id'),
  createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`).notNull(),
  readAt: text('read_at'),
});

// Sessions Table
export const sessions = sqliteTable('sessions', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  userId: integer('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  tokenHash: text('token_hash').unique().notNull(),
  deviceName: text('device_name'),
  userAgent: text('user_agent'),
  ipAddress: text('ip_address'),
  createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`).notNull(),
  expiresAt: text('expires_at').notNull(),
  lastActivityAt: text('last_activity_at').default(sql`CURRENT_TIMESTAMP`).notNull(),
});

// Edge Sync Logs (Legacy - kept for temporary telemetry)
export const syncLogs = sqliteTable('sync_logs', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  userId: integer('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  entityType: text('entity_type'),
  entityId: integer('entity_id'),
  action: text('action'),
  clientId: text('client_id'),
  syncedAt: text('synced_at').default(sql`CURRENT_TIMESTAMP`).notNull(),
});

// Citation Cache Table
export const citationCache = sqliteTable('citation_cache', {
  id: text('id').primaryKey(),
  doi: text('doi').unique().notNull(),
  apiSource: text('api_source').notNull(), // "semantic_scholar" | "openalex"
  citationCount: integer('citation_count').default(0).notNull(),
  referenceCount: integer('reference_count').default(0).notNull(),
  rawData: text('raw_data', { mode: 'json' }).notNull(),
  lastFetched: text('last_fetched').default(sql`CURRENT_TIMESTAMP`).notNull(),
  expiresAt: text('expires_at').notNull(),
});

// Network Graph Tables
export const networkGraphs = sqliteTable('network_graphs', {
  id: text('id').primaryKey(),
  userId: integer('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  description: text('description'),
  isAuto: integer('is_auto', { mode: 'boolean' }).default(false).notNull(),
  nodeCount: integer('node_count').default(0).notNull(),
  edgeCount: integer('edge_count').default(0).notNull(),
  layout: text('layout', { mode: 'json' }),
  // Set for a group's network (migration 0006); NULL for a personal one
  groupId: integer('group_id').references(() => groups.id, { onDelete: 'cascade' }),
  // Papers the library cites but lacks: [{ openAlexId, doi, title, year, citedByCount, citedBy }]
  suggestions: text('suggestions', { mode: 'json' }),
  // Fingerprint of the papers it was made from (ids, DOIs, authors): stale when it differs
  papersHash: text('papers_hash'),
  createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`).notNull(),
  updatedAt: text('updated_at').default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export const paperConnections = sqliteTable('paper_connections', {
  id: text('id').primaryKey(),
  fromPaperId: integer('from_paper_id').notNull().references(() => papers.id, { onDelete: 'cascade' }),
  toPaperId: integer('to_paper_id').notNull().references(() => papers.id, { onDelete: 'cascade' }),
  connectionType: text('connection_type').notNull(), // "cites" | "common_author" (legacy rows: "common_tag")
  source: text('source').notNull(),
  confidence: real('confidence').default(1.0),
  createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`).notNull(),
});

// --- RELATIONS ---

export const usersRelations = relations(users, ({ many }) => ({
  papers: many(papers),
  folders: many(folders),
  annotations: many(annotations),
  sessions: many(sessions),
  syncLogs: many(syncLogs),
  networkGraphs: many(networkGraphs),
}));

export const papersRelations = relations(papers, ({ one, many }) => ({
  user: one(users, { fields: [papers.userId], references: [users.id] }),
  annotations: many(annotations),
  paperFolders: many(paperFolders),
  citingPapers: many(paperConnections, { relationName: 'CitingPapers' }),
  citedPapers: many(paperConnections, { relationName: 'CitedPapers' }),
}));

export const paperConnectionsRelations = relations(paperConnections, ({ one }) => ({
  fromPaper: one(papers, { fields: [paperConnections.fromPaperId], references: [papers.id], relationName: 'CitingPapers' }),
  toPaper: one(papers, { fields: [paperConnections.toPaperId], references: [papers.id], relationName: 'CitedPapers' }),
}));

export const foldersRelations = relations(folders, ({ one, many }) => ({
  user: one(users, { fields: [folders.userId], references: [users.id] }),
  paperFolders: many(paperFolders),
}));

export const paperFoldersRelations = relations(paperFolders, ({ one }) => ({
  paper: one(papers, { fields: [paperFolders.paperId], references: [papers.id] }),
  folder: one(folders, { fields: [paperFolders.folderId], references: [folders.id] }),
  user: one(users, { fields: [paperFolders.userId], references: [users.id] }),
}));

export const annotationsRelations = relations(annotations, ({ one }) => ({
  user: one(users, { fields: [annotations.userId], references: [users.id] }),
  paper: one(papers, { fields: [annotations.paperId], references: [papers.id] }),
}));

export const sessionsRelations = relations(sessions, ({ one }) => ({
  user: one(users, { fields: [sessions.userId], references: [users.id] }),
}));

export const crdtDocumentsRelations = relations(crdtDocuments, ({ many }) => ({
  clientSyncStates: many(clientSyncStates),
}));

export const clientSyncStatesRelations = relations(clientSyncStates, ({ one }) => ({
  user: one(users, { fields: [clientSyncStates.userId], references: [users.id] }),
  document: one(crdtDocuments, { fields: [clientSyncStates.documentId], references: [crdtDocuments.id] }),
}));

export const syncLogsRelations = relations(syncLogs, ({ one }) => ({
  user: one(users, { fields: [syncLogs.userId], references: [users.id] }),
}));

export const networkGraphsRelations = relations(networkGraphs, ({ one }) => ({
  user: one(users, { fields: [networkGraphs.userId], references: [users.id] }),
}));
