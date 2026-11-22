import { describe, expect, it } from "vitest";
import { moveService, serviceSlug, validateService, type ServiceDraft } from "./service";

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

  it("rechaza un precio con centavos (RF-3: los precios se muestran sin decimales)", () => {
    expect(validateService({ ...corte, priceCents: 1_800_050 }, 15, [])).toEqual({ ok: false, error: ["PRICE_HAS_CENTS"] });
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

describe("validateService, rangos de la spec 003 (RF-17)", () => {
  it("acepta los bordes: $ 1, $ 9.999.999, un paso y 10 h, nombre de 60 y descripción de 200", () => {
    expect(validateService({ ...corte, priceCents: 100, durationMinutes: 15 }, 15, []).ok).toBe(true);
    expect(validateService({ ...corte, priceCents: 999_999_900, durationMinutes: 600 }, 15, []).ok).toBe(true);
    expect(validateService({ ...corte, name: "x".repeat(60), description: "y".repeat(200) }, 15, []).ok).toBe(true);
  });

  it("rechaza precio, duración, nombre y descripción fuera de rango", () => {
    expect(validateService({ ...corte, priceCents: 1_000_000_000 }, 15, [])).toEqual({ ok: false, error: ["PRICE_TOO_HIGH"] });
    expect(validateService({ ...corte, durationMinutes: 615 }, 15, [])).toEqual({ ok: false, error: ["DURATION_OUT_OF_RANGE"] });
    expect(validateService({ ...corte, name: "   " }, 15, [])).toEqual({ ok: false, error: ["NAME_LENGTH"] });
    expect(validateService({ ...corte, name: "x".repeat(61) }, 15, [])).toEqual({ ok: false, error: ["NAME_LENGTH"] });
    expect(validateService({ ...corte, description: "y".repeat(201) }, 15, [])).toEqual({ ok: false, error: ["DESCRIPTION_TOO_LONG"] });
  });

  it("caso 9: ' corte ' choca con 'Corte' que se ofrece, pero no con uno sacado (no viene en la lista)", () => {
    expect(validateService({ ...corte, name: " corte " }, 15, ["Corte"]).ok).toBe(false);
    expect(validateService({ ...corte, name: " corte " }, 15, []).ok).toBe(true);
  });
});

describe("moveService (RF-18)", () => {
  const order = ["a", "b", "c"];
  it("sube y baja un servicio", () => {
    expect(moveService(order, "b", "up")).toEqual(["b", "a", "c"]);
    expect(moveService(order, "b", "down")).toEqual(["a", "c", "b"]);
  });
  it("en los extremos o con un id que no está, no cambia nada", () => {
    expect(moveService(order, "a", "up")).toEqual(order);
    expect(moveService(order, "c", "down")).toEqual(order);
    expect(moveService(order, "z", "up")).toEqual(order);
  });
});
