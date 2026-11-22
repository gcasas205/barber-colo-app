import { describe, expect, it } from "vitest";
import { instantAt, localDate } from "@/shared/kernel";
import type { WeeklyRange } from "../domain/schedule";
import { getAvailability } from "./get-availability";

const hm = (t: string) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3));
const ranges: WeeklyRange[] = ([1, 2, 3, 4, 5, 6] as const).map((weekday) => ({
  weekday,
  opensAt: hm("10:00"),
  closesAt: hm("13:00"),
}));
const deps = {
  schedule: {
    settings: async () => ({ config: { stepMinutes: 15, minNoticeMinutes: 30, maxAdvanceDays: 30 }, contactWhatsapp: "+5491100000000" }),
    weeklyRanges: async () => ranges,
  },
  occupations: { occupations: async () => [], notices: async () => [] },
};
const now = instantAt(localDate("2026-11-24"), hm("09:00"));

describe("getAvailability al cambiar de semana", () => {
  it("sin día elegido, muestra el primer día con lugar de la semana pedida", async () => {
    const result = await getAvailability(deps, { serviceMinutes: 30, now, weekOf: localDate("2026-12-02") });
    expect(result.week[0]?.date).toBe("2026-11-30");
    expect(result.day).toBe("2026-11-30");
  });

  it("con día elegido, lo respeta aunque la semana sea otra", async () => {
    const result = await getAvailability(deps, {
      serviceMinutes: 30,
      now,
      day: localDate("2026-11-26"),
      weekOf: localDate("2026-12-02"),
    });
    expect(result.day).toBe("2026-11-26");
  });
});
