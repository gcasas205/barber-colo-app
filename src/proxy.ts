import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Refresca la sesión de Supabase antes de las pantallas con sesión (ADR-07). Solo corre en esas rutas:
 * la página pública no paga el costo de verificar una sesión en cada visita.
 */
export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) return response;

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (toSet) => {
        for (const { name, value } of toSet) request.cookies.set(name, value);
        response = NextResponse.next({ request });
        for (const { name, value, options } of toSet) response.cookies.set(name, value, options);
      },
    },
  });
  // Verifica el token y, si venció, lo renueva con el refresh token (y escribe las cookies nuevas).
  await supabase.auth.getClaims();
  return response;
}

export const config = {
  matcher: ["/ingresar", "/perfil/:path*", "/colo/:path*", "/auth/:path*"],
};
