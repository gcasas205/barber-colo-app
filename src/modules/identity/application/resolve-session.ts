import { resolveActor, type Actor, type DemoKind, type SessionClaims } from "../domain/actor";

/** Lo que la base sabe de un usuario de Auth. */
export type StoredIdentity = {
  demoAccount: { kind: DemoKind; customerId: string | null } | null;
  guestDevice: { customerId: string } | null;
  holder: { customerId: string; profileComplete: boolean } | null;
  lastSeenAt: Date | null;
};

export interface IdentityRepository {
  load(userId: string): Promise<StoredIdentity>;
  touch(userId: string, at: Date): Promise<void>;
}

export type IdentityConfig = { demoEnabled: boolean; barberEmail: string | null };

/** No se escribe la actividad en cada pedido: alcanza con una vez por hora para medir 30 o 60 días. */
const TOUCH_EVERY_MS = 60 * 60 * 1000;

/** Caso de uso: de los claims verificados al actor, registrando la última actividad (RF-4). */
export async function resolveSession(
  deps: { identities: IdentityRepository; config: IdentityConfig },
  claims: SessionClaims | null,
  now: Date,
): Promise<Actor> {
  if (!claims) return { kind: "none", reason: "no_session" };
  const stored = await deps.identities.load(claims.sub);
  const actor = resolveActor({ claims, now, ...deps.config, ...stored });
  if (actor.kind !== "none" && (!stored.lastSeenAt || now.getTime() - stored.lastSeenAt.getTime() > TOUCH_EVERY_MS)) {
    await deps.identities.touch(claims.sub, now);
  }
  return actor;
}
