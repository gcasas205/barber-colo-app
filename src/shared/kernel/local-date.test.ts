import { describe, expect, it } from "vitest";
import {
  addDays,
  compareLocalDate,
  daysBetween,
  isoWeekday,
  localDate,
  parseLocalDate,
  weekDays,
  weekStart,
} from "./local-date";

describe("parseLocalDate", () => {
  it("acepta fechas reales con formato AAAA-MM-DD", () => {
    expect(parseLocalDate("2026-11-26")).toBe("2026-11-26");
    expect(parseLocalDate("2028-02-29")).toBe("2028-02-29"); // bisiesto
  });

  it.each(["2026-02-29", "2026-13-01", "2026-11-31", "26-11-2026", "2026-1-5", "", "hoy", "2026-11-26T10:00"])(
    "rechaza %j",
    (raw) => {
      expect(parseLocalDate(raw)).toBeNull();
    },
  );
});

describe("addDays", () => {
  it("cruza fin de mes, fin de año y febrero", () => {
    expect(addDays(localDate("2026-11-30"), 1)).toBe("2026-12-01");
    expect(addDays(localDate("2026-12-31"), 1)).toBe("2027-01-01");
    expect(addDays(localDate("2027-02-28"), 1)).toBe("2027-03-01");
    expect(addDays(localDate("2028-02-28"), 1)).toBe("2028-02-29");
    expect(addDays(localDate("2026-11-21"), 30)).toBe("2026-12-21");
    expect(addDays(localDate("2027-01-01"), -1)).toBe("2026-12-31");
  });
});

describe("semana", () => {
  it("numera los días como ISO: lunes 1, domingo 7", () => {
    expect(isoWeekday(localDate("2026-11-23"))).toBe(1); // lunes
    expect(isoWeekday(localDate("2026-11-28"))).toBe(6); // sábado
    expect(isoWeekday(localDate("2026-11-29"))).toBe(7); // domingo
  });

  it("empieza el lunes, también si la fecha es domingo", () => {
    expect(weekStart(localDate("2026-11-29"))).toBe("2026-11-23");
    expect(weekStart(localDate("2026-11-23"))).toBe("2026-11-23");
    expect(weekStart(localDate("2027-01-01"))).toBe("2026-12-28"); // cruza el año
  });

  it("devuelve los siete días de lunes a domingo", () => {
    expect(weekDays(localDate("2026-11-26"))).toEqual([
      "2026-11-23",
      "2026-11-24",
      "2026-11-25",
      "2026-11-26",
      "2026-11-27",
      "2026-11-28",
      "2026-11-29",
    ]);
  });
});

describe("comparación", () => {
  it("compara y cuenta días", () => {
    expect(compareLocalDate(localDate("2026-11-21"), localDate("2026-12-01"))).toBeLessThan(0);
    expect(compareLocalDate(localDate("2026-12-01"), localDate("2026-12-01"))).toBe(0);
    expect(daysBetween(localDate("2026-11-21"), localDate("2026-12-21"))).toBe(30);
    expect(daysBetween(localDate("2026-12-31"), localDate("2027-01-01"))).toBe(1);
  });
});

describe("bordes (ub-mode)", () => {
  it("compara en los dos sentidos", () => {
    expect(compareLocalDate(localDate("2026-12-01"), localDate("2026-11-21"))).toBeGreaterThan(0);
  });
});
