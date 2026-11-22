import { err, ok, type Result } from "@/shared/kernel";

/** Reglas de Turnos de la spec 004 (RN-10, RN-31, RN-33, P-14). */
export const APPOINTMENT_POLICY = {
  /** Plazo para cancelar o reprogramar sin que quede como tarde (RN-10). */
  lateThresholdMinutes: 240,
  /** Margen para corregir un error después de reservar (RN-33, RF-39). */
  correctionMinutes: 10,
  /** Con menos de esto, la reserva nace Confirmado (RN-31). */
  confirmationLeadMinutes: 60,
  /** Reprogramaciones del cliente por turno (I-7b). */
  maxCustomerReschedules: 2,
  reasonLength: { min: 3, max: 200 },
} as const;

export type ActiveStatus = "reserved" | "confirmed";
export type AppointmentStatus = ActiveStatus | "cancelled" | "cancelled_late";
export const ACTIVE_STATUSES: readonly ActiveStatus[] = ["reserved", "confirmed"];

const MINUTE = 60_000;

/** RF-8: con menos de 1 h nace Confirmado (reservar en ese momento ya es confirmar). */
export function initialStatus(start: Date, now: Date): ActiveStatus {
  return start.getTime() - now.getTime() < APPOINTMENT_POLICY.confirmationLeadMinutes * MINUTE ? "confirmed" : "reserved";
}

/** Un turno es "futuro" mientras no terminó (clarificación 2). */
export const isUpcoming = (a: { end: Date }, now: Date) => a.end.getTime() > now.getTime();

/**
 * Cancelar o reprogramar ahora, ¿es a tiempo o tarde? Con 4 h o más, o dentro de los 10 min siguientes a
 * reservar, es a tiempo (RF-14, RF-17). Desde el inicio ya no se puede (RF-19).
 */
export function changeTiming(a: { start: Date; bookedAt: Date }, now: Date): "on_time" | "late" | "started" {
  const t = now.getTime();
  if (t >= a.start.getTime()) return "started";
  if (t - a.bookedAt.getTime() <= APPOINTMENT_POLICY.correctionMinutes * MINUTE) return "on_time";
  return a.start.getTime() - t >= APPOINTMENT_POLICY.lateThresholdMinutes * MINUTE ? "on_time" : "late";
}

/** RF-18, RF-19. */
export function customerCanReschedule(
  a: { start: Date; customerReschedules: number },
  now: Date,
): Result<void, "RESCHEDULE_LIMIT" | "STARTED"> {
  if (now.getTime() >= a.start.getTime()) return err("STARTED");
  if (a.customerReschedules >= APPOINTMENT_POLICY.maxCustomerReschedules) return err("RESCHEDULE_LIMIT");
  return ok(undefined);
}

/** RF-24, RF-25: el motivo de Colo es obligatorio y le llega al cliente. */
export function validateBarberReason(raw: string): Result<string, "REASON_LENGTH"> {
  const text = raw.trim().replace(/\s+/g, " ");
  const { min, max } = APPOINTMENT_POLICY.reasonLength;
  return text.length < min || text.length > max ? err("REASON_LENGTH") : ok(text);
}
