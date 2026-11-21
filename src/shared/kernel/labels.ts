import { isoWeekday, type LocalDate } from "./local-date";

// Escritos a mano, sin Intl: no dependen de los datos de idioma de cada instalación de Node.
const WEEKDAYS = ["lunes", "martes", "miércoles", "jueves", "viernes", "sábado", "domingo"];
const WEEKDAYS_SHORT = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];
const MONTHS = [
  "enero", "febrero", "marzo", "abril", "mayo", "junio",
  "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
];

const dayOfMonth = (d: LocalDate) => Number(d.slice(8, 10));

/** "Jue" */
export function weekdayShort(d: LocalDate): string {
  return WEEKDAYS_SHORT[isoWeekday(d) - 1]!;
}

/** "jueves 26 de noviembre" */
export function formatDayLong(d: LocalDate): string {
  return `${WEEKDAYS[isoWeekday(d) - 1]} ${dayOfMonth(d)} de ${MONTHS[Number(d.slice(5, 7)) - 1]}`;
}

/** "mié 25" */
export function formatDayShort(d: LocalDate): string {
  return `${weekdayShort(d).toLowerCase()} ${dayOfMonth(d)}`;
}

export { dayOfMonth };
