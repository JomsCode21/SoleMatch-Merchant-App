# SoleMatch Merchant Assistant — App Decisions

## 1. Store Concept

SoleMatch is a modern sneaker store focused on helping customers find the right pair for everyday life, running, training, lifestyle, and outdoor activities.

The storefront uses a simple athletic visual style with clear product navigation and a "Find Your Match" quiz that recommends a sneaker based on the customer's activity, priority, and style.

The goal is to make sneaker shopping simple while giving merchants useful tools to manage inventory.

## 2. Embedded App Idea

SoleMatch Merchant Assistant is an embedded Shopify Admin app that helps merchants identify which products need inventory attention first.

The app calculates a Product Priority Score based on inventory levels:

* 0 inventory = Critical
* 1–3 units = Critical
* 4–8 units = Watchlist
* 9–15 units = Healthy
* More than 15 units = Healthy

The dashboard shows the highest-priority products first and provides recommendations for merchant action.

Merchants can also create restock rules with:

* Minimum inventory threshold
* Priority level
* Notes

The app also keeps an activity history so merchants can see inventory analysis and restock rule changes.

## 3. Architecture

The application uses:

* Shopify embedded app
* React Router
* Vite
* Node.js
* TypeScript
* Drizzle ORM
* MySQL
* Shopify Admin GraphQL API
* Shopify webhooks

The app uses Shopify authentication and embedded app navigation.

Inventory analysis retrieves product information from Shopify and synchronizes it into the application's MySQL database.

Shopify product create and update webhooks keep the local product data synchronized when product changes happen outside the app.

## 4. Database Design

The database contains the following related tables:

### shops

Stores the Shopify shop and access information.

### products

Stores synchronized Shopify product information including title, price, and inventory.

A composite unique constraint on shop ID and Shopify product ID prevents duplicate products for the same shop.

### inventorySnapshots

Stores inventory analysis results over time, including:

* Inventory level
* Priority score
* Status
* Timestamp

### restockRules

Stores merchant-created restock rules for products.

### activityLogs

Stores important merchant and system activity such as:

* Inventory analysis
* Product creation
* Product updates
* Restock rule updates

### sessions

Stores Shopify authentication session data for the embedded app.

## 5. Priority Scoring Logic

The priority score is intentionally simple and explainable.

Inventory of 0 results in a score of 100.

For other inventory levels:

* 1–3 units adds 70 points
* 4–8 units adds 45 points
* 9–15 units adds 20 points
* More than 15 units adds 0 points

Status is then calculated from the score:

* 70 or higher = Critical
* 40–69 = Watchlist
* Below 40 = Healthy

This approach makes the recommendation easy for a merchant to understand instead of hiding the decision behind a complicated algorithm.

## 6. Tradeoffs

### Simple scoring instead of a complex prediction model

A simple rule-based score was chosen because the assessment focuses on product thinking, usability, and clear business logic.

A machine-learning model would require more historical sales data and would make the result harder for a merchant to understand.

### Inventory-first logic

The first version focuses on inventory because it provides a clear and useful signal without requiring a large amount of historical order data.

A future version could incorporate:

* Sales velocity
* Recent orders
* Product demand
* Seasonal trends
* Supplier lead times

### Data-driven customer matching

The storefront includes a customer-facing product-matching quiz based on activity, priority, and style.

The quiz originally used product-specific JavaScript logic. This was changed to a data-driven approach using Shopify product metafields:

* `solematch.activity`
* `solematch.priority`
* `solematch.style`

The quiz calculates a match score using:

* Activity match = 50 points
* Priority match = 30 points
* Style match = 20 points

The highest-scoring product is presented as the customer's best match.

This approach keeps product configuration inside Shopify and separates product data from recommendation logic. It also allows new products to participate in the quiz without requiring changes to the quiz JavaScript, provided the required metafields are configured.

### Shopify as the source of truth

Shopify remains the source of truth for product and inventory information.

The application database is used for synchronization, historical snapshots, restock rules, and activity history.

## 7. What I Would Improve With More Time

With additional development time, I would add:

1. Sales velocity to the priority score.
2. Historical inventory charts.
3. Low-stock notifications.
4. More advanced restock recommendations.
5. Supplier lead-time support.
6. Bulk restock actions.
7. Date filters for activity history.
8. More detailed analytics for merchants.
9. Automated testing for scoring and webhook behavior.
10. Production deployment configuration and monitoring.

## 8. Product Thinking

The main product decision was to avoid making the merchant dashboard another generic inventory table.

Instead, the app answers a specific merchant question:

**"Which products should I pay attention to first?"**

The priority score, status badges, restock rules, and activity history are designed around that question.

This keeps the first version focused and gives the merchant an actionable workflow:

**Analyze → Prioritize → Create Restock Rule → Track Activity**
