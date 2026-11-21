/** Hora del día como minutos desde la medianoche: 600 = 10:00, 1440 = 24:00 (fin del día). */
export type MinuteOfDay = number;

export const MINUTES_PER_DAY = 1440;

export function isMinuteOfDay(m: number): m is MinuteOfDay {
  return Number.isInteger(m) && m >= 0 && m <= MINUTES_PER_DAY;
}

export function formatMinute(m: MinuteOfDay): string {
  const hh = String(Math.floor(m / 60)).padStart(2, "0");
  const mm = String(m % 60).padStart(2, "0");
  return `${hh}:${mm}`;
}

/** Lee "HH:MM" (con dos dígitos); devuelve null si no es una hora válida del día. */
export function parseMinute(raw: string): MinuteOfDay | null {
  const match = /^(\d{2}):(\d{2})$/.exec(raw);
  if (!match) return null;
  const h = Number(match[1]);
  const m = Number(match[2]);
  if (m > 59) return null;
  const total = h * 60 + m;
  return isMinuteOfDay(total) ? total : null;
}
