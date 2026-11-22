import type { Client } from "pg";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import type { Actor } from "@/modules/identity";
import { deactivateService, reactivateService, saveService } from "@/modules/pricing";
import { addBlock, changeStep, getScheduleSettings, removeBlock, saveContact, saveWeeklyRanges } from "@/modules/schedule";
import { queries } from "@/server/composition";
import { scheduleAdminDeps, serviceAdminDeps } from "@/server/settings";
import { createDatabase, type Database } from "@/shared/db/client";
import { localDate } from "@/shared/kernel";
import { connect, createAuthUser, TEST_DATABASE_URL } from "./db";

vi.mock("server-only", () => ({}));

// Spec 003, T4: los casos de uso con los repositorios reales, como `app_server`. Cada test vuelve a la
// configuración inicial (la comparten los demás archivos de integración).
const APP_URL = TEST_DATABASE_URL.replace("postgres:postgres@", "app_server:local-test-only@");
let admin: Client;
let db: Database;
let colo: Actor;

async function restoreInitial() {
  await admin.query("delete from app.schedule_blocks");
  await admin.query("delete from app.settings_changes");
  await admin.query("update app.schedule_settings set step_minutes = 15, min_notice_minutes = 30, max_advance_days = 30, contact_whatsapp = '+5491138163491'");
  await admin.query("delete from app.weekly_ranges");
  await admin.query(`insert into app.weekly_ranges (weekday, opens_at, closes_at)
    select d, r.o, r.c from generate_series(1, 6) d cross join (values (time '10:00', time '13:00'), (time '14:00', time '20:00')) r(o, c)`);
  await admin.query("delete from app.services where name not in ('Corte', 'Completo', 'Claritos')");
  await admin.query(`update app.services set deactivated_at = null, position = case name when 'Corte' then 1 when 'Completo' then 2 else 3 end,
    price_cents = case name when 'Corte' then 1800000 when 'Completo' then 2000000 else 7000000 end`);
}

beforeAll(async () => {
  admin = await connect();
  await admin.query("alter role app_server password 'local-test-only'");
  db = createDatabase(APP_URL);
  colo = { kind: "barber", userId: await createAuthUser(admin, { email: `colo-${Date.now()}@example.com` }), demo: true };
});
beforeEach(restoreInitial);
afterAll(async () => {
  await restoreInitial();
  await db.destroy();
  await admin.end();
});

const now = new Date("2026-11-21T23:00:00Z");

describe("Ajustes contra la base (spec 003)", () => {
  it("guarda franjas, paso y contacto, y la foto pública los usa (RF-5, RF-8, RF-23, RF-25)", async () => {
    const deps = scheduleAdminDeps(db);
    expect((await saveWeeklyRanges(deps, colo, [{ weekday: 7, opensAt: 600, closesAt: 1440 }])).ok).toBe(true);
    expect((await changeStep(deps, colo, 30)).ok).toBe(true);
    expect((await saveContact(deps, colo, "+5491100001111")).ok).toBe(true);
    const snapshot = await queries(db).getScheduleSnapshot(now);
    expect(snapshot.ranges).toEqual([{ weekday: 7, opensAt: 600, closesAt: 1440 }]);
    expect(snapshot.config.stepMinutes).toBe(30);
    expect(snapshot.contactWhatsapp).toBe("+5491100001111");
  });

  it("registra quién cambió qué (RF-27)", async () => {
    await changeStep(scheduleAdminDeps(db), colo, 30);
    const { rows } = await admin.query("select area, changed_by, detail from app.settings_changes");
    expect(rows).toEqual([{ area: "paso", changed_by: colo.kind === "barber" && colo.userId, detail: { from: 15, to: 30 } }]);
  });

  it("caso 16: dos guardados de franjas a la vez dejan uno completo, nunca una mezcla", async () => {
    const other = createDatabase(APP_URL);
    const a = Array.from({ length: 4 }, (_, i) => ({ weekday: 1 as const, opensAt: 480 + i * 120, closesAt: 540 + i * 120 }));
    const b = [{ weekday: 2 as const, opensAt: 600, closesAt: 720 }];
    const results = await Promise.all([saveWeeklyRanges(scheduleAdminDeps(db), colo, a), saveWeeklyRanges(scheduleAdminDeps(other), colo, b)]);
    await other.destroy();
    expect(results.every((r) => r.ok)).toBe(true);
    const { rows } = await admin.query("select weekday from app.weekly_ranges");
    const days = new Set(rows.map((r) => r.weekday));
    expect(days.size).toBe(1);
    expect(rows).toHaveLength(days.has(1) ? 4 : 1);
  });

  it("bloqueos con aviso: se guardan con quién los cargó, se listan y se borran (RF-10, RF-12)", async () => {
    const deps = scheduleAdminDeps(db);
    const added = await addBlock(deps, colo, { kind: "days", first: localDate("2026-12-24"), last: localDate("2026-12-25") }, "Navidad", now);
    expect(added.ok).toBe(true);
    const { rows } = await admin.query("select notice, created_by, lower(period) as s, upper(period) as e from app.schedule_blocks");
    expect(rows[0]).toMatchObject({ notice: "Navidad", s: new Date("2026-12-24T03:00:00Z"), e: new Date("2026-12-26T03:00:00Z") });
    const view = await getScheduleSettings(deps, colo, now);
    expect(view.ok && view.value.blocks.map((b) => b.notice)).toEqual(["Navidad"]);
    expect(added.ok && (await removeBlock(deps, colo, added.value.id)).ok).toBe(true);
    expect(await removeBlock(deps, colo, "no-es-un-id")).toEqual({ ok: false, error: "NOT_FOUND" });
  });

  it("servicios: alta, nombre repetido, sacar y reactivar (RF-16, RF-17, RF-19, RF-20)", async () => {
    const deps = serviceAdminDeps(db);
    const input = { name: "Barba", description: "Perfilado", durationMinutes: 15, priceCents: 900_000, countsForBenefits: false };
    const created = await saveService(deps, colo, null, input);
    expect(created.ok).toBe(true);
    expect(await saveService(deps, colo, null, { ...input, name: " barba " })).toEqual({ ok: false, error: ["NAME_TAKEN"] });
    const corte = (await admin.query("select id::text from app.services where name = 'Corte'")).rows[0].id as string;
    expect((await deactivateService(deps, colo, corte, false)).ok).toBe(true);
    expect((await queries(db).listServices()).map((s) => s.name)).toEqual(["Completo", "Claritos", "Barba"]);
    expect((await reactivateService(deps, colo, corte)).ok).toBe(true);
    expect((await queries(db).listServices()).map((s) => s.name)).toEqual(["Completo", "Claritos", "Barba", "Corte"]);
  });

  it("un cliente no cambia nada (caso 15)", async () => {
    const cliente: Actor = { kind: "customer", userId: "x", customerId: null, profileComplete: false, demo: false };
    expect(await changeStep(scheduleAdminDeps(db), cliente, 30)).toEqual({ ok: false, error: "NOT_ALLOWED" });
    const { rows } = await admin.query("select step_minutes from app.schedule_settings");
    expect(rows[0].step_minutes).toBe(15);
  });
});
