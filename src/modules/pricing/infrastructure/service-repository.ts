import type { Database } from "@/shared/db/client";
import type { ServiceCatalog } from "../application/ports";
import { serviceSlug, type Service } from "../domain/service";

export function createServiceCatalog(db: Database): ServiceCatalog {
  return {
    async listActive(): Promise<Service[]> {
      const rows = await db
        .selectFrom("app.services")
        .select(["id", "name", "description", "duration_minutes", "price_cents", "counts_for_benefits", "position"])
        .where("deactivated_at", "is", null)
        .orderBy("position")
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
      }));
    },
  };
}
