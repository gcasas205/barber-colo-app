import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { sessionCsp } from "./shared/security/csp";

/**
 * Pantallas con sesión (spec 002):
 * 1. CSP con un nonce nuevo en cada pedido (RNF-4). Next lo lee del encabezado del pedido y se lo pone a
 *    sus propios scripts; cualquier otro script, sin ese nonce, no corre.
 * 2. Refresca la sesión de Supabase (ADR-07).
 * Desde la spec 004 corre en todas las pantallas (la principal es el ingreso).
 */
export async function proxy(request: NextRequest) {
  const nonce = Buffer.from(crypto.randomUUID()).toString("base64");
  const csp = sessionCsp(nonce, process.env.NODE_ENV === "development");
  const headers = new Headers(request.headers);
  headers.set("x-nonce", nonce);
  headers.set("Content-Security-Policy", csp);

  const next = () => {
    const res = NextResponse.next({ request: { headers } });
    res.headers.set("Content-Security-Policy", csp);
    return res;
  };
  let response = next();

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) return response;

  const supabase = createServerClient(url, key, {
    // Igual que SESSION_COOKIE en src/server/auth/supabase.ts (el proxy no puede importar "server-only").
    cookieOptions: { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/" },
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (toSet) => {
        for (const { name, value } of toSet) request.cookies.set(name, value);
        // Las cookies nuevas tienen que viajar también en el pedido que sigue (con la CSP).
        headers.set("cookie", request.cookies.toString());
        response = next();
        for (const { name, value, options } of toSet) response.cookies.set(name, value, options);
      },
    },
  });
  // Verifica el token y, si venció, lo renueva con el refresh token (y escribe las cookies nuevas).
  // Si lanza (token de otro proyecto, JWKS caído), la pantalla sigue: getActor la trata como "sin sesión".
  await supabase.auth.getClaims().catch(() => undefined);
  return response;
}

export const config = {
  matcher: [
    // Sin los prefetch de next/link: no hace falta CSP ni sesión para eso (documentación de Next).
    {
      // Spec 004: todas las pantallas (la principal es el ingreso), menos archivos estáticos y el prototipo.
      source: "/((?!_next/|prototipo|favicon\\.ico|icon\\.svg|apple-icon\\.png|robots\\.txt).*)",
      missing: [
        { type: "header", key: "next-router-prefetch" },
        { type: "header", key: "purpose", value: "prefetch" },
      ],
    },
  ],
};
