import type { Metadata } from "next";
import { connection } from "next/server";
import { getActor } from "@/server/auth/actor";
import { localDateOf, parseLocalDate } from "@/shared/kernel";
import { DemoBanner } from "../_sesion/DemoBanner";
import { NoAccess } from "../_sesion/NoAccess";
import { AppFrame } from "../_sesion/AppFrame";
import { agendaData } from "./agenda-data";
import { AgendaScreen } from "./AgendaScreen";
import { ColoSignOut } from "./ColoNav";

/** Con sesión y CSP con nonce: ruta bloqueante, sin <Suspense> (RNF-4 de la 002). */
export const instant = false;

export const metadata: Metadata = { title: "Agenda · El Colo", robots: { index: false } };

/** Spec 004, RF-21 a RF-26: la pantalla principal de Colo es la agenda del día. */
export default async function AgendaPage({ searchParams }: PageProps<"/colo">) {
  await connection();
  const actor = await getActor();
  if (actor.kind !== "barber") return <NoAccess actor={actor} />; // RF-8 de la 002: ningún dato

  const now = new Date();
  const today = localDateOf(now);
  const asked = (await searchParams).dia;
  const day = (typeof asked === "string" && parseLocalDate(asked)) || today;
  const data = await agendaData(actor, day, now);
  if (!data) return <NoAccess actor={actor} />;

  return (
    <AppFrame area="colo" current="/colo" banner={actor.demo ? <DemoBanner /> : null}>
      <AgendaScreen initial={data} today={today} renderedAt={now.getTime()} />
      <ColoSignOut />
    </AppFrame>
  );
}
