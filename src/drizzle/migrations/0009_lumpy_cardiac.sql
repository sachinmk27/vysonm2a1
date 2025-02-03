PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_user` (
	`id` integer PRIMARY KEY NOT NULL,
	`email` text NOT NULL,
	`name` text,
	`api_key` text NOT NULL,
	`created_at` integer DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	`tier_id` integer DEFAULT 1,
	FOREIGN KEY (`tier_id`) REFERENCES `tier`(`id`) ON UPDATE cascade ON DELETE set default
);
--> statement-breakpoint
INSERT INTO `__new_user`("id", "email", "name", "api_key", "created_at", "tier_id") SELECT "id", "email", "name", "api_key", "created_at", "tier_id" FROM `user`;--> statement-breakpoint
DROP TABLE `user`;--> statement-breakpoint
ALTER TABLE `__new_user` RENAME TO `user`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE UNIQUE INDEX `user_email_unique` ON `user` (`email`);--> statement-breakpoint
CREATE UNIQUE INDEX `user_api_key_unique` ON `user` (`api_key`);