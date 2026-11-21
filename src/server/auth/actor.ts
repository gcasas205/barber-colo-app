import "server-only";
import { cache } from "react";
import { resolveSession, type Actor } from "@/modules/identity";
import { createIdentityRepository } from "@/modules/identity/infrastructure/identity-repository";
import { database } from "@/shared/db/client";
import { authEnv } from "@/shared/config/env";
import { readClaims } from "./claims";
import { supabaseServer } from "./supabase";

/**
 * Quién es quién en este pedido (ADR-07). Es el único lugar que lee la sesión, y se memoriza por
 * pedido. La identidad sale de getClaims(), que verifica la firma del token; nunca de getSession().
 */
export const getActor = cache(async (): Promise<Actor> => {
  const env = authEnv();
  const supabase = await supabaseServer();
  const claims = await readClaims(supabase.auth);
  const actor = await resolveSession(
    {
      identities: createIdentityRepository(database()),
      config: { demoEnabled: env.DEMO_ENABLED, barberEmail: env.BARBER_EMAIL ?? null },
    },
    claims,
    new Date(),
  );
  if (actor.kind === "none" && actor.signOut) {
    // Sesión vencida, de prueba con la demo apagada o sin acceso: se cierra en este dispositivo.
    // En un Server Component no se pueden borrar cookies; igual el actor es "nadie" (RF-24).
    await supabase.auth.signOut({ scope: "local" }).catch(() => undefined);
  }
  return actor;
});
