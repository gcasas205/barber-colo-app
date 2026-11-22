import { addDays, instantAt, MINUTES_PER_DAY, type LocalDate, type MinuteOfDay } from "@/shared/kernel";

/** Bloqueo con aviso, tal como viaja en la foto de la agenda: [inicio, fin) en milisegundos. */
export type BlockNotice = { start: number; end: number; text: string };

export type DayNotice =
  | { date: LocalDate; kind: "closed"; text: string }
  | { date: LocalDate; kind: "hours"; from: MinuteOfDay; to: MinuteOfDay; text: string };

const MINUTE_MS = 60_000;

/** RF-14: los avisos de los días de una semana. Cubre todo el día → "cerrado"; una parte → su horario. */
export function weekNotices(week: LocalDate[], notices: BlockNotice[]): DayNotice[] {
  const out: [order: number, notice: DayNotice][] = [];
  for (const date of week) {
    const dayStart = instantAt(date, 0).getTime();
    const dayEnd = instantAt(addDays(date, 1), 0).getTime();
    for (const n of notices) {
      const start = Math.max(n.start, dayStart);
      const end = Math.min(n.end, dayEnd);
      if (end <= start) continue;
      if (start === dayStart && end === dayEnd) {
        out.push([dayStart, { date, kind: "closed", text: n.text }]);
      } else {
        const from = Math.round((start - dayStart) / MINUTE_MS);
        const to = Math.min(MINUTES_PER_DAY, Math.round((end - dayStart) / MINUTE_MS));
        out.push([start, { date, kind: "hours", from, to, text: n.text }]);
      }
    }
  }
  return out.sort((a, b) => a[0] - b[0]).map(([, n]) => n);
}
