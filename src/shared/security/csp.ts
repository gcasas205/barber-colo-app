import { createHash } from "node:crypto";
import { themeBootScript } from "../theme"; // relativo: también lo importa next.config.ts

/**
 * Content Security Policy (S-5 de la 001, RNF-4 de la 002). Lo usan next.config.ts (página pública) y
 * src/proxy.ts (pantallas con sesión). Nunca se importa desde el navegador.
 */

/** Pantallas con sesión y datos personales: CSP con nonce por pedido. */
export const SESSION_ROUTES = ["ingresar", "perfil", "colo", "auth"] as const;

/** El script del tema va en el layout compartido (sin nonce): se autoriza solo ese texto exacto. */
export const THEME_SCRIPT_HASH = `sha256-${createHash("sha256").update(themeBootScript).digest("base64")}`;

const COMMON = [
  "default-src 'self'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self'",
  "connect-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
];

/**
 * Página pública: prerenderizada, así que sus scripts de arranque no pueden llevar nonce y necesita
 * 'unsafe-inline' (tampoco se le puede sumar el hash: con un hash, el navegador ignora 'unsafe-inline').
 * No muestra datos personales.
 */
export function publicCsp(dev: boolean): string {
  return [COMMON[0], `script-src 'self' 'unsafe-inline'${dev ? " 'unsafe-eval'" : ""}`, ...COMMON.slice(1)].join("; ");
}

/** Pantallas con sesión: solo scripts con el nonce de este pedido (o el del tema, por su hash). */
export function sessionCsp(nonce: string, dev: boolean): string {
  return [
    COMMON[0],
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic' '${THEME_SCRIPT_HASH}'${dev ? " 'unsafe-eval'" : ""}`,
    ...COMMON.slice(1),
  ].join("; ");
}
