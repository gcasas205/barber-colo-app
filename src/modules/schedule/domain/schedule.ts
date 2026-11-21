import type { IsoWeekday, MinuteOfDay } from "@/shared/kernel";

/** Franja de atención de un día de la semana, en hora de Buenos Aires: [opensAt, closesAt). */
export type WeeklyRange = { weekday: IsoWeekday; opensAt: MinuteOfDay; closesAt: MinuteOfDay };

/** Lapso entre dos instantes, con el final abierto: [start, end). */
export type Interval = { start: Date; end: Date };

/** Parámetros de la agenda que define Colo. */
export type ScheduleConfig = {
  /** Cada cuántos minutos puede empezar un turno. Divide la hora en partes iguales. */
  stepMinutes: number;
  /** Anticipación mínima para ofrecer un horario. */
  minNoticeMinutes: number;
  /** Días hacia adelante que abarca la ventana de reserva (hoy y los N siguientes). */
  maxAdvanceDays: number;
};

/** Pasos permitidos: los que dividen la hora en partes iguales (RF-12). Coincide con el check de la base. */
export const ALLOWED_STEPS = [5, 10, 15, 20, 30, 60] as const;
