import { authenticate } from "../shopify.server";
import db from "../db.server";
import { discount, products, shops } from "../db/schema.js";
import { and, eq } from "drizzle-orm";
import { Form, useActionData, useLoaderData } from "react-router";
import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";
import { useEffect, useState } from "react";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const shop = await db
    .select({ id: shops.id })
    .from(shops)
    .where(eq(shops.shopDomain, session.shop))
    .limit(1);

  return {
    products: shop[0]
      ? await db
        .select({
          id: products.id,
          shopifyProductId: products.shopifyProductId,
          title: products.title,
        })
        .from(products)
        .where(eq(products.shopId, shop[0].id))
      : [],
  };
};

const createDiscountCode = () =>
  `SOLE-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;

export const action = async ({ request }: ActionFunctionArgs) => {
  const { admin, session } = await authenticate.admin(request);
  const formData = await request.formData();
  const productId = Number(formData.get("productId"));
  const discountValue = Number(formData.get("discountValue"));
  const expiresDate = String(formData.get("expiresDate") || "");
  const expiresTime = String(formData.get("expiresTime") || "");

  if (
    !Number.isInteger(productId) ||
    !Number.isFinite(discountValue) ||
    !Number.isInteger(discountValue) ||
    discountValue < 1 ||
    discountValue > 100 ||
    !expiresDate ||
    !expiresTime
  ) {
    return {
      success: false,
      message: "Enter a valid discount value, expiration date, expiration time, and choose a product.",
    };
  }

  const expiresAt = new Date(`${expiresDate}T${expiresTime}:00`);

  if (Number.isNaN(expiresAt.getTime())) {
    return {
      success: false,
      message: "Enter a valid expiration date and time."
    };
  }
  if (expiresAt.getTime() <= Date.now()) {
    return {
      success: false,
      message: "Expiration date and time must be in the future."
    };
  }

  const shop = await db
    .select()
    .from(shops)
    .where(eq(shops.shopDomain, session.shop))
    .limit(1);
  const product = shop[0]
    ? await db
      .select()
      .from(products)
      .where(and(eq(products.id, productId), eq(products.shopId, shop[0].id)))
      .limit(1)
    : [];

  if (!shop[0] || !product[0]) {
    return { success: false, message: "Select a product from your synced catalog." };
  }

  const code = createDiscountCode();
  const value = {
    percentage: discountValue / 100,
  };

  const response = await admin.graphql(
    `#graphql
			mutation CreateProductDiscount($discount: DiscountCodeBasicInput!) {
				discountCodeBasicCreate(basicCodeDiscount: $discount) {
					codeDiscountNode {
            codeDiscount {
              ... on DiscountCodeBasic {
                codes(first: 1) {
                  nodes {
                    code
                  }
                }
              }
            }
          }
					userErrors {
            field message
          }
				}
			}`,
    {
      variables: {
        discount: {
          title: code,
          code,
          startsAt: new Date().toISOString(),
          endsAt: expiresAt.toISOString(),
          customerSelection: { all: true },
          customerGets: {
            value,
            items: { products: { productsToAdd: [product[0].shopifyProductId] } },
          },
        },
      },
    },
  );
  const result = await response.json();
  const userErrors = result.data?.discountCodeBasicCreate?.userErrors ?? [];

  if (userErrors.length > 0) {
    return { success: false, message: userErrors[0].message };
  }

  await db.insert(discount).values({
    shopId: shop[0].id,
    productId: product[0].id,
    discountCode: code,
    discountType: "percentage",
    discountValue: String(discountValue),
    expiresAt: expiresAt,
  });

  return {
    success: true,
    message: `Discount ${code} created for ${product[0].title}.`,
    code,
    expiresAt: expiresAt.toISOString(),
  };
};



export default function DiscountGenerator() {
  const { products } = useLoaderData<typeof loader>();
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

  return (
    <>

      {showToast && actionData?.success && (
        <div
          style={{
            position: "fixed",
            bottom: "24px",
            right: "24px",
            zIndex: 1000,
            padding: "12px 16px",
            borderRadius: "8px",
            background: "#008060",
            color: "#ffffff",
            boxShadow: "0 4px 12px rgba(0, 0, 0, 0.2)",
          }}
        >
          {actionData.message}
        </div>
      )}
      <s-page heading="Discount generator">
        <s-section>
          <s-stack direction="block" gap="base">
            <s-heading>Create a product discount</s-heading>
            <s-paragraph>
              Generate a Shopify discount code for one product with a custom percentage and expiration date.
            </s-paragraph>
            <Form method="post">
              <s-stack direction="block" gap="base">
                <s-select label="Product" name="productId" required>
                  <s-option value="">Choose a product</s-option>

                  {products.map((product) => (
                    <s-option key={product.id} value={String(product.id)}>
                      {product.title}
                    </s-option>
                  ))}
                </s-select>

                <s-number-field
                  label="Discount percentage"
                  name="discountValue"
                  min={1}
                  max={100}
                  step={1}
                  required
                />

                <s-date-field
                  label="Expiration date"
                  name="expiresDate"
                  required
                />

                <div>
                  <label
                    htmlFor="expiresTime"
                    style={{
                      display: "block",
                      marginBottom: "6px",
                      fontWeight: 500,
                    }}
                  >
                    Expiration time
                  </label>

                  <input
                    id="expiresTime"
                    type="time"
                    name="expiresTime"
                    required
                    style={{
                      width: "100%",
                      padding: "10px 12px",
                      border: "1px solid #8c9196",
                      borderRadius: "6px",
                      fontSize: "14px",
                      boxSizing: "border-box",
                    }}
                  />
                </div>

                <s-button
                  variant="primary"
                  type="submit"
                  disabled={products.length === 0}
                >
                  Generate discount
                </s-button>
              </s-stack>
            </Form>

            {actionData && !actionData.success && (
              <s-banner tone="critical">
                {actionData.message}
              </s-banner>
            )}

            {actionData?.success && actionData.code && (
              <s-section heading="Generated discount">
                <s-stack direction="block" gap="small">
                  <s-text>Discount code</s-text>

                  <s-heading>{actionData.code}</s-heading>

                  <s-text>
                    Use this code to apply the discount to the selected product.
                  </s-text>

                  {actionData.expiresAt && (
                    <s-text>
                      Expires:{" "}
                      {new Date(actionData.expiresAt).toLocaleDateString(
                        "en-PH",
                        {
                          year: "numeric",
                          month: "long",
                          day: "numeric",
                          hour: "numeric",
                          minute: "2-digit",
                        },
                      )}
                    </s-text>
                  )}
                </s-stack>
              </s-section>
            )}
          </s-stack>
        </s-section>
      </s-page>
    </>
  );
}


