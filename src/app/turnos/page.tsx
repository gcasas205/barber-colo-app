import type { Metadata } from "next";
import { UserRound } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { getMyAppointments } from "@/modules/appointments";
import { formatArPhone, getOwnProfile, listDependents } from "@/modules/customers";
import { appointmentsDeps } from "@/server/appointments";
import { getActor } from "@/server/auth/actor";
import { queries } from "@/server/composition";
import { customersStore } from "@/server/customers";
import { NoServices } from "../_reservar/Notices";
import { PublicHeader } from "../_reservar/PublicHeader";
import { SiteFooter } from "../_reservar/SiteFooter";
import { DemoBanner } from "../_sesion/DemoBanner";
import { TurnosClient, type ContactNeeds, type Member, type MyTurno, type NoticeView } from "./TurnosClient";
import { displayName, toTurnoView } from "./turno-view";

/** Con sesión y CSP con nonce: ruta bloqueante, sin <Suspense> (RNF-4 de la 002). */
export const instant = false;

export const metadata: Metadata = { title: "Turnos · El Colo", robots: { index: false } };

const HEADER_LINK =
  "inline-flex min-h-[44px] items-center gap-1.5 rounded-[10px] px-3 text-[15px] font-bold text-sobre-esmalte hover:bg-[rgb(243_245_244/0.12)] focus-visible:outline focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-poste";

/** Spec 004, RF-2 y RF-6 a RF-20: la pantalla principal después de ingresar. */
export default async function TurnosPage() {
  await connection();
  const actor = await getActor();
  if (actor.kind === "none") redirect("/"); // RF-3
  if (actor.kind === "barber") redirect("/colo");

  const now = new Date();
  const q = queries();
  const [services, snapshot, mine, profile, dependents] = await Promise.all([
    q.listServices(),
    q.getScheduleSnapshot(now),
    getMyAppointments(appointmentsDeps(), actor, now),
    getOwnProfile({ store: customersStore() }, actor),
    listDependents({ store: customersStore() }, actor), // 004b: vacío para invitados
  ]);

  const turnos: MyTurno[] = mine.appointments.flatMap((a) => toTurnoView(a, a.isSelf) ?? []);
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
  // 004b, RF-8: el cliente ("Vos") y sus personas a cargo. Una cuenta de Google sin ficha todavía no tiene id.
  const members: Member[] = [
    { customerId: actor.customerId ?? "", name: "Vos", isSelf: true },
    ...dependents.map((d) => ({ customerId: d.id, name: displayName(d.name), isSelf: false })),
  ];
  // RF-7: nombre y celular se piden al reservar, solo si faltan.
  const needed = actor.kind === "guest" ? !actor.customerId : !actor.profileComplete;
  const contact: ContactNeeds = {
    needed,
    name: profile?.fullName.replace(/ \(demo\)$/, "") ?? "",
    phone: profile?.phone ? formatArPhone(profile.phone) : "",
  };
  const demo = actor.kind === "customer" && actor.demo;

  return (
    <div className="flex min-h-dvh flex-col">
      {demo ? <DemoBanner /> : null}
      <PublicHeader
        session={
          <Link href="/perfil" className={HEADER_LINK}>
            <UserRound aria-hidden size={20} strokeWidth={2.5} /> Mi perfil
          </Link>
        }
      />
      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-7 px-4 pb-12 pt-6 lg:px-8 lg:pt-10">
        {services.length === 0 && turnos.length === 0 ? (
          <NoServices whatsapp={snapshot.contactWhatsapp} />
        ) : (
          <TurnosClient services={services} snapshot={snapshot} turnos={turnos} members={members} notice={notice} contact={contact} />
        )}
      </main>
      <SiteFooter whatsapp={snapshot.contactWhatsapp} />
    </div>
  );
}
