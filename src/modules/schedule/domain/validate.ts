import { err, isMinuteOfDay, ok, type IsoWeekday, type Result } from "@/shared/kernel";
import { ALLOWED_STEPS, type Interval, type WeeklyRange } from "./schedule";

export type ScheduleError =
  | { code: "STEP_INVALID" }
  | { code: "RANGE_OUT_OF_DAY"; weekday: IsoWeekday }
  | { code: "RANGE_INVERTED"; weekday: IsoWeekday }
  | { code: "RANGES_OVERLAP"; weekday: IsoWeekday };

/** RF-12: franjas bien formadas y sin superponerse dentro del día; paso que divide la hora. */
export function validateSchedule(ranges: WeeklyRange[], stepMinutes: number): Result<void, ScheduleError[]> {
  const errors: ScheduleError[] = [];
  if (!(ALLOWED_STEPS as readonly number[]).includes(stepMinutes)) errors.push({ code: "STEP_INVALID" });

  const valid: WeeklyRange[] = [];
  for (const range of ranges) {
    if (!isMinuteOfDay(range.opensAt) || !isMinuteOfDay(range.closesAt)) {
      errors.push({ code: "RANGE_OUT_OF_DAY", weekday: range.weekday });
    } else if (range.closesAt <= range.opensAt) {
      errors.push({ code: "RANGE_INVERTED", weekday: range.weekday });
    } else {
      valid.push(range);
    }
  }

  // Ordenadas por día y apertura, dos franjas se superponen si una abre antes de que cierre la anterior.
  // Que una abra justo cuando cierra la otra está permitido (final abierto).
  const sorted = [...valid].sort((a, b) => a.weekday - b.weekday || a.opensAt - b.opensAt);
  const overlapping = new Set<IsoWeekday>();
  for (let i = 1; i < sorted.length; i++) {
    const prev = sorted[i - 1]!;
    const curr = sorted[i]!;
    if (prev.weekday === curr.weekday && curr.opensAt < prev.closesAt) overlapping.add(curr.weekday);
  }
  for (const weekday of overlapping) errors.push({ code: "RANGES_OVERLAP", weekday });

  return errors.length === 0 ? ok(undefined) : err(errors);
}

/** RF-14: el fin de un bloqueo es posterior a su inicio. */
export function validateBlock(block: Interval): Result<void, "BLOCK_EMPTY"> {
  return block.end.getTime() > block.start.getTime() ? ok(undefined) : err("BLOCK_EMPTY");
}
