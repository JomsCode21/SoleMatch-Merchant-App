CREATE TABLE `activity_logs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`shop_id` int NOT NULL,
	`product_id` int,
	`action` varchar(100) NOT NULL,
	`description` text NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `activity_logs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `inventory_snapshots` (
	`id` int AUTO_INCREMENT NOT NULL,
	`product_id` int NOT NULL,
	`inventory` int NOT NULL,
	`priority_score` int NOT NULL,
	`status` varchar(50) NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `inventory_snapshots_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `products` (
	`id` int AUTO_INCREMENT NOT NULL,
	`shop_id` int NOT NULL,
	`shopify_product_id` varchar(255) NOT NULL,
	`title` varchar(255) NOT NULL,
	`price` varchar(50) NOT NULL,
	`inventory` int NOT NULL DEFAULT 0,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `products_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `restock_rules` (
	`id` int AUTO_INCREMENT NOT NULL,
	`product_id` int NOT NULL,
	`minimum_inventory` int NOT NULL,
	`priority` varchar(50) NOT NULL,
	`notes` text,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `restock_rules_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `shops` (
	`id` int AUTO_INCREMENT NOT NULL,
	`shop_domain` varchar(255) NOT NULL,
	`access_token` text NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `shops_id` PRIMARY KEY(`id`),
	CONSTRAINT `shops_shop_domain_unique` UNIQUE(`shop_domain`)
);
