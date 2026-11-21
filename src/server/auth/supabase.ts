import "server-only";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { authEnv } from "@/shared/config/env";

/**
 * Cliente de Supabase Auth del servidor, con la sesión en cookies httpOnly (RNF-1). En un Server
 * Component no se pueden escribir cookies: ahí el refresco lo hace el proxy, y este cliente solo lee.
 */
export async function supabaseServer() {
  const env = authEnv();
  const store = await cookies();
  return createServerClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, {
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
