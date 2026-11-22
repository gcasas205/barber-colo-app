import type { Appointment } from "@/modules/appointments";

/** El turno tal como lo muestra la pantalla (fechas en milisegundos). */
export type TurnoView = {
  id: string;
  /** Para quién es (spec 004b): el propio cliente o una persona a cargo. */
  customerId: string;
  customerName: string;
  isSelf: boolean;
  serviceId: string;
  serviceName: string;
  start: number;
  end: number;
  status: "reserved" | "confirmed";
  priceCents: number;
  customerReschedules: number;
  bookedAt: number;
};

/** "Tomi (demo)" → "Tomi": la marca de prueba no se muestra en los turnos. */
export const displayName = (name: string) => name.replace(/ \(demo\)$/, "");

export function toTurnoView(a: Appointment, isSelf: boolean): TurnoView | null {
  if (a.status !== "reserved" && a.status !== "confirmed") return null;
  return {
    id: a.id,
    customerId: a.customerId,
    customerName: displayName(a.customerName),
    isSelf,
    serviceId: a.serviceId,
    serviceName: a.serviceName,
    start: a.start.getTime(),
    end: a.end.getTime(),
    status: a.status,
    priceCents: a.priceCents,
    customerReschedules: a.customerReschedules,
    bookedAt: a.bookedAt.getTime(),
  };
}
