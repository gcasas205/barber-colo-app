/**
 * Borra los datos de prueba (spec 002, RF-25). Lo corre una persona antes de publicar la app real:
 *
 *   PURGE_DATABASE_URL="<conexión de postgres>" node --experimental-strip-types scripts/purge-demo.ts --yes
 *
 * Solo toca filas con is_demo = true (y lo que cuelga de ellas). Los usuarios de prueba de Supabase Auth
 * se borran después desde el panel (Authentication → Users).
 */
import { pathToFileURL } from "node:url";
import pg from "pg";

export type PurgeCounts = { customers: number; demoAccounts: number };

export async function purgeDemo(client: pg.Client): Promise<PurgeCounts> {
  await client.query("begin");
  try {
    // 1. Los clientes de prueba sueltan su teléfono, así un invitado real que se había unido a uno
    //    de ellos recupera el suyo sin chocar con el índice único.
    await client.query("update app.customers set phone_e164 = null where is_demo and role <> 'guest'");
    await client.query("update app.customers set linked_to = null where linked_to in (select id from app.customers where is_demo)");
    // 2. Lo que cuelga de los clientes y cuentas de prueba.
    await client.query("delete from app.phone_changes where customer_id in (select id from app.customers where is_demo)");
    await client.query("delete from app.guest_devices where customer_id in (select id from app.customers where is_demo)");
    await client.query("delete from app.user_activity where auth_user_id in (select auth_user_id from app.demo_accounts)");
    const demo = await client.query("delete from app.demo_accounts");
    const customers = await client.query("delete from app.customers where is_demo");
    await client.query("commit");
    return { customers: customers.rowCount ?? 0, demoAccounts: demo.rowCount ?? 0 };
  } catch (e) {
    await client.query("rollback");
    throw e;
  }
}

async function main() {
  const url = process.env.PURGE_DATABASE_URL;
  if (!url || !process.argv.includes("--yes")) {
    console.error("Uso: PURGE_DATABASE_URL=… node --experimental-strip-types scripts/purge-demo.ts --yes");
    process.exit(1);
  }
  const client = new pg.Client({ connectionString: url });
  await client.connect();
  try {
    const counts = await purgeDemo(client);
    console.log(`Listo: ${counts.customers} clientes de prueba y ${counts.demoAccounts} cuentas de prueba borrados.`);
    console.log("Falta borrar los 3 usuarios de prueba en Supabase → Authentication → Users.");
  } finally {
    await client.end();
  }
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) void main();
