import "server-only";
import { getDayAgenda } from "@/modules/appointments";
import type { Actor } from "@/modules/identity";
import { appointmentsDeps } from "@/server/appointments";
import { queries } from "@/server/composition";
import { addDays, instantAt, type LocalDate } from "@/shared/kernel";
import type { AgendaData } from "./AgendaScreen";

/** Lo que muestra la agenda de un día (RF-21 a RF-26). Solo lee: no marca el día como visto. */
export async function agendaData(actor: Actor, day: LocalDate, now: Date): Promise<AgendaData | null> {
  const range = { start: instantAt(day, 0), end: instantAt(addDays(day, 1), 0) };
  const [agenda, blocks] = await Promise.all([getDayAgenda(appointmentsDeps(), actor, day, now), queries().blocksOn(range)]);
  if (!agenda.ok) return null;
  return {
    day,
    turnos: agenda.value.items
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
      })),
    blocks: blocks.map((b) => ({
      start: b.start.getTime(),
      end: b.end.getTime(),
      notice: b.notice,
      allDay: b.start.getTime() <= range.start.getTime() && b.end.getTime() >= range.end.getTime(),
    })),
    newElsewhere: agenda.value.newElsewhere,
  };
}
