CREATE TABLE `sessions` (
	`id` varchar(255) NOT NULL,
	`shop` varchar(255) NOT NULL,
	`state` varchar(255) NOT NULL,
	`is_online` int NOT NULL,
	`scope` text,
	`expires` timestamp,
	`access_token` text,
	`user_id` varchar(255),
	`first_name` varchar(255),
	`last_name` varchar(255),
	`email` varchar(255),
	`account_owner` int,
	`locale` varchar(50),
	`collaborator` int,
	`email_verified` int,
	CONSTRAINT `sessions_id` PRIMARY KEY(`id`)
);
