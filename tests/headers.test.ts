import { describe, expect, it } from "vitest";
import nextConfig from "../next.config";

async function headersFor(path: string) {
  const rules = (await nextConfig.headers?.()) ?? [];
  const rule = rules.find((r) => new RegExp(`^${r.source.replace("(.*)", ".*")}$`).test(path));
  return Object.fromEntries((rule?.headers ?? []).map((h) => [h.key.toLowerCase(), h.value]));
}

describe("cabeceras de seguridad (S-5)", () => {
  it("se aplican a todas las páginas", async () => {
    const h = await headersFor("/");
    expect(h["strict-transport-security"]).toBe("max-age=63072000; includeSubDomains; preload");
    expect(h["x-content-type-options"]).toBe("nosniff");
    expect(h["x-frame-options"]).toBe("DENY");
    expect(h["referrer-policy"]).toBe("strict-origin-when-cross-origin");
    expect(h["permissions-policy"]).toMatch(/camera=\(\)/);
    expect(await headersFor("/prototipo/reservar")).toEqual(h);
  });

  it("la CSP solo permite recursos propios y nadie puede embeber la app", async () => {
    const csp = (await headersFor("/"))["content-security-policy"] ?? "";
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
