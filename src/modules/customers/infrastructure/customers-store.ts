import { sql, type Selectable } from "kysely";
import type { Database } from "@/shared/db/client";
import type { AppCustomers } from "@/shared/db/types";
import { PhoneConflictError, type CustomerRow, type CustomersStore, type CustomersTx } from "../application/ports";
import type { PhoneE164 } from "../domain/phone";

const isUniqueViolation = (e: unknown) => (e as { code?: string })?.code === "23505";

function toRow(r: Selectable<AppCustomers>): CustomerRow {
  return {
    id: r.id,
    role: r.role,
    accountUserId: r.account_user_id,
    fullName: r.full_name,
    phone: r.phone_e164 as PhoneE164 | null,
    birthday: r.birth_day !== null && r.birth_month !== null ? { day: r.birth_day, month: r.birth_month } : null,
    nickname: r.nickname,
    isDemo: r.is_demo,
    createdAt: new Date(r.created_at),
  };
}

function tx(db: Database): CustomersTx {
  const active = () => db.selectFrom("app.customers").where("linked_to", "is", null).where("anonymized_at", "is", null);
  return {
    async lockPhoneOwner(phone) {
      const r = await active().selectAll().where("phone_e164", "=", phone).forUpdate().executeTakeFirst();
      return r ? toRow(r) : null;
    },
    async getCustomer(id) {
      const r = await db.selectFrom("app.customers").selectAll().where("id", "=", id).executeTakeFirst();
      return r ? toRow(r) : null;
    },
    async updateProfile(id, p) {
      try {
        await db
          .updateTable("app.customers")
          .set({
            full_name: p.fullName,
            phone_e164: p.phone,
            birth_day: p.birthday?.day ?? null,
            birth_month: p.birthday?.month ?? null,
            updated_at: sql`now()`,
          })
          .where("id", "=", id)
          .execute();
      } catch (e) {
        if (isUniqueViolation(e)) throw new PhoneConflictError();
        throw e;
      }
    },
    async linkGuest(guestId, holderId) {
      await db.updateTable("app.customers").set({ linked_to: holderId, updated_at: sql`now()` }).where("id", "=", guestId).execute();
    },
    async recordPhoneChange(c) {
      await db
        .insertInto("app.phone_changes")
        .values({ customer_id: c.customerId, old_phone: c.oldPhone, new_phone: c.newPhone, changed_by: c.changedBy })
        .execute();
    },
    async countGuestAttempts(ipHash, since) {
      const r = await db
        .selectFrom("app.guest_attempts")
        .select((eb) => eb.fn.countAll<string>().as("n"))
        .where("ip_hash", "=", ipHash)
        .where("attempted_at", ">=", since)
        .executeTakeFirstOrThrow();
      return Number(r.n);
    },
    async recordGuestAttempt(ipHash, at) {
      await db.insertInto("app.guest_attempts").values({ ip_hash: ipHash, attempted_at: at }).execute();
    },
    async createGuest(g) {
      try {
        const r = await db
          .insertInto("app.customers")
          .values({ role: "guest", registered_by: "self", full_name: g.fullName, phone_e164: g.phone })
          .returning("id")
          .executeTakeFirstOrThrow();
        return r.id;
      } catch (e) {
        if (isUniqueViolation(e)) throw new PhoneConflictError();
        throw e;
      }
    },
    async addGuestDevice(authUserId, customerId) {
      await db
        .insertInto("app.guest_devices")
        .values({ auth_user_id: authUserId, customer_id: customerId })
        .onConflict((oc) => oc.column("auth_user_id").doUpdateSet({ customer_id: customerId }))
        .execute();
    },
    async findDemoAccount(authUserId) {
      const r = await db.selectFrom("app.demo_accounts").select(["kind", "customer_id"]).where("auth_user_id", "=", authUserId).executeTakeFirst();
      return r ? { kind: r.kind, customerId: r.customer_id } : null;
    },
    async saveDemoAccount(authUserId, kind, customerId) {
      // Si la cuenta de prueba se volvió a crear en Supabase (otro id), se reemplaza la anterior.
      await db
        .insertInto("app.demo_accounts")
        .values({ auth_user_id: authUserId, kind, customer_id: customerId })
        .onConflict((oc) => oc.column("kind").doUpdateSet({ auth_user_id: authUserId, customer_id: customerId }))
        .execute();
    },
    async createDemoHolder(authUserId, fullName) {
      const r = await db
        .insertInto("app.customers")
        .values({ role: "holder", registered_by: "self", account_user_id: authUserId, full_name: fullName, is_demo: true })
        .returning("id")
        .executeTakeFirstOrThrow();
      return r.id;
    },
    async listCustomers(limit, after) {
      let q = active()
        .select(["id", "role", "full_name", "phone_e164", "nickname", "is_demo", "created_at"])
        .where("role", "<>", "dependent");
      if (after) q = q.where(sql<boolean>`(created_at, id) < (${after.createdAt}, ${after.id}::uuid)`);
      const rows = await q.orderBy("created_at", "desc").orderBy("id", "desc").limit(limit).execute();
      return rows.map((r) => ({
        id: r.id,
        role: r.role,
        fullName: r.full_name,
        phone: r.phone_e164 as PhoneE164 | null,
        nickname: r.nickname,
        isDemo: r.is_demo,
        createdAt: new Date(r.created_at),
      }));
    },
    async setNickname(customerId, nickname) {
      const r = await db
        .updateTable("app.customers")
        .set({ nickname, updated_at: sql`now()` })
        .where("id", "=", customerId)
        .returning("id")
        .executeTakeFirst();
      return !!r;
    },
  };
}

export function createCustomersStore(db: Database): CustomersStore {
  return { transaction: (fn) => db.transaction().execute((trx) => fn(tx(trx))) };
}
