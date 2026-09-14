import {
  ActionFunctionArgs,
  Form,
  LoaderFunctionArgs,
  useActionData,
  useLoaderData,
} from "react-router";
import { useState, useEffect } from "react";
import { authenticate } from "../shopify.server";
import db from "../db.server";
import { products, shops, restockRules, activityLogs } from "../db/schema.js";
import { eq } from "drizzle-orm";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  await authenticate.admin(request);

  const productRows = await db.select().from(products);
  const ruleRows = await db.select().from(restockRules);

  return {
    products: productRows,
    rules: ruleRows,
  };
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const { session } = await authenticate.admin(request);

  const formData = await request.formData();
  const intent = String(formData.get("intent") || "create");

  const shopResult = await db
    .select()
    .from(shops)
    .where(eq(shops.shopDomain, session.shop))
    .limit(1);

  const shop = shopResult[0];

  if (!shop) {
    throw new Error("Shop record not found. Please analyze inventory first.");
  }

  if (intent === "delete") {
    const ruleId = Number(formData.get("ruleId"));

    const ruleResult = await db
      .select()
      .from(restockRules)
      .where(eq(restockRules.id, ruleId))
      .limit(1);

    const deletedRule = ruleResult[0];

    if (deletedRule) {
      await db
        .delete(restockRules)
        .where(eq(restockRules.id, ruleId));

      await db.insert(activityLogs).values({
        shopId: shop.id,
        productId: deletedRule.productId,
        action: "RESTOCK_RULE_DELETED",
        description: `Restock rule deleted. Minimum inventory: ${deletedRule.minimumInventory}, priority: ${deletedRule.priority}, notes: ${deletedRule.notes || "No notes provided."}.`,
      });
    }

    return {
      success: true,
      message: "Restock rule deleted successfully.",
      action: "delete",
    };
  }

  if (intent === "update") {
    const ruleId = Number(formData.get("ruleId"));
    const minimumInventory = Number(formData.get("minimumInventory"));
    const priority = String(formData.get("priority"));
    const notes = String(formData.get("notes") || "");

    await db
      .update(restockRules)
      .set({
        minimumInventory,
        priority,
        notes,
        updatedAt: new Date(),
      })
      .where(eq(restockRules.id, ruleId));

    const ruleResult = await db
      .select()
      .from(restockRules)
      .where(eq(restockRules.id, ruleId))
      .limit(1);

    const updatedRule = ruleResult[0];

    if (updatedRule) {
      await db.insert(activityLogs).values({
        shopId: shop.id,
        productId: updatedRule.productId,
        action: "RESTOCK_RULE_UPDATED",
        description: `Restock rule updated. Minimum inventory: ${minimumInventory}, priority: ${priority}.`,
      });
    }

    return {
      success: true,
      message: "Restock rule updated successfully.",
      action: "update",
    };
  }

  const productId = String(formData.get("productId"));
  const minimumInventory = Number(formData.get("minimumInventory"));
  const priority = String(formData.get("priority"));
  const notes = String(formData.get("notes") || "");

  const productResult = await db
    .select()
    .from(products)
    .where(eq(products.shopifyProductId, productId))
    .limit(1);

  const product = productResult[0];

  if (!product) {
    throw new Error("Product not found.");
  }

  await db.insert(restockRules).values({
    productId: product.id,
    minimumInventory,
    priority,
    notes,
  });

  return {
    success: true,
    message: "Restock rule created successfully.",
    action: "create",
  };
};

export default function RestockRules() {
  const { products, rules } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const [showToast, setShowToast] = useState(false);
  const [editingRuleId, setEditingRuleId] = useState<number | null>(null);
  const [editMinimumInventory, setEditMinimumInventory] = useState("");
  const [editPriority, setEditPriority] = useState("");
  const [editNotes, setEditNotes] = useState("");

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
      {showToast && actionData?.message && (
        <div
          style={{
            position: "fixed",
            bottom: "24px",
            right: "24px",
            zIndex: 1000,
            padding: "12px 16px",
            borderRadius: "8px",
            background:
              actionData.action === "delete"
              ? "#d72c0d"
              : actionData.action === "create"
              ? "#008060"
              : "#2563eb",
            color: "#ffffff",
            boxShadow: "0 4px 12px rgba(0, 0, 0, 0.2)",
          }}
        >
          {actionData.message}
        </div>
      )}

      <s-page heading="Restock Rules"></s-page>
      <s-page heading="Restock Rules">
        <s-section>
          <s-stack direction="block" gap="base">
            <s-heading>Set your restock priorities.</s-heading>

            <s-paragraph>
              Create simple restock rules so you know when a sneaker needs
              attention. Set a minimum inventory level, choose a priority, and
              add a note for your team.
            </s-paragraph>
          </s-stack>
        </s-section>

        <s-section heading="Create a restock rule">
          <s-stack direction="block" gap="base">
            <s-paragraph>
              Choose a product and set the inventory level that should trigger a
              restock reminder.
            </s-paragraph>

            <Form method="post">
              <s-stack direction="block" gap="base">
                <s-select label="Product" name="productId">
                  {products.map((product) => (
                    <s-option
                      key={product.id}
                      value={product.shopifyProductId}
                    >
                      {product.title}
                    </s-option>
                  ))}
                </s-select>

                <s-number-field
                  label="Restock when inventory reaches"
                  name="minimumInventory"
                  min={0}
                  value="5"
                />

                <s-select label="Priority" name="priority">
                  <s-option value="low">Low</s-option>
                  <s-option value="medium">Medium</s-option>
                  <s-option value="high">High</s-option>
                </s-select>

                <s-text-area
                  label="Notes"
                  name="notes"
                  placeholder="Example: Restock before the weekend"
                />

                <s-button variant="primary" type="submit">
                  Save restock rule
                </s-button>
              </s-stack>
            </Form>
          </s-stack>
        </s-section>

        <s-section heading="Your restock rules">
          {rules.length === 0 ? (
            <s-box
              padding="base"
              borderWidth="base"
              borderRadius="base"
              background="subdued"
            >
              <s-stack direction="block" gap="small">
                <s-heading>No restock rules yet</s-heading>

                <s-paragraph>
                  Create your first rule above to define when a sneaker should
                  be considered for restocking.
                </s-paragraph>
              </s-stack>
            </s-box>
          ) : (
            <s-stack direction="block" gap="base">
              {rules.map((rule) => {
                const product = products.find(
                  (product) => product.id === rule.productId,
                );

                return (
                  <s-box
                    key={rule.id}
                    padding="base"
                    borderWidth="base"
                    borderRadius="base"
                  >
                    <s-stack direction="block" gap="base">
                      <s-stack direction="block" gap="small">
                        <s-heading>
                          {product?.title || "Unknown product"}
                        </s-heading>

                        <s-text>
                          Restock when inventory reaches{" "}
                          {rule.minimumInventory} units
                        </s-text>

                        <s-text>
                          Priority: {rule.priority}
                        </s-text>

                        <s-text>
                          {rule.notes || "No notes provided."}
                        </s-text>
                      </s-stack>

                      <s-button
                        tone="neutral"
                        onClick={() => {
                          if (editingRuleId === rule.id) {
                            setEditingRuleId(null);
                            return;
                          }

                          setEditingRuleId(rule.id);
                          setEditMinimumInventory(String(rule.minimumInventory));
                          setEditPriority(rule.priority);
                          setEditNotes(rule.notes || "");
                        }}
                      >
                        {editingRuleId === rule.id ? "Cancel" : "Update Rule"}
                      </s-button>

                      <Form method="post">
                        <input
                          type="hidden"
                          name="intent"
                          value="delete"
                        />

                        <input
                          type="hidden"
                          name="ruleId"
                          value={rule.id}
                        />

                        <s-button tone="critical" type="submit">
                          Delete Rule
                        </s-button>
                      </Form>

                      {editingRuleId === rule.id && (
                        <div style={{ marginTop: "16px" }}>
                          <Form method="post">
                            <input
                              type="hidden"
                              name="intent"
                              value="update"
                            />

                            <input
                              type="hidden"
                              name="ruleId"
                              value={rule.id}
                            />

                            <s-stack direction="block" gap="base">
                              <s-number-field
                                label="Restock when inventory reaches"
                                name="minimumInventory"
                                value={editMinimumInventory}
                                min={0}
                                onChange={(event) =>
                                  setEditMinimumInventory(event.currentTarget.value)
                                }
                              />

                              <s-select
                                label="Priority"
                                name="priority"
                                value={editPriority}
                                onChange={(event) =>
                                  setEditPriority(event.currentTarget.value)
                                }
                              >
                                <s-option value="low">Low</s-option>
                                <s-option value="medium">Medium</s-option>
                                <s-option value="high">High</s-option>
                              </s-select>

                              <s-text-area
                                label="Notes"
                                name="notes"
                                value={editNotes}
                                onChange={(event) =>
                                  setEditNotes(event.currentTarget.value)
                                }
                              />

                              <s-button variant="primary" type="submit">
                                Save Changes
                              </s-button>
                            </s-stack>
                          </Form>
                        </div>
                      )}
                    </s-stack>
                  </s-box>
                );
              })}
            </s-stack>
          )}
        </s-section>

        <s-section slot="aside" heading="How restock rules help">
          <s-stack direction="block" gap="small">
            <s-text>1. Choose a sneaker</s-text>
            <s-text>2. Set its inventory threshold</s-text>
            <s-text>3. Choose the priority</s-text>
            <s-text>4. Add context for your team</s-text>

            <s-divider />

            <s-paragraph>
              Restock rules give your team a consistent way to turn inventory
              levels into clear actions.
            </s-paragraph>
          </s-stack>
        </s-section>
      </s-page>
    </>
  );
}
