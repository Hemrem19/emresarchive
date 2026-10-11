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
