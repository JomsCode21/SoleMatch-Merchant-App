import {
  ActionFunctionArgs,
  Form,
  LoaderFunctionArgs,
  useLoaderData,
} from "react-router";
import { useState } from "react";
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
  };
};

export default function RestockRules() {
  const { products, rules } = useLoaderData<typeof loader>();
  const [editingRuleId, setEditingRuleId] = useState<number | null>(null);
  const [editMinimumInventory, setEditMinimumInventory] = useState("");
  const [editPriority, setEditPriority] = useState("");
  const [editNotes, setEditNotes] = useState("");

  return (
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
                      variant="secondary"
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
  );
}
