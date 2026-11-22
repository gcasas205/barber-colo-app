"use server";

import { barberFreeStarts, cancelByBarber, markAgendaSeen, rescheduleByBarber } from "@/modules/appointments";
import { appointmentsDeps } from "@/server/appointments";
import { getActor } from "@/server/auth/actor";
import { parseLocalDate } from "@/shared/kernel";
import { agendaData } from "./agenda-data";
import type { AgendaData } from "./AgendaScreen";

export type AgendaResult = { ok: true } | { ok: false; error: string };

const MESSAGES: Record<string, string> = {
  REASON_LENGTH: "Escribí el motivo (de 3 a 200 letras). Le llega al cliente.",
  SLOT_TAKEN: "Ese horario ya no está libre. Elegí otro.",
  NOT_FOUND: "Ese turno ya no está activo.",
  ENDED: "Ese turno ya terminó.",
  NOT_ALLOWED: "No tenés permiso para hacer esto.",
};
const fail = (code: string): AgendaResult => ({ ok: false, error: MESSAGES[code] ?? "No pudimos guardar. Probá de nuevo." });
/** La agenda vuelve a pedir el día por su cuenta (AgendaScreen): no hace falta rehacer la página. */
const done = (): AgendaResult => ({ ok: true });

/** Un día de la agenda, para cambiar de día sin recargar la pantalla y para precargar los vecinos. */
export async function loadAgendaDayAction(day: unknown): Promise<AgendaData | null> {
  if (typeof day !== "string") return null;
  const date = parseLocalDate(day);
  if (!date) return null;
  return agendaData(await getActor(), date, new Date());
}

/** RF-23: Colo tiene el día en pantalla. */
export async function markAgendaSeenAction(day: unknown): Promise<void> {
  if (typeof day !== "string") return;
  const date = parseLocalDate(day);
  if (date) await markAgendaSeen(appointmentsDeps(), await getActor(), date, new Date());
}

/** RF-24. La autorización está en el caso de uso (solo el barbero). */
export async function cancelTurnoAction(id: unknown, reason: unknown): Promise<AgendaResult> {
  if (typeof id !== "string" || typeof reason !== "string") return fail("TRY_AGAIN");
  const r = await cancelByBarber(appointmentsDeps(), await getActor(), id, reason.slice(0, 400), new Date());
  return r.ok ? done() : fail(r.error);
}

/** RF-25. */
export async function moveTurnoAction(id: unknown, start: unknown, reason: unknown): Promise<AgendaResult> {
  if (typeof id !== "string" || typeof start !== "number" || typeof reason !== "string") return fail("TRY_AGAIN");
  const r = await rescheduleByBarber(appointmentsDeps(), await getActor(), id, new Date(start), reason.slice(0, 400), new Date());
  return r.ok ? done() : fail(r.error);
}

/** RF-25: horarios libres de un día para mover el turno. */
export async function freeStartsAction(id: unknown, day: unknown): Promise<{ start: number; label: string }[]> {
  if (typeof id !== "string" || typeof day !== "string") return [];
  const date = parseLocalDate(day);
  if (!date) return [];
  const r = await barberFreeStarts(appointmentsDeps(), await getActor(), id, date, new Date());
  return r.ok ? r.value.map((s) => ({ start: s.start.getTime(), label: s.label })) : [];
}
