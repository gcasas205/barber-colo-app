import type { Database } from "@/shared/db/client";
import type { IdentityRepository, StoredIdentity } from "../application/resolve-session";

export function createIdentityRepository(db: Database): IdentityRepository {
  return {
    async load(userId): Promise<StoredIdentity> {
      const [demo, device, holder, activity] = await Promise.all([
        db.selectFrom("app.demo_accounts").select(["kind", "customer_id"]).where("auth_user_id", "=", userId).executeTakeFirst(),
        db.selectFrom("app.guest_devices").select("customer_id").where("auth_user_id", "=", userId).executeTakeFirst(),
        db
          .selectFrom("app.customers")
          .select(["id", "phone_e164"])
          .where("account_user_id", "=", userId)
          .where("role", "=", "holder")
          .executeTakeFirst(),
        db.selectFrom("app.user_activity").select("last_seen_at").where("auth_user_id", "=", userId).executeTakeFirst(),
      ]);
      return {
        demoAccount: demo ? { kind: demo.kind, customerId: demo.customer_id } : null,
        guestDevice: device ? { customerId: device.customer_id } : null,
        holder: holder ? { customerId: holder.id, profileComplete: holder.phone_e164 !== null } : null,
        lastSeenAt: activity ? new Date(activity.last_seen_at) : null,
      };
    },
    async touch(userId, at) {
      await db
        .insertInto("app.user_activity")
        .values({ auth_user_id: userId, last_seen_at: at })
        .onConflict((oc) => oc.column("auth_user_id").doUpdateSet({ last_seen_at: at }))
        .execute();
    },
  };
}
