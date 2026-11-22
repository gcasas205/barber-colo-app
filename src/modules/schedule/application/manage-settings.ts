import type { Actor } from "@/modules/identity";
import { err, ok, type LocalDate, type MinuteOfDay, type Result } from "@/shared/kernel";
import type { WeeklyRange } from "../domain/schedule";
import {
  blockOfDays,
  blockOfHours,
  isWhatsapp,
  validateBookingRules,
  validateNewBlock,
  validateNotice,
  validateStepChange,
  validateWeeklyRanges,
  type BlockError,
  type BookingRules,
  type BookingRulesError,
  type RangesError,
  type StepChangeError,
} from "../domain/settings";
import { intervalsOutside, intervalsOverlapping } from "../domain/settings";
import type { AffectedAppointment, BlockRecord, ScheduleAdminDeps, ScheduleSettings } from "./ports";

/** RF-2: solo el barbero (Colo o Colo demo, RF-28) toca los Ajustes. */
type Barber = Extract<Actor, { kind: "barber" }>;
const isBarber = (actor: Actor): actor is Barber => actor.kind === "barber";
const NOT_ALLOWED = err("NOT_ALLOWED" as const);

export type ScheduleView = ScheduleSettings & { ranges: WeeklyRange[]; blocks: BlockRecord[] };

/** Lo que muestra la pantalla de Ajustes de la agenda. */
export async function getScheduleSettings(
  deps: ScheduleAdminDeps,
  actor: Actor,
  now: Date,
): Promise<Result<ScheduleView, "NOT_ALLOWED">> {
  if (!isBarber(actor)) return NOT_ALLOWED;
  return deps.transaction(async ({ admin }) => {
    const settings = await admin.lockSettings();
    const [ranges, blocks] = await Promise.all([admin.weeklyRanges(), admin.currentBlocks(now)]);
    return ok({ ...settings, ranges, blocks });
  });
}

/** Spec 004, RF-27: hay turnos que quedarían afuera; Colo los resuelve antes de guardar. */
export type AppointmentsAffected = { appointmentsAffected: AffectedAppointment[] };

/** RF-5, RF-6: reemplaza todas las franjas de una vez, validadas con el paso del momento. */
export async function saveWeeklyRanges(
  deps: ScheduleAdminDeps,
  actor: Actor,
  ranges: WeeklyRange[],
  now: Date,
): Promise<Result<void, "NOT_ALLOWED" | RangesError[] | AppointmentsAffected>> {
  if (!isBarber(actor)) return NOT_ALLOWED;
  return deps.transaction(async ({ admin, audit, upcomingAppointments }) => {
    const { config } = await admin.lockSettings();
    const valid = validateWeeklyRanges(ranges, config.stepMinutes);
    if (!valid.ok) return valid;
    const outside = intervalsOutside(await upcomingAppointments(now), ranges);
    if (outside.length > 0) return err({ appointmentsAffected: outside });
    await admin.replaceWeeklyRanges(ranges);
    await audit.record({ area: "franjas", userId: actor.userId, detail: { ranges } });
    return ok(undefined);
  });
}

/** RF-8, RF-9. */
export async function changeStep(
  deps: ScheduleAdminDeps,
  actor: Actor,
  stepMinutes: number,
): Promise<Result<void, "NOT_ALLOWED" | StepChangeError>> {
  if (!isBarber(actor)) return NOT_ALLOWED;
  return deps.transaction(async ({ admin, audit, activeServices }) => {
    const { config } = await admin.lockSettings();
    if (config.stepMinutes === stepMinutes) return ok(undefined);
    const [ranges, services] = await Promise.all([admin.weeklyRanges(), activeServices()]);
    const valid = validateStepChange(stepMinutes, ranges, services);
    if (!valid.ok) return valid;
    await admin.updateStep(stepMinutes);
    await audit.record({ area: "paso", userId: actor.userId, detail: { from: config.stepMinutes, to: stepMinutes } });
    return ok(undefined);
  });
}

/** RF-22, RF-24. */
export async function saveBookingRules(
  deps: ScheduleAdminDeps,
  actor: Actor,
  rules: BookingRules,
): Promise<Result<void, "NOT_ALLOWED" | BookingRulesError[]>> {
  if (!isBarber(actor)) return NOT_ALLOWED;
  const valid = validateBookingRules(rules);
  if (!valid.ok) return valid;
  return deps.transaction(async ({ admin, audit }) => {
    await admin.lockSettings();
    await admin.updateBookingRules(rules);
    await audit.record({ area: "reserva", userId: actor.userId, detail: rules });
    return ok(undefined);
  });
}

/** RF-23, RF-24. Recibe el número ya normalizado por la interfaz (`normalizeArPhone` de Clientes). */
export async function saveContact(
  deps: ScheduleAdminDeps,
  actor: Actor,
  whatsapp: string,
): Promise<Result<void, "NOT_ALLOWED" | "WHATSAPP_INVALID">> {
  if (!isBarber(actor)) return NOT_ALLOWED;
  if (!isWhatsapp(whatsapp)) return err("WHATSAPP_INVALID");
  return deps.transaction(async ({ admin, audit }) => {
    await admin.lockSettings();
    await admin.updateContact(whatsapp);
    await audit.record({ area: "contacto", userId: actor.userId, detail: { whatsapp } });
    return ok(undefined);
  });
}

export type BlockDraft =
  | { kind: "days"; first: LocalDate; last: LocalDate }
  | { kind: "hours"; day: LocalDate; from: MinuteOfDay; to: MinuteOfDay };

/** RF-10, RF-11, RF-13 (los bloqueos se pueden superponer). */
export async function addBlock(
  deps: ScheduleAdminDeps,
  actor: Actor,
  draft: BlockDraft,
  rawNotice: string,
  now: Date,
): Promise<Result<{ id: string }, "NOT_ALLOWED" | BlockError | "NOTICE_TOO_LONG" | AppointmentsAffected>> {
  if (!isBarber(actor)) return NOT_ALLOWED;
  const notice = validateNotice(rawNotice);
  if (!notice.ok) return notice;
  const block = draft.kind === "days" ? blockOfDays(draft.first, draft.last) : blockOfHours(draft.day, draft.from, draft.to);
  if (!block.ok) return block;
  const current = validateNewBlock(block.value, now);
  if (!current.ok) return current;
  return deps.transaction(async ({ admin, audit, upcomingAppointments }) => {
    await admin.lockSettings(); // espera a las reservas en curso (spec 004, clarificación 4)
    const inside = intervalsOverlapping(await upcomingAppointments(now), block.value);
    if (inside.length > 0) return err({ appointmentsAffected: inside });
    const id = await admin.insertBlock(block.value, notice.value, actor.userId);
    await audit.record({
      area: "bloqueos",
      userId: actor.userId,
      detail: { added: id, start: block.value.start.toISOString(), end: block.value.end.toISOString(), notice: notice.value },
    });
    return ok({ id });
  });
}

/** RF-12: borrar un bloqueo devuelve esos horarios. */
export async function removeBlock(
  deps: ScheduleAdminDeps,
  actor: Actor,
  id: string,
): Promise<Result<void, "NOT_ALLOWED" | "NOT_FOUND">> {
  if (!isBarber(actor)) return NOT_ALLOWED;
  return deps.transaction(async ({ admin, audit }) => {
    if (!(await admin.deleteBlock(id))) return err("NOT_FOUND" as const);
    await audit.record({ area: "bloqueos", userId: actor.userId, detail: { removed: id } });
    return ok(undefined);
  });
}
