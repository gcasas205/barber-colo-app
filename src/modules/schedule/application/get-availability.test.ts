import { describe, expect, it } from "vitest";
import { instantAt, localDate } from "@/shared/kernel";
import type { Interval, WeeklyRange } from "../domain/schedule";
import { getAvailability } from "./get-availability";
import type { OccupationSource, ScheduleRepository } from "./ports";

const hm = (t: string) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3));
const at = (date: string, time: string) => instantAt(localDate(date), hm(time));

const ranges: WeeklyRange[] = ([1, 2, 3, 4, 5, 6] as const).flatMap((weekday) => [
  { weekday, opensAt: hm("10:00"), closesAt: hm("13:00") },
  { weekday, opensAt: hm("14:00"), closesAt: hm("20:00") },
]);

function deps(blocks: Interval[] = []) {
  const asked: Interval[] = [];
  const schedule: ScheduleRepository = {
    settings: async () => ({
      config: { stepMinutes: 15, minNoticeMinutes: 30, maxAdvanceDays: 30 },
      contactWhatsapp: "+5491138163491",
    }),
    weeklyRanges: async () => ranges,
  };
  const occupations: OccupationSource = {
    occupations: async (range) => {
      asked.push(range);
      return blocks.filter((b) => b.start < range.end && range.start < b.end);
    },
    notices: async () => [],
  };
  return { deps: { schedule, occupations }, asked };
}

const now = at("2026-11-24", "19:40"); // martes, ya no queda nada hoy

describe("getAvailability", () => {
  it("sin día elegido, muestra el primero con lugar y su semana", async () => {
    const result = await getAvailability(deps().deps, { serviceMinutes: 30, now });
    expect(result.day).toBe("2026-11-25");
    expect(result.starts[0]?.label).toBe("10:00");
    expect(result.week[0]?.date).toBe("2026-11-23");
    expect(result.contactWhatsapp).toBe("+5491138163491");
    expect(result.noRoomInWindow).toBe(false);
  });

  it("pide las ocupaciones de toda la ventana en una sola consulta", async () => {
    const { deps: d, asked } = deps();
    await getAvailability(d, { serviceMinutes: 30, now });
    expect(asked).toEqual([{ start: at("2026-11-24", "00:00"), end: at("2026-12-25", "00:00") }]);
  });

  it("un día sin lugar sugiere el próximo (RF-6)", async () => {
    const result = await getAvailability(deps().deps, { serviceMinutes: 30, now, day: localDate("2026-11-29") });
    expect(result.day).toBe("2026-11-29");
    expect(result.starts).toEqual([]);
    expect(result.nextDayWithRoom).toBe("2026-11-30");
  });

  it("un día con lugar no sugiere otro", async () => {
    const result = await getAvailability(deps().deps, { serviceMinutes: 30, now, day: localDate("2026-11-26") });
    expect(result.nextDayWithRoom).toBeNull();
  });

  it("un día fuera de la ventana se reemplaza por el primero con lugar", async () => {
    for (const day of ["2026-11-01", "2027-03-01"]) {
      expect((await getAvailability(deps().deps, { serviceMinutes: 30, now, day: localDate(day) })).day).toBe("2026-11-25");
    }
  });

  it("sin lugar en toda la ventana lo avisa (RF-6b)", async () => {
    const all: Interval = { start: at("2026-11-01", "00:00"), end: at("2027-02-01", "00:00") };
    const result = await getAvailability(deps([all]).deps, { serviceMinutes: 30, now });
    expect(result.noRoomInWindow).toBe(true);
    expect(result.day).toBe("2026-11-24");
    expect(result.starts).toEqual([]);
    expect(result.nextDayWithRoom).toBeNull();
  });

  it("navega de a una semana sin salir de la ventana (RF-4)", async () => {
    const first = await getAvailability(deps().deps, { serviceMinutes: 30, now });
    expect(first.previousWeek).toBeNull();
    expect(first.nextWeek).toBe("2026-11-30");

    // La ventana termina el jueves 2026-12-24: su semana empieza el lunes 21.
    const last = await getAvailability(deps().deps, { serviceMinutes: 30, now, weekOf: localDate("2026-12-23") });
    expect(last.week[0]?.date).toBe("2026-12-21");
    expect(last.nextWeek).toBeNull();
    expect(last.previousWeek).toBe("2026-12-14");

    const clamped = await getAvailability(deps().deps, { serviceMinutes: 30, now, weekOf: localDate("2027-06-01") });
    expect(clamped.week[0]?.date).toBe("2026-12-21");
  });
});
