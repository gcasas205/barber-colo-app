import { describe, expect, it, vi } from "vitest";
import { toSessionClaims } from "./claims";

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
