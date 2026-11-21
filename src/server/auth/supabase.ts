import "server-only";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { authEnv } from "@/shared/config/env";

/**
 * RNF-1: el navegador nunca usa Supabase directamente, así que la cookie de sesión no tiene por qué ser
 * legible desde JavaScript. httpOnly la protege de un script inyectado; SameSite=Lax, de otros sitios.
 */
export const SESSION_COOKIE = { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/" } as const;

/**
 * Cliente de Supabase Auth del servidor, con la sesión en cookies httpOnly (RNF-1). En un Server
 * Component no se pueden escribir cookies: ahí el refresco lo hace el proxy, y este cliente solo lee.
 */
export async function supabaseServer() {
  const env = authEnv();
  const store = await cookies();
  return createServerClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, {
    cookieOptions: SESSION_COOKIE,
    cookies: {
      getAll: () => store.getAll(),
      setAll: (toSet) => {
        try {
          for (const { name, value, options } of toSet) store.set(name, value, options);
        } catch {
          // Server Component: el proxy ya refrescó la sesión.
        }
      },
    },
  });
}
