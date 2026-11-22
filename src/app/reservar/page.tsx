import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { getMyAppointments } from "@/modules/appointments";
import { formatArPhone, getOwnProfile, listDependents } from "@/modules/customers";
import { appointmentsDeps } from "@/server/appointments";
import { getActor } from "@/server/auth/actor";
import { queries } from "@/server/composition";
import { customersStore } from "@/server/customers";
import { NoServices } from "../_reservar/Notices";
import { AppFrame } from "../_sesion/AppFrame";
import { DemoBanner } from "../_sesion/DemoBanner";
import { displayName, toTurnoView, type TurnoView } from "../turnos/turno-view";
import { ReservarClient, type ContactNeeds, type Member } from "./ReservarClient";

/** Con sesión y CSP con nonce: ruta bloqueante, sin <Suspense> (RNF-4 de la 002). */
export const instant = false;

export const metadata: Metadata = { title: "Reservar · El Colo", robots: { index: false } };

/** Spec 004c, RF-9 a RF-14 (con las reglas de la 004 y la 004b). `?cambiar=<id>`: cambiar ese turno. */
export default async function ReservarPage({ searchParams }: PageProps<"/reservar">) {
  await connection();
  const actor = await getActor();
  if (actor.kind === "none") redirect("/");
  if (actor.kind === "barber") redirect("/colo");

  const now = new Date();
  const q = queries();
  const [services, snapshot, mine, profile, dependents, params] = await Promise.all([
    q.listServices(),
    q.getScheduleSnapshot(now),
    getMyAppointments(appointmentsDeps(), actor, now),
    getOwnProfile({ store: customersStore() }, actor),
    listDependents({ store: customersStore() }, actor),
    searchParams,
  ]);

  const turnos: TurnoView[] = mine.appointments.flatMap((a) => toTurnoView(a, a.isSelf) ?? []);
  // Solo un turno de la cuenta (RF-15 de la 004b); si no, se reserva uno nuevo.
  const cambiar = typeof params.cambiar === "string" ? (turnos.find((t) => t.id === params.cambiar) ?? null) : null;
  const members: Member[] = [
    { customerId: actor.customerId ?? "", name: "Vos", isSelf: true },
    ...dependents.map((d) => ({ customerId: d.id, name: displayName(d.name), isSelf: false })),
  ];
  const contact: ContactNeeds = {
    needed: actor.kind === "guest" ? !actor.customerId : !actor.profileComplete,
    name: profile?.fullName.replace(/ \(demo\)$/, "") ?? "",
    phone: profile?.phone ? formatArPhone(profile.phone) : "",
  };

  return (
    <AppFrame area="cliente" current="/reservar" width="ancho" banner={actor.kind === "customer" && actor.demo ? <DemoBanner /> : null}>
      {services.length === 0 && !cambiar ? (
        <NoServices whatsapp={snapshot.contactWhatsapp} />
      ) : (
        <ReservarClient
          key={cambiar?.id ?? "nuevo"}
          services={services}
          snapshot={snapshot}
          members={members}
          turnos={turnos}
          turno={cambiar}
          contact={contact}
        />
      )}
    </AppFrame>
  );
}
