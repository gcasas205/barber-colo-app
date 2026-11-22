import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { getActor } from "@/server/auth/actor";
import { authEnv } from "@/shared/config/env";
import { SessionScreen } from "./_sesion/SessionScreen";
import { GuestForm } from "./ingresar/GuestForm";
import { LoginForm } from "./ingresar/LoginForm";
import { PrefetchNext } from "./ingresar/PrefetchNext";

/**
 * Spec 004, RF-1 y RF-2: la pantalla principal es el ingreso. Con sesión, cada uno va a lo suyo.
 * Ruta bloqueante, con la CSP con nonce (RNF-4 de la 002).
 */
export const instant = false;

export const metadata: Metadata = {
  title: "El Colo, Barbería y Peluquería",
  description: "Reservá tu turno con Colo: corte, completo y claritos.",
};

export default async function Home() {
  await connection();
  const actor = await getActor();
  if (actor.kind === "barber") redirect("/colo");
  if (actor.kind === "customer" || actor.kind === "guest") redirect("/turnos");
  return (
    <SessionScreen>
      <div className="flex flex-col gap-2">
        <h1 className="text-[28px] font-bold leading-tight">Reservá tu turno</h1>
        <p className="text-tinta-suave">Ingresá con tu cuenta o entrá como invitado para ver los horarios libres.</p>
      </div>
      <PrefetchNext />
      <LoginForm showDemoUsers={authEnv().DEMO_ENABLED} />
      <section aria-labelledby="titulo-invitado" className="flex flex-col gap-4 border-t-2 border-linea pt-6">
        <h2 id="titulo-invitado" className="text-[20px] font-bold">
          Entrar como invitado
        </h2>
        <GuestForm />
      </section>
    </SessionScreen>
  );
}
