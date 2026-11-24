/**
 * Un día del calendario ("2026-11-26"), sin hora ni zona. Un día no es un instante: se guarda y se
 * compara como texto, y la aritmética se hace en UTC puro para no depender de la zona de la máquina.
 */
export type LocalDate = string & { readonly __brand: "LocalDate" };
/** Día de la semana ISO: 1 = lunes … 7 = domingo. */
export type IsoWeekday = 1 | 2 | 3 | 4 | 5 | 6 | 7;

const PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;
const DAY_MS = 86_400_000;

function toUtcMs(d: LocalDate): number {
  const [y, m, day] = d.split("-").map(Number) as [number, number, number];
  return Date.UTC(y, m - 1, day);
}

function fromUtcMs(ms: number): LocalDate {
  return new Date(ms).toISOString().slice(0, 10) as LocalDate;
}

/** Devuelve la fecha si el texto es un día real con formato AAAA-MM-DD; si no, null. */
export function parseLocalDate(raw: string): LocalDate | null {
  const match = PATTERN.exec(raw);
  if (!match) return null;
  const [, y, m, d] = match.map(Number) as [number, number, number, number];
  // Si el día no existe (31 de noviembre), Date lo corre al mes siguiente y el texto ya no coincide.
  return fromUtcMs(Date.UTC(y, m - 1, d)) === raw ? (raw as LocalDate) : null;
}

/** Como parseLocalDate, pero falla si el texto no es válido. Para constantes y tests. */
export function localDate(raw: string): LocalDate {
  const parsed = parseLocalDate(raw);
  if (!parsed) throw new Error(`Fecha inválida: ${raw}`);
  return parsed;
}

/** Suma días de calendario. Date.UTC normaliza el desborde (31 + 1 → 1 del mes siguiente) sin sumar milisegundos. */
export function addDays(d: LocalDate, days: number): LocalDate {
  const [y, m, day] = d.split("-").map(Number) as [number, number, number];
  return fromUtcMs(Date.UTC(y, m - 1, day + days));
}

export function isoWeekday(d: LocalDate): IsoWeekday {
  const day = new Date(toUtcMs(d)).getUTCDay(); // 0 = domingo
  return (day === 0 ? 7 : day) as IsoWeekday;
}

/** Lunes de la semana que contiene `d`. */
export function weekStart(d: LocalDate): LocalDate {
  return addDays(d, 1 - isoWeekday(d));
}

/** Los siete días, de lunes a domingo, de la semana que contiene `d`. */
export function weekDays(d: LocalDate): LocalDate[] {
  const monday = weekStart(d);
  return Array.from({ length: 7 }, (_, i) => addDays(monday, i));
}

export function compareLocalDate(a: LocalDate, b: LocalDate): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

/** Días de `from` a `to` (positivo si `to` es posterior). */
export function daysBetween(from: LocalDate, to: LocalDate): number {
  return Math.round((toUtcMs(to) - toUtcMs(from)) / DAY_MS);
}
