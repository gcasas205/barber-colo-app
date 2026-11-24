import { addDays, formatDayLong, formatDuration, formatMinute, localDateOf, minuteOfDayOf, type LocalDate } from "@/shared/kernel";

/** Opciones de hora cada `step` minutos, de 00:00 a 24:00 (las franjas pueden cerrar a la medianoche). */
export function timeOptions(step: number): { value: number; label: string }[] {
  const out = [];
  for (let m = 0; m <= 1440; m += step) out.push({ value: m, label: formatMinute(m) });
  return out;
}

/** "Del jueves 24 de diciembre al viernes 25 de diciembre", "Miércoles 25 de noviembre, de 10:00 a 11:00". */
export function describeBlock(start: Date, end: Date): string {
  const first = localDateOf(start);
  const startMinute = minuteOfDayOf(start);
  const endMinute = minuteOfDayOf(end);
  const lastDay = addDays(localDateOf(end), -1) as LocalDate;
  if (startMinute === 0 && endMinute === 0) {
    return first === lastDay ? `${cap(formatDayLong(first))}, todo el día` : `Del ${formatDayLong(first)} al ${formatDayLong(lastDay)}`;
  }
  const endDay = localDateOf(end);
  if (endDay === first || (endMinute === 0 && lastDay === first)) {
    return `${cap(formatDayLong(first))}, de ${formatMinute(startMinute)} a ${endMinute === 0 ? "24:00" : formatMinute(endMinute)}`;
  }
  return `Del ${formatDayLong(first)} a las ${formatMinute(startMinute)} al ${formatDayLong(endDay)} a las ${formatMinute(endMinute)}`;
}

export const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/** Anticipación mínima en palabras: 0 → "Sin anticipación", 90 → "1 h 30 min". */
export function noticeLabel(minutes: number): string {
  return minutes === 0 ? "Sin anticipación" : formatDuration(minutes);
}
