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

/** Bloqueo cargado, para la lista de Ajustes (RF-12). */
export type BlockRecord = { id: string; start: Date; end: Date; notice: string | null };

/** Auditoría de Ajustes (RF-27). La implementa `src/server` una sola vez para Agenda y Precios. */
export interface SettingsAudit {
  record(change: { area: SettingsArea; userId: string; detail: Record<string, unknown> }): Promise<void>;
}
export type SettingsArea = "franjas" | "paso" | "bloqueos" | "servicios" | "reserva" | "contacto";

/** Escritura de la agenda. Vive dentro de una transacción (clarificación 6). */
export interface ScheduleAdmin {
  /** Bloquea la fila de ajustes hasta el fin de la transacción y la devuelve. */
  lockSettings(): Promise<ScheduleSettings>;
  weeklyRanges(): Promise<WeeklyRange[]>;
  replaceWeeklyRanges(ranges: WeeklyRange[]): Promise<void>;
  updateStep(stepMinutes: number): Promise<void>;
  updateBookingRules(rules: { minNoticeMinutes: number; maxAdvanceDays: number }): Promise<void>;
  updateContact(whatsapp: string): Promise<void>;
  insertBlock(block: Interval, notice: string | null, createdBy: string): Promise<string>;
  deleteBlock(id: string): Promise<boolean>;
  /** Bloqueos que todavía no terminaron, ordenados por inicio. */
  currentBlocks(now: Date): Promise<BlockRecord[]>;
}

/** Lo que tiene a mano un caso de uso de Ajustes dentro de la transacción. */
export type ScheduleAdminTx = {
  admin: ScheduleAdmin;
  audit: SettingsAudit;
  /** Servicios que se ofrecen (los da Precios): para validar un cambio de paso (RF-9). */
  activeServices(): Promise<{ name: string; durationMinutes: number }[]>;
};
export type ScheduleAdminDeps = { transaction<T>(fn: (tx: ScheduleAdminTx) => Promise<T>): Promise<T> };
