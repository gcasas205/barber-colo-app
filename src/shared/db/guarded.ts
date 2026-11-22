import { sql } from "kysely";
import type { Database } from "./client";

/**
 * Corre `fn` dentro de un savepoint. Si la base la rechaza y `onError` sabe qué devolver, vuelve al
 * savepoint y la transacción sigue viva: sin esto Postgres la aborta y Kysely no puede confirmarla.
 */
export async function guarded<T>(db: Database, fn: () => Promise<T>, onError: (e: unknown) => T | undefined): Promise<T> {
  await sql`savepoint guarded`.execute(db);
  try {
    const out = await fn();
    await sql`release savepoint guarded`.execute(db);
    return out;
  } catch (e) {
    await sql`rollback to savepoint guarded`.execute(db);
    const handled = onError(e);
    if (handled === undefined) throw e;
    return handled;
  }
}
