CREATE TABLE `discount` (
	`id` int AUTO_INCREMENT NOT NULL,
	`shop_id` int NOT NULL,
	`discount_code` varchar(255) NOT NULL,
	`discount_type` varchar(50) NOT NULL,
	`discount_value` varchar(50) NOT NULL,
	CONSTRAINT `discount_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `discount` ADD CONSTRAINT `discount_shop_id_shops_id_fk` FOREIGN KEY (`shop_id`) REFERENCES `shops`(`id`) ON DELETE no action ON UPDATE no action;