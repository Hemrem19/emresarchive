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
--> statement-breakpoint
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
--> statement-breakpoint
CREATE INDEX `folders_user_id_idx` ON `folders` (`user_id`);
--> statement-breakpoint
CREATE INDEX `folders_deleted_at_idx` ON `folders` (`deleted_at`);
--> statement-breakpoint
CREATE INDEX `paper_folders_paper_id_idx` ON `paper_folders` (`paper_id`);
--> statement-breakpoint
CREATE INDEX `paper_folders_folder_id_idx` ON `paper_folders` (`folder_id`);
--> statement-breakpoint
CREATE INDEX `paper_folders_user_id_idx` ON `paper_folders` (`user_id`);
