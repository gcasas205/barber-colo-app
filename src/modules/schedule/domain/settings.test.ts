import { describe, expect, it } from "vitest";
import { localDate } from "@/shared/kernel";
import type { WeeklyRange } from "./schedule";
import {
  blockOfDays,
  blockOfHours,
  copyDay,
  isWhatsapp,
  validateNewBlock,
  validateBookingRules,
  validateNotice,
  validateStepChange,
  validateWeeklyRanges,
} from "./settings";

const m = (t: string) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3));
const r = (weekday: WeeklyRange["weekday"], opens: string, closes: string): WeeklyRange => ({
  weekday,
  opensAt: m(opens),
  closesAt: m(closes),
});
const initial: WeeklyRange[] = [1, 2, 3, 4, 5, 6].flatMap((d) => [
  r(d as WeeklyRange["weekday"], "10:00", "13:00"),
  r(d as WeeklyRange["weekday"], "14:00", "20:00"),
]);
const services = [
  { name: "Corte", durationMinutes: 30 },
  { name: "Completo", durationMinutes: 30 },
  { name: "Claritos", durationMinutes: 120 },
];

describe("validateWeeklyRanges (RF-6)", () => {
  it("acepta la configuración inicial y una franja que cierra a las 24:00", () => {
    expect(validateWeeklyRanges(initial, 15).ok).toBe(true);
    expect(validateWeeklyRanges([r(5, "20:00", "24:00")], 15).ok).toBe(true);
  });

  it("caso 4: 13:00 a 14:00 entre 10–13 y 14–20 se permite (se tocan en los bordes)", () => {
    expect(validateWeeklyRanges([r(1, "10:00", "13:00"), r(1, "13:00", "14:00"), r(1, "14:00", "20:00")], 15).ok).toBe(true);
  });

  it("rechaza horas que no son múltiplo del paso, indicando el día", () => {
    expect(validateWeeklyRanges([r(2, "10:10", "13:00")], 15)).toEqual({
      ok: false,
      error: [{ code: "RANGE_NOT_ON_STEP", weekday: 2 }],
    });
  });

  it("rechaza más de 4 franjas en un día", () => {
    const five = ["08", "10", "12", "14", "16"].map((h) => r(3, `${h}:00`, `${h}:30`));
    expect(validateWeeklyRanges(five, 15)).toEqual({ ok: false, error: [{ code: "TOO_MANY_RANGES", weekday: 3 }] });
  });

  it("rechaza superposiciones y franjas invertidas con el día", () => {
    const result = validateWeeklyRanges([r(4, "10:00", "14:00"), r(4, "13:00", "20:00"), r(6, "12:00", "11:00")], 15);
    expect(result).toMatchObject({ ok: false });
    if (!result.ok) {
      expect(result.error).toContainEqual({ code: "RANGES_OVERLAP", weekday: 4 });
      expect(result.error).toContainEqual({ code: "RANGE_INVERTED", weekday: 6 });
    }
  });
});

describe("copyDay (RF-7)", () => {
  it("caso 14: copia las franjas del sábado al domingo, reemplazando las del destino", () => {
    const out = copyDay([...initial, r(7, "09:00", "10:00")], 6, [7]);
    expect(out.filter((x) => x.weekday === 7)).toEqual([r(7, "10:00", "13:00"), r(7, "14:00", "20:00")]);
    expect(out.filter((x) => x.weekday === 6)).toHaveLength(2);
  });

  it("no toca el día de origen aunque esté en los destinos", () => {
    expect(copyDay(initial, 1, [1, 2])).toHaveLength(initial.length);
  });
});

describe("validateStepChange (RF-9)", () => {
  it("caso 1: de 15 a 20 con Corte de 30 lista Corte y Completo", () => {
    expect(validateStepChange(20, initial, services)).toEqual({
      ok: false,
      error: { services: ["Corte", "Completo"], weekdays: [] },
    });
  });

  it("caso 2: de 15 a 30 con franjas de hora en punto y Claritos de 120 se permite", () => {
    expect(validateStepChange(30, initial, services).ok).toBe(true);
  });

  it("caso 3: de 15 a 60 con una franja que abre a las 10:30 lista ese día", () => {
    const result = validateStepChange(60, [r(2, "10:30", "13:00")], [{ name: "Claritos", durationMinutes: 120 }]);
    expect(result).toEqual({ ok: false, error: { services: [], weekdays: [2] } });
  });

  it("rechaza un paso que no divide la hora", () => {
    expect(validateStepChange(25, initial, services)).toMatchObject({ ok: false, error: { invalidStep: true } });
  });
});

describe("validateBookingRules (RF-22, RF-24)", () => {
  it("acepta los bordes de los rangos", () => {
    expect(validateBookingRules({ minNoticeMinutes: 0, maxAdvanceDays: 1 }).ok).toBe(true);
    expect(validateBookingRules({ minNoticeMinutes: 2880, maxAdvanceDays: 90 }).ok).toBe(true);
  });

  it("rechaza fuera de rango o sin múltiplo de 15", () => {
    expect(validateBookingRules({ minNoticeMinutes: 2895, maxAdvanceDays: 91 })).toEqual({
      ok: false,
      error: ["MIN_NOTICE_OUT_OF_RANGE", "MAX_ADVANCE_OUT_OF_RANGE"],
    });
    expect(validateBookingRules({ minNoticeMinutes: 20, maxAdvanceDays: 0 })).toEqual({
      ok: false,
      error: ["MIN_NOTICE_OUT_OF_RANGE", "MAX_ADVANCE_OUT_OF_RANGE"],
    });
  });
});

describe("bloqueos (RF-10, RF-11)", () => {
  const at = (iso: string) => new Date(iso);

  it("un bloqueo de días va de las 00:00 del primero a las 24:00 del último, en Buenos Aires", () => {
    expect(blockOfDays(localDate("2026-12-24"), localDate("2026-12-31"))).toEqual({
      ok: true,
      value: { start: at("2026-12-24T03:00:00Z"), end: at("2027-01-01T03:00:00Z") },
    });
  });

  it("rechaza un bloqueo de días con el último antes del primero", () => {
    expect(blockOfDays(localDate("2026-12-31"), localDate("2026-12-24"))).toEqual({ ok: false, error: "DAYS_INVERTED" });
  });

  it("un bloqueo de horas es dentro del día; rechaza fin no posterior o fuera del paso de 5", () => {
    expect(blockOfHours(localDate("2026-11-25"), m("10:00"), m("11:00"))).toEqual({
      ok: true,
      value: { start: at("2026-11-25T13:00:00Z"), end: at("2026-11-25T14:00:00Z") },
    });
    expect(blockOfHours(localDate("2026-11-25"), m("11:00"), m("11:00"))).toEqual({ ok: false, error: "HOURS_INVERTED" });
  });

  it("caso 6: un bloqueo que ya empezó pero termina después de ahora se permite", () => {
    const block = blockOfDays(localDate("2026-12-24"), localDate("2026-12-31"));
    if (!block.ok) throw new Error();
    expect(validateNewBlock(block.value, at("2026-12-24T21:00:00Z")).ok).toBe(true);
  });

  it("caso 7: un bloqueo de horas que ya terminó se rechaza", () => {
    const block = blockOfHours(localDate("2026-11-25"), m("09:00"), m("10:00"));
    if (!block.ok) throw new Error();
    expect(validateNewBlock(block.value, at("2026-11-25T14:00:00Z"))).toEqual({ ok: false, error: "BLOCK_IN_PAST" });
  });

  it("el aviso es opcional y de hasta 80 caracteres; los espacios de los extremos no cuentan", () => {
    expect(validateNotice("")).toEqual({ ok: true, value: null });
    expect(validateNotice("  Vacaciones ")).toEqual({ ok: true, value: "Vacaciones" });
    expect(validateNotice("x".repeat(81))).toEqual({ ok: false, error: "NOTICE_TOO_LONG" });
  });
});

describe("isWhatsapp (RF-23)", () => {
  it("acepta solo celulares argentinos normalizados", () => {
    expect(isWhatsapp("+5491138163491")).toBe(true);
    expect(isWhatsapp("+541138163491")).toBe(false);
    expect(isWhatsapp("11 3816-3491")).toBe(false);
  });
});
