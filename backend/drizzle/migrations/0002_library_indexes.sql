-- Every library query filters by user_id (see src/lib/access.js); without
-- these, each one scans the whole table. IF NOT EXISTS keeps it re-runnable.
CREATE INDEX IF NOT EXISTS `papers_user_id_updated_at_idx` ON `papers` (`user_id`, `updated_at`);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `annotations_user_id_idx` ON `annotations` (`user_id`);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `annotations_paper_id_idx` ON `annotations` (`paper_id`);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `network_graphs_user_id_idx` ON `network_graphs` (`user_id`);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `paper_connections_from_paper_id_idx` ON `paper_connections` (`from_paper_id`);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `paper_connections_to_paper_id_idx` ON `paper_connections` (`to_paper_id`);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `sessions_user_id_idx` ON `sessions` (`user_id`);
