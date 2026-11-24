import { createHash } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
const header = vi.hoisted(() => ({ forwarded: null as string | null }));
vi.mock("next/headers", () => ({ headers: async () => ({ get: () => header.forwarded }) }));

const { ipHash } = await import("./customers");

const PEPPER = "p".repeat(32);
const sha = (text: string) => createHash("sha256").update(text).digest("hex");

beforeEach(() => {
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://x.supabase.co");
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "sb_publishable_0123456789");
  vi.stubEnv("IP_HASH_PEPPER", PEPPER);
  header.forwarded = null;
});
afterEach(() => vi.unstubAllEnvs());

describe("ipHash (RF-18b)", () => {
  it("usa el primer valor de x-forwarded-for, sin espacios, con la pimienta; nunca la IP sola", async () => {
    header.forwarded = " 200.1.2.3 , 10.0.0.1";
    const hash = await ipHash();
    expect(hash).toBe(sha(`${PEPPER}:200.1.2.3`));
    expect(hash).not.toContain("200.1.2.3");
  });

  it("sin el encabezado, todos los pedidos comparten la misma marca", async () => {
    expect(await ipHash()).toBe(sha(`${PEPPER}:desconocida`));
    header.forwarded = "";
    expect(await ipHash()).toBe(sha(`${PEPPER}:desconocida`));
  });

  it("sin pimienta: en desarrollo usa una fija; en producción no arranca", async () => {
    vi.stubEnv("IP_HASH_PEPPER", undefined);
    header.forwarded = "200.1.2.3";
    expect(await ipHash()).toBe(sha("solo-desarrollo:200.1.2.3"));
    vi.stubEnv("NODE_ENV", "production");
    await expect(ipHash()).rejects.toThrow("Falta IP_HASH_PEPPER");
  });
});
