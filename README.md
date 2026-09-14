# SoleMatch Merchant Assistant

SoleMatch Merchant Assistant is an embedded Shopify Admin app designed to help sneaker merchants identify which products need inventory attention first.

The app combines Shopify product data, inventory analysis, priority scoring, restock rules, activity history, and Shopify webhooks into a focused merchant workflow.

It also includes a customer-facing product-matching quiz that recommends sneakers based on activity, priority, and style.

---

## Features

### Merchant Dashboard

The dashboard gives merchants a prioritized view of their inventory, including:

- Critical products
- Watchlist products
- Healthy products
- Top restock priorities
- Inventory levels
- Priority scores
- Action recommendations

The goal is to answer one specific merchant question:

> Which products should I pay attention to first?

### Inventory Priority Scoring

Products are prioritized based on their current inventory level:

| Inventory | Score | Status |
| --------- | ----: | ------ |
| 0         | 100   | Critical |
| 1–3       | 70    | Critical |
| 4–8       | 45    | Watchlist |
| 9–15      | 20    | Healthy |
| 16+       | 0     | Healthy |

The scoring system is intentionally simple and explainable so merchants can understand why a product requires attention.

Detailed reasoning behind the scoring model is documented in [APP_DECISION.md](APP_DECISION.md).

### Customer Product-Matching Quiz

The SoleMatch storefront includes an interactive quiz that recommends a sneaker based on:

- Activity
- Priority
- Style

Product matching is data-driven using Shopify product metafields:

- `solematch.activity`
- `solematch.priority`
- `solematch.style`

The quiz calculates a match score using:

- Activity match: 50 points
- Priority match: 30 points
- Style match: 20 points

The highest-scoring product is presented as the customer's best match.

Product configuration is stored in Shopify rather than hard-coded into the quiz, allowing new products to participate without changing the quiz logic as long as the required metafields are configured.

### Restock Rules

Merchants can create and update restock rules for individual products.

Each rule can include:

- Minimum inventory threshold
- Priority
- Notes

### Activity History

The app records important merchant and system activity, including:

- Inventory analysis
- Product creation
- Product updates
- Restock rule updates

### Shopify Webhooks

The app listens for Shopify events including:

- `products/create`
- `products/update`
- `app/uninstalled`
- `app/scopes_update`

Product webhooks help keep the application's local product data synchronized when changes occur in Shopify.

---

## Technology

- Shopify Embedded App
- React Router
- Vite
- Node.js
- TypeScript
- Drizzle ORM
- MySQL
- Shopify Admin GraphQL API
- Shopify Webhooks

---

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
│   │   ├── app.additional.tsx
│   │   ├── app.sync.tsx
│   │   ├── webhooks.products.create.tsx
│   │   └── webhooks.products.update.tsx
│   ├── db.server.ts
│   ├── shopify.server.ts
│   └── session-storage.server.ts
├── extensions/
├── public/
├── shopify.app.toml
├── package.json
├── APP_DECISION.md
└── README.md
```

---

## Prerequisites

Before running the project, install:

- Node.js
- Shopify CLI
- MySQL

You will also need access to a Shopify development store.

---

## Installation

Clone the repository and install dependencies:

```shell
npm install
```

Create a `.env` file in the project root with the required Shopify and database configuration.

For example:

```env
DATABASE_URL=mysql://username:password@localhost:3306/solematch
```

Do not commit `.env` or other environment files containing secrets.

---

## Database Setup

Create a MySQL database:

```sql
CREATE DATABASE solematch;
```

The application uses Drizzle ORM for database access.

The database contains the following tables:

- `shops`
- `products`
- `inventory_snapshots`
- `restock_rules`
- `activity_logs`
- `sessions`

The `products` table uses a composite unique constraint on the shop and Shopify product ID to prevent duplicate product records.

---

## Local Development

Start the Shopify development environment:

```shell
shopify app dev
```

The Shopify CLI creates the development tunnel and manages the development app configuration.

After the CLI starts, open the generated app preview URL and install or open the app in the Shopify development store.

---

## Using the App

### 1. Analyze Inventory

Open the SoleMatch Merchant Assistant dashboard and select **Analyze Inventory**.

The app retrieves product information from Shopify and synchronizes:

- Product title
- Price
- Inventory

It then calculates a priority score and stores an inventory snapshot.

### 2. Review Priorities

The dashboard groups products into:

- Critical
- Watchlist
- Healthy

Higher-priority products are displayed first so merchants can focus on the products that require the most attention.

### 3. Create Restock Rules

Open **Restock Rules** and create a rule for a product.

Configure:

- Minimum inventory
- Priority
- Notes

### 4. Review Activity

Open **History** to review inventory analysis, product changes, and restock rule activity.

---

## Customer Product Matching

The customer-facing storefront provides a **Find Your Match** experience.

Customers answer questions about:

- Activity
- Priority
- Style

The quiz compares those answers against product metafields configured in Shopify and calculates a match score.

The product with the highest score is presented as the customer's recommended sneaker.

---

## Testing

The application has been tested for:

- Product synchronization
- Duplicate prevention
- Inventory analysis
- Priority scoring
- Restock rule creation
- Restock rule updates
- Activity history
- Product create webhook
- Product update webhook
- Shopify navigation
- Shopify cart and storefront functionality

---

## Build

Build the application with:

```shell
npm run build
```

A successful build confirms that the TypeScript and React Router application can be compiled successfully.

---

## Architecture

Shopify is the source of truth for product and inventory data.

The application database is used for:

- Synchronized product data
- Inventory snapshots
- Merchant restock rules
- Activity history
- Shopify session data

The primary merchant workflow is:

```text
Shopify
   ↓
Product Data
   ↓
Inventory Analysis
   ↓
Priority Score
   ↓
Critical / Watchlist / Healthy
   ↓
Merchant Action
   ↓
Restock Rule
   ↓
Activity History
```

Shopify product webhooks provide an additional synchronization path when products are created or updated outside the application.

---

## Product Thinking

SoleMatch is designed around two focused experiences.

### Merchant

The merchant experience answers:

> Which products should I pay attention to first?

The workflow is:

**Analyze → Prioritize → Create Restock Rule → Track Activity**

### Customer

The customer experience answers:

> Which sneaker is the best match for me?

The workflow is:

**Answer Questions → Get Match → View Product**

Product attributes for the customer quiz are stored in Shopify product metafields, keeping product configuration separate from recommendation logic.

---

## Additional Documentation

For product decisions, architecture rationale, database design, scoring logic, technical tradeoffs, and future improvements, see:

[APP_DECISION.md](APP_DECISION.md)

---

## Deployment Notes

Before production deployment:

1. Configure a production application URL.
2. Configure production Shopify authentication redirect URLs.
3. Configure production environment variables.
4. Use a production MySQL database.
5. Run the required Drizzle migrations.
6. Deploy the application server.
7. Deploy the Shopify app configuration.
8. Verify Shopify webhooks.
9. Install and test the production app on a development or test store before wider release.

The current configuration is intended for the Shopify take-home assessment and local development.
