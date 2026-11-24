import { describe, expect, it } from "vitest";
import { addDays, instantAt, localDate, type LocalDate } from "@/shared/kernel";
import {
  bookingWindow,
  dayStarts,
  firstDayWithRoom,
  nextDayWithRoom,
  weekAvailability,
  type AvailabilityInput,
} from "./availability";
import type { Interval, WeeklyRange } from "./schedule";

// Los tests corren con TZ de Buenos Aires, UTC y Tokio (caso límite 10): los resultados son los mismos.
const hm = (t: string) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3));
const at = (date: string, time: string) => instantAt(localDate(date), hm(time));
const labels = (date: string, input: AvailabilityInput) =>
  dayStarts({ ...input, date: localDate(date) }).map((s) => s.label);

// Configuración inicial de la spec. 2026-11-23 es lunes.
const ranges: WeeklyRange[] = ([1, 2, 3, 4, 5, 6] as const).flatMap((weekday) => [
  { weekday, opensAt: hm("10:00"), closesAt: hm("13:00") },
  { weekday, opensAt: hm("14:00"), closesAt: hm("20:00") },
]);
const base: AvailabilityInput = {
  ranges,
  config: { stepMinutes: 15, minNoticeMinutes: 30, maxAdvanceDays: 30 },
  serviceMinutes: 30,
  occupations: [],
  now: at("2026-11-21", "08:00"), // sábado temprano
};
const CORTE = 30;
const CLARITOS = 120;

describe("bookingWindow", () => {
  it("va de hoy a hoy + 30, con hoy en hora de Buenos Aires", () => {
    expect(bookingWindow(at("2026-11-21", "08:00"), 30)).toEqual({ first: "2026-11-21", last: "2026-12-21" });
    // Caso 8: a las 23:50 "hoy" todavía es ese día, aunque en UTC ya sea el siguiente.
    expect(bookingWindow(at("2026-12-31", "23:50"), 30)).toEqual({ first: "2026-12-31", last: "2027-01-30" });
  });
});

describe("dayStarts: los 12 casos límite de la spec", () => {
  it("un día común ofrece todos los inicios de cada franja, de a 15 min", () => {
    const starts = labels("2026-11-24", base);
    expect(starts.slice(0, 3)).toEqual(["10:00", "10:15", "10:30"]);
    expect(starts).toContain("12:30");
    expect(starts).not.toContain("13:00");
    expect(starts.at(-1)).toBe("19:30");
    expect(starts).toHaveLength(11 + 23); // 10:00–12:30 y 14:00–19:30
  });

  it("1. Claritos (2 h) en 10–13 empieza hasta las 11:00; a las 11:15 ya no entra", () => {
    const starts = labels("2026-11-24", { ...base, serviceMinutes: CLARITOS });
    expect(starts.filter((s) => s < "13:00")).toEqual(["10:00", "10:15", "10:30", "10:45", "11:00"]);
  });

  it("2. un Corte puede empezar 12:30 (termina justo al cierre) pero no 12:45", () => {
    const starts = labels("2026-11-24", base);
    expect(starts).toContain("12:30");
    expect(starts).not.toContain("12:45");
  });

  it("3. con un bloqueo de 10 a 11, el primer Corte libre es a las 11:00", () => {
    const block: Interval = { start: at("2026-11-24", "10:00"), end: at("2026-11-24", "11:00") };
    expect(labels("2026-11-24", { ...base, occupations: [block] })[0]).toBe("11:00");
  });

  it("3b. una ocupación en el medio saca solo los inicios que la pisan", () => {
    const busy: Interval = { start: at("2026-11-24", "11:00"), end: at("2026-11-24", "11:30") };
    const starts = labels("2026-11-24", { ...base, occupations: [busy] });
    expect(starts).toContain("10:30"); // termina 11:00, toca el borde
    expect(starts).not.toContain("10:45");
    expect(starts).not.toContain("11:15");
    expect(starts).toContain("11:30");
  });

  it("4. un bloqueo de todo el día deja el día sin lugar para todos los servicios", () => {
    const block: Interval = { start: at("2026-11-24", "00:00"), end: at("2026-11-25", "00:00") };
    for (const serviceMinutes of [CORTE, CLARITOS]) {
      expect(labels("2026-11-24", { ...base, serviceMinutes, occupations: [block] })).toEqual([]);
    }
  });

  it("5. vacaciones del 1 al 7: ninguno de esos días tiene lugar, el 8 sí", () => {
    const block: Interval = { start: at("2026-12-01", "00:00"), end: at("2026-12-08", "00:00") };
    const input = { ...base, occupations: [block] };
    for (let i = 0; i < 7; i++) {
      expect(labels(addDays(localDate("2026-12-01"), i), input)).toEqual([]);
    }
    expect(labels("2026-12-08", input).length).toBeGreaterThan(0);
  });

  it("6. a las 19:40 de un martes no queda nada hoy", () => {
    expect(labels("2026-11-24", { ...base, now: at("2026-11-24", "19:40") })).toEqual([]);
  });

  it("7. a las 09:45 se ofrece 10:15 (30 min exactos) y no 10:00", () => {
    const starts = labels("2026-11-24", { ...base, now: at("2026-11-24", "09:45") });
    expect(starts[0]).toBe("10:15");
    expect(starts).not.toContain("10:00");
  });

  it("7b. con anticipación de 30 min, a las 09:46 tampoco se ofrece 10:15", () => {
    expect(labels("2026-11-24", { ...base, now: at("2026-11-24", "09:46") })[0]).toBe("10:30");
  });

  it("8. a las 23:50 el día de hoy no tiene horarios y mañana sí", () => {
    const input = { ...base, now: at("2026-11-23", "23:50") };
    expect(labels("2026-11-23", input)).toEqual([]);
    expect(labels("2026-11-24", input)[0]).toBe("10:00");
  });

  it("9. el último día de la ventana se ofrece completo y el siguiente no", () => {
    const input = { ...base, now: at("2026-11-23", "08:00") }; // ventana hasta el 2026-12-23 (miércoles)
    expect(labels("2026-12-23", input)).toHaveLength(34);
    expect(labels("2026-12-24", input)).toEqual([]);
  });

  it("9b. un día anterior a hoy no tiene horarios", () => {
    expect(labels("2026-11-20", base)).toEqual([]);
  });

  it("10. el resultado es el mismo instante en cualquier zona de la máquina", () => {
    const [first] = dayStarts({ ...base, date: localDate("2026-11-24") });
    expect(first?.start.toISOString()).toBe("2026-11-24T13:00:00.000Z");
  });

  it("11. el domingo no tiene lugar para ningún servicio", () => {
    expect(labels("2026-11-29", base)).toEqual([]);
    expect(labels("2026-11-29", { ...base, serviceMinutes: CLARITOS })).toEqual([]);
  });

  // Caso 12 (servicio desactivado): lo cubre el caso de uso, que solo calcula para servicios activos (T7).

  it("RF-7: cada inicio dice a qué franja pertenece, en orden", () => {
    const starts = dayStarts({ ...base, date: localDate("2026-11-24") });
    expect(starts[0]?.range).toEqual({ opensAt: hm("10:00"), closesAt: hm("13:00") });
    expect(starts.at(-1)?.range).toEqual({ opensAt: hm("14:00"), closesAt: hm("20:00") });
    const times = starts.map((s) => s.start.getTime());
    expect(times).toEqual([...times].sort((a, b) => a - b));
  });

  it("respeta franjas cargadas en desorden y un paso de 20 min", () => {
    const input: AvailabilityInput = {
      ...base,
      ranges: [
        { weekday: 2, opensAt: hm("14:00"), closesAt: hm("15:00") },
        { weekday: 2, opensAt: hm("10:00"), closesAt: hm("11:00") },
      ],
      config: { ...base.config, stepMinutes: 20 },
      serviceMinutes: 40,
    };
    expect(labels("2026-11-24", input)).toEqual(["10:00", "10:20", "14:00", "14:20"]);
  });
});

describe("weekAvailability (RF-4, RF-5)", () => {
  it("cuenta los horarios de cada día de lunes a domingo y marca los de fuera de la ventana", () => {
    const week = weekAvailability({ ...base, now: at("2026-11-25", "12:00"), weekOf: localDate("2026-11-26") });
    expect(week.map((d) => d.date)).toEqual([
      "2026-11-23",
      "2026-11-24",
      "2026-11-25",
      "2026-11-26",
      "2026-11-27",
      "2026-11-28",
      "2026-11-29",
    ]);
    expect(week.map((d) => d.inWindow)).toEqual([false, false, true, true, true, true, true]);
    expect(week[0]?.count).toBe(0);
    expect(week[2]?.count).toBe(24); // miércoles a las 12:00: 12:30 y los 23 de la tarde
    expect(week[3]?.count).toBe(34);
    expect(week[6]?.count).toBe(0); // domingo, sin lugar
  });
});

describe("nextDayWithRoom y firstDayWithRoom (RF-6, RF-6b)", () => {
  it("salta el domingo", () => {
    expect(nextDayWithRoom({ ...base, after: localDate("2026-11-28") })).toBe("2026-11-30");
  });

  it("salta los días bloqueados", () => {
    const block: Interval = { start: at("2026-12-01", "00:00"), end: at("2026-12-08", "00:00") };
    expect(nextDayWithRoom({ ...base, occupations: [block], after: localDate("2026-11-30") })).toBe("2026-12-08");
  });

  it("devuelve null si no hay lugar hasta el final de la ventana", () => {
    const block: Interval = { start: at("2026-11-21", "00:00"), end: at("2027-02-01", "00:00") };
    expect(nextDayWithRoom({ ...base, occupations: [block], after: localDate("2026-11-21") })).toBeNull();
    expect(firstDayWithRoom({ ...base, occupations: [block] })).toBeNull();
  });

  it("el primer día con lugar puede ser hoy, o mañana si hoy ya no queda nada", () => {
    expect(firstDayWithRoom({ ...base, now: at("2026-11-24", "09:00") })).toBe("2026-11-24");
    expect(firstDayWithRoom({ ...base, now: at("2026-11-24", "19:40") })).toBe("2026-11-25");
  });

  it("no busca más allá de la ventana", () => {
    const now = at("2026-11-23", "08:00");
    const last: LocalDate = bookingWindow(now, 30).last;
    expect(nextDayWithRoom({ ...base, now, after: last })).toBeNull();
  });
});

describe("bordes de la búsqueda de días (ub-mode)", () => {
  it("encuentra lugar en el último día de la ventana", () => {
    const now = at("2026-11-23", "08:00"); // ventana hasta el 2026-12-23
    const allButLast: Interval = { start: at("2026-11-23", "00:00"), end: at("2026-12-23", "00:00") };
    expect(firstDayWithRoom({ ...base, now, occupations: [allButLast] })).toBe("2026-12-23");
  });

  it("un día con un solo horario libre cuenta como día con lugar", () => {
    const now = at("2026-11-23", "08:00");
    const busy: Interval[] = [
      { start: at("2026-11-23", "00:00"), end: at("2026-11-24", "19:30") },
      { start: at("2026-11-25", "00:00"), end: at("2027-02-01", "00:00") },
    ];
    expect(labels("2026-11-24", { ...base, now, occupations: busy })).toEqual(["19:30"]);
    expect(firstDayWithRoom({ ...base, now, occupations: busy })).toBe("2026-11-24");
  });

  it("si `after` es anterior a la ventana, busca desde hoy", () => {
    expect(nextDayWithRoom({ ...base, now: at("2026-11-24", "09:00"), after: localDate("2026-11-01") })).toBe("2026-11-24");
  });
});
