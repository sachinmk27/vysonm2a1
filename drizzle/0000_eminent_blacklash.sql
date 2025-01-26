-- Current sql file was generated after introspecting the database
-- If you want to run this migration please uncomment this code before executing migrations
/*
CREATE TABLE `url_shortener` (
	`id` integer PRIMARY KEY AUTOINCREMENT,
	`original_url` text,
	`short_code` text,
	`visit_count` integer DEFAULT 0,
	`created_at` text DEFAULT (current_timestamp) NOT NULL
);

*/