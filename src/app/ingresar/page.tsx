import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { getActor } from "@/server/auth/actor";
import { authEnv } from "@/shared/config/env";
import { SessionScreen } from "../_sesion/SessionScreen";
import { GuestForm } from "./GuestForm";
import { LoginForm } from "./LoginForm";
import { PrefetchNext } from "./PrefetchNext";

/**
 * RNF-4: ruta bloqueante, renderizada entera en cada pedido. La CSP con nonce no es compatible con el
 * prerenderizado parcial (los scripts del armazón prerenderizado no tendrían el nonce).
 */
export const instant = false;

export const metadata: Metadata = { title: "Ingresar · El Colo", robots: { index: false } };

export default async function IngresarPage() {
  await connection(); // RNF-4: ver `instant` arriba
  return (
    <SessionScreen>
      <h1 className="text-[28px] font-bold leading-tight">Ingresar</h1>
      <Forms />
    </SessionScreen>
  );
}

async function Forms() {
  const actor = await getActor();
  // Con sesión, no tiene sentido ingresar de nuevo.
  if (actor.kind === "barber") redirect("/colo");
  if (actor.kind === "customer" || actor.kind === "guest") redirect("/perfil");
  return (
    <>
      <PrefetchNext />
      <LoginForm showDemoUsers={authEnv().DEMO_ENABLED} />
      <section aria-labelledby="titulo-invitado" className="flex flex-col gap-4 border-t-2 border-linea pt-6">
        <h2 id="titulo-invitado" className="text-[20px] font-bold">
          Entrar como invitado
        </h2>
        <GuestForm />
      </section>
    </>
  );
}
