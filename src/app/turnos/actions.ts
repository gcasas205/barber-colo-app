"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { book, cancelByCustomer, dismissBarberNotice, rescheduleByCustomer } from "@/modules/appointments";
import { saveContact } from "@/modules/customers";
import type { Actor } from "@/modules/identity";
import { appointmentsDeps } from "@/server/appointments";
import { getActor } from "@/server/auth/actor";
import { customersStore } from "@/server/customers";
import type { TurnoView } from "./turno-view";

/** Lo que vuelve a la pantalla. Los códigos se pasan a palabras en el cliente (`turnosError`). */
export type TurnoResult =
  | { ok: true; late?: boolean; turno?: TurnoView }
  | { ok: false; error: string; fields?: Record<string, string>; confirmLate?: true };

const fail = (error: string, extra: Partial<Extract<TurnoResult, { ok: false }>> = {}): TurnoResult => ({ ok: false, error, ...extra });
/**
 * RNF-1: el resultado vuelve enseguida y la pantalla lo muestra; la foto de la agenda se actualiza después,
 * de fondo (el cliente llama a router.refresh), sin hacer esperar a la persona.
 */
const done = (extra: { late?: boolean; turno?: TurnoView } = {}): TurnoResult => ({ ok: true, ...extra });


type ClientActor = Extract<Actor, { kind: "customer" | "guest" }>;

/** Solo clientes e invitados reservan (RF-6); sin sesión, al ingreso. */
async function client(): Promise<ClientActor> {
  const actor = await getActor();
  if (actor.kind === "none") redirect("/");
  if (actor.kind === "barber") redirect("/colo");
  return actor;
}

const bookSchema = z.object({
  serviceId: z.string().max(10),
  start: z.number().int().positive(),
  name: z.string().max(200).optional(),
  phone: z.string().max(40).optional(),
  /** Spec 004b: para una persona a cargo de la cuenta (el caso de uso verifica que lo sea). */
  forCustomerId: z.string().max(40).optional(),
});

/** RF-7 a RF-12. Si faltan, primero se guardan nombre y celular (clarificación 1) y después se reserva. */
export async function bookAction(input: unknown): Promise<TurnoResult> {
  let actor = await client();
  const parsed = bookSchema.safeParse(input);
  if (!parsed.success) return fail("TRY_AGAIN");
  const { serviceId, start, name, phone, forCustomerId } = parsed.data;

  const needsContact = actor.kind === "guest" ? !actor.customerId : !actor.customerId || !actor.profileComplete;
  if (needsContact) {
    if (actor.kind === "customer" && !actor.customerId) return fail("TRY_AGAIN"); // cuenta de Google sin ficha (spec de publicación)
    const contact = await saveContact({ store: customersStore() }, actor, { name: name ?? "", phone: phone ?? "" });
    if (!contact.ok) {
      if (contact.error === "NOT_ALLOWED") return fail("TRY_AGAIN");
      return "fields" in contact.error ? fail("CONTACT", { fields: contact.error.fields }) : fail(contact.error.form);
    }
    actor = actor.kind === "guest" ? { ...actor, customerId: contact.value.customerId } : { ...actor, profileComplete: true };
  }

  const result = await book(appointmentsDeps(), actor, { serviceId, start: new Date(start), forCustomerId }, new Date());
  // 004c, RF-12: a Inicio con el turno nuevo. Redirigir desde la acción manda Inicio en la misma respuesta
  // (un solo viaje al servidor, RNF-1 de la 004).
  if (result.ok) {
    revalidatePath("/turnos");
    redirect(`/turnos?listo=reserva&turno=${encodeURIComponent(result.value.id)}`);
  }
  revalidatePath("/reservar"); // RF-9: los horarios se actualizan (004c: están en Reservar)
  if (typeof result.error === "object") return fail("HAS_UPCOMING");
  return fail(result.error);
}

/** RF-14, RF-15. */
export async function cancelAction(id: unknown, confirmLate: unknown): Promise<TurnoResult> {
  const actor = await client();
  if (typeof id !== "string") return fail("TRY_AGAIN");
  const result = await cancelByCustomer(appointmentsDeps(), actor, id, confirmLate === true, new Date());
  if (result.ok) return done({ late: result.value.late });
  if (result.error === "CONFIRM_LATE") return fail("CONFIRM_LATE", { confirmLate: true });
  revalidatePath("/turnos");
  return fail(result.error);
}

/** RF-16 a RF-18. */
export async function rescheduleAction(id: unknown, start: unknown, confirmLate: unknown): Promise<TurnoResult> {
  const actor = await client();
  if (typeof id !== "string" || typeof start !== "number" || !Number.isInteger(start)) return fail("TRY_AGAIN");
  const result = await rescheduleByCustomer(appointmentsDeps(), actor, id, new Date(start), confirmLate === true, new Date());
  if (result.ok) {
    revalidatePath("/turnos"); // 004c, RF-13: a Inicio, en la misma respuesta
    redirect(`/turnos?listo=cambio&turno=${encodeURIComponent(result.value.id)}`);
  }
  if (result.error === "CONFIRM_LATE") return fail("CONFIRM_LATE", { confirmLate: true });
  revalidatePath("/turnos");
  revalidatePath("/reservar");
  return fail(result.error);
}

/** RF-20: cerrar el aviso de Colo. */
export async function dismissNoticeAction(eventId: unknown): Promise<void> {
  const actor = await client();
  if (typeof eventId !== "string") return;
  await dismissBarberNotice(appointmentsDeps(), actor, eventId, new Date());
  revalidatePath("/turnos");
}
