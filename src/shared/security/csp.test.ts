import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import { themeBootScript } from "@/shared/theme";
import { publicCsp, sessionCsp, STATIC_ROUTES, THEME_SCRIPT_HASH } from "./csp";

const directive = (csp: string, name: string) => csp.split("; ").find((d) => d.startsWith(`${name} `)) ?? "";

describe("CSP de las pantallas con sesión (RNF-4)", () => {
  const csp = sessionCsp("abc123", false);

  it("los scripts necesitan el nonce del pedido o ser el script exacto del tema", () => {
    expect(directive(csp, "script-src")).toBe(`script-src 'self' 'nonce-abc123' 'strict-dynamic' '${THEME_SCRIPT_HASH}'`);
    expect(directive(csp, "script-src")).not.toContain("unsafe-inline");
  });

  it("el hash corresponde al script del tema tal cual se manda", () => {
    expect(THEME_SCRIPT_HASH).toBe(`sha256-${createHash("sha256").update(themeBootScript).digest("base64")}`);
  });

  it("mantiene las demás restricciones de la 001", () => {
    for (const d of ["default-src 'self'", "object-src 'none'", "base-uri 'self'", "form-action 'self'", "frame-ancestors 'none'", "connect-src 'self'"]) {
      expect(csp).toContain(d);
    }
    expect(csp).not.toMatch(/https?:|\*/);
  });

  it("solo en desarrollo permite eval (lo necesita la recarga en caliente)", () => {
    expect(sessionCsp("n", true)).toContain("'unsafe-eval'");
    expect(csp).not.toContain("unsafe-eval");
  });
});

describe("CSP fija (solo el prototipo estático desde la spec 004)", () => {
  it("es la de la 001 (prerenderizada: no puede llevar nonce)", () => {
    expect(directive(publicCsp(false), "script-src")).toBe("script-src 'self' 'unsafe-inline'");
  });
});

describe("rutas estáticas", () => {
  it("solo el prototipo de diseño se sirve sin la CSP con nonce", () => {
    expect(STATIC_ROUTES).toEqual(["prototipo"]);
  });
});

describe("orden y forma de las directivas (ub-mode)", () => {
  it("default-src va primero, después script-src, y cada directiva una sola vez", () => {
    for (const csp of [publicCsp(false), sessionCsp("abc", false)]) {
      const names = csp.split("; ").map((d) => d.split(" ")[0]);
      expect(names.slice(0, 2)).toEqual(["default-src", "script-src"]);
      expect(new Set(names).size).toBe(names.length);
      expect(names).toHaveLength(10);
    }
  });
});
