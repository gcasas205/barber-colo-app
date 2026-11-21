import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

// La lógica de negocio vive en src/modules/*/domain y se prueba sin red ni base de datos.
// Los tests corren con la zona horaria del local (constitución, principio 6) para
// detectar cualquier cálculo que dependa por error de la zona del servidor.
// `npm run test:tz` repite los tests de src/ con TEST_TZ=UTC y Asia/Tokyo (como un servidor
// de Vercel o un viajero): el kernel tiene que dar lo mismo en cualquier zona.
process.env.TZ = process.env.TEST_TZ ?? "America/Argentina/Buenos_Aires";

export default defineConfig({
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
  test: {
    include: ["src/**/*.test.ts", "tests/**/*.test.ts"],
    // Los de integración necesitan la base local: corren con `npm run test:integration`.
    exclude: ["tests/integration/**", "node_modules/**"],
    environment: "node",
  },
});
