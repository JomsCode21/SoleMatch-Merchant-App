import {
  mysqlTable,
  int,
  varchar,
  text,
  timestamp,
  unique,
} from "drizzle-orm/mysql-core";

export const shops = mysqlTable("shops", {
  id: int("id").autoincrement().primaryKey(),
  shopDomain: varchar("shop_domain", { length: 255 })
    .notNull()
    .unique(),
  accessToken: text("access_token").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const products = mysqlTable("products", {
  id: int("id").autoincrement().primaryKey(),
  // Foreign key → shops.id
  shopId: int("shop_id")
    .notNull()
    .references(() => shops.id),
  shopifyProductId: varchar("shopify_product_id", {
    length: 255,
  }).notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  price: varchar("price", { length: 50 }).notNull(),
  inventory: int("inventory").default(0).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
},
  (table) => ({
    shopifyProductUnique: unique("shopify_product_unique").on(
      table.shopId,
      table.shopifyProductId,
    ),
  }),
);

export const inventorySnapshots = mysqlTable("inventory_snapshots", {
  id: int("id").autoincrement().primaryKey(),
  productId: int("product_id")
    .notNull()
    .references(() => products.id),
  inventory: int("inventory").notNull(),
  priorityScore: int("priority_score").notNull(),
  status: varchar("status", { length: 50 }).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const restockRules = mysqlTable("restock_rules", {
  id: int("id").autoincrement().primaryKey(),
  productId: int("product_id")
    .notNull()
    .references(() => products.id),
  minimumInventory: int("minimum_inventory").notNull(),
  priority: varchar("priority", { length: 50 }).notNull(),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const activityLogs = mysqlTable("activity_logs", {
  id: int("id").autoincrement().primaryKey(),
  shopId: int("shop_id")
    .notNull()
    .references(() => shops.id),
  // Optional foreign key → products.id
  productId: int("product_id").references(() => products.id),
  action: varchar("action", { length: 100 }).notNull(),
  description: text("description").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const sessions = mysqlTable("sessions", {
  id: varchar("id", { length: 255 }).primaryKey(),
  shop: varchar("shop", { length: 255 }).notNull(),
  state: varchar("state", { length: 255 }).notNull(),
  isOnline: int("is_online").notNull(),
  scope: text("scope"),
  expires: timestamp("expires"),
  accessToken: text("access_token"),
  userId: varchar("user_id", { length: 255 }),
  firstName: varchar("first_name", { length: 255 }),
  lastName: varchar("last_name", { length: 255 }),
  email: varchar("email", { length: 255 }),
  accountOwner: int("account_owner"),
  locale: varchar("locale", { length: 50 }),
  collaborator: int("collaborator"),
  emailVerified: int("email_verified"),
});
