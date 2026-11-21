import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { getActor } from "@/server/auth/actor";
import { authEnv } from "@/shared/config/env";
import { BrandLoader } from "@/ui/brand/BrandLoader";
import { SessionScreen } from "../_sesion/SessionScreen";
import { GuestForm } from "./GuestForm";
import { LoginForm } from "./LoginForm";

export const metadata: Metadata = { title: "Ingresar · El Colo", robots: { index: false } };

export default function IngresarPage() {
  return (
    <SessionScreen>
      <h1 className="text-[28px] font-bold leading-tight">Ingresar</h1>
      <Suspense fallback={<BrandLoader label="Cargando…" />}>
        <Forms />
      </Suspense>
    </SessionScreen>
  );
}

async function Forms() {
  await connection();
  const actor = await getActor();
  // Con sesión, no tiene sentido ingresar de nuevo.
  if (actor.kind === "barber") redirect("/colo");
  if (actor.kind === "customer" || actor.kind === "guest") redirect("/perfil");
  return (
    <>
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
