import { afterEach, describe, expect, it, vi } from "vitest";

afterEach(() => vi.unstubAllEnvs());

describe("database()", () => {
  it("crea una sola conexión por proceso, al primer uso", async () => {
    vi.resetModules();
    vi.stubEnv("DATABASE_URL", "postgresql://u:p@127.0.0.1:54332/postgres");
    const { database } = await import("./client");
    const first = database();
    expect(database()).toBe(first);
  });

  it("sin DATABASE_URL no arranca, y lo dice", async () => {
    vi.resetModules();
    vi.stubEnv("DATABASE_URL", "");
    const { database } = await import("./client");
    expect(() => database()).toThrow(/DATABASE_URL/);
  });
});
