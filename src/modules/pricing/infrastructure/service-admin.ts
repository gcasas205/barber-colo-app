import type { Database } from "@/shared/db/client";
import { guarded } from "@/shared/db/guarded";
import type { ServiceAdmin } from "../application/ports";
import { serviceSlug } from "../domain/service";

const isId = (id: string) => /^\d{1,5}$/.test(id);
/** El índice único de nombres activos frenó el cambio (dos pestañas a la vez). */
const isNameTaken = (e: unknown) => (e as { code?: string }).code === "23505";
// Con `guarded`, la transacción sigue viva después del rechazo (si no, Kysely no puede confirmarla).

/** Escritura del catálogo (spec 003). `db` es la transacción que abre `src/server/settings.ts`. */
export function createServiceAdmin(db: Database): ServiceAdmin {
  return {
    async listAll() {
      const rows = await db
        .selectFrom("app.services")
        .select([
          "id",
          "name",
          "description",
          "duration_minutes",
          "price_cents",
          "counts_for_benefits",
          "position",
          "deactivated_at",
        ])
        .orderBy((eb) => eb("deactivated_at", "is not", null))
        .orderBy("position")
        .orderBy("id")
        .execute();
      return rows.map((r) => ({
        id: String(r.id),
        slug: serviceSlug(r.name),
        name: r.name,
        description: r.description,
        durationMinutes: r.duration_minutes,
        priceCents: r.price_cents,
        countsForBenefits: r.counts_for_benefits,
        position: r.position,
        active: r.deactivated_at === null,
      }));
    },

    async insert(input, position) {
      return guarded(
        db,
        async () => {
          const row = await db
            .insertInto("app.services")
            .values({
              name: input.name,
              description: input.description,
              duration_minutes: input.durationMinutes,
              price_cents: input.priceCents,
              counts_for_benefits: input.countsForBenefits,
              position,
            })
            .returning("id")
            .executeTakeFirstOrThrow();
          return String(row.id);
        },
        (e) => (isNameTaken(e) ? ("NAME_TAKEN" as const) : undefined),
      );
    },

    async update(id, input) {
      if (!isId(id)) return "NOT_FOUND";
      return guarded(
        db,
        async () => {
          const result = await db
            .updateTable("app.services")
            .set({
              name: input.name,
              description: input.description,
              duration_minutes: input.durationMinutes,
              price_cents: input.priceCents,
              counts_for_benefits: input.countsForBenefits,
            })
            .where("id", "=", Number(id))
            .executeTakeFirst();
          return Number(result.numUpdatedRows) > 0
            ? ("ok" as const)
            : ("NOT_FOUND" as const);
        },
        (e) => (isNameTaken(e) ? ("NAME_TAKEN" as const) : undefined),
      );
    },

    async setActive(id, active, position) {
      if (!isId(id)) return "NOT_FOUND";
      return guarded(
        db,
        async () => {
          const result = await db
            .updateTable("app.services")
            .set({
              deactivated_at: active ? null : new Date(),
              ...(position === null ? {} : { position }),
            })
            .where("id", "=", Number(id))
            .executeTakeFirst();
          return Number(result.numUpdatedRows) > 0
            ? ("ok" as const)
            : ("NOT_FOUND" as const);
        },
        (e) => (isNameTaken(e) ? ("NAME_TAKEN" as const) : undefined),
      );
    },

    async setOrder(ids) {
      for (const [i, id] of ids.entries()) {
        if (isId(id))
          await db
            .updateTable("app.services")
            .set({ position: i + 1 })
            .where("id", "=", Number(id))
            .execute();
      }
    },
  };
}
