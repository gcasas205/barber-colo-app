import {
  addDays,
  compareLocalDate,
  formatMinute,
  instantAt,
  isoWeekday,
  localDateOf,
  weekDays,
  type LocalDate,
  type MinuteOfDay,
} from "@/shared/kernel";
import type { Interval, ScheduleConfig, WeeklyRange } from "./schedule";

/** Todo lo que hace falta para calcular horarios libres. "Ahora" entra como dato (RNF-2). */
export type AvailabilityInput = {
  ranges: WeeklyRange[];
  config: ScheduleConfig;
  /** Duración del servicio elegido. */
  serviceMinutes: number;
  /** Lapsos ocupados: bloqueos (y, desde la spec 003, turnos). */
  occupations: Interval[];
  now: Date;
};

/** Un horario en que puede empezar el servicio. */
export type Start = {
  start: Date;
  /** Hora en Buenos Aires, "HH:MM". */
  label: string;
  /** Franja a la que pertenece (RF-7). */
  range: { opensAt: MinuteOfDay; closesAt: MinuteOfDay };
};

export type DayCount = { date: LocalDate; count: number; inWindow: boolean };

const MINUTE_MS = 60_000;

/** Ventana de reserva: hoy (en Buenos Aires) y los `maxAdvanceDays` días siguientes (RF-11). */
export function bookingWindow(now: Date, maxAdvanceDays: number): { first: LocalDate; last: LocalDate } {
  const first = localDateOf(now);
  return { first, last: addDays(first, maxAdvanceDays) };
}

function inWindow(date: LocalDate, window: { first: LocalDate; last: LocalDate }): boolean {
  return compareLocalDate(date, window.first) >= 0 && compareLocalDate(date, window.last) <= 0;
}

/** [a, b) y [c, d) se superponen; que uno termine justo cuando empieza el otro no cuenta (RF-9). */
function overlaps(start: number, end: number, other: Interval): boolean {
  return start < other.end.getTime() && other.start.getTime() < end;
}

/** Horarios en que puede empezar el servicio el día `date`, ordenados y con su franja (RF-7 a RF-11). */
export function dayStarts(input: AvailabilityInput & { date: LocalDate }): Start[] {
  const { date, ranges, config, serviceMinutes, occupations, now } = input;
  if (!inWindow(date, bookingWindow(now, config.maxAdvanceDays))) return [];

  const earliest = now.getTime() + config.minNoticeMinutes * MINUTE_MS;
  const weekday = isoWeekday(date);
  const dayRanges = ranges.filter((r) => r.weekday === weekday).sort((a, b) => a.opensAt - b.opensAt);

  const starts: Start[] = [];
  for (const { opensAt, closesAt } of dayRanges) {
    // El servicio tiene que terminar dentro de la misma franja; terminar justo al cierre vale (RF-8).
    for (let m = opensAt; m + serviceMinutes <= closesAt; m += config.stepMinutes) {
      const start = instantAt(date, m);
      const startMs = start.getTime();
      // Fin calculado desde la hora local, no sumando milisegundos al inicio (RNF-1).
      const endMs = instantAt(date, m + serviceMinutes).getTime();
      if (startMs < earliest) continue; // RF-10: con la anticipación exacta, sí se ofrece
      if (occupations.some((o) => overlaps(startMs, endMs, o))) continue; // RF-9
      starts.push({ start, label: formatMinute(m), range: { opensAt, closesAt } });
    }
  }
  return starts;
}

/** Cantidad de horarios de cada día, de lunes a domingo, de la semana que contiene `weekOf` (RF-4, RF-5). */
export function weekAvailability(input: AvailabilityInput & { weekOf: LocalDate }): DayCount[] {
  const window = bookingWindow(input.now, input.config.maxAdvanceDays);
  return weekDays(input.weekOf).map((date) => ({
    date,
    count: dayStarts({ ...input, date }).length,
    inWindow: inWindow(date, window),
  }));
}

function findDayWithRoom(input: AvailabilityInput, from: LocalDate): LocalDate | null {
  const { last } = bookingWindow(input.now, input.config.maxAdvanceDays);
  for (let date = from; compareLocalDate(date, last) <= 0; date = addDays(date, 1)) {
    if (dayStarts({ ...input, date }).length > 0) return date;
  }
  return null;
}

/** Próximo día con lugar después de `after`, dentro de la ventana; null si no hay (RF-6, RF-6b). */
export function nextDayWithRoom(input: AvailabilityInput & { after: LocalDate }): LocalDate | null {
  // Si `after` es anterior a hoy, los días previos no tienen horarios (dayStarts devuelve []): no hace falta recortarlo.
  return findDayWithRoom(input, addDays(input.after, 1));
}

/** Primer día de la ventana con lugar (puede ser hoy); null si no hay ninguno. */
export function firstDayWithRoom(input: AvailabilityInput): LocalDate | null {
  return findDayWithRoom(input, bookingWindow(input.now, input.config.maxAdvanceDays).first);
}
