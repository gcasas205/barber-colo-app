import { err, isMinuteOfDay, ok, type IsoWeekday, type Result } from "@/shared/kernel";
import { ALLOWED_STEPS, type Interval, type WeeklyRange } from "./schedule";

export type ScheduleError =
  | { code: "STEP_INVALID" }
  | { code: "RANGE_OUT_OF_DAY"; weekday: IsoWeekday }
  | { code: "RANGE_INVERTED"; weekday: IsoWeekday }
  | { code: "RANGES_OVERLAP"; weekday: IsoWeekday };

/** RF-12: franjas bien formadas y sin superponerse dentro del día; paso que divide la hora. */
export function validateSchedule(ranges: WeeklyRange[], stepMinutes: number): Result<void, ScheduleError[]> {
  const stepErrors: ScheduleError[] = (ALLOWED_STEPS as readonly number[]).includes(stepMinutes) ? [] : [{ code: "STEP_INVALID" }];
  const wellFormed = ranges.filter((range) => rangeError(range) === null);
  const errors = [
    ...stepErrors,
    ...ranges.map(rangeError).filter((e) => e !== null),
    ...overlappingWeekdays(wellFormed).map((weekday): ScheduleError => ({ code: "RANGES_OVERLAP", weekday })),
  ];
  return errors.length === 0 ? ok(undefined) : err(errors);
}

/** El problema de forma de una franja suelta, o null. */
function rangeError(range: WeeklyRange): ScheduleError | null {
  if (!isMinuteOfDay(range.opensAt) || !isMinuteOfDay(range.closesAt)) return { code: "RANGE_OUT_OF_DAY", weekday: range.weekday };
  if (range.closesAt <= range.opensAt) return { code: "RANGE_INVERTED", weekday: range.weekday };
  return null;
}

/**
 * Días con franjas superpuestas. Ordenadas por día y apertura, dos franjas se superponen si una abre
 * antes de que cierre la anterior; que una abra justo cuando cierra la otra está permitido (final abierto).
 */
function overlappingWeekdays(ranges: WeeklyRange[]): IsoWeekday[] {
  const sorted = [...ranges].sort((a, b) => a.weekday - b.weekday || a.opensAt - b.opensAt);
  const overlapping = new Set<IsoWeekday>();
  for (let i = 1; i < sorted.length; i++) {
    const prev = sorted[i - 1]!;
    const curr = sorted[i]!;
    if (prev.weekday === curr.weekday && curr.opensAt < prev.closesAt) overlapping.add(curr.weekday);
  }
  return [...overlapping];
}

/** RF-14: el fin de un bloqueo es posterior a su inicio. */
export function validateBlock(block: Interval): Result<void, "BLOCK_EMPTY"> {
  return block.end.getTime() > block.start.getTime() ? ok(undefined) : err("BLOCK_EMPTY");
}
