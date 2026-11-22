import { sql } from "kysely";
import type { IsoWeekday } from "@/shared/kernel";
import type { Database } from "@/shared/db/client";
import type { OccupationSource, ScheduleRepository } from "../application/ports";
import type { Interval } from "../domain/schedule";

/** "10:00:00" → 600; "24:00:00" → 1440. */
const timeToMinutes = (t: string) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3, 5));

export function createScheduleRepository(db: Database): ScheduleRepository {
  return {
    async settings() {
      const row = await db
        .selectFrom("app.schedule_settings")
        .select(["step_minutes", "min_notice_minutes", "max_advance_days", "contact_whatsapp"])
        .where("id", "=", 1)
        .executeTakeFirstOrThrow();
      return {
        config: {
          stepMinutes: row.step_minutes,
          minNoticeMinutes: row.min_notice_minutes,
          maxAdvanceDays: row.max_advance_days,
        },
        contactWhatsapp: row.contact_whatsapp,
      };
    },

    async weeklyRanges() {
      const rows = await db
        .selectFrom("app.weekly_ranges")
        .select(["weekday", "opens_at", "closes_at"])
        .orderBy("weekday")
        .orderBy("opens_at")
        .execute();
      return rows.map((r) => ({
        weekday: r.weekday as IsoWeekday,
        opensAt: timeToMinutes(r.opens_at),
        closesAt: timeToMinutes(r.closes_at),
      }));
    },
  };
}

/** Las ocupaciones son los bloqueos que se superponen con el rango pedido; los avisos, los que tienen texto. */
export function createBlockOccupations(db: Database): OccupationSource {
  return {
    async occupations(range: Interval): Promise<Interval[]> {
      const rows = await db
        .selectFrom("app.schedule_blocks")
        .select([sql<Date>`lower(period)`.as("start"), sql<Date>`upper(period)`.as("end")])
        .where(sql<boolean>`period && tstzrange(${range.start}, ${range.end}, '[)')`)
        .orderBy(sql`lower(period)`)
        .execute();
      return rows.map((r) => ({ start: new Date(r.start), end: new Date(r.end) }));
    },

    async notices(range: Interval) {
      const rows = await db
        .selectFrom("app.schedule_blocks")
        .select(["notice", sql<Date>`lower(period)`.as("start"), sql<Date>`upper(period)`.as("end")])
        .where("notice", "is not", null)
        .where(sql<boolean>`period && tstzrange(${range.start}, ${range.end}, '[)')`)
        .orderBy(sql`lower(period)`)
        .execute();
      return rows.map((r) => ({ start: new Date(r.start), end: new Date(r.end), text: r.notice! }));
    },
  };
}

/** Spec 004, RF-26: los bloqueos de un día para la agenda de Colo, con o sin aviso. */
export function createBlockList(db: Database) {
  return async (range: Interval): Promise<{ start: Date; end: Date; notice: string | null }[]> => {
    const rows = await db
      .selectFrom("app.schedule_blocks")
      .select(["notice", sql<Date>`lower(period)`.as("start"), sql<Date>`upper(period)`.as("end")])
      .where(sql<boolean>`period && tstzrange(${range.start}, ${range.end}, '[)')`)
      .orderBy(sql`lower(period)`)
      .execute();
    return rows.map((r) => ({ start: new Date(r.start), end: new Date(r.end), notice: r.notice }));
  };
}
