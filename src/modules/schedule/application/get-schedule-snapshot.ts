import { addDays, instantAt } from "@/shared/kernel";
import { bookingWindow, type AvailabilityInput } from "../domain/availability";
import type { BlockNotice } from "../domain/notices";
import type { ScheduleConfig, WeeklyRange } from "../domain/schedule";
import type { OccupationSource, ScheduleRepository } from "./ports";

/**
 * Foto de la agenda para calcular en el dispositivo (cambio 01, RF-15). Todo en números y textos para
 * que viaje del servidor al navegador. Las ocupaciones son solo lapsos [inicio, fin) en milisegundos:
 * nunca quién ocupa (S-7). Los avisos son el texto que Colo escribió para los clientes (spec 003, RF-14).
 */
export type ScheduleSnapshot = {
  serverNow: number;
  config: ScheduleConfig;
  ranges: WeeklyRange[];
  occupations: [number, number][];
  notices: BlockNotice[];
  contactWhatsapp: string;
};

export async function getScheduleSnapshot(
  deps: { schedule: ScheduleRepository; occupations: OccupationSource },
  now: Date,
): Promise<ScheduleSnapshot> {
  const [{ config, contactWhatsapp }, ranges] = await Promise.all([
    deps.schedule.settings(),
    deps.schedule.weeklyRanges(),
  ]);
  const window = bookingWindow(now, config.maxAdvanceDays);
  // La ventana y un día más: si la página queda abierta pasada la medianoche, la ventana se corre un día.
  const range = { start: instantAt(window.first, 0), end: instantAt(addDays(window.last, 2), 0) };
  const [occupations, notices] = await Promise.all([deps.occupations.occupations(range), deps.occupations.notices(range)]);
  return {
    serverNow: now.getTime(),
    config,
    ranges,
    occupations: occupations.map((o) => [o.start.getTime(), o.end.getTime()]),
    notices: notices.map((n) => ({ start: n.start.getTime(), end: n.end.getTime(), text: n.text })),
    contactWhatsapp,
  };
}

/** Vuelve a armar la entrada del cálculo puro a partir de la foto. */
export function snapshotInput(snapshot: ScheduleSnapshot, serviceMinutes: number, now: Date): AvailabilityInput {
  return {
    ranges: snapshot.ranges,
    config: snapshot.config,
    serviceMinutes,
    occupations: snapshot.occupations.map(([start, end]) => ({ start: new Date(start), end: new Date(end) })),
    now,
  };
}
