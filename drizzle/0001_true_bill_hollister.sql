CREATE TABLE `dpp_traceability_node_mappings` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`mapping_key` text NOT NULL,
	`ke_dan_hao` text NOT NULL,
	`ke_dan_hang` text NOT NULL,
	`node_id` integer NOT NULL,
	`node_seq_no` integer,
	`stage` text NOT NULL,
	`process` text DEFAULT '' NOT NULL,
	`notes` text DEFAULT '' NOT NULL,
	`status` text DEFAULT 'draft' NOT NULL,
	`reviewed_by` text DEFAULT '' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `dpp_traceability_node_mappings_key_idx` ON `dpp_traceability_node_mappings` (`mapping_key`);--> statement-breakpoint
CREATE INDEX `dpp_traceability_node_mappings_milref_idx` ON `dpp_traceability_node_mappings` (`ke_dan_hao`,`ke_dan_hang`);