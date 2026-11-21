import { describe, expect, it } from "vitest";
import { authEnv, serverEnv } from "./env";

describe("serverEnv", () => {
  it("acepta una URL de Postgres", () => {
    expect(serverEnv({ DATABASE_URL: "postgresql://u:p@127.0.0.1:54332/postgres" }).DATABASE_URL).toMatch(/^postgresql/);
  });

  it("nombra las variables con problemas sin mostrar sus valores", () => {
    expect(() => serverEnv({ DATABASE_URL: "https://secreto@example.com" })).toThrow(/DATABASE_URL/);
    expect(() => serverEnv({ DATABASE_URL: "https://secreto@example.com" })).not.toThrow(/secreto/);
    expect(() => serverEnv({})).toThrow(/DATABASE_URL/);
  });

  it("rechaza un certificado que no es PEM", () => {
    expect(() => serverEnv({ DATABASE_URL: "postgres://u:p@h/db", DATABASE_CA_CERT: "abc" })).toThrow(/DATABASE_CA_CERT/);
  });
});

describe("authEnv", () => {
  const base = { NEXT_PUBLIC_SUPABASE_URL: "https://x.supabase.co", NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_123456789012345" };

  it.each(["true", "TRUE", " true", "true\n", '"true"', "'True'"])("DEMO_ENABLED=%j activa la demo", (v) => {
    expect(authEnv({ ...base, DEMO_ENABLED: v }).DEMO_ENABLED).toBe(true);
  });

  it.each([undefined, "false", "FALSE "])("DEMO_ENABLED=%j la deja apagada", (v) => {
    expect(authEnv({ ...base, DEMO_ENABLED: v }).DEMO_ENABLED).toBe(false);
  });

  it("un valor que no es true ni false dice qué se espera, sin mostrar el valor", () => {
    expect(() => authEnv({ ...base, DEMO_ENABLED: "sí-secreto" })).toThrow(/DEMO_ENABLED \(tiene que ser "true" o "false"\)/);
    expect(() => authEnv({ ...base, DEMO_ENABLED: "sí-secreto" })).not.toThrow(/secreto/);
  });
});
