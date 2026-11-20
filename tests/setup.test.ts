import { describe, expect, it } from "vitest";

// Test de humo: comprueba que la configuración de tests es la que exige la constitución.
// Se reemplaza o complementa con los tests de cada spec.
describe("entorno de tests", () => {
  it("corre con la zona horaria del local", () => {
    // Según la versión de ICU, el nombre puede aparecer con o sin "Argentina/".
    expect(["America/Argentina/Buenos_Aires", "America/Buenos_Aires"]).toContain(
      Intl.DateTimeFormat().resolvedOptions().timeZone,
    );
    // UTC-3, sin horario de verano.
    expect(new Date(2026, 0, 15).getTimezoneOffset()).toBe(180);
    expect(new Date(2026, 6, 15).getTimezoneOffset()).toBe(180);
  });

  it("resuelve una fecha local sin desfase de día", () => {
    // 20/11/2026 a las 22:30 en Buenos Aires ya es 21/11 en UTC.
    const date = new Date(2026, 10, 20, 22, 30);
    expect(date.getDate()).toBe(20);
    expect(date.toISOString().startsWith("2026-11-21")).toBe(true);
  });
});
