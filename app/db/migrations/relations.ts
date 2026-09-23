import { relations } from "drizzle-orm/relations";
import { products, activityLogs, shops, discount, inventorySnapshots, restockRules } from "./schema";

export const activityLogsRelations = relations(activityLogs, ({one}) => ({
	product: one(products, {
		fields: [activityLogs.productId],
		references: [products.id]
	}),
	shop: one(shops, {
		fields: [activityLogs.shopId],
		references: [shops.id]
	}),
}));

export const productsRelations = relations(products, ({one, many}) => ({
	activityLogs: many(activityLogs),
	discounts: many(discount),
	inventorySnapshots: many(inventorySnapshots),
	shop: one(shops, {
		fields: [products.shopId],
		references: [shops.id]
	}),
	restockRules: many(restockRules),
}));

export const shopsRelations = relations(shops, ({many}) => ({
	activityLogs: many(activityLogs),
	discounts: many(discount),
	products: many(products),
}));

export const discountRelations = relations(discount, ({one}) => ({
	product: one(products, {
		fields: [discount.productId],
		references: [products.id]
	}),
	shop: one(shops, {
		fields: [discount.shopId],
		references: [shops.id]
	}),
}));

export const inventorySnapshotsRelations = relations(inventorySnapshots, ({one}) => ({
	product: one(products, {
		fields: [inventorySnapshots.productId],
		references: [products.id]
	}),
}));

export const restockRulesRelations = relations(restockRules, ({one}) => ({
	product: one(products, {
		fields: [restockRules.productId],
		references: [products.id]
	}),
}));