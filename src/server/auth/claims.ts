import type { SessionClaims } from "@/modules/identity";

type JwtClaims = {
  sub?: string;
  email?: string;
  is_anonymous?: boolean;
  app_metadata?: { provider?: string };
  user_metadata?: { email_verified?: boolean };
};

/** Traduce los claims verificados de Supabase a lo que entiende el dominio. */
export function toSessionClaims(claims: JwtClaims | null | undefined): SessionClaims | null {
  if (!claims?.sub) return null;
  return {
    sub: claims.sub,
    email: claims.email || null,
    // Solo Google lo informa; para el resto queda en false y nunca da el rol de barbero.
    emailVerified: claims.user_metadata?.email_verified === true,
    isAnonymous: claims.is_anonymous === true,
    provider: claims.is_anonymous ? "anonymous" : (claims.app_metadata?.provider ?? null),
  };
}

type ClaimsReader = {
  getClaims: () => Promise<{ data: { claims?: JwtClaims } | null; error: unknown }>;
};

/**
 * Lee y verifica la sesión sin dejar que un token raro tire abajo la pantalla: si Supabase devuelve un
 * error o lanza una excepción (token de otro proyecto, firma inválida, JWKS que no responde), es "sin
 * sesión" y la persona vuelve a ingresar.
 */
export async function readClaims(auth: ClaimsReader): Promise<SessionClaims | null> {
  try {
    const { data, error } = await auth.getClaims();
    return error ? null : toSessionClaims(data?.claims);
  } catch {
    return null;
  }
}
