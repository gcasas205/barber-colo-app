import { Kysely, PostgresDialect } from "kysely";
import { Pool } from "pg";
import { serverEnv } from "@/shared/config/env";
import { poolConfig } from "./pool-config";
import type { DB } from "./types";

export type Database = Kysely<DB>;

export function createDatabase(databaseUrl: string, caCert?: string): Database {
  return new Kysely<DB>({ dialect: new PostgresDialect({ pool: new Pool(poolConfig(databaseUrl, caCert)) }) });
}

// Una sola instancia por proceso, creada al primer uso.
let instance: Database | undefined;

export function database(): Database {
  if (!instance) {
    const env = serverEnv();
    instance = createDatabase(env.DATABASE_URL, env.DATABASE_CA_CERT);
  }
  return instance;
}
