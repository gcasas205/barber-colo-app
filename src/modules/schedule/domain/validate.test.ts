import { describe, expect, it } from "vitest";
import type { WeeklyRange } from "./schedule";
import { validateBlock, validateSchedule } from "./validate";

const r = (weekday: WeeklyRange["weekday"], opens: string, closes: string): WeeklyRange => {
  const m = (t: string) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3));
  return { weekday, opensAt: m(opens), closesAt: m(closes) };
};

// Configuración inicial de la spec: lunes a sábado 10–13 y 14–20, paso de 15.
const initial: WeeklyRange[] = [1, 2, 3, 4, 5, 6].flatMap((d) => [
  r(d as WeeklyRange["weekday"], "10:00", "13:00"),
  r(d as WeeklyRange["weekday"], "14:00", "20:00"),
]);

describe("validateSchedule (RF-12)", () => {
  it("acepta la configuración inicial", () => {
    expect(validateSchedule(initial, 15)).toEqual({ ok: true, value: undefined });
  });

  it("acepta franjas que se tocan en el borde (13:00 a 13:00)", () => {
    expect(validateSchedule([r(1, "10:00", "13:00"), r(1, "13:00", "20:00")], 15).ok).toBe(true);
  });

  it("acepta un día sin franjas y franjas iguales en días distintos", () => {
    expect(validateSchedule([r(1, "10:00", "13:00"), r(2, "10:00", "13:00")], 15).ok).toBe(true);
    expect(validateSchedule([], 15).ok).toBe(true);
  });

  it("rechaza dos franjas del mismo día que se superponen, aunque vengan desordenadas", () => {
    const result = validateSchedule([r(3, "14:00", "20:00"), r(3, "10:00", "14:30")], 15);
    expect(result).toEqual({ ok: false, error: [{ code: "RANGES_OVERLAP", weekday: 3 }] });
  });

  it("rechaza una franja contenida dentro de otra", () => {
    expect(validateSchedule([r(2, "10:00", "20:00"), r(2, "12:00", "13:00")], 15)).toMatchObject({
      ok: false,
      error: [{ code: "RANGES_OVERLAP", weekday: 2 }],
    });
  });

  it.each([
    ["cierra antes de abrir", "13:00", "10:00"],
    ["cierra a la misma hora", "10:00", "10:00"],
  ])("rechaza una franja que %s", (_, opens, closes) => {
    expect(validateSchedule([r(4, opens, closes)], 15)).toEqual({
      ok: false,
      error: [{ code: "RANGE_INVERTED", weekday: 4 }],
    });
  });

  it("rechaza minutos fuera del día", () => {
    expect(validateSchedule([{ weekday: 1, opensAt: 600, closesAt: 1500 }], 15)).toEqual({
      ok: false,
      error: [{ code: "RANGE_OUT_OF_DAY", weekday: 1 }],
    });
  });

  it.each([5, 10, 15, 20, 30, 60])("acepta el paso de %d minutos", (step) => {
    expect(validateSchedule(initial, step).ok).toBe(true);
  });

  it.each([0, 7, 25, 45, 90, 12.5, -15])("rechaza el paso de %d minutos", (step) => {
    expect(validateSchedule(initial, step)).toEqual({ ok: false, error: [{ code: "STEP_INVALID" }] });
  });

  it("informa todos los problemas juntos", () => {
    const result = validateSchedule([r(1, "13:00", "10:00"), r(2, "10:00", "14:00"), r(2, "13:00", "20:00")], 7);
    expect(result.ok).toBe(false);
    expect(!result.ok && result.error.map((e) => e.code).sort()).toEqual([
      "RANGES_OVERLAP",
      "RANGE_INVERTED",
      "STEP_INVALID",
    ]);
  });
});

describe("validateBlock (RF-14)", () => {
  const at = (iso: string) => new Date(iso);

  it("acepta un bloqueo de una hora y uno de varios días", () => {
    expect(validateBlock({ start: at("2026-11-26T13:00:00Z"), end: at("2026-11-26T14:00:00Z") }).ok).toBe(true);
    expect(validateBlock({ start: at("2026-12-01T03:00:00Z"), end: at("2026-12-08T03:00:00Z") }).ok).toBe(true);
  });

  it("rechaza un bloqueo cuyo fin no es posterior al inicio", () => {
    const start = at("2026-11-26T13:00:00Z");
    expect(validateBlock({ start, end: start })).toEqual({ ok: false, error: "BLOCK_EMPTY" });
    expect(validateBlock({ start, end: at("2026-11-26T12:00:00Z") })).toEqual({ ok: false, error: "BLOCK_EMPTY" });
  });
});

describe("orden de las franjas (ub-mode)", () => {
  it("acepta franjas del mismo día que no se tocan aunque vengan desordenadas", () => {
    expect(validateSchedule([r(1, "14:00", "20:00"), r(1, "10:00", "13:00")], 15).ok).toBe(true);
  });

  it("detecta la superposición aunque entre las dos franjas venga otro día", () => {
    const result = validateSchedule([r(1, "10:00", "12:00"), r(2, "09:00", "10:00"), r(1, "11:00", "13:00")], 15);
    expect(result).toEqual({ ok: false, error: [{ code: "RANGES_OVERLAP", weekday: 1 }] });
  });
});
