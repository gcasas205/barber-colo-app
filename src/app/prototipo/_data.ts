/** Datos de ejemplo del prototipo de diseño. Ficticios: no son clientes ni precios reales. */
import type { AppointmentStatus } from "@/ui/StatusMark";

export const RATE = 12000;

export const DAYS = [
  { id: "lun-23", short: "Lun", day: 23, long: "Lunes 23", free: 7, total: 20 },
  { id: "mar-24", short: "Mar", day: 24, long: "Martes 24", free: 4, total: 20 },
  { id: "mie-25", short: "Mié", day: 25, long: "Miércoles 25", free: 0, total: 20 },
  { id: "jue-26", short: "Jue", day: 26, long: "Jueves 26", free: 5, total: 20 },
  { id: "vie-27", short: "Vie", day: 27, long: "Viernes 27", free: 2, total: 20 },
  { id: "sab-28", short: "Sáb", day: 28, long: "Sábado 28", free: 9, total: 20 },
] as const;

export const FREE_SLOTS: Record<string, string[]> = {
  "lun-23": ["10:00", "10:30", "12:00", "15:30", "17:00", "18:30", "19:30"],
  "mar-24": ["11:30", "14:00", "16:30", "19:00"],
  "mie-25": [],
  "jue-26": ["10:30", "11:00", "14:30", "17:30", "19:30"],
  "vie-27": ["13:00", "19:30"],
  "sab-28": ["10:00", "10:30", "11:00", "12:30", "13:00", "16:00", "17:00", "18:00", "19:00"],
};

export type BarberRow = {
  time: string;
  name: string;
  forWhom?: string;
  status: AppointmentStatus;
  price: number;
  discount?: string;
};

export const TODAY: BarberRow[] = [
  { time: "10:00", name: "Hernán Ríos", status: "attended", price: 12000 },
  { time: "10:30", name: "Facundo Díaz", status: "attended", price: 10800, discount: "4.º corte del mes" },
  { time: "11:30", name: "Santiago Ruiz", status: "no_show", price: 12000 },
  { time: "14:00", name: "Mateo López", forWhom: "Martín López", status: "attended", price: 12000 },
  { time: "16:00", name: "Juan Pérez", status: "confirmed", price: 10800, discount: "4.º corte del mes" },
  { time: "16:30", name: "Tomi Sosa", forWhom: "Martín Sosa", status: "confirmed", price: 12000 },
  { time: "17:00", name: "Lucas Gómez", status: "unconfirmed", price: 12000 },
  { time: "18:30", name: "Bruno Méndez", status: "booked", price: 10200, discount: "Corte n.º 10" },
  { time: "19:30", name: "Ezequiel Paz", status: "booked", price: 12000 },
];

export function pesos(value: number): string {
  return new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 }).format(value);
}
