import { describe, expect, it } from "vitest";
import type { SessionClaims } from "../domain/actor";
import { resolveSession, type IdentityRepository, type StoredIdentity } from "./resolve-session";

const now = new Date("2026-11-21T21:00:00Z");
const colo: SessionClaims = { sub: "u1", email: "colo@example.com", emailVerified: false, isAnonymous: false, provider: "email" };

function repo(stored: Partial<StoredIdentity>) {
  const touched: Date[] = [];
  const identities: IdentityRepository = {
    load: async () => ({ demoAccount: null, guestDevice: null, holder: null, lastSeenAt: null, ...stored }),
    touch: async (_id, at) => void touched.push(at),
  };
  return { identities, touched };
}
const config = { demoEnabled: true, barberEmail: null };

describe("resolveSession", () => {
  it("resuelve el actor y registra la actividad", async () => {
    const { identities, touched } = repo({ demoAccount: { kind: "barber", customerId: null } });
    expect(await resolveSession({ identities, config }, colo, now)).toEqual({ kind: "barber", userId: "u1", demo: true });
    expect(touched).toEqual([now]);
  });

  it("no vuelve a escribir la actividad dentro de la misma hora", async () => {
    const { identities, touched } = repo({ demoAccount: { kind: "barber", customerId: null }, lastSeenAt: new Date(now.getTime() - 10 * 60_000) });
    await resolveSession({ identities, config }, colo, now);
    expect(touched).toEqual([]);
  });

  it("una sesión vencida no renueva su actividad", async () => {
    const { identities, touched } = repo({ demoAccount: { kind: "barber", customerId: null }, lastSeenAt: new Date("2026-09-01T00:00:00Z") });
    expect((await resolveSession({ identities, config }, colo, now)).kind).toBe("none");
    expect(touched).toEqual([]);
  });

  it("sin sesión no consulta la base", async () => {
    expect(await resolveSession({ identities: { load: () => Promise.reject(new Error("no")), touch: () => Promise.reject(new Error("no")) }, config }, null, now)).toEqual({ kind: "none", reason: "no_session" });
  });
});
