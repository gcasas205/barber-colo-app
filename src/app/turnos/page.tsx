import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { getMyAppointments } from "@/modules/appointments";
import { getOwnProfile, listDependents } from "@/modules/customers";
import { appointmentsDeps } from "@/server/appointments";
import { getActor } from "@/server/auth/actor";
import { customersStore } from "@/server/customers";
import { AppFrame } from "../_sesion/AppFrame";
import { DemoBanner } from "../_sesion/DemoBanner";
import { InicioClient, type Done, type NoticeView, type Person } from "./InicioClient";
import { displayName, toTurnoView, type TurnoView } from "./turno-view";

/** Con sesión y CSP con nonce: ruta bloqueante, sin <Suspense> (RNF-4 de la 002). */
export const instant = false;

export const metadata: Metadata = { title: "Inicio · El Colo", robots: { index: false } };

/** Spec 004c, RF-5 a RF-8: Inicio del cliente (la pantalla principal después de ingresar, D-18). */
export default async function InicioPage({ searchParams }: PageProps<"/turnos">) {
  await connection();
  const actor = await getActor();
  if (actor.kind === "none") redirect("/"); // RF-3 de la 004
  if (actor.kind === "barber") redirect("/colo");

  const now = new Date();
  const [mine, profile, dependents, params] = await Promise.all([
    getMyAppointments(appointmentsDeps(), actor, now),
    getOwnProfile({ store: customersStore() }, actor),
    listDependents({ store: customersStore() }, actor), // 004b: vacío para invitados
    searchParams,
  ]);

  const turnos: TurnoView[] = mine.appointments.flatMap((a) => toTurnoView(a, a.isSelf) ?? []);
  const n = mine.notice;
  const notice: NoticeView | null = n
    ? {
        eventId: n.eventId,
        kind: n.kind,
        serviceName: n.serviceName,
        fromStart: n.fromStart.getTime(),
        toStart: n.toStart?.getTime() ?? null,
        reason: n.reason,
        customerName: displayName(n.customerName),
        isSelf: n.isSelf,
      }
    : null;
  const people: Person[] = [
    { customerId: actor.customerId ?? "", name: "Vos", isSelf: true },
    ...dependents.map((d) => ({ customerId: d.id, name: displayName(d.name), isSelf: false })),
  ];
  const listo = params.listo;
  const done: Done =
    (listo === "reserva" || listo === "cambio") && typeof params.turno === "string" ? { kind: listo, turnoId: params.turno } : null;
  // RF-5: el nombre sin el apellido ni la marca de prueba.
  const name = profile?.fullName ? displayName(profile.fullName).split(" ")[0]! : null;

  return (
    <AppFrame area="cliente" current="/turnos" width="ancho" banner={actor.kind === "customer" && actor.demo ? <DemoBanner /> : null}>
      <InicioClient name={name} turnos={turnos} people={people} notice={notice} done={done} serverNow={now.getTime()} />
    </AppFrame>
  );
}
