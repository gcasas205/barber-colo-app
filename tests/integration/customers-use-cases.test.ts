import type { Client } from "pg";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { enterAsDemo, enterAsGuest, listCustomers, saveProfile, setNickname } from "@/modules/customers/application/use-cases";
import { createCustomersStore } from "@/modules/customers/infrastructure/customers-store";
import type { Actor } from "@/modules/identity";
import { createDatabase, type Database } from "@/shared/db/client";
import { purgeDemo } from "../../scripts/purge-demo.mts";
import { connect, createAuthUser, TEST_DATABASE_URL } from "./db";

const APP_URL = TEST_DATABASE_URL.replace("postgres:postgres@", "app_server:local-test-only@");
const now = new Date();
const barber: Actor = { kind: "barber", userId: "colo", demo: true };
let admin: Client;
let db: Database;
let store: ReturnType<typeof createCustomersStore>;

async function clean() {
  await admin.query(`delete from app.phone_changes; delete from app.guest_devices; delete from app.user_activity;
    delete from app.demo_accounts; delete from app.customers where linked_to is not null; delete from app.customers; delete from app.guest_attempts;
    delete from auth.users where email is null or email like '%@x.test'`);
}

beforeAll(async () => {
  admin = await connect();
  await admin.query("alter role app_server password 'local-test-only'");
  db = createDatabase(APP_URL);
  store = createCustomersStore(db);
});
beforeEach(clean);
afterAll(async () => {
  await clean();
  await db.destroy();
  await admin.end();
});

const anon = () => createAuthUser(admin, { anonymous: true });
async function demoClient(email = "cliente1@example.com") {
  const userId = await createAuthUser(admin, { email: email.replace("@example.com", "@x.test") });
  const r = await enterAsDemo({ store, demoEnabled: true }, { authUserId: userId, email });
  if (!r.ok || r.value.kind !== "customer") throw new Error("demo");
  return { kind: "customer", userId, customerId: r.value.customerId, profileComplete: false, demo: true } as Actor & { customerId: string };
}
const guest = (name: string, phone: string, ip = "ip-1") => enterAsGuest({ store, createSession: anon }, { name, phone, ipHash: ip, now });

describe("casos de uso de clientes contra la base (como app_server)", () => {
  it("perfil completo con unión de un invitado (RF-12) y registro del cambio de teléfono (RF-14)", async () => {
    const g = await guest("Lucas", "11 3816-3491");
    const me = await demoClient();
    expect(await saveProfile({ store }, me, { name: "Lucas P.", phone: "1138163491", birthday: { day: 29, month: 2 } })).toEqual({ ok: true, value: { merged: true } });
    const { rows } = await admin.query("select id, linked_to, phone_e164, birth_day, birth_month from app.customers order by created_at");
    expect(rows.find((r) => r.id === (g.ok ? g.value.customerId : ""))?.linked_to).toBe(me.customerId);
    expect(rows.find((r) => r.id === me.customerId)).toMatchObject({ phone_e164: "+5491138163491", birth_day: 29, birth_month: 2 });
    const changes = await admin.query("select old_phone, new_phone from app.phone_changes");
    expect(changes.rows).toEqual([{ old_phone: null, new_phone: "+5491138163491" }]);
  });

  it("dos cuentas con el mismo teléfono: la segunda ve RF-11", async () => {
    const a = await demoClient("cliente1@example.com");
    const b = await demoClient("cliente2@example.com");
    await saveProfile({ store }, a, { name: "Ana", phone: "1138163491", birthday: null });
    expect(await saveProfile({ store }, b, { name: "Beto", phone: "1138163491", birthday: null })).toEqual({ ok: false, error: { fields: { phone: "PHONE_TAKEN" } } });
  });

  it("dos cuentas guardan el mismo teléfono al mismo tiempo: una lo consigue (caso 5)", async () => {
    const a = await demoClient("cliente1@example.com");
    const b = await demoClient("cliente2@example.com");
    const results = await Promise.all([
      saveProfile({ store }, a, { name: "Ana", phone: "1138163491", birthday: null }),
      saveProfile({ store }, b, { name: "Beto", phone: "1138163491", birthday: null }),
    ]);
    expect(results.filter((r) => r.ok)).toHaveLength(1);
    expect(results.find((r) => !r.ok)).toEqual({ ok: false, error: { fields: { phone: "PHONE_TAKEN" } } });
  });

  it("invitado: mismo teléfono = mismo cliente; teléfono de una cuenta = rechazado; sexto intento = rechazado", async () => {
    const first = await guest("Lucas", "1138163491");
    const again = await guest("Otro", "011 15 3816-3491");
    expect(again.ok && first.ok && again.value.customerId === first.value.customerId).toBe(true);
    const { rows } = await admin.query("select count(*)::int as n from app.guest_devices");
    expect(rows[0].n).toBe(2);
    const me = await demoClient();
    await saveProfile({ store }, me, { name: "Martín", phone: "1155556666", birthday: null });
    expect(await guest("Impostor", "1155556666")).toEqual({ ok: false, error: { form: "PHONE_HAS_ACCOUNT" } });
    for (let i = 0; i < 2; i++) await guest("Lucas", `11 4000-000${i}`);
    expect(await guest("Lucas", "11 4000-0009")).toEqual({ ok: false, error: { form: "RATE_LIMITED" } });
    const attempts = await admin.query("select ip_hash from app.guest_attempts limit 1");
    expect(attempts.rows[0].ip_hash).toBe("ip-1"); // solo el hash que manda la app, nunca la IP
  });

  it("lista de a 50 con cursor y sobrenombre", async () => {
    await admin.query(`insert into app.customers (role, full_name, phone_e164, created_at)
      select 'guest', 'Cliente ' || i, '+54911' || (40000000 + i), now() - (i || ' minutes')::interval from generate_series(1, 55) i`);
    const p1 = await listCustomers({ store }, barber, null);
    expect(p1.ok && p1.value.items[0]!.fullName).toBe("Cliente 1");
    expect(p1.ok && p1.value.items).toHaveLength(50);
    const p2 = await listCustomers({ store }, barber, p1.ok ? p1.value.next : null);
    expect(p2.ok && p2.value.items.map((c) => c.fullName)).toEqual(["Cliente 51", "Cliente 52", "Cliente 53", "Cliente 54", "Cliente 55"]);
    const id = p1.ok ? p1.value.items[0]!.id : "";
    expect((await setNickname({ store }, barber, id, "el de la moto")).ok).toBe(true);
    const { rows } = await admin.query("select nickname from app.customers where id = $1", [id]);
    expect(rows[0].nickname).toBe("el de la moto");
  });
});

describe("borrado de la demo (RF-25)", () => {
  it("borra solo lo de prueba; un invitado real unido a un cliente de prueba recupera su teléfono", async () => {
    await guest("Real Uno", "1111112222");
    const realGuest = await guest("Real Dos", "1133334444");
    const me = await demoClient();
    await saveProfile({ store }, me, { name: "Cliente de prueba 1 (demo)", phone: "1133334444", birthday: null }); // se une Real Dos
    const colo = await createAuthUser(admin, { email: "colo@x.test" });
    await enterAsDemo({ store, demoEnabled: true }, { authUserId: colo, email: "colo@example.com" });

    const counts = await purgeDemo(admin);
    expect(counts).toEqual({ customers: 1, demoAccounts: 2 });
    const { rows } = await admin.query("select full_name, phone_e164, linked_to, is_demo from app.customers order by full_name");
    expect(rows).toEqual([
      { full_name: "Real Dos", phone_e164: "+5491133334444", linked_to: null, is_demo: false },
      { full_name: "Real Uno", phone_e164: "+5491111112222", linked_to: null, is_demo: false },
    ]);
    expect(realGuest.ok).toBe(true);
  });
});
