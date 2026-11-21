import { createClient } from "@supabase/supabase-js";
import type { Client } from "pg";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { resolveSession } from "@/modules/identity";
import { createIdentityRepository } from "@/modules/identity/infrastructure/identity-repository";
import { toSessionClaims } from "@/server/auth/claims";
import { createDatabase, type Database } from "@/shared/db/client";
import { connect, TEST_DATABASE_URL } from "./db";

vi.mock("server-only", () => ({}));

// Auth local de Supabase (npm run db:start). Clave publicable del entorno local, no es secreta.
const API = process.env.TEST_SUPABASE_URL ?? "http://127.0.0.1:54321";
const KEY = process.env.TEST_SUPABASE_PUBLISHABLE_KEY ?? "sb_publishable_ACJWlzQHlZjBrEguHvfOxg_3BJgxAaH";
const auth = () => createClient(API, KEY, { auth: { persistSession: false } }).auth;

let admin: Client;
let db: Database;
const config = { demoEnabled: true, barberEmail: null };

beforeAll(async () => {
  admin = await connect();
  db = createDatabase(TEST_DATABASE_URL);
});
afterAll(async () => {
  await admin.query("delete from app.demo_accounts; delete from app.user_activity; delete from app.guest_devices; delete from app.customers where role = 'guest'");
  await db.destroy();
  await admin.end();
});

async function claimsOf(token: string) {
  const { data, error } = await auth().getClaims(token);
  return error ? null : toSessionClaims(data?.claims);
}

describe("identidad con el Auth real local", () => {
  it("Colo (demo) entra con correo y contraseña y es barbero", async () => {
    const { data } = await auth().signInWithPassword({ email: "colo@example.com", password: "colo1234" });
    const userId = data.user!.id;
    await admin.query("insert into app.demo_accounts (auth_user_id, kind) values ($1, 'barber') on conflict do nothing", [userId]);
    const actor = await resolveSession({ identities: createIdentityRepository(db), config }, await claimsOf(data.session!.access_token), new Date());
    expect(actor).toEqual({ kind: "barber", userId, demo: true });
    const { rows } = await admin.query("select 1 from app.user_activity where auth_user_id = $1", [userId]);
    expect(rows).toHaveLength(1);
  });

  it("con la demo apagada, la misma sesión deja de valer (RF-24)", async () => {
    const { data } = await auth().signInWithPassword({ email: "colo@example.com", password: "colo1234" });
    const actor = await resolveSession({ identities: createIdentityRepository(db), config: { ...config, demoEnabled: false } }, await claimsOf(data.session!.access_token), new Date());
    expect(actor).toMatchObject({ kind: "none", reason: "demo_disabled" });
  });

  it("un token alterado no se acepta", async () => {
    const { data } = await auth().signInWithPassword({ email: "cliente1@example.com", password: "cliente1234" });
    const [h, p, s] = data.session!.access_token.split(".");
    const payload = JSON.parse(Buffer.from(p!, "base64url").toString());
    payload.email = "colo@example.com";
    const forged = `${h}.${Buffer.from(JSON.stringify(payload)).toString("base64url")}.${s}`;
    expect(await claimsOf(forged)).toBeNull();
  });

  it("una contraseña equivocada no entra (RF-1b)", async () => {
    const { error } = await auth().signInWithPassword({ email: "colo@example.com", password: "mala" });
    expect(error?.code).toBe("invalid_credentials");
  });

  it("una sesión anónima con su dispositivo asociado es invitado", async () => {
    const { data } = await auth().signInAnonymously();
    const userId = data.user!.id;
    const { rows } = await admin.query("insert into app.customers (role, full_name, phone_e164) values ('guest', 'Lucas', '+5491177778888') returning id");
    await admin.query("insert into app.guest_devices (auth_user_id, customer_id) values ($1, $2)", [userId, rows[0].id]);
    const actor = await resolveSession({ identities: createIdentityRepository(db), config }, await claimsOf(data.session!.access_token), new Date());
    expect(actor).toEqual({ kind: "guest", userId, customerId: rows[0].id });
  });
});
