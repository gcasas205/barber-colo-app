import type { Appointment } from "@/modules/appointments";

/** El turno tal como lo muestra la pantalla (fechas en milisegundos). */
export type TurnoView = {
  id: string;
  serviceId: string;
  serviceName: string;
  start: number;
  end: number;
  status: "reserved" | "confirmed";
  priceCents: number;
  customerReschedules: number;
  bookedAt: number;
};

export function toTurnoView(a: Appointment): TurnoView | null {
  if (a.status !== "reserved" && a.status !== "confirmed") return null;
  return {
    id: a.id,
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
