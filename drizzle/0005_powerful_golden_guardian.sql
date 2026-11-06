CREATE TABLE `auth_users` (
	`id` text PRIMARY KEY NOT NULL,
	`email` text NOT NULL,
	`name` text DEFAULT '' NOT NULL,
	`password_hash` text NOT NULL,
	`role` text DEFAULT 'scm' NOT NULL,
	`is_active` integer DEFAULT true NOT NULL,
	`token_version` integer DEFAULT 0 NOT NULL,
	`last_login_at` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `auth_users_email_idx` ON `auth_users` (`email`);