import { describe, expect, it } from "vitest";
import { serverClock } from "./clock";

describe("serverClock (caso límite 14)", () => {
  it("arranca en la hora del servidor y avanza con el tiempo transcurrido, no con el reloj del dispositivo", () => {
    let elapsed = 1_000; // performance.now() al cargar
    const now = serverClock(Date.parse("2026-11-24T12:45:00Z"), () => elapsed);
    expect(now().toISOString()).toBe("2026-11-24T12:45:00.000Z");
    elapsed += 6 * 60_000; // pasaron 6 minutos
    expect(now().toISOString()).toBe("2026-11-24T12:51:00.000Z");
  });
});
