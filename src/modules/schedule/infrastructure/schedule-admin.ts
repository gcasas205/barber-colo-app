import { sql } from "kysely";
import type { IsoWeekday } from "@/shared/kernel";
import type { Database } from "@/shared/db/client";
import type { ScheduleAdmin } from "../application/ports";

const timeToMinutes = (t: string) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3, 5));
/** 600 → "10:00"; 1440 → "24:00" (Postgres acepta 24:00 en `time`). */
const minutesToTime = (m: number) => `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
const isId = (id: string) => /^\d{1,18}$/.test(id);

/** Escritura de la agenda (spec 003). `db` es la transacción que abre `src/server/settings.ts`. */
export function createScheduleAdmin(db: Database): ScheduleAdmin {
  return {
    async lockSettings() {
      const row = await db
        .selectFrom("app.schedule_settings")
        .select(["step_minutes", "min_notice_minutes", "max_advance_days", "contact_whatsapp"])
        .where("id", "=", 1)
        .forUpdate()
        .executeTakeFirstOrThrow();
      return {
        config: { stepMinutes: row.step_minutes, minNoticeMinutes: row.min_notice_minutes, maxAdvanceDays: row.max_advance_days },
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
      return rows.map((r) => ({ weekday: r.weekday as IsoWeekday, opensAt: timeToMinutes(r.opens_at), closesAt: timeToMinutes(r.closes_at) }));
    },

    async replaceWeeklyRanges(ranges) {
      await db.deleteFrom("app.weekly_ranges").execute();
      if (ranges.length === 0) return;
      await db
        .insertInto("app.weekly_ranges")
        .values(ranges.map((r) => ({ weekday: r.weekday, opens_at: minutesToTime(r.opensAt), closes_at: minutesToTime(r.closesAt) })))
        .execute();
    },

    async updateStep(stepMinutes) {
      await db.updateTable("app.schedule_settings").set({ step_minutes: stepMinutes, updated_at: new Date() }).where("id", "=", 1).execute();
    },

    async updateBookingRules(rules) {
      await db
        .updateTable("app.schedule_settings")
        .set({ min_notice_minutes: rules.minNoticeMinutes, max_advance_days: rules.maxAdvanceDays, updated_at: new Date() })
        .where("id", "=", 1)
        .execute();
    },

    async updateContact(whatsapp) {
      await db.updateTable("app.schedule_settings").set({ contact_whatsapp: whatsapp, updated_at: new Date() }).where("id", "=", 1).execute();
    },

    async insertBlock(block, notice, createdBy) {
      const row = await db
        .insertInto("app.schedule_blocks")
        .values({ period: sql<string>`tstzrange(${block.start}, ${block.end}, '[)')`, notice, created_by: createdBy })
        .returning("id")
        .executeTakeFirstOrThrow();
      return String(row.id);
    },

    async deleteBlock(id) {
      if (!isId(id)) return false;
      const result = await db.deleteFrom("app.schedule_blocks").where("id", "=", id).executeTakeFirst();
      return Number(result.numDeletedRows) > 0;
    },

    async currentBlocks(now) {
      const rows = await db
        .selectFrom("app.schedule_blocks")
        .select(["id", "notice", sql<Date>`lower(period)`.as("start"), sql<Date>`upper(period)`.as("end")])
        .where(sql<boolean>`upper(period) > ${now}`)
        .orderBy(sql`lower(period)`)
        .execute();
      return rows.map((r) => ({ id: String(r.id), notice: r.notice, start: new Date(r.start), end: new Date(r.end) }));
    },
  };
}
