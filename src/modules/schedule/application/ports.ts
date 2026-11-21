import type { Interval, ScheduleConfig, WeeklyRange } from "../domain/schedule";

export type ScheduleSettings = { config: ScheduleConfig; contactWhatsapp: string };

/** Configuración de la agenda que define Colo. */
export interface ScheduleRepository {
  settings(): Promise<ScheduleSettings>;
  weeklyRanges(): Promise<WeeklyRange[]>;
}

/**
 * Lapsos ocupados que se superponen con `range`. En la spec 001 son solo los bloqueos; desde la
 * spec 003, Turnos agrega sus turnos sin que Agenda lo conozca (bajo acoplamiento).
 */
export interface OccupationSource {
  occupations(range: Interval): Promise<Interval[]>;
}
