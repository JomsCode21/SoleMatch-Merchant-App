import {
  LoaderFunctionArgs,
  useLoaderData,
  useNavigation,
} from "react-router";
import { desc } from "drizzle-orm";

import { authenticate } from "../shopify.server";
import db from "../db.server";
import { activityLogs, products } from "../db/schema.js";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  await authenticate.admin(request);

  const logs = await db
    .select()
    .from(activityLogs)
    .orderBy(desc(activityLogs.createdAt));

  const productRows = await db.select().from(products);

  return {
    logs,
    products: productRows,
  };
};

const activityLabels: Record<string, string> = {
  INVENTORY_ANALYSIS: "Inventory analysis completed",
  RESTOCK_RULE_UPDATED: "Restock rule updated",
  PRODUCT_CREATED: "Product created",
  PRODUCT_UPDATED: "Product updated",
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

  if (action === "PRODUCT_CREATED") {
    return <s-badge tone="success">Product created</s-badge>;
  }

  if (action === "PRODUCT_UPDATED") {
    return <s-badge>Product updated</s-badge>;
  }

  return <s-badge>{activityLabels[action] ?? action}</s-badge>;
};

export default function History() {
  const { logs, products } = useLoaderData<typeof loader>();
  const navigation = useNavigation();

  const isLoading = navigation.state === "loading";

  return (
    <s-page heading="History">
      <s-section>
        <s-stack direction="block" gap="base">
          <s-heading>See what changed in your store.</s-heading>

          <s-paragraph>
            Review inventory analysis, restock rule updates, and product
            activity in one place.
          </s-paragraph>
        </s-stack>
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
            <s-stack direction="block" gap="small">
              {logs.map((log) => {
                const product = products.find(
                  (product) => product.id === log.productId,
                );

                return (
                  <s-box
                    key={log.id}
                    padding="base"
                    borderWidth="base"
                    borderRadius="base"
                  >
                    <s-stack direction="block" gap="small">
                      {activityBadge(log.action)}

                      <s-text>
                        {product?.title ?? "All products"}
                      </s-text>

                      <s-paragraph>
                        {activityDescriptions[log.action]?.(product?.title) ??
                          log.description}
                      </s-paragraph>

                      <s-text>
                        {log.createdAt.toLocaleString("en-PH", {
                          timeZone: "UTC",
                        })}
                      </s-text>
                    </s-stack>
                  </s-box>
                );
              })}
            </s-stack>
          )}
        </s-section>
      )}

      <s-section slot="aside" heading="What you'll find here">
        <s-stack direction="block" gap="small">
          <s-text>Inventory analysis</s-text>
          <s-text>Restock rule updates</s-text>
          <s-text>Product activity</s-text>

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
