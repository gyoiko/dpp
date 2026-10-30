CREATE TABLE `dpp_pages` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`mil_ref` text NOT NULL,
	`ke_dan_hao` text NOT NULL,
	`ke_dan_hang` text NOT NULL,
	`title` text DEFAULT '' NOT NULL,
	`intro` text DEFAULT '' NOT NULL,
	`status` text DEFAULT 'draft' NOT NULL,
	`published_at` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `dpp_pages_milref_idx` ON `dpp_pages` (`mil_ref`);