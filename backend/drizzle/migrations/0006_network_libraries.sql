-- Networks per library (src/services/citation.js): a group's network carries
-- group_id, a personal one keeps it NULL. suggestions: papers the library's
-- papers cite but it lacks, as a JSON array, refreshed with the network.
ALTER TABLE `network_graphs` ADD `group_id` integer REFERENCES `groups`(`id`) ON DELETE cascade;
--> statement-breakpoint
ALTER TABLE `network_graphs` ADD `suggestions` text;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `network_graphs_group_id_idx` ON `network_graphs` (`group_id`);
