import type { Client } from "pg";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { createServiceCatalog } from "@/modules/pricing/infrastructure/service-repository";
import {
  createBlockOccupations,
  createScheduleRepository,
} from "@/modules/schedule/infrastructure/schedule-repository";
import { queries } from "@/server/composition";
import { createDatabase, type Database } from "@/shared/db/client";
import { instantAt, localDate } from "@/shared/kernel";
import { connect, TEST_DATABASE_URL } from "./db";

vi.mock("server-only", () => ({}));

// Los repositorios se prueban con el rol de la app (solo lectura); los datos se preparan como postgres.
const APP_URL = TEST_DATABASE_URL.replace("postgres:postgres@", "app_server:local-test-only@");
let admin: Client;
let db: Database;

beforeAll(async () => {
  admin = await connect();
  await admin.query("alter role app_server password 'local-test-only'");
  db = createDatabase(APP_URL);
});
afterAll(async () => {
  await db.destroy();
  await admin.query("delete from app.schedule_blocks");
  await admin.query("update app.services set deactivated_at = null");
  await admin.end();
});

describe("ScheduleRepository", () => {
  it("lee la configuración inicial", async () => {
    expect(await createScheduleRepository(db).settings()).toEqual({
      config: { stepMinutes: 15, minNoticeMinutes: 30, maxAdvanceDays: 30 },
      contactWhatsapp: "+5491138163491",
    });
  });

  it("lee las franjas como minutos del día", async () => {
    const ranges = await createScheduleRepository(db).weeklyRanges();
    expect(ranges).toHaveLength(12);
    expect(ranges.slice(0, 2)).toEqual([
      { weekday: 1, opensAt: 600, closesAt: 780 },
      { weekday: 1, opensAt: 840, closesAt: 1200 },
    ]);
  });
});

describe("OccupationSource de bloqueos", () => {
  it("devuelve los bloqueos que se superponen con el rango, como instantes", async () => {
    await admin.query("delete from app.schedule_blocks");
    await admin.query(`insert into app.schedule_blocks (period, notice) values
      ('[2026-12-01 00:00-03, 2026-12-08 00:00-03)', 'Vacaciones'),
      ('[2026-11-26 10:00-03, 2026-11-26 11:00-03)', 'Trámite'),
      ('[2027-03-01 10:00-03, 2027-03-01 11:00-03)', 'Lejos')`);
    const found = await createBlockOccupations(db).occupations({
      start: instantAt(localDate("2026-11-21"), 0),
      end: instantAt(localDate("2026-12-22"), 0),
    });
    expect(found).toEqual([
      { start: new Date("2026-11-26T13:00:00Z"), end: new Date("2026-11-26T14:00:00Z") },
      { start: new Date("2026-12-01T03:00:00Z"), end: new Date("2026-12-08T03:00:00Z") },
    ]);
  });

  it("no devuelve un bloqueo que termina justo cuando empieza el rango", async () => {
    await admin.query("delete from app.schedule_blocks");
    await admin.query("insert into app.schedule_blocks (period) values ('[2026-11-20 10:00-03, 2026-11-21 00:00-03)')");
    const found = await createBlockOccupations(db).occupations({
      start: instantAt(localDate("2026-11-21"), 0),
      end: instantAt(localDate("2026-11-22"), 0),
    });
    expect(found).toEqual([]);
  });
});

describe("ServiceCatalog", () => {
  it("lista los servicios activos en orden, con su slug", async () => {
    const services = await createServiceCatalog(db).listActive();
    expect(services.map((s) => [s.slug, s.durationMinutes, s.priceCents, s.countsForBenefits])).toEqual([
      ["corte", 30, 1_800_000, true],
      ["completo", 30, 2_000_000, true],
      ["claritos", 120, 7_000_000, false],
    ]);
  });

  it("no lista los servicios desactivados (caso límite 12)", async () => {
    await admin.query("update app.services set deactivated_at = now() where name = 'Claritos'");
    expect((await createServiceCatalog(db).listActive()).map((s) => s.name)).toEqual(["Corte", "Completo"]);
    await admin.query("update app.services set deactivated_at = null");
  });
});

describe("composición completa", () => {
  it("calcula la disponibilidad de punta a punta con un bloqueo", async () => {
    await admin.query("delete from app.schedule_blocks");
    await admin.query("insert into app.schedule_blocks (period) values ('[2026-11-26 10:00-03, 2026-11-26 11:00-03)')");
    const q = queries(db);
    const [corte] = await q.listServices();
    const result = await q.getAvailability({
      serviceMinutes: corte!.durationMinutes,
      now: instantAt(localDate("2026-11-25"), 12 * 60),
      day: localDate("2026-11-26"),
    });
    expect(result.starts[0]?.label).toBe("11:00");
    expect(result.week.find((d) => d.date === "2026-11-26")?.count).toBe(34 - 4);
  });
});

describe("foto de la agenda desde la base (cambio 01)", () => {
  it("trae configuración, franjas, bloqueos como lapsos y solo los avisos públicos (spec 003, RF-14)", async () => {
    await admin.query("delete from app.schedule_blocks");
    await admin.query(`insert into app.schedule_blocks (period, notice) values
      ('[2026-11-26 10:00-03, 2026-11-26 11:00-03)', null),
      ('[2026-11-27 10:00-03, 2026-11-27 11:00-03)', 'Trámite')`);
    const snapshot = await queries(db).getScheduleSnapshot(instantAt(localDate("2026-11-24"), 9 * 60));
    expect(snapshot.ranges).toHaveLength(12);
    expect(snapshot.config.stepMinutes).toBe(15);
    expect(snapshot.occupations).toHaveLength(2);
    expect(snapshot.notices).toEqual([{ start: Date.parse("2026-11-27T13:00:00Z"), end: Date.parse("2026-11-27T14:00:00Z"), text: "Trámite" }]);
    expect(Object.keys(snapshot.notices[0]!)).toEqual(["start", "end", "text"]); // nada de quién lo cargó
  });
});
