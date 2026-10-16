-- Paper comments: a discussion thread per group paper (src/routes/comments.js).
-- A comment is an annotations row with type 'comment'; replies point at a
-- top-level comment through parent_id. client_id lets a retried post return
-- the comment it already created instead of adding a second one.
ALTER TABLE `annotations` ADD `parent_id` integer REFERENCES `annotations`(`id`) ON DELETE cascade;
--> statement-breakpoint
ALTER TABLE `annotations` ADD `client_id` text;
--> statement-breakpoint
CREATE INDEX `annotations_paper_created_idx` ON `annotations` (`paper_id`, `created_at`);
--> statement-breakpoint
CREATE UNIQUE INDEX `annotations_user_client_unique` ON `annotations` (`user_id`, `client_id`) WHERE `client_id` IS NOT NULL;
