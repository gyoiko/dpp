CREATE TABLE `dpp_supply_chain_mappings` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`mapping_key` text NOT NULL,
	`ke_dan_hao` text NOT NULL,
	`ke_dan_hang` text NOT NULL,
	`contract_no` text DEFAULT '' NOT NULL,
	`lot_no` text DEFAULT '' NOT NULL,
	`stage` text NOT NULL,
	`process` text DEFAULT '' NOT NULL,
	`relation` text DEFAULT 'external' NOT NULL,
	`supplier` text DEFAULT '' NOT NULL,
	`batch_no` text DEFAULT '' NOT NULL,
	`notes` text DEFAULT '' NOT NULL,
	`status` text DEFAULT 'draft' NOT NULL,
	`reviewed_by` text DEFAULT '' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `dpp_supply_chain_mappings_key_idx` ON `dpp_supply_chain_mappings` (`mapping_key`);--> statement-breakpoint
CREATE INDEX `dpp_supply_chain_mappings_milref_idx` ON `dpp_supply_chain_mappings` (`ke_dan_hao`,`ke_dan_hang`);