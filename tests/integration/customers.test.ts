import type { Client } from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { connect, createAuthUser, inRollback, sqlState, TEST_DATABASE_URL } from "./db";

// SQLSTATE: 23514 check, 23505 único, 23503 clave foránea, 42501 sin permiso.
let db: Client;
beforeAll(async () => {
  db = await connect();
});
afterAll(async () => {
  await db.end();
});

const holder = (userId: string, phone: string | null = null, name = "Martín") =>
  sqlState(db, "insert into app.customers (role, account_user_id, full_name, phone_e164) values ('holder', $1, $2, $3)", [userId, name, phone]);
const guest = (phone: string | null, name = "Lucas", extra = "") =>
  sqlState(db, `insert into app.customers (role, full_name, phone_e164${extra ? ", is_demo" : ""}) values ('guest', $1, $2${extra ? ", true" : ""})`, [name, phone]);

describe("clientes (RF-9 a RF-12, RF-17)", () => {
  it("un titular nace sin teléfono (perfil incompleto) y con cuenta", () =>
    inRollback(db, async () => {
      expect(await holder(await createAuthUser(db, { email: "a@x.com" }))).toBeNull();
      expect(await sqlState(db, "insert into app.customers (role, full_name) values ('holder', 'Sin cuenta')")).toBe("23514");
    }));

  it("un invitado no tiene cuenta y sí tiene teléfono", () =>
    inRollback(db, async () => {
      expect(await guest("+5491138163491")).toBeNull();
      expect(await guest(null)).toBe("23514");
      const user = await createAuthUser(db);
      expect(
        await sqlState(db, "insert into app.customers (role, account_user_id, full_name, phone_e164) values ('guest', $1, 'X Y', '+5491100000000')", [user]),
      ).toBe("23514");
    }));

  it("una cuenta tiene un solo titular", () =>
    inRollback(db, async () => {
      const user = await createAuthUser(db, { email: "b@x.com" });
      expect(await holder(user)).toBeNull();
      expect(await holder(user, null, "Otro")).toBe("23505");
    }));

  it("el teléfono es único entre clientes activos no vinculados", () =>
    inRollback(db, async () => {
      expect(await guest("+5491138163491")).toBeNull();
      expect(await guest("+5491138163491", "Otro")).toBe("23505");
      // Al unir el invitado a una cuenta (linked_to), el teléfono queda libre para el titular.
      const user = await createAuthUser(db, { email: "c@x.com" });
      const { rows } = await db.query("insert into app.customers (role, account_user_id, full_name) values ('holder', $1, 'Martín') returning id", [user]);
      await db.query("update app.customers set linked_to = $1 where role = 'guest' and phone_e164 = '+5491138163491'", [rows[0].id]);
      expect(await sqlState(db, "update app.customers set phone_e164 = '+5491138163491' where id = $1", [rows[0].id])).toBeNull();
    }));

  it("rechaza teléfonos que no son celulares argentinos normalizados", () =>
    inRollback(db, async () => {
      expect(await guest("11 3816-3491")).toBe("23514");
      expect(await guest("+59899123456")).toBe("23514");
    }));

  it("valida el cumpleaños (día y mes, el 29/2 vale) y el sobrenombre", () =>
    inRollback(db, async () => {
      const set = (sql: string) => sqlState(db, `update app.customers set ${sql} where full_name = 'Lucas'`);
      await guest("+5491138163491");
      expect(await set("birth_day = 29, birth_month = 2")).toBeNull();
      expect(await set("birth_day = 31, birth_month = 4")).toBe("23514");
      expect(await set("birth_day = 10, birth_month = null")).toBe("23514");
      expect(await set("nickname = 'el pelado de la moto'")).toBeNull();
      expect(await set(`nickname = '${"x".repeat(41)}'`)).toBe("23514");
    }));

  it("los datos de prueba llevan '(demo)' en el nombre y los reales no pueden llevar la marca (RF-25)", () =>
    inRollback(db, async () => {
      expect(await guest("+5491100000001", "Cliente de prueba 1 (demo)", "demo")).toBeNull();
      expect(await guest("+5491100000002", "Martín", "demo")).toBe("23514");
    }));
});

describe("identidad (RF-4, RF-14, RF-17, RF-18b, RF-22)", () => {
  it("un dispositivo invitado apunta a un cliente; una cuenta de prueba tiene un tipo único", () =>
    inRollback(db, async () => {
      await guest("+5491138163491");
      const anon = await createAuthUser(db, { anonymous: true });
      expect(
        await sqlState(db, "insert into app.guest_devices (auth_user_id, customer_id) select $1, id from app.customers where full_name = 'Lucas'", [anon]),
      ).toBeNull();
      const colo = await createAuthUser(db, { email: "prueba-barbero@x.com" });
      expect(await sqlState(db, "insert into app.demo_accounts (auth_user_id, kind) values ($1, 'barber')", [colo])).toBeNull();
      const otro = await createAuthUser(db, { email: "otro@example.com" });
      expect(await sqlState(db, "insert into app.demo_accounts (auth_user_id, kind) values ($1, 'barber')", [otro])).toBe("23505");
    }));

  it("registra actividad, cambios de teléfono e intentos de invitado", () =>
    inRollback(db, async () => {
      const user = await createAuthUser(db, { email: "d@x.com" });
      expect(await sqlState(db, "insert into app.user_activity (auth_user_id, last_seen_at) values ($1, now())", [user])).toBeNull();
      await guest("+5491138163491");
      expect(
        await sqlState(db, "insert into app.phone_changes (customer_id, old_phone, new_phone, changed_by) select id, '+5491100000000', phone_e164, $1 from app.customers where full_name = 'Lucas'", [user]),
      ).toBeNull();
      expect(await sqlState(db, "insert into app.guest_attempts (ip_hash) values ('abc')")).toBeNull();
    }));

  it("la limpieza diaria está programada (RF-14: 12 meses; intentos: 1 día)", async () => {
    const { rows } = await db.query("select jobname, schedule from cron.job where jobname = 'retencion-diaria'");
    expect(rows).toHaveLength(1);
  });
});

describe("permisos de app_server (RNF-3)", () => {
  let asApp: Client;
  beforeAll(async () => {
    await db.query("alter role app_server password 'local-test-only'");
    asApp = await connect(TEST_DATABASE_URL.replace("postgres:postgres@", "app_server:local-test-only@"));
  });
  afterAll(async () => {
    await asApp.end();
  });

  it("puede leer, crear y actualizar clientes, pero no borrarlos", () =>
    inRollback(asApp, async () => {
      expect(await sqlState(asApp, "insert into app.customers (role, full_name, phone_e164) values ('guest', 'Lucas', '+5491138163491')")).toBeNull();
      expect(await sqlState(asApp, "update app.customers set nickname = 'Lu' where full_name = 'Lucas'")).toBeNull();
      expect(await sqlState(asApp, "delete from app.customers")).toBe("42501");
    }));

  it("no puede borrar el registro de cambios de teléfono ni las cuentas de prueba", () =>
    inRollback(asApp, async () => {
      expect(await sqlState(asApp, "delete from app.phone_changes")).toBe("42501");
      expect(await sqlState(asApp, "delete from app.demo_accounts")).toBe("42501");
    }));

  it("no puede borrar servicios (spec 003: se sacan, no se borran)", () =>
    inRollback(asApp, async () => {
      expect(await sqlState(asApp, "delete from app.services")).toBe("42501");
    }));
});
