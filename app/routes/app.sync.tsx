import type { ActionFunctionArgs } from "react-router";
import { authenticate } from "../shopify.server";
import db from "../db.server";
import { shops, products } from "../db/schema.js";
import { eq } from "drizzle-orm";

export const action = async ({ request }: ActionFunctionArgs) => {
  const { admin, session } = await authenticate.admin(request);

  const response = await admin.graphql(`
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
  }

  return {
    success: true,
    message: "Products synchronized successfully",
  };
};

export default function SyncPage() {
  return (
    <s-page heading="Sync Products">
      <s-section>
        <s-paragraph>
          Product synchronization is ready.
        </s-paragraph>
      </s-section>
    </s-page>
  );
}
