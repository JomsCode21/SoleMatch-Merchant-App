# SoleMatch Merchant Assistant — App Decisions

## 1. Store Concept

SoleMatch is a modern sneaker store focused on helping customers find the right pair for everyday life, running, training, lifestyle, and outdoor activities.

The storefront uses a simple athletic visual style with clear product navigation and a **Find Your Match** quiz that recommends a sneaker based on the customer's activity, priority, and style.

The goal is to make sneaker shopping simple while giving merchants useful tools to manage inventory and identify products that need attention.

---

## 2. Embedded App Idea

SoleMatch Merchant Assistant is an embedded Shopify Admin app that helps merchants identify which products need inventory attention first.

The app calculates a Product Priority Score based on inventory levels:

- 0 inventory = Critical
- 1–3 units = Critical
- 4–8 units = Watchlist
- 9–15 units = Healthy
- More than 15 units = Healthy

The dashboard shows the highest-priority products first and provides recommendations for merchant action.

Merchants can also create restock rules with:

- Minimum inventory threshold
- Priority level
- Notes

The app keeps an activity history so merchants can review inventory analysis and restock rule changes.

The product is intentionally focused on turning inventory data into an actionable merchant workflow rather than providing only a generic inventory table.

---

## 3. Architecture Decisions

The application uses:

- Shopify embedded app
- React Router
- Vite
- Node.js
- TypeScript
- Drizzle ORM
- MySQL
- Shopify Admin GraphQL API
- Shopify webhooks

### Shopify as the Source of Truth

Shopify remains the source of truth for product and inventory information.

The application database is used for application-specific data that benefits from persistence, including:

- Synchronized product data
- Inventory snapshots
- Restock rules
- Activity history
- Shopify authentication sessions

This separation avoids treating the local database as the authoritative source for Shopify product or inventory state.

### Synchronization

Inventory analysis retrieves product information from Shopify and synchronizes the relevant product information into the application's MySQL database.

Shopify product create and update webhooks provide an additional synchronization path when product changes happen outside the application.

This allows the application to maintain useful local historical and merchant-specific data while keeping Shopify as the authoritative product system.

---

## 4. Database Design

The database contains the following related tables.

### `shops`

Stores Shopify shop information and application-related shop data.

### `products`

Stores synchronized Shopify product information including title, price, and inventory.

A composite unique constraint on the shop ID and Shopify product ID prevents duplicate product records for the same shop.

### `inventorySnapshots`

Stores inventory analysis results over time, including:

- Inventory level
- Priority score
- Status
- Timestamp

Snapshots provide historical context instead of overwriting every previous inventory analysis.

### `restockRules`

Stores merchant-created restock rules for products.

Rules allow merchants to define a minimum inventory threshold, priority, and notes for future action.

### `activityLogs`

Stores important merchant and system activity such as:

- Inventory analysis
- Product creation
- Product updates
- Restock rule updates

This provides an audit-style history of meaningful application events.

### `sessions`

Stores Shopify authentication session data required by the embedded app.

---

## 5. Priority Scoring Logic

The priority score is intentionally simple and explainable.

Inventory of 0 results in a score of 100.

For other inventory levels:

- 1–3 units adds 70 points
- 4–8 units adds 45 points
- 9–15 units adds 20 points
- More than 15 units adds 0 points

Status is then calculated from the score:

- 70 or higher = Critical
- 40–69 = Watchlist
- Below 40 = Healthy

This approach makes the recommendation easy for a merchant to understand instead of hiding the decision behind a complicated algorithm.

### Why Inventory-First?

The first version focuses on inventory because it provides a clear and immediately useful signal without requiring a large amount of historical sales data.

The scoring model is therefore deterministic and predictable:

**Inventory → Score → Status → Merchant Action**

This makes it easier to explain, test, and improve later.

---

## 6. Customer Product-Matching Decision

The storefront includes a customer-facing product-matching quiz based on:

- Activity
- Priority
- Style

The quiz originally used product-specific JavaScript logic. This was changed to a data-driven approach using Shopify product metafields:

- `solematch.activity`
- `solematch.priority`
- `solematch.style`

The quiz calculates a match score using:

- Activity match = 50 points
- Priority match = 30 points
- Style match = 20 points

The highest-scoring product is presented as the customer's best match.

### Why Metafields?

Product attributes belong with the product configuration rather than inside the quiz JavaScript.

Using Shopify metafields keeps product data separate from recommendation logic and allows merchants to configure products through Shopify.

This also means new products can participate in the quiz without requiring changes to the quiz JavaScript, provided the required metafields are configured.

### Why These Weights?

Activity receives the highest weight because it is the strongest signal for determining whether a sneaker is appropriate for the customer's intended use.

Priority provides a secondary preference signal, while style provides additional personalization.

The weighting is intentionally straightforward so the recommendation can be explained to customers and easily adjusted as more usage data becomes available.

---

## 7. Tradeoffs

### Simple Scoring Instead of a Complex Prediction Model

A simple rule-based score was chosen because the assessment focuses on product thinking, usability, and clear business logic.

A machine-learning model would require more historical sales or customer behavior data and could make the recommendation harder for a merchant to understand.

The current rules can be inspected, tested, and changed without introducing model-training infrastructure.

### Inventory-First Logic

The first version focuses on inventory rather than attempting to predict future demand.

This keeps the initial product focused and avoids requiring historical order data before the app can provide value.

A future version could incorporate:

- Sales velocity
- Recent orders
- Product demand
- Seasonal trends
- Supplier lead times

### Local Database vs. Shopify Data

The application maintains local product data for synchronization, analysis, and history rather than querying Shopify for every historical operation.

The tradeoff is that synchronized data introduces another state that must be kept consistent.

Shopify webhooks and explicit inventory analysis provide mechanisms for maintaining that synchronization.

### Explainability vs. Sophistication

The priority system intentionally favors explainability over algorithmic complexity.

A merchant can understand why a product is Critical, Watchlist, or Healthy by looking at its inventory level and score.

This is more valuable for the first version than a sophisticated model whose recommendations cannot be easily explained.

---

## 8. Product Thinking

The main product decision was to avoid making the merchant dashboard another generic inventory table.

Instead, the app answers a specific merchant question:

> Which products should I pay attention to first?

The priority score, status badges, restock rules, and activity history are designed around that question.

This creates a focused merchant workflow:

**Analyze → Prioritize → Create Restock Rule → Track Activity**

The customer-facing storefront applies the same product-focused approach from the customer perspective:

**Answer Questions → Get Match → View Product**

The two experiences use product data differently but share the same goal of reducing decision-making effort.

---

## 9. Data-Driven Product Matching

The product-matching quiz is designed to keep product configuration outside of the application logic.

Each participating product can define its matching attributes through Shopify metafields:

- `solematch.activity`
- `solematch.priority`
- `solematch.style`

The quiz reads these attributes and calculates a score against the customer's answers.

This approach provides three benefits:

1. Product configuration stays in Shopify.
2. Recommendation logic remains independent from individual products.
3. New products can be added without modifying the quiz code.

The approach also creates a foundation for future recommendation improvements without requiring the storefront architecture to be rewritten.

---

## 10. What I Would Improve With More Time

With additional development time, I would add:

1. Sales velocity to the merchant priority score.
2. Historical inventory charts.
3. Low-stock notifications.
4. More advanced restock recommendations.
5. Supplier lead-time support.
6. Bulk restock actions.
7. Date filters for activity history.
8. More detailed merchant analytics.
9. Automated testing for scoring and webhook behavior.
10. Production deployment configuration and monitoring.

### Future Scoring Model

A future priority model could combine current inventory with demand signals.

For example:

**Inventory Risk + Sales Velocity + Demand Trend + Supplier Lead Time**

This would make the priority score more predictive while preserving the current explainable workflow.

---

## 11. Summary of Key Decisions

| Decision | Reason |
| -------- | ------ |
| Inventory-first merchant scoring | Provides immediate value with minimal data requirements |
| Rule-based priority score | Easy to understand, test, and explain |
| Shopify as product/inventory source of truth | Avoids conflicting product state |
| MySQL local application database | Supports history, rules, activity, and sessions |
| Shopify webhooks | Keeps synchronized product data updated |
| Product metafields for quiz attributes | Separates product configuration from code |
| Weighted quiz scoring | Provides simple and explainable recommendations |
| Restock rules | Converts inventory insight into merchant action |
| Activity history | Provides visibility into important system and merchant actions |

---

## 12. Final Product Direction

SoleMatch is intentionally designed as a focused first version rather than a full inventory-management platform.

The core product loop is:

**Shopify Data → Insight → Recommendation → Action → History**

For merchants, this means turning inventory levels into clear priorities and actionable restock decisions.

For customers, it means turning a small set of preferences into a simple sneaker recommendation.

The architecture and product decisions are designed so future features can be added without changing the core workflow or moving product configuration away from Shopify.
