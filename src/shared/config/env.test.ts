import { describe, expect, it, vi } from "vitest";
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

describe("serverEnv con process.env", () => {
  it("lee process.env una sola vez; otra fuente no usa ni pisa ese valor", async () => {
    vi.resetModules();
    const { serverEnv: fresh } = await import("./env");
    vi.stubEnv("DATABASE_URL", "postgresql://u:p@127.0.0.1:54332/primera");
    try {
      expect(fresh().DATABASE_URL).toMatch(/primera$/);
      expect(fresh({ DATABASE_URL: "postgres://u:p@h/otra" }).DATABASE_URL).toMatch(/otra$/);
      vi.stubEnv("DATABASE_URL", "postgresql://u:p@127.0.0.1:54332/segunda");
      expect(fresh().DATABASE_URL).toMatch(/primera$/);
    } finally {
      vi.unstubAllEnvs();
    }
  });
});

describe("authEnv", () => {
  const base = { NEXT_PUBLIC_SUPABASE_URL: "https://x.supabase.co", NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_0123456789" };

  it("la demo está apagada salvo que diga exactamente true", () => {
    expect(authEnv(base).DEMO_ENABLED).toBe(false);
    expect(authEnv({ ...base, DEMO_ENABLED: "true" }).DEMO_ENABLED).toBe(true);
    expect(() => authEnv({ ...base, DEMO_ENABLED: "si" })).toThrow(/DEMO_ENABLED/);
  });

  it("nombra las variables con problemas sin mostrar sus valores", () => {
    expect(() => authEnv({ ...base, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "corta" })).toThrow(/NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY/);
    expect(() => authEnv({ ...base, IP_HASH_PEPPER: "pimienta-secreta" })).toThrow(/IP_HASH_PEPPER/);
    expect(() => authEnv({ ...base, IP_HASH_PEPPER: "pimienta-secreta" })).not.toThrow(/pimienta/);
  });
});
