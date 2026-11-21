import { describe, expect, it } from "vitest";
import { serverEnv } from "./env";

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
