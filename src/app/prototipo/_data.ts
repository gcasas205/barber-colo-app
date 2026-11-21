/**
 * Datos de ejemplo del prototipo de diseño. Los nombres y turnos son ficticios.
 * Servicios y precios: pizarra del local (20/11/2026). Duraciones: propuesta inicial, a confirmar.
 */
import type { AppointmentStatus } from "@/ui/StatusMark";

export type Service = {
  id: "corte" | "completo" | "claritos";
  name: string;
  description: string;
  minutes: number;
  price: number;
  countsForBenefits: boolean;
};

export const SERVICES: Service[] = [
  { id: "corte", name: "Corte", description: "Corte de pelo", minutes: 30, price: 18000, countsForBenefits: true },
  { id: "completo", name: "Completo", description: "Corte, barba y cejas", minutes: 45, price: 20000, countsForBenefits: true },
  { id: "claritos", name: "Claritos", description: "Reflejos", minutes: 120, price: 70000, countsForBenefits: false },
];

/** Paso de la agenda, en minutos. */
export const STEP = 15;

export const DAYS = [
  { id: "lun-23", short: "Lun", day: 23, long: "Lunes 23" },
  { id: "mar-24", short: "Mar", day: 24, long: "Martes 24" },
  { id: "mie-25", short: "Mié", day: 25, long: "Miércoles 25" },
  { id: "jue-26", short: "Jue", day: 26, long: "Jueves 26" },
  { id: "vie-27", short: "Vie", day: 27, long: "Viernes 27" },
  { id: "sab-28", short: "Sáb", day: 28, long: "Sábado 28" },
] as const;

/** Huecos libres de cada día (inicio y fin). La jornada es de 10:00 a 20:00: 600 minutos. */
const FREE_WINDOWS: Record<string, Array<[string, string]>> = {
  "lun-23": [["10:00", "11:00"], ["12:00", "12:30"], ["15:30", "18:00"], ["18:30", "20:00"]],
  "mar-24": [["11:30", "12:00"], ["14:00", "14:30"], ["16:30", "17:15"], ["19:00", "19:30"]],
  "mie-25": [],
  "jue-26": [["10:30", "11:30"], ["14:30", "15:00"], ["17:30", "18:00"], ["19:30", "20:00"]],
  "vie-27": [["13:00", "13:30"], ["19:30", "20:00"]],
  "sab-28": [["10:00", "13:30"], ["16:00", "17:00"], ["18:00", "19:30"]],
};

const toMin = (t: string) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3));
const toTime = (m: number) => `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;

/** Inicios posibles (cada STEP minutos) donde el servicio entra completo en un hueco libre. */
export function startsFor(dayId: string, minutes: number): string[] {
  return (FREE_WINDOWS[dayId] ?? []).flatMap(([from, to]) => {
    const starts: string[] = [];
    for (let m = toMin(from); m + minutes <= toMin(to); m += STEP) starts.push(toTime(m));
    return starts;
  });
}

/** Ocupación del día (0 a 1) para la barra de la tira de días. */
export function occupancy(dayId: string): number {
  const free = (FREE_WINDOWS[dayId] ?? []).reduce((sum, [a, b]) => sum + toMin(b) - toMin(a), 0);
  return 1 - free / 600;
}

export type BarberRow = {
  time: string;
  name: string;
  service: string;
  forWhom?: string;
  status: AppointmentStatus;
  price: number;
  discount?: string;
};

export const TODAY: BarberRow[] = [
  { time: "10:00", name: "Hernán Ríos", service: "Claritos", status: "attended", price: 70000 },
  { time: "12:00", name: "Santiago Ruiz", service: "Corte", status: "no_show", price: 18000 },
  { time: "14:00", name: "Mateo López", service: "Corte", forWhom: "Martín López", status: "attended", price: 18000 },
  { time: "14:30", name: "Facundo Díaz", service: "Completo", status: "attended", price: 18000, discount: "4.º corte del mes" },
  { time: "16:00", name: "Juan Pérez", service: "Corte", status: "confirmed", price: 16200, discount: "4.º corte del mes" },
  { time: "16:30", name: "Tomi Sosa", service: "Corte", forWhom: "Martín Sosa", status: "confirmed", price: 18000 },
  { time: "17:00", name: "Lucas Gómez", service: "Completo", status: "unconfirmed", price: 20000 },
  { time: "18:00", name: "Bruno Méndez", service: "Corte", status: "booked", price: 15300, discount: "Corte n.º 10" },
  { time: "19:30", name: "Ezequiel Paz", service: "Corte", status: "booked", price: 18000 },
];

export function pesos(value: number): string {
  return new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 }).format(value);
}
