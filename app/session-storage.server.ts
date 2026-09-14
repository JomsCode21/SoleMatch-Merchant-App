import { Session } from "@shopify/shopify-api";
import type { SessionStorage } from "@shopify/shopify-app-session-storage";
import { eq, inArray } from "drizzle-orm";

import db from "./db.server";
import { sessions } from "../app/db/schema";

export class DrizzleSessionStorage implements SessionStorage {
  async storeSession(session: Session): Promise<boolean> {
    await db
      .insert(sessions)
      .values({
        id: session.id,
        shop: session.shop,
        state: session.state,
        isOnline: session.isOnline ? 1 : 0,
        scope: session.scope ?? null,
        expires: session.expires ?? null,
        accessToken: session.accessToken ?? null,
        userId: session.onlineAccessInfo?.associated_user?.id?.toString() ?? null,
        firstName: session.onlineAccessInfo?.associated_user?.first_name ?? null,
        lastName: session.onlineAccessInfo?.associated_user?.last_name ?? null,
        email: session.onlineAccessInfo?.associated_user?.email ?? null,
        accountOwner: session.onlineAccessInfo?.associated_user?.account_owner ? 1 : 0,
        locale: session.onlineAccessInfo?.associated_user?.locale ?? null,
        collaborator: session.onlineAccessInfo?.associated_user?.collaborator ? 1 : 0,
        emailVerified: session.onlineAccessInfo?.associated_user?.email_verified ? 1 : 0,
      })
      .onDuplicateKeyUpdate({
        set: {
          shop: session.shop,
          state: session.state,
          isOnline: session.isOnline ? 1 : 0,
          scope: session.scope ?? null,
          expires: session.expires ?? null,
          accessToken: session.accessToken ?? null,
        },
      });

    return true;
  }

  async loadSession(id: string): Promise<Session | undefined> {
    const result = await db
      .select()
      .from(sessions)
      .where(eq(sessions.id, id))
      .limit(1);

    const row = result[0];

    if (!row) {
      return undefined;
    }

    return new Session({
      id: row.id,
      shop: row.shop,
      state: row.state,
      isOnline: Boolean(row.isOnline),
      scope: row.scope ?? undefined,
      expires: row.expires ?? undefined,
      accessToken: row.accessToken ?? undefined,
      onlineAccessInfo: row.userId
        ? {
          expires_in: 0,
          associated_user_scope: row.scope ?? "",
          associated_user: {
            id: Number(row.userId),
            first_name: row.firstName ?? "",
            last_name: row.lastName ?? "",
            email: row.email ?? "",
            account_owner: Boolean(row.accountOwner),
            locale: row.locale ?? "",
            collaborator: Boolean(row.collaborator),
            email_verified: Boolean(row.emailVerified),
          },
        }
        : undefined,
    });
  }

  async deleteSession(id: string): Promise<boolean> {
    await db.delete(sessions).where(eq(sessions.id, id));
    return true;
  }

  async deleteSessions(ids: string[]): Promise<boolean> {
    if (ids.length === 0) {
      return true;
    }

    await db.delete(sessions).where(inArray(sessions.id, ids));
    return true;
  }

  async findSessionsByShop(shop: string): Promise<Session[]> {
    const rows = await db
      .select()
      .from(sessions)
      .where(eq(sessions.shop, shop));

    return rows.map(
      (row) =>
        new Session({
          id: row.id,
          shop: row.shop,
          state: row.state,
          isOnline: Boolean(row.isOnline),
          scope: row.scope ?? undefined,
          expires: row.expires ?? undefined,
          accessToken: row.accessToken ?? undefined,
        }),
    );
  }
}
