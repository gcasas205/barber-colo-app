/** Las tres cuentas de prueba (D-11, RF-22). Mismos correos que en Supabase y en `supabase/seed.sql`. */
export const DEMO_ACCOUNTS = [
  { kind: "barber", email: "colo@example.com", label: "Colo (barbero)" },
  { kind: "client_1", email: "cliente1@example.com", label: "Cliente de prueba 1" },
  { kind: "client_2", email: "cliente2@example.com", label: "Cliente de prueba 2" },
] as const;
export type DemoKind = (typeof DEMO_ACCOUNTS)[number]["kind"];

/** Lo que dice el token verificado (getClaims) de la sesión. */
export type SessionClaims = {
  sub: string;
  email: string | null;
  emailVerified: boolean;
  isAnonymous: boolean;
  /** Proveedor de ingreso: "email", "google" o "anonymous". */
  provider: string | null;
};

/** Todo lo que hace falta para saber quién es quién. "Ahora" entra como dato. */
export type IdentityFacts = {
  claims: SessionClaims | null;
  demoEnabled: boolean;
  /** Email de la cuenta de Google de Colo (spec de publicación). */
  barberEmail: string | null;
  demoAccount: { kind: DemoKind; customerId: string | null } | null;
  guestDevice: { customerId: string } | null;
  holder: { customerId: string; profileComplete: boolean } | null;
  lastSeenAt: Date | null;
  now: Date;
};

export type NoActorReason = "no_session" | "expired" | "demo_disabled" | "not_allowed" | "guest_unregistered";

export type Actor =
  | { kind: "barber"; userId: string; demo: boolean }
  | { kind: "customer"; userId: string; customerId: string | null; profileComplete: boolean; demo: boolean }
  | { kind: "guest"; userId: string; customerId: string }
  | { kind: "none"; reason: NoActorReason; signOut?: true };

const DAY_MS = 86_400_000;
/** RF-4: días sin usar la app hasta que vence la sesión. */
export const INACTIVITY_DAYS = { barber: 30, other: 60 } as const;

const sameEmail = (a: string | null, b: string | null) => !!a && !!b && a.trim().toLowerCase() === b.trim().toLowerCase();

/** Decide quién es quién (ADR-07 actualizado). Función pura: la usan getActor() y los tests. */
export function resolveActor(f: IdentityFacts): Actor {
  const c = f.claims;
  if (!c) return { kind: "none", reason: "no_session" };

  const actor = classify(f, c);
  if (actor.kind === "none") return actor;

  const limitDays = actor.kind === "barber" ? INACTIVITY_DAYS.barber : INACTIVITY_DAYS.other;
  if (f.lastSeenAt && f.now.getTime() - f.lastSeenAt.getTime() > limitDays * DAY_MS) {
    return { kind: "none", reason: "expired", signOut: true };
  }
  return actor;
}

function classify(f: IdentityFacts, c: SessionClaims): Actor {
  // Cuentas de prueba: solo con la demo activa (RF-24).
  if (f.demoAccount) {
    if (!f.demoEnabled) return { kind: "none", reason: "demo_disabled", signOut: true };
    if (f.demoAccount.kind === "barber") return { kind: "barber", userId: c.sub, demo: true };
    return {
      kind: "customer",
      userId: c.sub,
      customerId: f.holder?.customerId ?? f.demoAccount.customerId,
      profileComplete: f.holder?.profileComplete ?? false,
      demo: true,
    };
  }

  // Invitado: sesión anónima asociada a un cliente desde este dispositivo (RF-17, RF-18).
  if (c.isAnonymous) {
    return f.guestDevice
      ? { kind: "guest", userId: c.sub, customerId: f.guestDevice.customerId }
      : { kind: "none", reason: "guest_unregistered" };
  }

  // Google (spec de publicación): barbero solo con el email verificado igual al de Colo (RF-6, RF-7b, RF-7c).
  if (c.provider === "google") {
    if (c.emailVerified && sameEmail(c.email, f.barberEmail)) return { kind: "barber", userId: c.sub, demo: false };
    return {
      kind: "customer",
      userId: c.sub,
      customerId: f.holder?.customerId ?? null,
      profileComplete: f.holder?.profileComplete ?? false,
      demo: false,
    };
  }

  // Cualquier otra cuenta (correo y contraseña que no es de prueba): sin acceso (RF-1c).
  return { kind: "none", reason: "not_allowed", signOut: true };
}
