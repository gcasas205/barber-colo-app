import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
const jar = vi.hoisted(() => ({ set: vi.fn(), getAll: () => [{ name: "sb", value: "1" }] }));
vi.mock("next/headers", () => ({ cookies: async () => jar }));
const created = vi.hoisted(() => ({ options: null as null | { cookieOptions: unknown; cookies: { getAll: () => unknown; setAll: (c: unknown[]) => void } } }));
vi.mock("@supabase/ssr", () => ({
  createServerClient: (_url: string, _key: string, options: never) => {
    created.options = options;
    return {};
  },
}));

const { SESSION_COOKIE, supabaseServer } = await import("./supabase");

beforeEach(() => {
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://x.supabase.co");
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "sb_publishable_0123456789");
  jar.set.mockReset();
});

describe("supabaseServer (RNF-1)", () => {
  it("la cookie de sesión es httpOnly y SameSite=Lax", async () => {
    await supabaseServer();
    expect(created.options!.cookieOptions).toBe(SESSION_COOKIE);
    expect(SESSION_COOKIE).toMatchObject({ httpOnly: true, sameSite: "lax", path: "/" });
  });

  it("lee y escribe las cookies del pedido", async () => {
    await supabaseServer();
    const { cookies } = created.options!;
    expect(cookies.getAll()).toEqual([{ name: "sb", value: "1" }]);
    cookies.setAll([{ name: "sb", value: "2", options: { path: "/" } }]);
    expect(jar.set).toHaveBeenCalledWith("sb", "2", { path: "/" });
  });

  it("en un Server Component no se pueden escribir cookies: no falla (el proxy ya refrescó la sesión)", async () => {
    jar.set.mockImplementation(() => {
      throw new Error("Cookies can only be modified in a Server Action or Route Handler");
    });
    await supabaseServer();
    expect(() => created.options!.cookies.setAll([{ name: "sb", value: "2", options: {} }])).not.toThrow();
  });
});
