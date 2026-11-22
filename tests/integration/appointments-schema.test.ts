import type { Client } from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { connect, inRollback, sqlState, TEST_DATABASE_URL } from "./db";

// Spec 004, T2: la base garantiza que no haya dos turnos activos superpuestos (RF-12, RNF-2) y
// `app_server` tiene lo mínimo (RNF-3).
let admin: Client;
let asApp: Client;
beforeAll(async () => {
  admin = await connect();
  await admin.query("alter role app_server password 'local-test-only'");
  asApp = await connect(TEST_DATABASE_URL.replace("postgres:postgres@", "app_server:local-test-only@"));
});
afterAll(async () => {
  await asApp.end();
  await admin.end();
});

async function guest(db: Client, phone: string) {
  const { rows } = await db.query("insert into app.customers (role, full_name, phone_e164) values ('guest', 'Prueba Turnos', $1) returning id", [phone]);
  return rows[0].id as string;
}
const insert = (period: string, status = "reserved") =>
  `insert into app.appointments (customer_id, service_id, period, status, price_cents)
   select $1, id, '${period}', '${status}', 1800000 from app.services where name = 'Corte'`;

describe("turnos en la base (spec 004)", () => {
  it("caso 1 y RF-12: dos turnos activos superpuestos no pueden existir", () =>
    inRollback(asApp, async () => {
      const c = await guest(asApp, "+5491177000001");
      expect(await sqlState(asApp, insert("[2026-12-01 10:00-03, 2026-12-01 10:30-03)"), [c])).toBeNull();
      expect(await sqlState(asApp, insert("[2026-12-01 10:15-03, 2026-12-01 10:45-03)"), [c])).toBe("23P01");
      // Terminar justo cuando empieza el otro vale (RF-9 de la 001).
      expect(await sqlState(asApp, insert("[2026-12-01 10:30-03, 2026-12-01 11:00-03)"), [c])).toBeNull();
    }));

  it("un turno cancelado libera el horario", () =>
    inRollback(asApp, async () => {
      const c = await guest(asApp, "+5491177000002");
      await asApp.query(insert("[2026-12-01 12:00-03, 2026-12-01 12:30-03)", "cancelled"), [c]);
      expect(await sqlState(asApp, insert("[2026-12-01 12:00-03, 2026-12-01 12:30-03)"), [c])).toBeNull();
    }));

  it("RNF-3: app_server no borra turnos ni eventos", () =>
    inRollback(asApp, async () => {
      expect(await sqlState(asApp, "delete from app.appointments")).toBe("42501");
      expect(await sqlState(asApp, "delete from app.appointment_events")).toBe("42501");
    }));

  it("un evento de Colo que cancela o mueve exige el motivo", () =>
    inRollback(asApp, async () => {
      const c = await guest(asApp, "+5491177000003");
      const { rows } = await asApp.query(`${insert("[2026-12-01 14:00-03, 2026-12-01 14:30-03)")} returning id`, [c]);
      const ev = "insert into app.appointment_events (appointment_id, actor, kind, reason) values ($1, 'barber', 'cancelled', $2)";
      expect(await sqlState(asApp, ev, [rows[0].id, null])).toBe("23514");
      expect(await sqlState(asApp, ev, [rows[0].id, "Me enfermé"])).toBeNull();
    }));
});
