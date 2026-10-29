-- Production D1 schema (dumped from citavers-db on 2026-10-11) for route tests.

CREATE TABLE `annotations` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`paper_id` integer NOT NULL,
	`user_id` integer NOT NULL,
	`type` text NOT NULL,
	`page_number` integer,
	`position` text,
	`content` text,
	`color` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`deleted_at` text,
	`version` integer DEFAULT 1 NOT NULL,
	FOREIGN KEY (`paper_id`) REFERENCES `papers`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);

CREATE TABLE `citation_cache` (
	`id` text PRIMARY KEY NOT NULL,
	`doi` text NOT NULL,
	`api_source` text NOT NULL,
	`citation_count` integer DEFAULT 0 NOT NULL,
	`reference_count` integer DEFAULT 0 NOT NULL,
	`raw_data` text NOT NULL,
	`last_fetched` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`expires_at` text NOT NULL
);

CREATE TABLE `client_sync_states` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` integer NOT NULL,
	`document_id` text NOT NULL,
	`state_vector` blob NOT NULL,
	`last_synced` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`document_id`) REFERENCES `crdt_documents`(`id`) ON UPDATE no action ON DELETE cascade
);

CREATE TABLE `collections` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` integer NOT NULL,
	`name` text NOT NULL,
	`icon` text DEFAULT 'folder' NOT NULL,
	`color` text DEFAULT 'text-primary' NOT NULL,
	`filters` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`deleted_at` text,
	`version` integer DEFAULT 1 NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);

CREATE TABLE `crdt_documents` (
	`id` text PRIMARY KEY NOT NULL,
	`workspace_id` text NOT NULL,
	`snapshot` blob,
	`updates` blob,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE TABLE `folders` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` integer NOT NULL,
	`name` text NOT NULL,
	`icon` text DEFAULT 'folder',
	`color` text,
	`position` integer DEFAULT 0 NOT NULL,
	`workspace_id` text,
	`is_shared` integer DEFAULT false NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`deleted_at` text,
	`version` integer DEFAULT 1 NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);

CREATE TABLE `network_graphs` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` integer NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`is_auto` integer DEFAULT false NOT NULL,
	`node_count` integer DEFAULT 0 NOT NULL,
	`edge_count` integer DEFAULT 0 NOT NULL,
	`layout` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);

CREATE TABLE `paper_connections` (
	`id` text PRIMARY KEY NOT NULL,
	`from_paper_id` integer NOT NULL,
	`to_paper_id` integer NOT NULL,
	`connection_type` text NOT NULL,
	`source` text NOT NULL,
	`confidence` real DEFAULT 1,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`from_paper_id`) REFERENCES `papers`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`to_paper_id`) REFERENCES `papers`(`id`) ON UPDATE no action ON DELETE cascade
);

CREATE TABLE `paper_folders` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`paper_id` integer NOT NULL,
	`folder_id` integer NOT NULL,
	`user_id` integer NOT NULL,
	`added_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`deleted_at` text,
	FOREIGN KEY (`paper_id`) REFERENCES `papers`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`folder_id`) REFERENCES `folders`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);

CREATE TABLE `papers` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` integer NOT NULL,
	`title` text NOT NULL,
	`authors` text DEFAULT '[]' NOT NULL,
	`year` integer,
	`journal` text,
	`doi` text,
	`url` text,
	`abstract` text,
	`tags` text DEFAULT '[]' NOT NULL,
	`status` text DEFAULT 'To Read' NOT NULL,
	`related_paper_ids` text DEFAULT '[]' NOT NULL,
	`notes` text,
	`summary` text,
	`rating` integer,
	`pdf_url` text,
	`pdf_size_bytes` integer,
	`reading_progress` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`client_id` text,
	`version` integer DEFAULT 1 NOT NULL,
	`deleted_at` text,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);

CREATE TABLE `sessions` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` integer NOT NULL,
	`token_hash` text NOT NULL,
	`device_name` text,
	`user_agent` text,
	`ip_address` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`expires_at` text NOT NULL,
	`last_activity_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);

CREATE TABLE `sync_logs` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` integer NOT NULL,
	`entity_type` text,
	`entity_id` integer,
	`action` text,
	`client_id` text,
	`synced_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);

CREATE TABLE `users` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`email` text NOT NULL,
	`password_hash` text NOT NULL,
	`name` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`email_verified` integer DEFAULT false NOT NULL,
	`verification_token` text,
	`verification_token_expiry` text,
	`last_login_at` text,
	`last_synced_at` text,
	`storage_used_bytes` integer DEFAULT 0 NOT NULL,
	`storage_limit_bytes` integer DEFAULT 2147483648 NOT NULL,
	`settings` text DEFAULT '{}' NOT NULL
);

CREATE UNIQUE INDEX `citation_cache_doi_unique` ON `citation_cache` (`doi`);

CREATE INDEX `folders_deleted_at_idx` ON `folders` (`deleted_at`);

CREATE INDEX `folders_user_id_idx` ON `folders` (`user_id`);

CREATE INDEX `paper_folders_folder_id_idx` ON `paper_folders` (`folder_id`);

CREATE INDEX `paper_folders_paper_id_idx` ON `paper_folders` (`paper_id`);

CREATE INDEX `paper_folders_user_id_idx` ON `paper_folders` (`user_id`);

CREATE UNIQUE INDEX `sessions_token_hash_unique` ON `sessions` (`token_hash`);

CREATE UNIQUE INDEX `users_email_unique` ON `users` (`email`);

CREATE UNIQUE INDEX `users_verification_token_unique` ON `users` (`verification_token`);

CREATE INDEX IF NOT EXISTS `papers_user_id_updated_at_idx` ON `papers` (`user_id`, `updated_at`);

CREATE INDEX IF NOT EXISTS `annotations_user_id_idx` ON `annotations` (`user_id`);

CREATE INDEX IF NOT EXISTS `annotations_paper_id_idx` ON `annotations` (`paper_id`);

CREATE INDEX IF NOT EXISTS `network_graphs_user_id_idx` ON `network_graphs` (`user_id`);

CREATE INDEX IF NOT EXISTS `paper_connections_from_paper_id_idx` ON `paper_connections` (`from_paper_id`);

CREATE INDEX IF NOT EXISTS `paper_connections_to_paper_id_idx` ON `paper_connections` (`to_paper_id`);

CREATE INDEX IF NOT EXISTS `sessions_user_id_idx` ON `sessions` (`user_id`);

CREATE TABLE `groups` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`owner_id` integer NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`owner_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
CREATE INDEX `groups_owner_id_idx` ON `groups` (`owner_id`);
CREATE TABLE `group_members` (
	`group_id` integer NOT NULL,
	`user_id` integer NOT NULL,
	`role` text NOT NULL,
	`joined_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	PRIMARY KEY (`group_id`, `user_id`),
	FOREIGN KEY (`group_id`) REFERENCES `groups`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
CREATE INDEX `group_members_user_id_idx` ON `group_members` (`user_id`);
CREATE TABLE `group_invites` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`group_id` integer NOT NULL,
	`email` text NOT NULL,
	`role` text NOT NULL,
	`invited_by` integer,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`expires_at` text NOT NULL,
	FOREIGN KEY (`group_id`) REFERENCES `groups`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`invited_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE set null
);
CREATE UNIQUE INDEX `group_invites_group_email_unique` ON `group_invites` (`group_id`, `email`);
CREATE INDEX `group_invites_email_idx` ON `group_invites` (`email`);
ALTER TABLE `papers` ADD `group_id` integer REFERENCES `groups`(`id`) ON DELETE cascade;
ALTER TABLE `folders` ADD `group_id` integer REFERENCES `groups`(`id`) ON DELETE cascade;
ALTER TABLE `paper_folders` ADD `group_id` integer REFERENCES `groups`(`id`) ON DELETE cascade;
ALTER TABLE `annotations` ADD `group_id` integer REFERENCES `groups`(`id`) ON DELETE cascade;
CREATE INDEX `papers_group_id_updated_at_idx` ON `papers` (`group_id`, `updated_at`);
CREATE INDEX `folders_group_id_idx` ON `folders` (`group_id`);
CREATE INDEX `paper_folders_group_id_idx` ON `paper_folders` (`group_id`);
CREATE INDEX `annotations_group_id_idx` ON `annotations` (`group_id`);

ALTER TABLE `annotations` ADD `parent_id` integer REFERENCES `annotations`(`id`) ON DELETE cascade;
ALTER TABLE `annotations` ADD `client_id` text;
CREATE INDEX `annotations_paper_created_idx` ON `annotations` (`paper_id`, `created_at`);
CREATE UNIQUE INDEX `annotations_user_client_unique` ON `annotations` (`user_id`, `client_id`) WHERE `client_id` IS NOT NULL;

ALTER TABLE `annotations` ADD `mentions` text;
CREATE TABLE `notifications` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` integer NOT NULL,
	`type` text NOT NULL,
	`actor_id` integer,
	`group_id` integer,
	`paper_id` integer,
	`comment_id` integer,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`read_at` text,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`actor_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`group_id`) REFERENCES `groups`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`paper_id`) REFERENCES `papers`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`comment_id`) REFERENCES `annotations`(`id`) ON UPDATE no action ON DELETE cascade
);
CREATE INDEX `notifications_user_created_idx` ON `notifications` (`user_id`, `created_at`);
CREATE INDEX `notifications_comment_idx` ON `notifications` (`comment_id`);

-- 0006_network_libraries
ALTER TABLE `network_graphs` ADD `group_id` integer REFERENCES `groups`(`id`) ON DELETE cascade;
ALTER TABLE `network_graphs` ADD `suggestions` text;
CREATE INDEX IF NOT EXISTS `network_graphs_group_id_idx` ON `network_graphs` (`group_id`);
