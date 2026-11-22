import { describe, expect, it } from "vitest";
import nextConfig from "../next.config";

/** Junta las cabeceras de todas las reglas de next.config que aplican a la ruta (como hace Next). */
async function headersFor(path: string) {
  const rules = (await nextConfig.headers?.()) ?? [];
  const matching = rules.filter((r) => new RegExp(`^${r.source.replace("(.*)", ".*")}$`).test(path));
  return Object.fromEntries(matching.flatMap((r) => r.headers).map((h) => [h.key.toLowerCase(), h.value]));
}

describe("cabeceras de seguridad (S-5)", () => {
  it("se aplican a todas las páginas", async () => {
    const h = await headersFor("/");
    expect(h["strict-transport-security"]).toBe("max-age=63072000; includeSubDomains; preload");
    expect(h["x-content-type-options"]).toBe("nosniff");
    expect(h["x-frame-options"]).toBe("DENY");
    expect(h["referrer-policy"]).toBe("strict-origin-when-cross-origin");
    expect(h["permissions-policy"]).toMatch(/camera=\(\)/);
    expect(await headersFor("/prototipo/reservar")).toMatchObject(h);
  });

  it("las pantallas no reciben la CSP fija: la suya, con nonce, la pone el proxy (RNF-4 de la 002; spec 004: todas)", async () => {
    for (const path of ["/", "/turnos", "/ingresar", "/perfil", "/colo", "/colo/ajustes", "/auth/callback"]) {
      const h = await headersFor(path);
      expect(h["content-security-policy"]).toBeUndefined();
      expect(h["x-frame-options"]).toBe("DENY");
    }
  });

  it("la CSP solo permite recursos propios y nadie puede embeber la app", async () => {
    const csp = (await headersFor("/prototipo/reservar"))["content-security-policy"] ?? "";
    for (const directive of [
      "default-src 'self'",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "frame-ancestors 'none'",
      "connect-src 'self'",
    ]) {
      expect(csp).toContain(directive);
    }
    expect(csp).not.toMatch(/\*|https?:/); // ningún dominio ajeno ni comodines
    expect(csp).not.toContain("unsafe-eval"); // solo en desarrollo
  });
});
