import { describe, expect, it } from "vitest";
import { formatDayLong, formatDayShort, weekdayShort } from "./labels";
import { localDate } from "./local-date";

describe("nombres de días y meses en español", () => {
  it("formatea un día completo", () => {
    expect(formatDayLong(localDate("2026-11-26"))).toBe("jueves 26 de noviembre");
    expect(formatDayLong(localDate("2027-01-01"))).toBe("viernes 1 de enero");
    expect(formatDayLong(localDate("2026-11-29"))).toBe("domingo 29 de noviembre");
  });

  it("formatea un día corto y el día de la semana abreviado", () => {
    expect(formatDayShort(localDate("2026-11-25"))).toBe("mié 25");
    expect(weekdayShort(localDate("2026-11-28"))).toBe("Sáb");
  });
});
