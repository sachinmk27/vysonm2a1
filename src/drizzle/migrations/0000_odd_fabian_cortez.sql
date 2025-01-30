CREATE TABLE `url_shortener` (
	`id` integer PRIMARY KEY NOT NULL,
	`original_url` text NOT NULL,
	`short_code` text NOT NULL,
	`visit_count` integer DEFAULT 0,
	`created_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_url_shortener_short_code_original_url` ON `url_shortener` (`short_code`,`original_url`);--> statement-breakpoint
CREATE INDEX `idx_url_shortener_original_url_short_code` ON `url_shortener` (`original_url`,`short_code`);