import { describe, expect, it } from "vitest";
import type { Service } from "../domain/service";
import { listServices } from "./list-services";

const service = (name: string, position: number): Service => ({
  id: String(position),
  slug: name.toLowerCase(),
  name,
  description: "",
  durationMinutes: 30,
  priceCents: 1_800_000,
  countsForBenefits: true,
  position,
});

describe("listServices", () => {
  it("devuelve los servicios activos en orden", async () => {
    const catalog = { listActive: async () => [service("Claritos", 3), service("Corte", 1), service("Completo", 2)] };
    expect((await listServices({ catalog })).map((s) => s.name)).toEqual(["Corte", "Completo", "Claritos"]);
  });

  it("devuelve una lista vacía si no hay servicios activos (RF-2b)", async () => {
    expect(await listServices({ catalog: { listActive: async () => [] } })).toEqual([]);
  });
});
