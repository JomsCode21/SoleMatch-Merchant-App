import type { ActionFunctionArgs } from "react-router";
import { eq } from "drizzle-orm";

import { authenticate } from "../shopify.server";
import db from "../db.server";
import {
  shops,
  products,
  inventorySnapshots,
  activityLogs,
} from "../db/schema";

export const action = async ({ request }: ActionFunctionArgs) => {
  const { shop, topic, admin, payload } = await authenticate.webhook(request);

  console.log(`Received ${topic} webhook for ${shop}`);

  const shopRecord = await db.query.shops.findFirst({
    where: eq(shops.shopDomain, shop),
  });

  if (!shopRecord) {
    console.log(`Shop not found in database: ${shop}`);
    return new Response();
  }

  if (!admin) {
    console.log(`Admin API client unavailable for shop: ${shop}`);
    return new Response();
  }

  const productId = `gid://shopify/Product/${payload.id}`;

  const response = await admin.graphql(
    `#graphql
      query GetProduct($id: ID!) {
        product(id: $id) {
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
    `,
    {
      variables: {
        id: productId,
      },
    },
  );

  const data = await response.json();
  const product = data.data.product;

  if (!product) {
    console.log(`Product not found in Shopify: ${productId}`);
    return new Response();
  }

  const variants = product.variants.nodes;

  const inventory = variants.reduce(
    (total: number, variant: { inventoryQuantity: number | null }) =>
      total + (variant.inventoryQuantity ?? 0),
    0,
  );

  const price = variants[0]?.price ?? "0";

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
      shopId: shopRecord.id,
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

  const savedProduct = await db.query.products.findFirst({
    where: eq(products.shopifyProductId, product.id),
  });

  if (!savedProduct) {
    console.log(`Could not find saved product: ${product.id}`);
    return new Response();
  }

  await db.insert(inventorySnapshots).values({
    productId: savedProduct.id,
    inventory,
    priorityScore,
    status,
  });

  await db.insert(activityLogs).values({
    shopId: shopRecord.id,
    productId: savedProduct.id,
    action: "PRODUCT_UPDATED",
    description: `Product "${product.title}" was updated. Inventory: ${inventory}. Priority: ${status}.`,
  });

  console.log(
    `Updated product ${product.title}: inventory=${inventory}, score=${priorityScore}, status=${status}`,
  );

  return new Response();
};
