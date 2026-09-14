import type {
  ActionFunctionArgs,
  HeadersFunction,
  LoaderFunctionArgs,
} from "react-router";
import { Form, useActionData, useLoaderData } from "react-router";
import { authenticate } from "../shopify.server";
import { boundary } from "@shopify/shopify-app-react-router/server";
import db from "../db.server";
import { eq } from "drizzle-orm";
import { products, shops, inventorySnapshots, activityLogs } from "../db/schema.js";
import { useState, useEffect } from "react";

export const action = async ({ request }: ActionFunctionArgs) => {
  const { admin, session } = await authenticate.admin(request);

  const response = await admin.graphql(`
    #graphql
    query {
      products(first: 50) {
        nodes {
          id
          title
          variants(first: 20) {
            nodes {
              price
              inventoryQuantity
            }
          }
        }
      }
    }
  `);

  const data = await response.json();

  const shopResult = await db
    .select()
    .from(shops)
    .where(eq(shops.shopDomain, session.shop))
    .limit(1);

  let shop = shopResult[0];

  if (!shop) {
    const inserted = await db.insert(shops).values({
      shopDomain: session.shop,
      accessToken: session.accessToken ?? "",
    });

    const newShopId = inserted[0].insertId;

    const newShopResult = await db
      .select()
      .from(shops)
      .where(eq(shops.id, Number(newShopId)))
      .limit(1);

    shop = newShopResult[0];
  }

  if (!shop) {
    throw new Error("Unable to create or find shop record");
  }

  for (const product of data.data.products.nodes) {
    const inventory = product.variants.nodes.reduce(
      (total: number, variant: { inventoryQuantity: number | null }) =>
        total + (variant.inventoryQuantity ?? 0),
      0,
    );

    const price = product.variants.nodes[0]?.price ?? "0";

    let priorityScore = 0;

    if (inventory <= 3) {
      priorityScore += 70;
    } else if (inventory <= 8) {
      priorityScore += 45;
    } else if (inventory <= 15) {
      priorityScore += 20;
    }

    if (inventory === 0) {
      priorityScore = 100;
    }

    let status = "Healthy";

    if (priorityScore >= 70) {
      status = "Critical";
    } else if (priorityScore >= 40) {
      status = "Watchlist";
    }

    await db
      .insert(products)
      .values({
        shopId: shop.id,
        shopifyProductId: product.id,
        title: product.title,
        price,
        inventory,
      })
      .onDuplicateKeyUpdate({
        set: {
          title: product.title,
          price,
          inventory,
          updatedAt: new Date(),
        },
      });

    const productResult = await db
      .select()
      .from(products)
      .where(eq(products.shopifyProductId, product.id))
      .limit(1);

    const savedProduct = productResult[0];

    if (savedProduct) {
      await db.insert(inventorySnapshots).values({
        productId: savedProduct.id,
        inventory,
        priorityScore,
        status,
      });
    }
  }

  await db.insert(activityLogs).values({
    shopId: shop.id,
    action: "INVENTORY_ANALYSIS",
    description: "Inventory analysis completed for all products",
  });

  return {
    success: true,
    message: "Products synchronized successfully",
  };
};

export const loader = async ({ request }: LoaderFunctionArgs) => {
  await authenticate.admin(request);

  const productRows = await db.select().from(products);

  const analyzedProducts = productRows.map((product) => {
    const inventory = product.inventory;

    let priorityScore = 0;

    if (inventory <= 3) {
      priorityScore += 70;
    } else if (inventory <= 8) {
      priorityScore += 45;
    } else if (inventory <= 15) {
      priorityScore += 20;
    }

    if (inventory === 0) {
      priorityScore = 100;
    }

    let status = "Healthy";

    if (priorityScore >= 70) {
      status = "Critical";
    } else if (priorityScore >= 40) {
      status = "Watchlist";
    }

    return {
      ...product,
      priorityScore,
      status,
    };
  });

  const criticalCount = analyzedProducts.filter(
    (product) => product.status === "Critical",
  ).length;

  const watchlistCount = analyzedProducts.filter(
    (product) => product.status === "Watchlist",
  ).length;

  const healthyCount = analyzedProducts.filter(
    (product) => product.status === "Healthy",
  ).length;

  const topPriorities = [...analyzedProducts]
    .sort((a, b) => b.priorityScore - a.priorityScore)
    .slice(0, 5);

  return {
    criticalCount,
    watchlistCount,
    healthyCount,
    topPriorities,
  };
};

export default function Index() {
  const data = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const [showToast, setShowToast] = useState(false);

  useEffect(() => {
    if (actionData?.success) {
      setShowToast(true);

      const timer = setTimeout(() => {
        setShowToast(false);
      }, 5000);

      return () => clearTimeout(timer);
    }
  }, [actionData]);


  const statusBadge = (status: string) => {
    if (status === "Critical") {
      return <s-badge tone="critical">Critical</s-badge>;
    }

    if (status === "Watchlist") {
      return <s-badge tone="caution">Watchlist</s-badge>;
    }

    return <s-badge tone="success">Healthy</s-badge>;
  };

  return (
    <s-page heading="SoleMatch Merchant Assistant">
      <s-section>
        <s-stack direction="block" gap="base">
          <s-heading>Know which sneakers need attention first.</s-heading>

          <s-paragraph>
            SoleMatch turns your store inventory into a simple restock
            priority list, so you can focus on the products that need action.
          </s-paragraph>

          <Form method="post">
            <s-button variant="primary" type="submit">
              Analyze inventory
            </s-button>
          </Form>
        </s-stack>
      </s-section>

      <s-section heading="Inventory overview">
        <s-stack direction="inline" gap="base">
          <s-box
            padding="base"
            borderWidth="base"
            borderRadius="base"
            background="subdued"
          >
            <s-stack direction="block" gap="small">
              {statusBadge("Critical")}
              <s-heading>{data.criticalCount}</s-heading>
              <s-text>Restock soon</s-text>
            </s-stack>
          </s-box>

          <s-box
            padding="base"
            borderWidth="base"
            borderRadius="base"
            background="subdued"
          >
            <s-stack direction="block" gap="small">
              {statusBadge("Watchlist")}
              <s-heading>{data.watchlistCount}</s-heading>
              <s-text>Keep an eye on</s-text>
            </s-stack>
          </s-box>

          <s-box
            padding="base"
            borderWidth="base"
            borderRadius="base"
            background="subdued"
          >
            <s-stack direction="block" gap="small">
              {statusBadge("Healthy")}
              <s-heading>{data.healthyCount}</s-heading>
              <s-text>No immediate action</s-text>
            </s-stack>
          </s-box>
        </s-stack>
      </s-section>

      <s-section heading="Top restock priorities">
        <s-stack direction="block" gap="base">
          <s-paragraph>
            Products are ranked by inventory risk, with the highest-priority
            items shown first.
          </s-paragraph>

          {data.topPriorities.length === 0 ? (
            <s-box
              padding="base"
              borderWidth="base"
              borderRadius="base"
              background="subdued"
            >
              <s-stack direction="block" gap="small">
                <s-heading>No products analyzed yet</s-heading>

                <s-paragraph>
                  Click Analyze inventory to sync your Shopify products and
                  calculate restock priorities.
                </s-paragraph>
              </s-stack>
            </s-box>
          ) : (
            <s-stack direction="block" gap="small">
              {data.topPriorities.map((product, index) => (
                <s-box
                  key={product.id}
                  padding="base"
                  borderWidth="base"
                  borderRadius="base"
                >
                  <s-stack direction="block" gap="small">
                    <s-stack direction="inline" gap="base">
                      <s-heading>
                        {index + 1}. {product.title}
                      </s-heading>

                      {statusBadge(product.status)}
                    </s-stack>

                    <s-stack direction="inline" gap="base">
                      <s-text>{product.inventory} units</s-text>

                      <s-text>
                        Score {product.priorityScore}/100
                      </s-text>
                    </s-stack>

                    <s-text>
                      {product.status === "Critical"
                        ? "Immediate restock attention recommended."
                        : product.status === "Watchlist"
                          ? "Inventory is getting low. Consider planning a restock."
                          : "Inventory is currently at a healthy level."}
                    </s-text>
                  </s-stack>
                </s-box>
              ))}
            </s-stack>
          )}
        </s-stack>
      </s-section>

      <s-section heading="Priority score">
        <details>
          <summary>How does the priority score work?</summary>

          <div style={{ marginTop: "16px" }}>
            <s-stack direction="block" gap="small">
              <s-paragraph>
                SoleMatch uses inventory levels to calculate a priority score
                from 0 to 100.
              </s-paragraph>

              <s-unordered-list>
                <s-list-item>
                  Critical — highest restock urgency
                </s-list-item>

                <s-list-item>
                  Watchlist — inventory should be monitored
                </s-list-item>

                <s-list-item>
                  Healthy — no immediate restock concern
                </s-list-item>
              </s-unordered-list>

              <s-paragraph>
                The goal is simple: help merchants decide what deserves
                attention first instead of manually checking every product.
              </s-paragraph>
            </s-stack>
          </div>
        </details>
      </s-section>

      <s-section slot="aside" heading="Merchant workflow">
        <s-stack direction="block" gap="small">
          <s-text>1. Analyze inventory</s-text>
          <s-text>2. Review restock priorities</s-text>
          <s-text>3. Create or update restock rules</s-text>
          <s-text>4. Review activity history</s-text>

          <s-divider />

          <s-paragraph>
            SoleMatch keeps your inventory analysis, restock rules, and
            activity history connected in one place.
          </s-paragraph>
        </s-stack>
      </s-section>

      {showToast && (
        <div
          style={{
            position: "fixed",
            bottom: "24px",
            right: "24px",
            background: "#2563eb",
            color: "white",
            padding: "14px 20px",
            borderRadius: "8px",
            boxShadow: "0 4px 12px rgba(0, 0, 0, 0.2)",
            zIndex: 1000,
            fontWeight: 500,
          }}
        >
          {actionData?.message}
        </div>
      )}

    </s-page>
  );
}


export const headers: HeadersFunction = (headersArgs) => {
  return boundary.headers(headersArgs);
};
