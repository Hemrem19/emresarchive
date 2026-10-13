-- Private groups (workspaces phase 1): shared libraries reached through
-- membership. Group rows carry group_id; personal rows keep group_id NULL.
-- user_id on a group row is the member who added it. See src/lib/access.js.
CREATE TABLE `groups` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`owner_id` integer NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`owner_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `groups_owner_id_idx` ON `groups` (`owner_id`);
--> statement-breakpoint
CREATE TABLE `group_members` (
	`group_id` integer NOT NULL,
	`user_id` integer NOT NULL,
	`role` text NOT NULL,
	`joined_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	PRIMARY KEY (`group_id`, `user_id`),
	FOREIGN KEY (`group_id`) REFERENCES `groups`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `group_members_user_id_idx` ON `group_members` (`user_id`);
--> statement-breakpoint
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
--> statement-breakpoint
CREATE UNIQUE INDEX `group_invites_group_email_unique` ON `group_invites` (`group_id`, `email`);
--> statement-breakpoint
CREATE INDEX `group_invites_email_idx` ON `group_invites` (`email`);
--> statement-breakpoint
ALTER TABLE `papers` ADD `group_id` integer REFERENCES `groups`(`id`) ON DELETE cascade;
--> statement-breakpoint
ALTER TABLE `folders` ADD `group_id` integer REFERENCES `groups`(`id`) ON DELETE cascade;
--> statement-breakpoint
ALTER TABLE `paper_folders` ADD `group_id` integer REFERENCES `groups`(`id`) ON DELETE cascade;
--> statement-breakpoint
ALTER TABLE `annotations` ADD `group_id` integer REFERENCES `groups`(`id`) ON DELETE cascade;
--> statement-breakpoint
CREATE INDEX `papers_group_id_updated_at_idx` ON `papers` (`group_id`, `updated_at`);
--> statement-breakpoint
CREATE INDEX `folders_group_id_idx` ON `folders` (`group_id`);
--> statement-breakpoint
CREATE INDEX `paper_folders_group_id_idx` ON `paper_folders` (`group_id`);
--> statement-breakpoint
CREATE INDEX `annotations_group_id_idx` ON `annotations` (`group_id`);
