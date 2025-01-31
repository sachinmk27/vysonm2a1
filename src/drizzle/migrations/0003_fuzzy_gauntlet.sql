DROP INDEX `idx_url_shortener_original_url_short_code`;--> statement-breakpoint
DROP INDEX `idx_url_shortener_short_code_original_url`;--> statement-breakpoint
CREATE INDEX `idx_url_shortener_original_url` ON `url_shortener` (`original_url`);--> statement-breakpoint
CREATE INDEX `idx_url_shortener_short_code_original_url` ON `url_shortener` (`short_code`,`original_url`);