import type { Metadata } from "next";
import { ChevronLeft, ChevronRight, Sparkles } from "lucide-react";
import Link from "next/link";
import { connection } from "next/server";
import { getDayAgenda } from "@/modules/appointments";
import { appointmentsDeps } from "@/server/appointments";
import { getActor } from "@/server/auth/actor";
import { queries } from "@/server/composition";
import { addDays, formatDayLong, formatDayShort, instantAt, localDateOf, parseLocalDate } from "@/shared/kernel";
import { DemoBanner } from "../_sesion/DemoBanner";
import { NoAccess } from "../_sesion/NoAccess";
import { SessionScreen } from "../_sesion/SessionScreen";
import { AgendaDay, type AgendaBlock, type AgendaTurno } from "./AgendaDay";
import { ColoNav, ColoSignOut } from "./ColoNav";

/** Con sesión y CSP con nonce: ruta bloqueante, sin <Suspense> (RNF-4 de la 002). */
export const instant = false;

export const metadata: Metadata = { title: "Agenda · El Colo", robots: { index: false } };

const ARROW =
  "grid min-h-[52px] min-w-[52px] place-items-center rounded-[var(--radius-control)] bg-chapa shadow-[inset_0_0_0_2px_var(--linea)] focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-poste";
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/** Spec 004, RF-21 a RF-26: la pantalla principal de Colo es la agenda del día. */
export default async function AgendaPage({ searchParams }: PageProps<"/colo">) {
  await connection();
  const actor = await getActor();
  if (actor.kind !== "barber") return <NoAccess actor={actor} />; // RF-8 de la 002: ningún dato

  const now = new Date();
  const today = localDateOf(now);
  const asked = (await searchParams).dia;
  const day = (typeof asked === "string" && parseLocalDate(asked)) || today;
  const range = { start: instantAt(day, 0), end: instantAt(addDays(day, 1), 0) };
  const [agenda, blocks] = await Promise.all([getDayAgenda(appointmentsDeps(), actor, day, now), queries().blocksOn(range)]);

  const turnos: AgendaTurno[] = agenda.ok
    ? agenda.value.items
        .filter((a) => a.status === "reserved" || a.status === "confirmed")
        .map((a) => ({
          id: a.id,
          serviceName: a.serviceName,
          start: a.start.getTime(),
          end: a.end.getTime(),
          status: a.status as "reserved" | "confirmed",
          priceCents: a.priceCents,
          customer: a.customer,
          isNew: a.isNew,
        }))
    : [];
  const dayBlocks: AgendaBlock[] = blocks.map((b) => ({
    start: b.start.getTime(),
    end: b.end.getTime(),
    notice: b.notice,
    allDay: b.start.getTime() <= range.start.getTime() && b.end.getTime() >= range.end.getTime(),
  }));

  return (
    <SessionScreen banner={actor.demo ? <DemoBanner /> : null}>
      <ColoNav current="/colo" />
      <div className="flex items-center gap-3">
        <Link href={`/colo?dia=${addDays(day, -1)}`} className={ARROW} aria-label="Día anterior">
          <ChevronLeft aria-hidden size={24} strokeWidth={2.5} />
        </Link>
        <div className="flex min-w-0 flex-1 flex-col items-center text-center">
          <h1 className="text-[24px] font-bold leading-tight">{day === today ? "Hoy" : cap(formatDayLong(day))}</h1>
          {day === today ? <p className="text-tinta-suave">{cap(formatDayLong(day))}</p> : null}
        </div>
        <Link href={`/colo?dia=${addDays(day, 1)}`} className={ARROW} aria-label="Día siguiente">
          <ChevronRight aria-hidden size={24} strokeWidth={2.5} />
        </Link>
      </div>
      {day !== today ? (
        <Link href="/colo" className="self-center font-bold underline decoration-2 underline-offset-4">
          Volver a hoy
        </Link>
      ) : null}
      {agenda.ok && agenda.value.newElsewhere.length > 0 ? (
        <section aria-labelledby="titulo-nuevos" className="flex flex-col gap-2 rounded-[var(--radius-chapa)] bg-chapa px-4 py-3 shadow-[inset_0_0_0_3px_var(--espera)]">
          <h2 id="titulo-nuevos" className="inline-flex items-center gap-2 font-bold">
            <Sparkles aria-hidden size={18} strokeWidth={2.5} /> Turnos nuevos en otros días
          </h2>
          <ul className="flex flex-wrap gap-x-4 gap-y-1">
            {agenda.value.newElsewhere.map((n) => (
              <li key={n.date}>
                <Link href={`/colo?dia=${n.date}`} className="inline-flex min-h-[44px] items-center font-bold underline decoration-2 underline-offset-4">
                  {cap(formatDayShort(n.date))}: {n.count === 1 ? "1 turno" : `${n.count} turnos`}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
      <AgendaDay key={day} day={day} turnos={turnos} blocks={dayBlocks} />
      <ColoSignOut />
    </SessionScreen>
  );
}
