import {
  addDays,
  compareLocalDate,
  err,
  instantAt,
  isMinuteOfDay,
  isoWeekday,
  localDateOf,
  minuteOfDayOf,
  MINUTES_PER_DAY,
  ok,
  type IsoWeekday,
  type LocalDate,
  type MinuteOfDay,
  type Result,
} from "@/shared/kernel";
import { ALLOWED_STEPS, type Interval, type WeeklyRange } from "./schedule";
import { validateSchedule, type ScheduleError } from "./validate";

/** Rangos permitidos de la spec 003 ("Definiciones"). */
export const SETTINGS_LIMITS = {
  rangesPerDay: 4,
  minNotice: { min: 0, max: 48 * 60, step: 15 },
  maxAdvanceDays: { min: 1, max: 90 },
  noticeLength: 80,
  /** Las horas de un bloqueo de horas van de 5 en 5 minutos (el paso más chico). */
  blockMinuteStep: 5,
} as const;

export type RangesError = ScheduleError | { code: "RANGE_NOT_ON_STEP"; weekday: IsoWeekday } | { code: "TOO_MANY_RANGES"; weekday: IsoWeekday };

/** RF-6: las reglas de la 001 (RF-12), más horas múltiplo del paso y como mucho 4 franjas por día. */
export function validateWeeklyRanges(ranges: WeeklyRange[], stepMinutes: number): Result<void, RangesError[]> {
  const base = validateSchedule(ranges, stepMinutes);
  const errors: RangesError[] = base.ok ? [] : [...base.error];
  const offStep = new Set<IsoWeekday>();
  const perDay = new Map<IsoWeekday, number>();
  for (const range of ranges) {
    perDay.set(range.weekday, (perDay.get(range.weekday) ?? 0) + 1);
    if (range.opensAt % stepMinutes !== 0 || range.closesAt % stepMinutes !== 0) offStep.add(range.weekday);
  }
  for (const weekday of offStep) errors.push({ code: "RANGE_NOT_ON_STEP", weekday });
  for (const [weekday, count] of perDay) {
    if (count > SETTINGS_LIMITS.rangesPerDay) errors.push({ code: "TOO_MANY_RANGES", weekday });
  }
  return errors.length === 0 ? ok(undefined) : err(errors);
}

/** RF-7: copia las franjas de un día a otros, reemplazando las que tenían. */
export function copyDay(ranges: WeeklyRange[], from: IsoWeekday, to: IsoWeekday[]): WeeklyRange[] {
  const targets = new Set(to.filter((d) => d !== from));
  const source = ranges.filter((r) => r.weekday === from);
  const kept = ranges.filter((r) => !targets.has(r.weekday));
  const copies = [...targets].flatMap((weekday) => source.map((r) => ({ ...r, weekday })));
  return [...kept, ...copies].sort((a, b) => a.weekday - b.weekday || a.opensAt - b.opensAt);
}

export type StepChangeError = { invalidStep?: true; services: string[]; weekdays: IsoWeekday[] };

/** RF-9: el paso nuevo tiene que dividir la hora y dejar alineados los servicios activos y las franjas. */
export function validateStepChange(
  stepMinutes: number,
  ranges: WeeklyRange[],
  activeServices: { name: string; durationMinutes: number }[],
): Result<void, StepChangeError> {
  if (!(ALLOWED_STEPS as readonly number[]).includes(stepMinutes)) {
    return err({ invalidStep: true, services: [], weekdays: [] });
  }
  const services = activeServices.filter((s) => s.durationMinutes % stepMinutes !== 0).map((s) => s.name);
  const weekdays = [
    ...new Set(ranges.filter((r) => r.opensAt % stepMinutes !== 0 || r.closesAt % stepMinutes !== 0).map((r) => r.weekday)),
  ].sort((a, b) => a - b);
  return services.length === 0 && weekdays.length === 0 ? ok(undefined) : err({ services, weekdays });
}

export type BookingRules = { minNoticeMinutes: number; maxAdvanceDays: number };
export type BookingRulesError = "MIN_NOTICE_OUT_OF_RANGE" | "MAX_ADVANCE_OUT_OF_RANGE";

/** RF-22, RF-24. */
export function validateBookingRules(rules: BookingRules): Result<void, BookingRulesError[]> {
  const { minNotice, maxAdvanceDays } = SETTINGS_LIMITS;
  const errors: BookingRulesError[] = [];
  const n = rules.minNoticeMinutes;
  if (!Number.isInteger(n) || n < minNotice.min || n > minNotice.max || n % minNotice.step !== 0) {
    errors.push("MIN_NOTICE_OUT_OF_RANGE");
  }
  const d = rules.maxAdvanceDays;
  if (!Number.isInteger(d) || d < maxAdvanceDays.min || d > maxAdvanceDays.max) errors.push("MAX_ADVANCE_OUT_OF_RANGE");
  return errors.length === 0 ? ok(undefined) : err(errors);
}

export type BlockError = "DAYS_INVERTED" | "HOURS_INVERTED" | "HOURS_INVALID" | "BLOCK_IN_PAST";

/** Bloqueo de días: de las 00:00 del primero a las 24:00 del último, en hora de Buenos Aires (RNF-2). */
export function blockOfDays(first: LocalDate, last: LocalDate): Result<Interval, BlockError> {
  if (compareLocalDate(last, first) < 0) return err("DAYS_INVERTED");
  return ok({ start: instantAt(first, 0), end: instantAt(addDays(last, 1), 0) });
}

/** Bloqueo de horas dentro de un mismo día (clarificación 8: no cruza la medianoche). */
export function blockOfHours(day: LocalDate, from: MinuteOfDay, to: MinuteOfDay): Result<Interval, BlockError> {
  const step = SETTINGS_LIMITS.blockMinuteStep;
  if (!isMinuteOfDay(from) || !isMinuteOfDay(to) || from % step !== 0 || to % step !== 0) return err("HOURS_INVALID");
  if (to <= from) return err("HOURS_INVERTED");
  return ok({ start: instantAt(day, from), end: instantAt(day, to) });
}

/** RF-11: un bloqueo se rechaza solo si ya terminó (clarificación 5). */
export function validateNewBlock(block: Interval, now: Date): Result<void, BlockError> {
  return block.end.getTime() > now.getTime() ? ok(undefined) : err("BLOCK_IN_PAST");
}

/** El aviso para los clientes: opcional, sin espacios en los extremos, hasta 80 caracteres. */
export function validateNotice(raw: string): Result<string | null, "NOTICE_TOO_LONG"> {
  const text = raw.trim().replace(/\s+/g, " ");
  if (!text) return ok(null);
  return text.length > SETTINGS_LIMITS.noticeLength ? err("NOTICE_TOO_LONG") : ok(text);
}

/** RF-23: el WhatsApp de contacto ya normalizado (celular argentino, como el teléfono de la 002). */
export const isWhatsapp = (e164: string) => /^\+549\d{10}$/.test(e164);

/** RF-27 de la spec 004: turnos que quedarían fuera de las franjas nuevas (no entran completos en una). */
export function intervalsOutside<T extends Interval>(intervals: T[], ranges: WeeklyRange[]): T[] {
  return intervals.filter((i) => {
    const day = localDateOf(i.start);
    const from = minuteOfDayOf(i.start);
    // Un turno que termina a la medianoche termina a las 24:00 de su día.
    const to = localDateOf(i.end) === day ? minuteOfDayOf(i.end) : MINUTES_PER_DAY;
    const weekday = isoWeekday(day);
    return !ranges.some((r) => r.weekday === weekday && r.opensAt <= from && to <= r.closesAt);
  });
}

/** RF-27 de la spec 004: turnos que se superponen con un bloqueo nuevo. */
export function intervalsOverlapping<T extends Interval>(intervals: T[], block: Interval): T[] {
  return intervals.filter((i) => i.start.getTime() < block.end.getTime() && block.start.getTime() < i.end.getTime());
}
