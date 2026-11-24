import {
  addDays,
  compareLocalDate,
  instantAt,
  weekStart,
  type LocalDate,
} from "@/shared/kernel";
import {
  bookingWindow,
  dayStarts,
  firstDayWithRoom,
  nextDayWithRoom,
  weekAvailability,
  type AvailabilityInput,
  type DayCount,
  type Start,
} from "../domain/availability";
import type { OccupationSource, ScheduleRepository } from "./ports";

export type AvailabilityQuery = {
  serviceMinutes: number;
  now: Date;
  /** Día elegido; si falta o está fuera de la ventana, el primero con lugar. */
  day?: LocalDate | null;
  /** Semana que se muestra (cualquier día de ella); si falta, la del día elegido. */
  weekOf?: LocalDate | null;
};

export type Availability = {
  window: { first: LocalDate; last: LocalDate };
  contactWhatsapp: string;
  /** Día cuyos horarios se muestran. */
  day: LocalDate;
  starts: Start[];
  /** Si el día no tiene lugar, el próximo que sí (RF-6). */
  nextDayWithRoom: LocalDate | null;
  /** Ningún día de la ventana tiene lugar para este servicio (RF-6b). */
  noRoomInWindow: boolean;
  /** Semana que se muestra, de lunes a domingo (RF-4, RF-5). */
  week: DayCount[];
  previousWeek: LocalDate | null;
  nextWeek: LocalDate | null;
};

function within(date: LocalDate, w: { first: LocalDate; last: LocalDate }): boolean {
  return compareLocalDate(date, w.first) >= 0 && compareLocalDate(date, w.last) <= 0;
}

/** Lo que elige el visitante. */
export type Selection = { day?: LocalDate | null; weekOf?: LocalDate | null };

/**
 * Cálculo puro de lo que muestra la página: día elegido, sus horarios, la semana y la navegación.
 * No lee nada: corre igual en el servidor y en el navegador (RF-15).
 */
/** Semana de `wanted`, sin salir de la ventana, y las semanas de los extremos. */
function weeksToShow(window: { first: LocalDate; last: LocalDate }, wanted: LocalDate) {
  const firstWeek = weekStart(window.first);
  const lastWeek = weekStart(window.last);
  let shownWeek = weekStart(wanted);
  if (compareLocalDate(shownWeek, firstWeek) < 0) shownWeek = firstWeek;
  if (compareLocalDate(shownWeek, lastWeek) > 0) shownWeek = lastWeek;
  return { shownWeek, firstWeek, lastWeek };
}

/** Primer día de la semana con lugar; si no hay, el primero dentro de la ventana. */
function firstDayOfWeek(week: DayCount[]): LocalDate | undefined {
  return (week.find((d) => d.inWindow && d.count > 0) ?? week.find((d) => d.inWindow))?.date;
}

export function computeAvailability(input: AvailabilityInput, selection: Selection, contactWhatsapp: string): Availability {
  const window = bookingWindow(input.now, input.config.maxAdvanceDays);
  const query = { ...selection };
  const first = firstDayWithRoom(input);
  const chosenDay = query.day && within(query.day, window) ? query.day : null;

  // Semana que se muestra: la pedida, o la del día elegido, o la del primer día con lugar; sin salir de la ventana.
  const { shownWeek, firstWeek, lastWeek } = weeksToShow(window, query.weekOf ?? chosenDay ?? first ?? window.first);
  const week = weekAvailability({ ...input, weekOf: shownWeek });

  // Día: el elegido; si se cambió de semana sin elegir día, el primero de esa semana con lugar; si no, el primero con lugar.
  const fromWeek = query.weekOf ? firstDayOfWeek(week) : undefined;
  const day = chosenDay ?? fromWeek ?? first ?? window.first;
  const starts = dayStarts({ ...input, date: day });

  return {
    window,
    contactWhatsapp,
    day,
    starts,
    nextDayWithRoom: starts.length === 0 ? nextDayWithRoom({ ...input, after: day }) : null,
    noRoomInWindow: first === null,
    week,
    previousWeek: compareLocalDate(shownWeek, firstWeek) > 0 ? addDays(shownWeek, -7) : null,
    nextWeek: compareLocalDate(shownWeek, lastWeek) < 0 ? addDays(shownWeek, 7) : null,
  };
}

/** Caso de uso de consulta: horarios libres de un servicio para un día y su semana (lee la base). */
export async function getAvailability(
  deps: { schedule: ScheduleRepository; occupations: OccupationSource },
  query: AvailabilityQuery,
): Promise<Availability> {
  const [{ config, contactWhatsapp }, ranges] = await Promise.all([
    deps.schedule.settings(),
    deps.schedule.weeklyRanges(),
  ]);
  const window = bookingWindow(query.now, config.maxAdvanceDays);
  // Una sola consulta para toda la ventana: de las 00:00 del primer día a las 00:00 del día siguiente al último.
  const occupations = await deps.occupations.occupations({
    start: instantAt(window.first, 0),
    end: instantAt(addDays(window.last, 1), 0),
  });
  const input: AvailabilityInput = { ranges, config, serviceMinutes: query.serviceMinutes, occupations, now: query.now };
  return computeAvailability(input, { day: query.day, weekOf: query.weekOf }, contactWhatsapp);
}
