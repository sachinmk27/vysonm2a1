PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_url_shortener` (
	`id` integer PRIMARY KEY NOT NULL,
	`original_url` text NOT NULL,
	`short_code` text NOT NULL,
	`visit_count` integer DEFAULT 0,
	`created_at` integer DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	`last_accessed_at` integer
);
--> statement-breakpoint
INSERT INTO `__new_url_shortener`("id", "original_url", "short_code", "visit_count", "created_at", "last_accessed_at") SELECT "id", "original_url", "short_code", "visit_count", "created_at", "last_accessed_at" FROM `url_shortener`;--> statement-breakpoint
DROP TABLE `url_shortener`;--> statement-breakpoint
ALTER TABLE `__new_url_shortener` RENAME TO `url_shortener`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE UNIQUE INDEX `idx_url_shortener_short_code_original_url` ON `url_shortener` (`short_code`,`original_url`);--> statement-breakpoint
CREATE INDEX `idx_url_shortener_original_url_short_code` ON `url_shortener` (`original_url`,`short_code`);