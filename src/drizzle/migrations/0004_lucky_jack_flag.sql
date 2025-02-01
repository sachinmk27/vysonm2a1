CREATE TABLE `user` (
	`id` integer PRIMARY KEY NOT NULL,
	`email` text NOT NULL,
	`name` text,
	`api_key` text NOT NULL,
	`created_at` integer DEFAULT (CURRENT_TIMESTAMP) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `user_email_unique` ON `user` (`email`);--> statement-breakpoint
CREATE UNIQUE INDEX `user_api_key_unique` ON `user` (`api_key`);--> statement-breakpoint
ALTER TABLE `url_shortener` ADD `user_id` integer NOT NULL REFERENCES user(id);