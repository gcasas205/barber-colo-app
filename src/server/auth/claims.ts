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
