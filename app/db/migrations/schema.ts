import { mysqlTable, mysqlSchema, AnyMySqlColumn, foreignKey, int, varchar, text, timestamp, unique } from "drizzle-orm/mysql-core"
import { sql } from "drizzle-orm"

export const activityLogs = mysqlTable("activity_logs", {
	id: int().autoincrement().notNull(),
	shopId: int("shop_id").notNull().references(() => shops.id),
	productId: int("product_id").references(() => products.id),
	action: varchar({ length: 100 }).notNull(),
	description: text().notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).default('current_timestamp()').notNull(),
});

export const discount = mysqlTable("discount", {
	id: int().autoincrement().notNull(),
	shopId: int("shop_id").notNull().references(() => shops.id),
	discountCode: varchar("discount_code", { length: 255 }).notNull(),
	discountType: varchar("discount_type", { length: 50 }).notNull(),
	discountValue: varchar("discount_value", { length: 50 }).notNull(),
	productId: int("product_id").notNull().references(() => products.id),
	createdAt: timestamp("created_at", { mode: 'string' }).default('current_timestamp()').notNull(),
});

export const inventorySnapshots = mysqlTable("inventory_snapshots", {
	id: int().autoincrement().notNull(),
	productId: int("product_id").notNull().references(() => products.id),
	inventory: int().notNull(),
	priorityScore: int("priority_score").notNull(),
	status: varchar({ length: 50 }).notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).default('current_timestamp()').notNull(),
});

export const products = mysqlTable("products", {
	id: int().autoincrement().notNull(),
	shopId: int("shop_id").notNull().references(() => shops.id),
	shopifyProductId: varchar("shopify_product_id", { length: 255 }).notNull(),
	title: varchar({ length: 255 }).notNull(),
	price: varchar({ length: 50 }).notNull(),
	inventory: int().default(0).notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).default('current_timestamp()').notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).default('current_timestamp()').notNull(),
},
(table) => [
	unique("shopify_product_unique").on(table.shopId, table.shopifyProductId),
]);

export const restockRules = mysqlTable("restock_rules", {
	id: int().autoincrement().notNull(),
	productId: int("product_id").notNull().references(() => products.id),
	minimumInventory: int("minimum_inventory").notNull(),
	priority: varchar({ length: 50 }).notNull(),
	notes: text().default('NULL'),
	createdAt: timestamp("created_at", { mode: 'string' }).default('current_timestamp()').notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).default('current_timestamp()').notNull(),
});

export const sessions = mysqlTable("sessions", {
	id: varchar({ length: 255 }).notNull(),
	shop: varchar({ length: 255 }).notNull(),
	state: varchar({ length: 255 }).notNull(),
	isOnline: int("is_online").notNull(),
	scope: text().default('NULL'),
	expires: timestamp({ mode: 'string' }).default('current_timestamp()').notNull(),
	accessToken: text("access_token").default('NULL'),
	userId: varchar("user_id", { length: 255 }).default('NULL'),
	firstName: varchar("first_name", { length: 255 }).default('NULL'),
	lastName: varchar("last_name", { length: 255 }).default('NULL'),
	email: varchar({ length: 255 }).default('NULL'),
	shopId: int("shop_id").references(() => shops.id),
	accountOwner: int("account_owner"),
	locale: varchar({ length: 50 }).default('NULL'),
	collaborator: int(),
	emailVerified: int("email_verified"),
});

export const shops = mysqlTable("shops", {
	id: int().autoincrement().notNull(),
	shopDomain: varchar("shop_domain", { length: 255 }).notNull(),
	accessToken: text("access_token").notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).default('current_timestamp()').notNull(),
},
(table) => [
	unique("shops_shop_domain_unique").on(table.shopDomain),
]);
