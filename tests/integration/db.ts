import { Client } from "pg";

/** Base local de Supabase (solo para tests; las credenciales son las públicas del entorno local). */
export const TEST_DATABASE_URL =
  process.env.TEST_DATABASE_URL ?? "postgresql://postgres:postgres@127.0.0.1:54332/postgres";

export async function connect(url = TEST_DATABASE_URL): Promise<Client> {
  const client = new Client({ connectionString: url });
  await client.connect();
  return client;
}

/** Corre `fn` dentro de una transacción que siempre se deshace: cada test deja la base como estaba. */
export async function inRollback<T>(client: Client, fn: () => Promise<T>): Promise<T> {
  await client.query("begin");
  try {
    return await fn();
  } finally {
    await client.query("rollback");
  }
}

/** Código SQLSTATE del error que produce `sql`, o null si no falla. */
export async function sqlState(client: Client, sql: string, params: unknown[] = []): Promise<string | null> {
  await client.query("savepoint t");
  try {
    await client.query(sql, params);
    await client.query("release savepoint t");
    return null;
  } catch (error) {
    await client.query("rollback to savepoint t");
    return (error as { code?: string }).code ?? "unknown";
  }
}
