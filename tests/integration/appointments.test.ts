import type { Client } from "pg";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { book, cancelByBarber, cancelByCustomer, getDayAgenda, getMyAppointments, hasUpcomingAppointment, markAgendaSeen, rescheduleByCustomer } from "@/modules/appointments";
import { addDependent, removeDependent } from "@/modules/customers";
import { createCustomersStore } from "@/modules/customers/infrastructure/customers-store";
import type { Actor } from "@/modules/identity";
import { appointmentsDeps } from "@/server/appointments";
import { queries } from "@/server/composition";
import { createDatabase, type Database } from "@/shared/db/client";
import { localDate } from "@/shared/kernel";
import { connect, createAuthUser, TEST_DATABASE_URL } from "./db";

vi.mock("server-only", () => ({}));

// Spec 004, T4: los casos de uso de Turnos con la base real, como `app_server`.
const APP_URL = TEST_DATABASE_URL.replace("postgres:postgres@", "app_server:local-test-only@");
const at = (hhmm: string, day = "2026-11-25") => new Date(`${day}T${hhmm}:00-03:00`);
const now = at("08:00");
let admin: Client;
let db: Database;
let other: Database;
let corte: string;
let colo: Actor;

const RUN = String(Date.now()).slice(-4);
async function customer(name: string, phone: string): Promise<Actor> {
  phone = phone.slice(0, -4) + String((Number(phone.slice(-4)) + Number(RUN)) % 10000).padStart(4, "0"); // único por corrida
  const userId = await createAuthUser(admin, { anonymous: true });
  const { rows } = await admin.query("insert into app.customers (role, full_name, phone_e164) values ('guest', $1, $2) returning id", [name, phone]);
  return { kind: "guest", userId, customerId: rows[0].id };
}

beforeAll(async () => {
  admin = await connect();
  await admin.query("alter role app_server password 'local-test-only'");
  db = createDatabase(APP_URL);
  other = createDatabase(APP_URL);
  corte = (await admin.query("select id::text from app.services where name = 'Corte'")).rows[0].id;
  colo = { kind: "barber", userId: await createAuthUser(admin, { email: `colo-t-${Date.now()}@example.com` }), demo: true };
});
beforeEach(async () => {
  await admin.query("delete from app.appointment_events; delete from app.appointments; delete from app.agenda_views");
  await admin.query("update app.services set price_cents = 1800000 where name = 'Corte'");
});
afterAll(async () => {
  await admin.query("delete from app.appointment_events; delete from app.appointments; delete from app.agenda_views");
  await admin.query("update app.services set price_cents = 1800000 where name = 'Corte'");
  await db.destroy();
  await other.destroy();
  await admin.end();
});

describe("turnos contra la base (spec 004)", () => {
  it("caso 1: dos personas confirman el mismo horario a la vez; reserva una sola", async () => {
    const [a, b] = await Promise.all([customer("Ana Uno", "+5491170000001"), customer("Beto Dos", "+5491170000002")]);
    const results = await Promise.all([
      book(appointmentsDeps(db), a, { serviceId: corte, start: at("16:00") }, now),
      book(appointmentsDeps(other), b, { serviceId: corte, start: at("16:00") }, now),
    ]);
    expect(results.filter((r) => r.ok)).toHaveLength(1);
    expect(results.find((r) => !r.ok)).toEqual({ ok: false, error: "SLOT_TAKEN" });
  });

  it("caso 13: el mismo cliente desde dos pestañas a la vez: un solo turno", async () => {
    const a = await customer("Ana Tres", "+5491170000003");
    const results = await Promise.all([
      book(appointmentsDeps(db), a, { serviceId: corte, start: at("16:00") }, now),
      book(appointmentsDeps(other), a, { serviceId: corte, start: at("17:00") }, now),
    ]);
    expect(results.filter((r) => r.ok)).toHaveLength(1);
    expect(results.find((r) => !r.ok)).toMatchObject({ ok: false, error: { hasUpcoming: expect.anything() } });
  });

  it("casos 9 y RF-28: el turno conserva el precio aunque Colo lo cambie, y la foto pública lo ocupa sin decir de quién", async () => {
    const a = await customer("Ana Cuatro", "+5491170000004");
    const r = await book(appointmentsDeps(db), a, { serviceId: corte, start: at("16:00") }, now);
    expect(r.ok).toBe(true);
    await admin.query("update app.services set price_cents = 2500000 where name = 'Corte'");
    const mine = await getMyAppointments(appointmentsDeps(db), a, now);
    expect(mine.appointments[0]).toMatchObject({ priceCents: 1_800_000, serviceName: "Corte", status: "reserved" });
    const snapshot = await queries(db).getScheduleSnapshot(now);
    expect(snapshot.occupations).toContainEqual([at("16:00").getTime(), at("16:30").getTime()]);
    expect(JSON.stringify(snapshot)).not.toContain("Ana");
  });

  it("reprogramar, cancelar como Colo, aviso al cliente, agenda con 'Nuevo' e historial", async () => {
    const a = await customer("Ana Cinco", "+5491170000005");
    const r = await book(appointmentsDeps(db), a, { serviceId: corte, start: at("16:00") }, now);
    if (!r.ok) throw new Error();
    expect((await rescheduleByCustomer(appointmentsDeps(db), a, r.value.id, at("16:15"), false, at("08:30"))).ok).toBe(true);
    const agenda = await getDayAgenda(appointmentsDeps(db), colo, localDate("2026-11-25"), at("08:40"));
    expect(agenda.ok && agenda.value.items.map((i) => [i.customer.name, i.isNew, i.start.getTime()])).toEqual([["Ana Cinco", true, at("16:15").getTime()]]);
    await markAgendaSeen(appointmentsDeps(db), colo, localDate("2026-11-25"), at("08:41"));
    const seen = await getDayAgenda(appointmentsDeps(db), colo, localDate("2026-11-25"), at("08:42"));
    expect(seen.ok && seen.value.items[0]!.isNew).toBe(false);
    expect((await cancelByBarber(appointmentsDeps(db), colo, r.value.id, "Me enfermé", at("09:00"))).ok).toBe(true);
    const mine = await getMyAppointments(appointmentsDeps(db), a, at("09:01"));
    expect(mine).toEqual({ appointments: [], notice: expect.objectContaining({ kind: "cancelled", reason: "Me enfermé", fromStart: at("16:15"), isSelf: true }) });
    const { rows } = await admin.query("select actor, kind, late from app.appointment_events order by at");
    expect(rows).toEqual([
      { actor: "customer", kind: "booked", late: false },
      { actor: "customer", kind: "rescheduled", late: false },
      { actor: "barber", kind: "cancelled", late: false },
    ]);
  });
});

describe("personas a cargo contra la base (spec 004b)", () => {
  async function holder(name: string, phone: string): Promise<Actor> {
    phone = phone.slice(0, -4) + String((Number(phone.slice(-4)) + Number(RUN)) % 10000).padStart(4, "0");
    const userId = await createAuthUser(admin, { email: `titular-${RUN}-${Math.random().toString(36).slice(2, 8)}@example.com` });
    const { rows } = await admin.query(
      "insert into app.customers (role, account_user_id, full_name, phone_e164) values ('holder', $1, $2, $3) returning id",
      [userId, name, phone],
    );
    return { kind: "customer", userId, customerId: rows[0].id, profileComplete: true, demo: false };
  }

  it("casos 1, 3 y 9: reserva para el hijo, la agenda lo muestra a cargo del titular y no se lo quita con turno futuro", async () => {
    const papa = await holder("Lucas Seis", "+5491170000006");
    const store = createCustomersStore(db);
    const hijo = await addDependent({ store }, papa, { name: "Tomi", birthday: null });
    expect(hijo.ok).toBe(true);
    const hijoId = hijo.ok ? hijo.value.id : "";

    expect((await book(appointmentsDeps(db), papa, { serviceId: corte, start: at("16:00") }, now)).ok).toBe(true);
    const r = await book(appointmentsDeps(db), papa, { serviceId: corte, start: at("16:30"), forCustomerId: hijoId }, now);
    expect(r.ok && r.value).toMatchObject({ customerName: "Tomi" });

    const mine = await getMyAppointments(appointmentsDeps(db), papa, now);
    expect(mine.appointments.map((a) => [a.customerName, a.isSelf])).toEqual([["Lucas Seis", true], ["Tomi", false]]);

    const agenda = await getDayAgenda(appointmentsDeps(db), colo, localDate("2026-11-25"), at("08:01"));
    const item = agenda.ok ? agenda.value.items.find((i) => i.customer.name === "Tomi") : undefined;
    expect(item?.customer).toMatchObject({ holderName: "Lucas Seis", phone: expect.stringMatching(/^\+549117/) });

    expect(await hasUpcomingAppointment(appointmentsDeps(db), hijoId, now)).toBe(true);
    expect(await removeDependent({ store }, papa, hijoId, now)).toEqual({ ok: false, error: "HAS_UPCOMING" });
    expect((await cancelByCustomer(appointmentsDeps(db), papa, r.ok ? r.value.id : "", false, now)).ok).toBe(true);
    expect(await removeDependent({ store }, papa, hijoId, now)).toEqual({ ok: true, value: undefined });
    const { rows } = await admin.query("select full_name from app.customers where id = $1", [hijoId]);
    expect(rows[0].full_name).toBe("Cliente dado de baja"); // RF-5: el historial queda, sin datos
  });
});
