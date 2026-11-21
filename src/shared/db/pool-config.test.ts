import { describe, expect, it } from "vitest";
import { poolConfig } from "./pool-config";

const CA = "-----BEGIN CERTIFICATE-----\nMIIB\n-----END CERTIFICATE-----";
const REMOTE = "postgresql://app_server.ref:secret@aws-0-sa-east-1.pooler.supabase.com:6543/postgres";

describe("poolConfig (S-2)", () => {
  it("la base local va sin TLS", () => {
    expect(poolConfig("postgresql://postgres:postgres@127.0.0.1:54332/postgres", undefined).ssl).toBe(false);
    expect(poolConfig("postgresql://postgres:postgres@localhost:54332/postgres", undefined).ssl).toBe(false);
  });

  it("una base remota exige el certificado y lo verifica", () => {
    expect(poolConfig(REMOTE, CA).ssl).toEqual({ ca: CA, rejectUnauthorized: true });
  });

  it("sin certificado no conecta a una base remota", () => {
    expect(() => poolConfig(REMOTE, undefined)).toThrow(/DATABASE_CA_CERT/);
  });

  it("quita sslmode de la URL para que no pise la verificación", () => {
    const config = poolConfig(`${REMOTE}?sslmode=no-verify&application_name=web`, CA);
    expect(config.connectionString).not.toMatch(/sslmode/);
    expect(config.connectionString).toMatch(/application_name=web/);
    expect(config.ssl).toEqual({ ca: CA, rejectUnauthorized: true });
  });

  it("usa una sola conexión por instancia", () => {
    expect(poolConfig(REMOTE, CA).max).toBe(1);
  });
});
