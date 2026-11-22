import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV === "development";

import { publicCsp, STATIC_ROUTES } from "./src/shared/security/csp";

/**
 * CSP fija para el prototipo estático. Las pantallas reciben otra, con un nonce por pedido, desde
 * src/proxy.ts (RNF-4 de la 002; desde la spec 004, todas). Ver src/shared/security/csp.ts.
 */
const csp = publicCsp(isDev);
const STATIC_PAGES = `/(${STATIC_ROUTES.join("|")})(.*)`;

const securityHeaders = [
  // Dos años, como pide la lista de precarga de HSTS. Vercel sirve todo por HTTPS.
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  // Respaldo de frame-ancestors para navegadores viejos.
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=(), usb=()" },
];

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  poweredByHeader: false,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  async headers() {
    return [
      { source: "/(.*)", headers: securityHeaders },
      { source: STATIC_PAGES, headers: [{ key: "Content-Security-Policy", value: csp }] },
    ];
  },
};

export default nextConfig;
