import type { Actor } from "@/modules/identity";
import { dayStarts, type Interval } from "@/modules/schedule";
import { addDays, err, instantAt, localDateOf, ok, type LocalDate, type Result } from "@/shared/kernel";
import { changeTiming, customerCanReschedule, initialStatus, isUpcoming, validateBarberReason } from "../domain/policy";
import type { AgendaItem, Appointment, AppointmentsDeps, AppointmentsTx, BarberNotice } from "./ports";

const MINUTE = 60_000;
const NOT_ALLOWED = err("NOT_ALLOWED" as const);
const isActive = (a: Appointment) => a.status === "reserved" || a.status === "confirmed";

/** El cliente del actor, si ya tiene sus datos (RF-7: si no, hay que pedirlos antes de reservar). */
function customerOf(actor: Actor): { customerId: string; userId: string } | "NOT_ALLOWED" | "NEEDS_CONTACT" {
  if (actor.kind === "customer") {
    if (!actor.customerId || !actor.profileComplete) return "NEEDS_CONTACT";
    return { customerId: actor.customerId, userId: actor.userId };
  }
  if (actor.kind === "guest") return actor.customerId ? { customerId: actor.customerId, userId: actor.userId } : "NEEDS_CONTACT";
  return "NOT_ALLOWED";
}

/**
 * RF-9: ¿el servicio puede empezar en `start`? Se recalcula en el servidor con los datos de la base y el
 * mismo `dayStarts` que usa la pantalla. Para Colo (RF-25) no cuentan la anticipación mínima ni la ventana.
 */
async function isOffered(
  tx: AppointmentsTx,
  q: { start: Date; serviceMinutes: number; now: Date; exclude: string | null; forBarber: boolean },
): Promise<boolean> {
  const date: LocalDate = localDateOf(q.start);
  const range = { start: instantAt(date, 0), end: instantAt(addDays(date, 1), 0) };
  const ctx = await tx.slotContext(range, q.exclude);
  const config = q.forBarber ? { ...ctx.config, minNoticeMinutes: 0, maxAdvanceDays: 3650 } : ctx.config;
  const starts = dayStarts({ date, ranges: ctx.ranges, config, serviceMinutes: q.serviceMinutes, occupations: ctx.occupations, now: q.now });
  return starts.some((s) => s.start.getTime() === q.start.getTime());
}

const endOf = (start: Date, minutes: number): Interval => ({ start, end: new Date(start.getTime() + minutes * MINUTE) });

export type BookError = "NOT_ALLOWED" | "NEEDS_CONTACT" | "SERVICE_UNAVAILABLE" | "SLOT_TAKEN" | { hasUpcoming: Appointment };

/** RF-8 a RF-12. */
export async function book(
  deps: AppointmentsDeps,
  actor: Actor,
  input: { serviceId: string; start: Date },
  now: Date,
): Promise<Result<Appointment, BookError>> {
  const who = customerOf(actor);
  if (typeof who === "string") return err(who);
  return deps.transaction(async (tx) => {
    await tx.lockScheduleShared();
    if (!(await tx.lockCustomer(who.customerId))) return NOT_ALLOWED;
    const upcoming = await tx.upcomingFor(who.customerId, now);
    if (upcoming) return err({ hasUpcoming: upcoming }); // RF-10
    const service = await tx.service(input.serviceId);
    if (!service?.active) return err("SERVICE_UNAVAILABLE" as const);
    const ok_ = await isOffered(tx, { start: input.start, serviceMinutes: service.durationMinutes, now, exclude: null, forBarber: false });
    if (!ok_) return err("SLOT_TAKEN" as const);
    const period = endOf(input.start, service.durationMinutes);
    const status = initialStatus(input.start, now);
    const id = await tx.insert({ customerId: who.customerId, serviceId: service.id, period, status, priceCents: service.priceCents, bookedAt: now });
    if (id === "OVERLAP") return err("SLOT_TAKEN" as const); // RF-12: la base lo frenó
    await tx.addEvent({ appointmentId: id, at: now, actor: "customer", actorUserId: who.userId, kind: "booked", from: null, to: period, late: false, reason: null });
    return ok({
      id,
      customerId: who.customerId,
      serviceId: service.id,
      serviceName: service.name,
      ...period,
      status,
      priceCents: service.priceCents,
      customerReschedules: 0,
      bookedAt: now,
    });
  });
}

/** RF-13, RF-20: "Tu turno" y lo que hizo Colo que el cliente todavía no vio. */
export async function getMyAppointment(
  deps: AppointmentsDeps,
  actor: Actor,
  now: Date,
): Promise<{ appointment: Appointment | null; notice: BarberNotice | null }> {
  const who = customerOf(actor);
  if (typeof who === "string") return { appointment: null, notice: null };
  return deps.transaction(async (tx) => {
    const [appointment, notice] = await Promise.all([tx.upcomingFor(who.customerId, now), tx.unseenBarberNotice(who.customerId)]);
    return { appointment, notice };
  });
}

/** RF-20: el cliente cierra el aviso. */
export async function dismissBarberNotice(deps: AppointmentsDeps, actor: Actor, eventId: string, now: Date): Promise<void> {
  const who = customerOf(actor);
  if (typeof who === "string") return;
  await deps.transaction((tx) => tx.markNoticeSeen(eventId, who.customerId, now));
}

type ChangeError = "NOT_ALLOWED" | "NOT_FOUND" | "STARTED" | "CONFIRM_LATE";

/** El turno activo del cliente, con la fila bloqueada. */
async function ownActive(tx: AppointmentsTx, customerId: string, id: string): Promise<Appointment | null> {
  const a = await tx.get(id);
  return a && a.customerId === customerId && isActive(a) ? a : null;
}

/** RF-14, RF-15, RF-19. */
export async function cancelByCustomer(
  deps: AppointmentsDeps,
  actor: Actor,
  id: string,
  confirmLate: boolean,
  now: Date,
): Promise<Result<{ late: boolean }, ChangeError>> {
  const who = customerOf(actor);
  if (typeof who === "string") return NOT_ALLOWED;
  return deps.transaction(async (tx) => {
    const a = await ownActive(tx, who.customerId, id);
    if (!a) return err("NOT_FOUND" as const);
    const timing = changeTiming(a, now);
    if (timing === "started") return err("STARTED" as const);
    const late = timing === "late";
    if (late && !confirmLate) return err("CONFIRM_LATE" as const); // RF-15: primero se advierte
    await tx.setStatus(a.id, late ? "cancelled_late" : "cancelled");
    await tx.addEvent({ appointmentId: a.id, at: now, actor: "customer", actorUserId: who.userId, kind: "cancelled", from: a, to: null, late, reason: null });
    return ok({ late });
  });
}

/** RF-16 a RF-19 (P-14): mueve el mismo turno; conserva el precio. */
export async function rescheduleByCustomer(
  deps: AppointmentsDeps,
  actor: Actor,
  id: string,
  newStart: Date,
  confirmLate: boolean,
  now: Date,
): Promise<Result<Appointment, ChangeError | "RESCHEDULE_LIMIT" | "SLOT_TAKEN">> {
  const who = customerOf(actor);
  if (typeof who === "string") return NOT_ALLOWED;
  return deps.transaction(async (tx) => {
    await tx.lockScheduleShared();
    const a = await ownActive(tx, who.customerId, id);
    if (!a) return err("NOT_FOUND" as const);
    const can = customerCanReschedule(a, now);
    if (!can.ok) return can;
    const late = changeTiming(a, now) === "late";
    if (late && !confirmLate) return err("CONFIRM_LATE" as const); // RF-17
    const minutes = Math.round((a.end.getTime() - a.start.getTime()) / MINUTE);
    if (!(await isOffered(tx, { start: newStart, serviceMinutes: minutes, now, exclude: a.id, forBarber: false }))) return err("SLOT_TAKEN" as const);
    const period = endOf(newStart, minutes);
    const status = initialStatus(newStart, now);
    const reschedules = a.customerReschedules + 1;
    if ((await tx.move(a.id, period, status, reschedules)) === "OVERLAP") return err("SLOT_TAKEN" as const);
    await tx.addEvent({ appointmentId: a.id, at: now, actor: "customer", actorUserId: who.userId, kind: "rescheduled", from: a, to: period, late, reason: null });
    return ok({ ...a, ...period, status, customerReschedules: reschedules });
  });
}

/** Días con turnos nuevos que Colo todavía no vio (para avisarle desde la agenda de otro día). */
export type NewElsewhere = { date: LocalDate; count: number };
const AHEAD_DAYS = 90;

/**
 * RF-21 a RF-23: la agenda de un día. "Nuevo" = el cliente reservó o movió el turno después de la última vez
 * que Colo vio ESE día. También cuenta los turnos nuevos de otros días. Solo lee: el día queda visto con
 * `markAgendaSeen` cuando Colo lo tiene en pantalla (así se pueden precargar los días vecinos).
 */
export async function getDayAgenda(
  deps: AppointmentsDeps,
  actor: Actor,
  date: LocalDate,
  now: Date,
): Promise<Result<{ items: (AgendaItem & { isNew: boolean })[]; newElsewhere: NewElsewhere[] }, "NOT_ALLOWED">> {
  if (actor.kind !== "barber") return NOT_ALLOWED;
  return deps.transaction(async (tx) => {
    const today = localDateOf(now);
    const [items, upcoming, seen] = await Promise.all([
      tx.agenda({ start: instantAt(date, 0), end: instantAt(addDays(date, 1), 0) }),
      tx.agenda({ start: instantAt(today, 0), end: instantAt(addDays(today, AHEAD_DAYS), 0) }),
      tx.agendaSeen(actor.userId),
    ]);
    const isNew = (i: AgendaItem) => {
      const day = localDateOf(i.start);
      const seenAt = seen.get(day);
      return isActive(i) && !!i.lastCustomerChangeAt && (!seenAt || i.lastCustomerChangeAt.getTime() > seenAt.getTime());
    };
    const counts = new Map<LocalDate, number>();
    for (const i of upcoming) {
      const day = localDateOf(i.start);
      if (day !== date && isNew(i)) counts.set(day, (counts.get(day) ?? 0) + 1);
    }
    return ok({
      items: items.filter(isActive).map((i) => ({ ...i, isNew: isNew(i) })),
      newElsewhere: [...counts].sort(([a], [b]) => (a < b ? -1 : 1)).map(([d, count]) => ({ date: d, count })),
    });
  });
}

/** RF-23: Colo tiene el día en pantalla; desde ahora sus turnos dejan de ser nuevos. */
export async function markAgendaSeen(deps: AppointmentsDeps, actor: Actor, date: LocalDate, now: Date): Promise<void> {
  if (actor.kind !== "barber") return;
  await deps.transaction((tx) => tx.setAgendaSeen(actor.userId, date, now));
}

type BarberChangeError = "NOT_ALLOWED" | "NOT_FOUND" | "REASON_LENGTH" | "ENDED";

/** RF-24 (P-05): Colo cancela con motivo, sin consecuencias para el cliente. */
export async function cancelByBarber(
  deps: AppointmentsDeps,
  actor: Actor,
  id: string,
  rawReason: string,
  now: Date,
): Promise<Result<void, BarberChangeError>> {
  if (actor.kind !== "barber") return NOT_ALLOWED;
  const reason = validateBarberReason(rawReason);
  if (!reason.ok) return reason;
  return deps.transaction(async (tx) => {
    const a = await tx.get(id);
    if (!a || !isActive(a)) return err("NOT_FOUND" as const);
    if (!isUpcoming(a, now)) return err("ENDED" as const);
    await tx.setStatus(a.id, "cancelled");
    await tx.addEvent({ appointmentId: a.id, at: now, actor: "barber", actorUserId: actor.userId, kind: "cancelled", from: a, to: null, late: false, reason: reason.value });
    return ok(undefined);
  });
}

/** RF-25 (P-14): Colo mueve con motivo, sin anticipación mínima ni ventana; no consume el límite del cliente. */
export async function rescheduleByBarber(
  deps: AppointmentsDeps,
  actor: Actor,
  id: string,
  newStart: Date,
  rawReason: string,
  now: Date,
): Promise<Result<void, BarberChangeError | "SLOT_TAKEN">> {
  if (actor.kind !== "barber") return NOT_ALLOWED;
  const reason = validateBarberReason(rawReason);
  if (!reason.ok) return reason;
  return deps.transaction(async (tx) => {
    await tx.lockScheduleShared();
    const a = await tx.get(id);
    if (!a || !isActive(a)) return err("NOT_FOUND" as const);
    if (!isUpcoming(a, now)) return err("ENDED" as const);
    const minutes = Math.round((a.end.getTime() - a.start.getTime()) / MINUTE);
    if (!(await isOffered(tx, { start: newStart, serviceMinutes: minutes, now, exclude: a.id, forBarber: true }))) return err("SLOT_TAKEN" as const);
    const period = endOf(newStart, minutes);
    if ((await tx.move(a.id, period, initialStatus(newStart, now), a.customerReschedules)) === "OVERLAP") return err("SLOT_TAKEN" as const);
    await tx.addEvent({ appointmentId: a.id, at: now, actor: "barber", actorUserId: actor.userId, kind: "rescheduled", from: a, to: period, late: false, reason: reason.value });
    return ok(undefined);
  });
}

/** RF-25: horarios a los que Colo puede mover un turno un día dado (sin anticipación mínima ni ventana). */
export async function barberFreeStarts(
  deps: AppointmentsDeps,
  actor: Actor,
  id: string,
  date: LocalDate,
  now: Date,
): Promise<Result<{ start: Date; label: string }[], "NOT_ALLOWED" | "NOT_FOUND">> {
  if (actor.kind !== "barber") return NOT_ALLOWED;
  return deps.transaction(async (tx) => {
    const a = await tx.get(id);
    if (!a || !isActive(a)) return err("NOT_FOUND" as const);
    const ctx = await tx.slotContext({ start: instantAt(date, 0), end: instantAt(addDays(date, 1), 0) }, a.id);
    const minutes = Math.round((a.end.getTime() - a.start.getTime()) / MINUTE);
    const config = { ...ctx.config, minNoticeMinutes: 0, maxAdvanceDays: 3650 };
    const starts = dayStarts({ date, ranges: ctx.ranges, config, serviceMinutes: minutes, occupations: ctx.occupations, now });
    return ok(starts.filter((s) => s.start.getTime() !== a.start.getTime()).map((s) => ({ start: s.start, label: s.label })));
  });
}
