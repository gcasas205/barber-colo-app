import { describe, expect, it } from "vitest";
import { localDate } from "./local-date";
import { instantAt, localDateOf, minuteOfDayOf } from "./zone";

// Estos tests corren también con TZ=UTC y TZ=Asia/Tokyo (npm run test:tz):
// el resultado no puede depender de la zona de la máquina.
describe("zona del negocio", () => {
  it("convierte día y hora de Buenos Aires a un instante", () => {
    expect(instantAt(localDate("2026-11-26"), 10 * 60).toISOString()).toBe("2026-11-26T13:00:00.000Z");
    expect(instantAt(localDate("2026-11-26"), 19 * 60 + 30).toISOString()).toBe("2026-11-26T22:30:00.000Z");
  });

  it("23:50 en Buenos Aires sigue siendo el mismo día aunque en UTC ya sea el siguiente", () => {
    const instant = instantAt(localDate("2026-12-31"), 23 * 60 + 50);
    expect(instant.toISOString()).toBe("2027-01-01T02:50:00.000Z");
    expect(localDateOf(instant)).toBe("2026-12-31");
    expect(minuteOfDayOf(instant)).toBe(23 * 60 + 50);
  });

  it("el minuto 1440 es la medianoche del día siguiente", () => {
    expect(instantAt(localDate("2026-11-30"), 1440).toISOString()).toBe("2026-12-01T03:00:00.000Z");
  });

  it("vuelve de un instante al día y minuto locales", () => {
    const instant = new Date("2026-11-21T03:00:00.000Z"); // 00:00 en Buenos Aires
    expect(localDateOf(instant)).toBe("2026-11-21");
    expect(minuteOfDayOf(instant)).toBe(0);
    expect(localDateOf(new Date("2026-11-21T02:59:00.000Z"))).toBe("2026-11-20");
  });

  it("rechaza minutos fuera del día", () => {
    expect(() => instantAt(localDate("2026-11-26"), -1)).toThrow();
    expect(() => instantAt(localDate("2026-11-26"), 1441)).toThrow();
    expect(() => instantAt(localDate("2026-11-26"), 10.5)).toThrow();
  });
});
