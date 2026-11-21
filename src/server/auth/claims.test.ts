import { describe, expect, it, vi } from "vitest";
import { readClaims, toSessionClaims } from "./claims";

vi.mock("server-only", () => ({}));

describe("toSessionClaims", () => {
  it("traduce una sesión de correo y contraseña", () => {
    expect(toSessionClaims({ sub: "u1", email: "colo@example.com", app_metadata: { provider: "email" } })).toEqual({
      sub: "u1", email: "colo@example.com", emailVerified: false, isAnonymous: false, provider: "email",
    });
  });
  it("traduce una sesión anónima", () => {
    expect(toSessionClaims({ sub: "u2", email: "", is_anonymous: true })).toMatchObject({ isAnonymous: true, provider: "anonymous", email: null });
  });
  it("sin claims no hay sesión", () => {
    expect(toSessionClaims(null)).toBeNull();
    expect(toSessionClaims({})).toBeNull();
  });
});

describe("readClaims", () => {
  const claims = { sub: "u1", email: "colo@example.com", app_metadata: { provider: "email" } };
  it("devuelve los claims verificados", async () => {
    await expect(readClaims({ getClaims: async () => ({ data: { claims }, error: null }) })).resolves.toMatchObject({ sub: "u1" });
  });
  it("con error de Supabase no hay sesión", async () => {
    await expect(readClaims({ getClaims: async () => ({ data: null, error: new Error("jwt expired") }) })).resolves.toBeNull();
  });
  it("si getClaims lanza (token de otro proyecto, JWKS caído) no hay sesión", async () => {
    await expect(readClaims({ getClaims: async () => { throw new Error("invalid signature"); } })).resolves.toBeNull();
  });
});
