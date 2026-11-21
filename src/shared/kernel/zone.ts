import { TZDate } from "@date-fns/tz";
import { isMinuteOfDay, type MinuteOfDay } from "./minutes";
import type { LocalDate } from "./local-date";

/** Zona del negocio. Todo día y toda hora que ve una persona se interpretan acá (constitución, principio 6). */
export const BUSINESS_TZ = "America/Argentina/Buenos_Aires";

/** Instante en que empieza el minuto `minute` del día `date` en Buenos Aires. */
export function instantAt(date: LocalDate, minute: MinuteOfDay): Date {
  if (!isMinuteOfDay(minute)) throw new Error(`Minuto del día inválido: ${minute}`);
  const [y, m, d] = date.split("-").map(Number) as [number, number, number];
  // TZDate resuelve el desfase de la zona para esa fecha (y desborda 24:00 al día siguiente).
  return new Date(new TZDate(y, m - 1, d, Math.floor(minute / 60), minute % 60, BUSINESS_TZ).getTime());
}

function inBusinessZone(instant: Date): TZDate {
  return new TZDate(instant.getTime(), BUSINESS_TZ);
}

/** Día de Buenos Aires en que cae el instante. */
export function localDateOf(instant: Date): LocalDate {
  const t = inBusinessZone(instant);
  const mm = String(t.getMonth() + 1).padStart(2, "0");
  const dd = String(t.getDate()).padStart(2, "0");
  return `${t.getFullYear()}-${mm}-${dd}` as LocalDate;
}

/** Minuto del día, en Buenos Aires, en que cae el instante. */
export function minuteOfDayOf(instant: Date): MinuteOfDay {
  const t = inBusinessZone(instant);
  return t.getHours() * 60 + t.getMinutes();
}
