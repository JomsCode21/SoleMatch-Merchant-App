ALTER TABLE `discount` ADD `product_id` int NOT NULL;--> statement-breakpoint
ALTER TABLE `discount` ADD `created_at` timestamp DEFAULT (now()) NOT NULL;--> statement-breakpoint
ALTER TABLE `discount` ADD CONSTRAINT `discount_product_id_products_id_fk` FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON DELETE no action ON UPDATE no action;