# SoleMatch Merchant Assistant

SoleMatch Merchant Assistant is an embedded Shopify Admin app that helps sneaker merchants identify which products need inventory attention first.

It combines Shopify product data, a rule-based priority score, restock rules, inventory snapshots, activity history, and Shopify webhooks into one merchant workflow.

## Features

### Merchant Dashboard

The dashboard provides:

* Critical products
* Watchlist products
* Healthy products
* Top restock priorities
* Inventory levels
* Priority scores
* Action recommendations

### Inventory Priority Scoring

Products are automatically classified based on inventory:

| Inventory | Score | Status    |
| --------- | ----: | --------- |
| 0         |   100 | Critical  |
| 1–3       |    70 | Critical  |
| 4–8       |    45 | Watchlist |
| 9–15      |    20 | Healthy   |
| 16+       |     0 | Healthy   |

The scoring system is intentionally simple and explainable so merchants can understand why a product requires attention.

### Customer Product-Matching Quiz

The SoleMatch storefront includes an interactive product-matching quiz that recommends a sneaker based on:

* Activity
* Priority
* Style

Product matching is data-driven using Shopify product metafields:

* `solematch.activity`
* `solematch.priority`
* `solematch.style`

The quiz calculates a match score using:

* Activity match: 50 points
* Priority match: 30 points
* Style match: 20 points

The highest-scoring product is displayed with its product image, collection, recommendation reason, match score, and product link.

This approach allows new products to participate in the quiz without changing the quiz JavaScript, as long as the product has the required metafield values.

### Restock Rules

Merchants can create and update rules for individual products with:

* Minimum inventory threshold
* Priority
* Notes

### Activity History

The app records important activity including:

* Inventory analysis
* Product creation
* Product updates
* Restock rule updates

### Shopify Webhooks

The app listens for:

* `products/create`
* `products/update`
* `app/uninstalled`
* `app/scopes_update`

Product webhooks synchronize Shopify product changes with the application database and create inventory snapshots and activity records.

## Technology

* Shopify Embedded App
* React Router
* Vite
* Node.js
* TypeScript
* Drizzle ORM
* MySQL
* Shopify Admin GraphQL API
* Shopify Webhooks

## Project Structure

```text
sole-match-merchant-assistant/
├── app/
│   ├── db/
│   │   └── schema.ts
│   ├── routes/
│   │   ├── app._index.tsx
│   │   ├── app.restock-rules.tsx
│   │   ├── app.history.tsx
│   │   ├── webhooks.products.create.tsx
│   │   └── webhooks.products.update.tsx
│   ├── db.server.ts
│   ├── shopify.server.ts
│   └── session-storage.server.ts
├── database/
│   ├── migrations/
│   ├── schema.ts
│   └── drizzle.config.ts
├── shopify.app.toml
├── APP_DECISIONS.md
├── package.json
└── README.md
```

## Prerequisites

Before running the project, install:

* Node.js
* Shopify CLI
* MySQL

You also need access to a Shopify development store.

## Database Setup

Create a MySQL database named:

```sql
CREATE DATABASE solematch;
```

Create a `.env` file in the project root with the required Shopify and database configuration.

Example:

```env
DATABASE_URL=mysql://username:password@localhost:3306/solematch
```

## Install Dependencies

From the project directory:

```shell
npm install
```

## Database Migrations

Generate or apply Drizzle migrations using the project's configured Drizzle workflow.

The database contains:

* `shops`
* `products`
* `inventory_snapshots`
* `restock_rules`
* `activity_logs`
* `sessions`

The `products` table uses a composite unique constraint on the shop and Shopify product ID to prevent duplicate product records.

## Local Development

Start the Shopify development environment with:

```shell
shopify app dev
```

The Shopify CLI creates the development tunnel and updates the development app configuration automatically.

After the CLI starts, open the generated app preview URL and install/open the app in the development store.

## Using the App

### 1. Analyze Inventory

Open the SoleMatch Merchant Assistant dashboard and select **Analyze inventory**.

The app retrieves products from Shopify and synchronizes:

* Product title
* Price
* Inventory

It then calculates a priority score and stores an inventory snapshot.

### 2. Review Priorities

The dashboard groups products into:

* Critical
* Watchlist
* Healthy

The highest-priority products are displayed first.

### 3. Create Restock Rules

Open **Restock Rules** and create a rule for a product.

Set:

* Minimum inventory
* Priority
* Notes

### 4. Review Activity

Open **History** to review inventory analysis, product changes, and restock rule updates.

## Testing

The application was tested with:

* Product synchronization
* Duplicate prevention
* Inventory analysis
* Priority scoring
* Restock rule creation
* Restock rule updates
* Activity history
* Product create webhook
* Product update webhook
* Shopify navigation
* Shopify cart and storefront functionality

## Build

To build the application:

```shell
npm run build
```

A successful build confirms that the TypeScript and React Router application can be compiled for deployment.

## Deployment Notes

Before production deployment:

1. Configure a production application URL.
2. Configure production Shopify authentication redirect URLs.
3. Configure production environment variables.
4. Use a production MySQL database.
5. Run the required Drizzle migrations.
6. Deploy the application server.
7. Deploy the Shopify app configuration.
8. Verify webhooks after deployment.
9. Install and test the production app on a development/test store before wider use.

The current development setup is intended for the Shopify take-home assessment and local development.

## Architecture

Shopify is the source of truth for product and inventory data.

The application database stores:

* Shop information
* Synchronized products
* Inventory snapshots
* Merchant restock rules
* Activity history
* Shopify sessions

The main workflow is:

```text
Shopify
   ↓
Product data
   ↓
Inventory analysis
   ↓
Priority score
   ↓
Critical / Watchlist / Healthy
   ↓
Merchant action
   ↓
Restock rule
   ↓
Activity history
```

Shopify product webhooks provide another synchronization path when products are created or updated outside the application.

## Product Thinking

The app is designed around a specific merchant question:

> Which products should I pay attention to first?

Instead of presenting only a generic inventory table, the application turns inventory levels into an actionable priority.

The customer-facing storefront applies the same product-focused approach through an interactive matching quiz. Customers answer questions about their activity, priority, and style, and the quiz recommends the product that best matches their preferences.

Product attributes for the quiz are stored in Shopify product metafields, keeping product configuration separate from the recommendation logic.

The overall product experience connects both sides of the store:

**Merchant:** Analyze → Prioritize → Create Restock Rule → Track Activity

**Customer:** Answer Questions → Get Match → View Product

## Additional Documentation

See [`APP_DECISION.md`](APP_DECISION.md) for:

* Store concept
* App idea
* Architecture decisions
* Database design
* Priority scoring logic
* Technical tradeoffs
* Future improvements
