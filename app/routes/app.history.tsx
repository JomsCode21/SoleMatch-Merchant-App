import {
  LoaderFunctionArgs,
  useLoaderData,
  useNavigation,
} from "react-router";
import { desc, eq } from "drizzle-orm";

import { authenticate } from "../shopify.server";
import db from "../db.server";
import { activityLogs, products, discount, shops } from "../db/schema.js";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);

  const shop = await db
    .select({ id: shops.id })
    .from(shops)
    .where(eq(shops.shopDomain, session.shop))
    .limit(1);

  const logs = await db
    .select()
    .from(activityLogs)
    .orderBy(desc(activityLogs.createdAt));

  const productRows = shop[0]
    ? await db
      .select()
      .from(products)
      .where(eq(products.shopId, shop[0].id))
    : [];

  const discounts = shop[0]
    ? await db
      .select({
        id: discount.id,
        productId: discount.productId,
        productTitle: products.title,
        discountCode: discount.discountCode,
        discountValue: discount.discountValue,
        createdAt: discount.createdAt,
      })
      .from(discount)
      .innerJoin(products, eq(discount.productId, products.id))
      .where(eq(discount.shopId, shop[0].id))
      .orderBy(desc(discount.createdAt))
    : [];

  return {
    logs,
    products: productRows,
    discounts,
  };
};

const activityLabels: Record<string, string> = {
  INVENTORY_ANALYSIS: "Inventory analysis completed",
  RESTOCK_RULE_UPDATED: "Restock rule updated",
  PRODUCT_CREATED: "Product created",
  PRODUCT_UPDATED: "Product updated",
  RESTOCK_RULE_DELETED: "Restock rule deleted",
};

const activityDescriptions: Record<
  string,
  (productTitle?: string) => string
> = {
  INVENTORY_ANALYSIS: () =>
    "Inventory was analyzed and priority scores were updated.",
  RESTOCK_RULE_UPDATED: (productTitle) =>
    `Restock rule updated${productTitle ? ` for ${productTitle}` : ""}.`,
  PRODUCT_CREATED: (productTitle) =>
    `Product added${productTitle ? `: ${productTitle}` : ""}.`,
  PRODUCT_UPDATED: (productTitle) =>
    `Product information updated${productTitle ? `: ${productTitle}` : ""}.`,
};

const activityBadge = (action: string) => {
  if (action === "INVENTORY_ANALYSIS") {
    return <s-badge tone="info">Inventory analysis completed</s-badge>;
  }

  if (action === "RESTOCK_RULE_UPDATED") {
    return <s-badge tone="caution">Restock rule updated</s-badge>;
  }

  if (action === "RESTOCK_RULE_DELETED") {
    return <s-badge tone="critical">Restock rule deleted</s-badge>
  }

  if (action === "PRODUCT_CREATED") {
    return <s-badge tone="success">Product created</s-badge>;
  }

  if (action === "PRODUCT_UPDATED") {
    return <s-badge>Product updated</s-badge>;
  }

  return <s-badge>{activityLabels[action] ?? action}</s-badge>;
};

export default function History() {
  const { logs, products, discounts } = useLoaderData<typeof loader>();
  const navigation = useNavigation();

  const isLoading = navigation.state === "loading";

  return (
    <s-page heading="History">
      <s-section>
        <s-stack direction="block" gap="base">
          <s-heading>See what changed in your store.</s-heading>

          <s-paragraph>
            Review inventory analysis, restock rule updates, product changes, and generated discounts in one place.
          </s-paragraph>
        </s-stack>
      </s-section>

      <s-section heading="Discount history">
        {discounts.length === 0 ? (
          <s-box
            padding="base"
            borderWidth="base"
            borderRadius="base"
            background="subdued"
          >
            <s-stack direction="block" gap="small">
              <s-heading>No discounts yet</s-heading>

              <s-paragraph>
                Generated product discounts will appear here.
              </s-paragraph>
            </s-stack>
          </s-box>
        ) : (
          <div
            style={{
              maxHeight: "500px",
              overflowY: "auto",
              border: "1px solid #e1e3e5",
              borderRadius: "8px",
            }}
          >
            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
              }}
            >
              <thead>
                <tr>
                  <th
                    style={{
                      textAlign: "left",
                      padding: "12px",
                      borderBottom: "1px solid #e1e3e5",
                    }}
                  >
                    Product
                  </th>
                  <th
                    style={{
                      textAlign: "left",
                      padding: "12px",
                      borderBottom: "1px solid #e1e3e5",
                    }}
                  >
                    Discount
                  </th>
                  <th
                    style={{
                      textAlign: "left",
                      padding: "12px",
                      borderBottom: "1px solid #e1e3e5",
                    }}
                  >
                    Code
                  </th>
                  <th
                    style={{
                      textAlign: "left",
                      padding: "12px",
                      borderBottom: "1px solid #e1e3e5",
                    }}
                  >
                    Created
                  </th>
                </tr>
              </thead>

              <tbody>
                {discounts.map((item) => (
                  <tr key={item.id}>
                    <td style={{ padding: "12px" }}>
                      {item.productTitle}
                    </td>

                    <td style={{ padding: "12px" }}>
                      <s-badge tone="success">
                        {item.discountValue}%
                      </s-badge>
                    </td>

                    <td style={{ padding: "12px" }}>
                      {item.discountCode}
                    </td>

                    <td style={{ padding: "12px" }}>
                      {item.createdAt.toLocaleString("en-PH", {
                        timeZone: "UTC",
                      })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </s-section>

      {isLoading ? (
        <s-section>
          <s-box
            padding="base"
            borderWidth="base"
            borderRadius="base"
            background="subdued"
          >
            <s-stack direction="block" gap="small">
              <s-heading>Loading activity</s-heading>

              <s-paragraph>
                Updating your activity history. Please wait a moment.
              </s-paragraph>
            </s-stack>
          </s-box>
        </s-section>
      ) : (
        <s-section heading="Activity history">
          {logs.length === 0 ? (
            <s-box
              padding="base"
              borderWidth="base"
              borderRadius="base"
              background="subdued"
            >
              <s-stack direction="block" gap="small">
                <s-heading>No activity yet</s-heading>

                <s-paragraph>
                  Activity will appear here after you analyze inventory or
                  update a restock rule.
                </s-paragraph>
              </s-stack>
            </s-box>
          ) : (
            <div
              style={{
                maxHeight: "500px",
                overflowY: "auto",
                border: "1px solid #e1e3e5",
                borderRadius: "8px",
              }}
            >
              <table
                style={{
                  width: "100%",
                  borderCollapse: "collapse",
                }}
              >
                <thead>
                  <tr>
                    <th
                      style={{
                        textAlign: "left",
                        padding: "12px",
                        borderBottom: "1px solid #e1e3e5",
                      }}
                    >
                      Action
                    </th>

                    <th
                      style={{
                        textAlign: "left",
                        padding: "12px",
                        borderBottom: "1px solid #e1e3e5",
                      }}
                    >
                      Product
                    </th>

                    <th
                      style={{
                        textAlign: "left",
                        padding: "12px",
                        borderBottom: "1px solid #e1e3e5",
                      }}
                    >
                      Description
                    </th>

                    <th
                      style={{
                        textAlign: "left",
                        padding: "12px",
                        borderBottom: "1px solid #e1e3e5",
                      }}
                    >
                      Created
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {logs.map((log) => {
                    const product = products.find(
                      (product) => product.id === log.productId,
                    );

                    return (
                      <tr key={log.id}>
                        <td style={{ padding: "12px" }}>
                          {activityBadge(log.action)}
                        </td>

                        <td style={{ padding: "12px" }}>
                          {product?.title ?? "All products"}
                        </td>

                        <td style={{ padding: "12px" }}>
                          {activityDescriptions[log.action]?.(product?.title) ??
                            log.description}
                        </td>

                        <td style={{ padding: "12px" }}>
                          {log.createdAt.toLocaleString("en-PH", {
                            timeZone: "UTC",
                          })}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </s-section>
      )}

      <s-section slot="aside" heading="What you'll find here">
        <s-stack direction="block" gap="small">
          <s-text>Inventory analysis</s-text>
          <s-text>Restock rule updates</s-text>
          <s-text>Product changes</s-text>
          <s-text>Generated discounts</s-text>

          <s-divider />

          <s-paragraph>
            Activities are shown with the newest events first, making it easy
            to review the latest changes to your inventory workflow.
          </s-paragraph>
        </s-stack>
      </s-section>
    </s-page>
  );
}
