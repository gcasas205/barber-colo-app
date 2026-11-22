"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { normalizeArPhone } from "@/modules/customers";
import type { Actor } from "@/modules/identity";
import { deactivateService, moveServiceOrder, reactivateService, saveService } from "@/modules/pricing";
import {
  addBlock,
  changeStep,
  removeBlock,
  saveBookingRules,
  saveContact,
  saveWeeklyRanges,
  validateBookingRules,
  type AffectedAppointment,
} from "@/modules/schedule";
import { getActor } from "@/server/auth/actor";
import { scheduleAdminDeps, serviceAdminDeps } from "@/server/settings";
import { formatDayLong, formatMinute, localDateOf, minuteOfDayOf, parseLocalDate, type IsoWeekday } from "@/shared/kernel";
import { settingsError, WEEKDAY_NAMES } from "./messages";

/** Turno que choca con el cambio (spec 004, RF-27), listo para mostrar con su enlace a la agenda. */
export type AffectedItem = { id: string; day: string; label: string };

/** Resultado para la pantalla: errores ya en palabras, por campo (RNF-4). */
export type SaveResult = { ok: true } | { ok: false; errors: Record<string, string>; confirmLast?: true; affected?: AffectedItem[] };

/** Spec 004, RF-27: no se guarda; Colo ve los turnos y va a la agenda de ese día a resolverlos. */
const blockedBy = (list: AffectedAppointment[]): SaveResult => ({
  ok: false,
  errors: { form: list.length === 1 ? "Hay un turno que quedaría afuera. Cancelalo o movelo primero." : `Hay ${list.length} turnos que quedarían afuera. Cancelalos o movelos primero.` },
  affected: list.map((a) => ({
    id: a.id,
    day: localDateOf(a.start),
    label: `${cap(formatDayLong(localDateOf(a.start)))}, ${formatMinute(minuteOfDayOf(a.start))} · ${a.customerName} · ${a.serviceName}`,
  })),
});
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

const PATH = "/colo/ajustes";
const saved = (): SaveResult => {
  revalidatePath(PATH);
  revalidatePath("/");
  return { ok: true };
};
const failed = (errors: Record<string, string>): SaveResult => ({ ok: false, errors });
const invalid = () => failed({ form: settingsError("TRY_AGAIN") });

/** RF-2: sin rol de barbero no se guarda nada y se va a la pantalla que corresponde. */
async function barber(): Promise<Actor> {
  const actor = await getActor();
  if (actor.kind !== "barber") redirect(actor.kind === "none" ? "/ingresar" : "/");
  return actor;
}

const minute = z.number().int().min(0).max(1440);
const weekday = z.number().int().min(1).max(7);
const rangesSchema = z.array(z.object({ weekday, opensAt: minute, closesAt: minute })).max(40);

/** RF-5, RF-6. */
export async function saveRangesAction(input: unknown): Promise<SaveResult> {
  const actor = await barber();
  const parsed = rangesSchema.safeParse(input);
  if (!parsed.success) return invalid();
  const ranges = parsed.data.map((r) => ({ ...r, weekday: r.weekday as IsoWeekday }));
  const result = await saveWeeklyRanges(scheduleAdminDeps(), actor, ranges, new Date());
  if (result.ok) return saved();
  if (result.error === "NOT_ALLOWED") redirect("/");
  if ("appointmentsAffected" in result.error) return blockedBy(result.error.appointmentsAffected);
  const errors: Record<string, string> = {};
  for (const e of result.error) {
    const key = "weekday" in e ? `day-${e.weekday}` : "form";
    errors[key] = errors[key] ? `${errors[key]} ${settingsError(e.code)}` : settingsError(e.code);
  }
  return failed(errors);
}

/** RF-8, RF-9. */
export async function changeStepAction(input: unknown): Promise<SaveResult> {
  const actor = await barber();
  const step = z.number().int().safeParse(input);
  if (!step.success) return invalid();
  const result = await changeStep(scheduleAdminDeps(), actor, step.data);
  if (result.ok) return saved();
  if (result.error === "NOT_ALLOWED") redirect("/");
  if (result.error.invalidStep) return failed({ step: settingsError("STEP_INVALID") });
  const parts = [
    result.error.services.length ? `la duración de ${result.error.services.join(", ")}` : null,
    result.error.weekdays.length ? `las franjas del ${result.error.weekdays.map((d) => WEEKDAY_NAMES[d].toLowerCase()).join(", ")}` : null,
  ].filter(Boolean);
  return failed({ step: `Con ese paso no coinciden ${parts.join(" ni ")}. Ajustalas antes de cambiar el paso.` });
}

/** RF-22 a RF-24: reglas de reserva y WhatsApp, en un mismo formulario. */
export async function saveBookingAction(input: unknown): Promise<SaveResult> {
  const actor = await barber();
  const parsed = z
    .object({ minNoticeMinutes: z.number().int(), maxAdvanceDays: z.number().int(), whatsapp: z.string().max(40) })
    .safeParse(input);
  if (!parsed.success) return invalid();
  // Se valida todo antes de guardar: o se guarda el formulario entero o nada.
  const errors: Record<string, string> = {};
  const phone = normalizeArPhone(parsed.data.whatsapp);
  if (!phone.ok) errors.whatsapp = settingsError(phone.error);
  const rules = { minNoticeMinutes: parsed.data.minNoticeMinutes, maxAdvanceDays: parsed.data.maxAdvanceDays };
  const valid = validateBookingRules(rules);
  if (!valid.ok) {
    for (const code of valid.error) errors[code === "MIN_NOTICE_OUT_OF_RANGE" ? "minNotice" : "maxAdvance"] = settingsError(code);
  }
  if (!phone.ok || Object.keys(errors).length) return failed(errors);
  const rulesResult = await saveBookingRules(scheduleAdminDeps(), actor, rules);
  const contact = await saveContact(scheduleAdminDeps(), actor, phone.value);
  return rulesResult.ok && contact.ok ? saved() : invalid();
}

const blockSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("days"), first: z.string(), last: z.string(), notice: z.string().max(400) }),
  z.object({ kind: z.literal("hours"), day: z.string(), from: minute, to: minute, notice: z.string().max(400) }),
]);

/** RF-10, RF-11. */
export async function addBlockAction(input: unknown): Promise<SaveResult> {
  const actor = await barber();
  const parsed = blockSchema.safeParse(input);
  if (!parsed.success) return invalid();
  const b = parsed.data;
  const first = parseLocalDate(b.kind === "days" ? b.first : b.day);
  const last = b.kind === "days" ? parseLocalDate(b.last) : first;
  if (!first || !last) return failed({ dates: "Elegí las fechas." });
  const draft = b.kind === "days" ? { kind: "days" as const, first, last } : { kind: "hours" as const, day: first, from: b.from, to: b.to };
  const result = await addBlock(scheduleAdminDeps(), actor, draft, b.notice, new Date());
  if (result.ok) return saved();
  if (result.error === "NOT_ALLOWED") redirect("/");
  if (typeof result.error === "object") return blockedBy(result.error.appointmentsAffected);
  return failed({ [result.error === "NOTICE_TOO_LONG" ? "notice" : "dates"]: settingsError(result.error) });
}

/** RF-12. */
export async function removeBlockAction(id: unknown): Promise<SaveResult> {
  const actor = await barber();
  if (typeof id !== "string") return invalid();
  const result = await removeBlock(scheduleAdminDeps(), actor, id);
  if (!result.ok && result.error === "NOT_ALLOWED") redirect("/");
  return saved(); // si ya no estaba, la lista se actualiza igual
}

const serviceSchema = z.object({
  id: z.string().nullable(),
  name: z.string().max(200),
  description: z.string().max(400),
  durationMinutes: z.number().int(),
  pesos: z.number().int(),
  countsForBenefits: z.boolean(),
});

/** RF-16, RF-17. El precio llega en pesos enteros y se guarda en centavos. */
export async function saveServiceAction(input: unknown): Promise<SaveResult> {
  const actor = await barber();
  const parsed = serviceSchema.safeParse(input);
  if (!parsed.success) return invalid();
  const { id, pesos, ...rest } = parsed.data;
  const result = await saveService(serviceAdminDeps(), actor, id, { ...rest, priceCents: pesos * 100 });
  if (result.ok) return saved();
  if (result.error === "NOT_ALLOWED") redirect("/");
  if (result.error === "NOT_FOUND") return invalid();
  const field: Record<string, string> = {
    NAME_LENGTH: "name",
    NAME_TAKEN: "name",
    DESCRIPTION_TOO_LONG: "description",
    DURATION_NOT_MULTIPLE_OF_STEP: "duration",
    DURATION_OUT_OF_RANGE: "duration",
  };
  return failed(Object.fromEntries(result.error.map((code) => [field[code] ?? "price", settingsError(code)])));
}

/** RF-18. */
export async function moveServiceAction(id: unknown, direction: unknown): Promise<SaveResult> {
  const actor = await barber();
  if (typeof id !== "string" || (direction !== "up" && direction !== "down")) return invalid();
  await moveServiceOrder(serviceAdminDeps(), actor, id, direction);
  return saved();
}

/** RF-19, RF-21. */
export async function deactivateServiceAction(id: unknown, confirmLast: unknown): Promise<SaveResult> {
  const actor = await barber();
  if (typeof id !== "string") return invalid();
  const result = await deactivateService(serviceAdminDeps(), actor, id, confirmLast === true);
  if (result.ok) return saved();
  if (result.error === "CONFIRM_LAST") return { ok: false, errors: {}, confirmLast: true };
  return invalid();
}

/** RF-20. */
export async function reactivateServiceAction(id: unknown): Promise<SaveResult> {
  const actor = await barber();
  if (typeof id !== "string") return invalid();
  const result = await reactivateService(serviceAdminDeps(), actor, id);
  if (result.ok) return saved();
  if (result.error === "NOT_ALLOWED" || result.error === "NOT_FOUND") return invalid();
  return failed({ form: result.error.map(settingsError).join(" ") });
}
