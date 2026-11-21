import { describe, expect, it } from "vitest";
import { instantAt, localDate } from "@/shared/kernel";
import type { Interval } from "../domain/schedule";
import { getScheduleSnapshot, snapshotInput } from "./get-schedule-snapshot";

const at = (d: string, minute: number) => instantAt(localDate(d), minute);

describe("getScheduleSnapshot (RF-15)", () => {
  it("junta todo lo necesario para calcular en el dispositivo, en números y textos serializables", async () => {
    const asked: Interval[] = [];
    const block = { start: at("2026-11-26", 600), end: at("2026-11-26", 660) };
    const snapshot = await getScheduleSnapshot(
      {
        schedule: {
          settings: async () => ({ config: { stepMinutes: 15, minNoticeMinutes: 30, maxAdvanceDays: 30 }, contactWhatsapp: "+5491138163491" }),
          weeklyRanges: async () => [{ weekday: 4, opensAt: 600, closesAt: 780 }],
        },
        occupations: { occupations: async (range) => (asked.push(range), [block]) },
      },
      at("2026-11-24", 540),
    );
    expect(snapshot).toEqual({
      serverNow: at("2026-11-24", 540).getTime(),
      config: { stepMinutes: 15, minNoticeMinutes: 30, maxAdvanceDays: 30 },
      ranges: [{ weekday: 4, opensAt: 600, closesAt: 780 }],
      occupations: [[block.start.getTime(), block.end.getTime()]],
      contactWhatsapp: "+5491138163491",
    });
    // Toda la ventana y un día más: si la página queda abierta después de medianoche, la ventana se corre un día.
    expect(asked).toEqual([{ start: at("2026-11-24", 0), end: at("2026-12-26", 0) }]);
    expect(JSON.parse(JSON.stringify(snapshot))).toEqual(snapshot);
  });

  it("vuelve a armar la entrada del cálculo con fechas", () => {
    const input = snapshotInput(
      { serverNow: 0, config: { stepMinutes: 15, minNoticeMinutes: 30, maxAdvanceDays: 30 }, ranges: [], occupations: [[1000, 2000]], contactWhatsapp: "" },
      30,
      new Date(5000),
    );
    expect(input.occupations).toEqual([{ start: new Date(1000), end: new Date(2000) }]);
    expect(input.now).toEqual(new Date(5000));
    expect(input.serviceMinutes).toBe(30);
  });
});
