import type { Metadata } from "next";
import { connection } from "next/server";
import { listCustomers } from "@/modules/customers";
import { getActor } from "@/server/auth/actor";
import { customersStore } from "@/server/customers";
import { DemoBanner } from "../../_sesion/DemoBanner";
import { NoAccess } from "../../_sesion/NoAccess";
import { SessionScreen } from "../../_sesion/SessionScreen";
import { ColoNav, ColoSignOut } from "../ColoNav";
import { CustomerList } from "../CustomerList";

/** Con sesión y CSP con nonce: ruta bloqueante (RNF-4 de la 002). */
export const instant = false;

export const metadata: Metadata = { title: "Clientes · El Colo", robots: { index: false } };

/** RF-19 a RF-21 de la 002: la lista de clientes, ahora como sección del panel (spec 004, RF-21). */
export default async function ClientesPage() {
  await connection();
  const actor = await getActor();
  if (actor.kind !== "barber") return <NoAccess actor={actor} />;
  const list = await listCustomers({ store: customersStore() }, actor, null);
  const { items, next } = list.ok ? list.value : { items: [], next: null };
  return (
    <SessionScreen banner={actor.demo ? <DemoBanner /> : null}>
      <ColoNav current="/colo/clientes" />
      <div className="flex flex-col gap-1">
        <h1 className="text-[28px] font-bold leading-tight">Clientes</h1>
        <p className="text-tinta-suave">Del más nuevo al más antiguo.</p>
      </div>
      <CustomerList initial={items} next={next} />
      <ColoSignOut />
    </SessionScreen>
  );
}
