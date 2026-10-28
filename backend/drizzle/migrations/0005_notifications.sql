-- Mentions and notifications (src/services/notifications.js).
-- annotations.mentions: the user ids a comment @mentions, as a JSON array.
-- notifications: one row per person to tell (a mention, or a reply to their
-- comment); read_at is set once they opened the bell.
ALTER TABLE `annotations` ADD `mentions` text;
--> statement-breakpoint
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
--> statement-breakpoint
CREATE INDEX `notifications_user_created_idx` ON `notifications` (`user_id`, `created_at`);
--> statement-breakpoint
CREATE INDEX `notifications_comment_idx` ON `notifications` (`comment_id`);
