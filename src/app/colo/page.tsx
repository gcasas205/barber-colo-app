import type { Metadata } from "next";
import { LogOut, ShieldAlert } from "lucide-react";
import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { listCustomers } from "@/modules/customers";
import { getActor } from "@/server/auth/actor";
import { customersStore } from "@/server/customers";
import { Button } from "@/ui/Button";
import { Plate } from "@/ui/Plate";
import { BrandLoader } from "@/ui/brand/BrandLoader";
import { DemoBanner } from "../_sesion/DemoBanner";
import { SessionScreen } from "../_sesion/SessionScreen";
import { signOut, signOutEverywhere } from "../ingresar/actions";
import { CustomerList } from "./CustomerList";

export const metadata: Metadata = { title: "Panel de Colo · El Colo", robots: { index: false } };

export default function ColoPage() {
  return (
    <Suspense
      fallback={
        <SessionScreen>
          <BrandLoader label="Cargando clientes…" />
        </SessionScreen>
      }
    >
      <Panel />
    </Suspense>
  );
}

async function Panel() {
  await connection();
  const actor = await getActor();
  if (actor.kind !== "barber") {
    // RF-8: sin rol de barbero, ningún dato.
    return (
      <SessionScreen>
        <Plate className="flex flex-col items-start gap-3 p-5" role="alert">
          <h1 className="inline-flex items-center gap-2 text-[24px] font-bold leading-tight">
            <ShieldAlert aria-hidden size={26} strokeWidth={2.5} /> No tenés acceso a esta pantalla
          </h1>
          <Link href={actor.kind === "none" ? "/ingresar" : "/"} className="font-bold underline decoration-2 underline-offset-4">
            {actor.kind === "none" ? "Ingresar" : "Volver a los horarios"}
          </Link>
        </Plate>
      </SessionScreen>
    );
  }

  const list = await listCustomers({ store: customersStore() }, actor, null);
  const { items, next } = list.ok ? list.value : { items: [], next: null };
  return (
    <SessionScreen banner={actor.demo ? <DemoBanner /> : null}>
      <div className="flex flex-col gap-1">
        <h1 className="text-[28px] font-bold leading-tight">Hola, Colo</h1>
        <p className="text-tinta-suave">Tus clientes, del más nuevo al más antiguo.</p>
      </div>
      <section aria-labelledby="titulo-clientes" className="flex flex-col gap-3">
        <h2 id="titulo-clientes" className="text-[20px] font-bold">
          Clientes
        </h2>
        <CustomerList initial={items} next={next} />
      </section>
      <div className="flex flex-col items-start gap-1 border-t-2 border-linea pt-4">
        <form action={signOut}>
          <Button type="submit" variant="texto">
            <LogOut aria-hidden size={20} strokeWidth={2.5} /> Salir
          </Button>
        </form>
        <form action={signOutEverywhere}>
          <Button type="submit" variant="texto">
            <LogOut aria-hidden size={20} strokeWidth={2.5} /> Salir de todos los dispositivos
          </Button>
        </form>
      </div>
    </SessionScreen>
  );
}
