CREATE TABLE `tier` (
	`id` integer PRIMARY KEY NOT NULL,
	`name` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `tier_name_unique` ON `tier` (`name`);--> statement-breakpoint
ALTER TABLE `user` ADD `tier_id` integer DEFAULT 1 REFERENCES tier(id);