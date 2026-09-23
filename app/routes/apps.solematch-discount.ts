import type { LoaderFunctionArgs } from "react-router";
import { and, eq } from "drizzle-orm";

import { authenticate } from "../shopify.server";
import db from "../db.server";
import { discount, products, shops } from "../db/schema";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.public.appProxy(request);

  if(!session) {
    return Response.json(
      { success: false,
        message: "Shop session not found."
      },
      { status: 401 },
    );
  }

  const url = new URL(request.url);

  const productId = url.searchParams.get("product_id");

  if (!productId) {
    return Response.json(
      { success: false,
        message: "Product ID is required."
      },
      { status: 400 },
    );
  }

  const shopifyProductId = productId.startsWith("gid://")
    ? productId
    : `gid://shopify/Product/${productId}`;

  const shop = await db
    .select({ id: shops.id })
    .from(shops)
    .where(eq(shops.shopDomain, session.shop))
    .limit(1);

  if (!shop[0]) {
    return Response.json(
      { success: false, message: "Shop not found." },
      { status: 404 },
    );
  }

  const discounts = await db
    .select({
      discountCode: discount.discountCode,
      discountValue: discount.discountValue,
      expiresAt: discount.expiresAt,
      productTitle: products.title,
      shopifyProductId: products.shopifyProductId,
    })
    .from(discount)
    .innerJoin(products, eq(discount.productId, products.id))
    .where(
      and(
        eq(discount.shopId, shop[0].id),
        eq(products.shopifyProductId, shopifyProductId),
      ),
    )
    .limit(1);

  const item = discounts[0];

  if (!item || (item.expiresAt && item.expiresAt.getTime() <= Date.now())) {
    return Response.json({
      success: false,
      discount: null,
    });
  }

  return Response.json({
    success: true,
    discount: {
      code: item.discountCode,
      percentage: Number(item.discountValue),
      productTitle: item.productTitle,
      expiresAt: item.expiresAt,
    },
  });
};
