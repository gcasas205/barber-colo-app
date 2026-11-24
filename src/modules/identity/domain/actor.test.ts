import { describe, expect, it } from "vitest";
import { DEMO_ACCOUNTS, resolveActor, type IdentityFacts } from "./actor";

const now = new Date("2026-11-21T21:00:00Z");
const days = (n: number) => new Date(now.getTime() - n * 86_400_000);
const base: IdentityFacts = {
  claims: null,
  demoEnabled: true,
  barberEmail: null,
  demoAccount: null,
  guestDevice: null,
  holder: null,
  lastSeenAt: null,
  now,
};
const claims = (c: Partial<NonNullable<IdentityFacts["claims"]>>) => ({
  sub: "u1",
  email: null,
  emailVerified: false,
  isAnonymous: false,
  provider: "email",
  ...c,
});

describe("resolveActor", () => {
  it("sin sesión no hay actor", () => {
    expect(resolveActor(base)).toEqual({ kind: "none", reason: "no_session" });
  });

  describe("cuentas de prueba (RF-22 a RF-24)", () => {
    const colo = { ...base, claims: claims({ email: "colo@example.com" }), demoAccount: { kind: "barber" as const, customerId: null } };

    it("Colo (demo) es barbero", () => {
      expect(resolveActor(colo)).toEqual({ kind: "barber", userId: "u1", demo: true });
    });

    it("un cliente de prueba es cliente, con su ficha", () => {
      const c1 = { ...base, claims: claims({ email: "cliente1@example.com" }), demoAccount: { kind: "client_1" as const, customerId: "c1" }, holder: { customerId: "c1", profileComplete: false } };
      expect(resolveActor(c1)).toEqual({ kind: "customer", userId: "u1", customerId: "c1", profileComplete: false, demo: true });
    });

    it("con la demo desactivada, una sesión de prueba abierta deja de valer (RF-24, caso 11)", () => {
      expect(resolveActor({ ...colo, demoEnabled: false })).toEqual({ kind: "none", reason: "demo_disabled", signOut: true });
    });

    it("una cuenta de correo y contraseña que no es de prueba no tiene acceso (RF-1c)", () => {
      expect(resolveActor({ ...base, claims: claims({ email: "otro@gmail.com" }) })).toEqual({ kind: "none", reason: "not_allowed", signOut: true });
    });

    it("conoce los tres correos de prueba", () => {
      expect(DEMO_ACCOUNTS.map((d) => d.email)).toEqual(["colo@example.com", "cliente1@example.com", "cliente2@example.com"]);
    });
  });

  describe("invitado (RF-15 a RF-18)", () => {
    const anon = { ...base, claims: claims({ isAnonymous: true, provider: "anonymous" }) };

    it("un dispositivo asociado a un cliente es invitado", () => {
      expect(resolveActor({ ...anon, guestDevice: { customerId: "g1" } })).toEqual({ kind: "guest", userId: "u1", customerId: "g1" });
    });

    it("spec 004 (RF-4): una sesión anónima sin cliente es un invitado que todavía no cargó sus datos", () => {
      expect(resolveActor(anon)).toEqual({ kind: "guest", userId: "u1", customerId: null });
    });
  });

  describe("vencimiento por inactividad (RF-4)", () => {
    const guest = { ...base, claims: claims({ isAnonymous: true }), guestDevice: { customerId: "g1" } };
    const colo = { ...base, claims: claims({ email: "colo@example.com" }), demoAccount: { kind: "barber" as const, customerId: null } };

    it("un invitado vence a los 60 días sin usar la app", () => {
      expect(resolveActor({ ...guest, lastSeenAt: days(59) }).kind).toBe("guest");
      expect(resolveActor({ ...guest, lastSeenAt: days(61) })).toEqual({ kind: "none", reason: "expired", signOut: true });
    });

    it("Colo vence a los 30 días", () => {
      expect(resolveActor({ ...colo, lastSeenAt: days(29) }).kind).toBe("barber");
      expect(resolveActor({ ...colo, lastSeenAt: days(31) })).toEqual({ kind: "none", reason: "expired", signOut: true });
    });

    it("el día justo del límite todavía no vence", () => {
      expect(resolveActor({ ...colo, lastSeenAt: days(30) }).kind).toBe("barber");
      expect(resolveActor({ ...guest, lastSeenAt: days(60) }).kind).toBe("guest");
    });
  });

  describe("Google (spec de publicación: la regla queda lista y probada)", () => {
    const google = (email: string, emailVerified = true) => ({ ...base, barberEmail: "Colo.Barber@Gmail.com", claims: claims({ email, emailVerified, provider: "google" }) });

    it("el email verificado igual al de Colo es barbero, sin importar mayúsculas (RF-6, caso 8)", () => {
      expect(resolveActor(google("colo.barber@gmail.com"))).toEqual({ kind: "barber", userId: "u1", demo: false });
    });

    it("sin verificar, nunca es barbero (RF-7b)", () => {
      expect(resolveActor(google("colo.barber@gmail.com", false)).kind).toBe("customer");
    });

    it("cualquier otra cuenta de Google es cliente; sin ficha todavía, perfil incompleto", () => {
      expect(resolveActor(google("martin@gmail.com"))).toEqual({ kind: "customer", userId: "u1", customerId: null, profileComplete: false, demo: false });
    });

    it("si cambia el email de Colo, la cuenta anterior deja de ser barbero en el próximo pedido (RF-7c)", () => {
      expect(resolveActor({ ...google("colo.barber@gmail.com"), barberEmail: "nuevo@gmail.com" }).kind).toBe("customer");
    });

    it("sin email de Colo configurado, nadie es barbero por Google (RF-7)", () => {
      expect(resolveActor({ ...google("colo.barber@gmail.com"), barberEmail: null }).kind).toBe("customer");
    });
  });
});
