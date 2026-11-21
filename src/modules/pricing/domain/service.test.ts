import { describe, expect, it } from "vitest";
import { serviceSlug, validateService, type ServiceDraft } from "./service";

const corte: ServiceDraft = { name: "Corte", priceCents: 1_800_000, durationMinutes: 30 };

describe("validateService (RF-13)", () => {
  it("acepta los servicios iniciales", () => {
    expect(validateService(corte, 15, ["Completo", "Claritos"]).ok).toBe(true);
    expect(validateService({ name: "Claritos", priceCents: 7_000_000, durationMinutes: 120 }, 15, []).ok).toBe(true);
  });

  it.each([0, -100])("rechaza el precio %d", (priceCents) => {
    expect(validateService({ ...corte, priceCents }, 15, [])).toEqual({
      ok: false,
      error: ["PRICE_NOT_POSITIVE"],
    });
  });

  it("rechaza un precio que no son centavos enteros", () => {
    expect(validateService({ ...corte, priceCents: 1800.5 }, 15, [])).toEqual({
      ok: false,
      error: ["PRICE_NOT_POSITIVE"],
    });
  });

  it.each([20, 40, 0, -30])("con paso de 15, rechaza la duración %d", (durationMinutes) => {
    expect(validateService({ ...corte, durationMinutes }, 15, [])).toEqual({
      ok: false,
      error: ["DURATION_NOT_MULTIPLE_OF_STEP"],
    });
  });

  it("acepta 20 minutos si el paso es de 10", () => {
    expect(validateService({ ...corte, durationMinutes: 20 }, 10, []).ok).toBe(true);
  });

  it("rechaza un nombre igual al de otro servicio activo, sin importar mayúsculas ni espacios", () => {
    expect(validateService({ ...corte, name: "  corte " }, 15, ["Corte"])).toEqual({
      ok: false,
      error: ["NAME_TAKEN"],
    });
  });

  it("informa todos los problemas juntos", () => {
    const result = validateService({ name: "Corte", priceCents: 0, durationMinutes: 25 }, 15, ["CORTE"]);
    expect(!result.ok && [...result.error].sort()).toEqual([
      "DURATION_NOT_MULTIPLE_OF_STEP",
      "NAME_TAKEN",
      "PRICE_NOT_POSITIVE",
    ]);
  });
});

describe("serviceSlug", () => {
  it.each([
    ["Corte", "corte"],
    ["Completo", "completo"],
    ["Corte de pelo", "corte-de-pelo"],
    ["  Barba & Cejas ", "barba-cejas"],
    ["Peinado niño", "peinado-nino"],
  ])("%j → %s", (name, slug) => {
    expect(serviceSlug(name)).toBe(slug);
  });
});
