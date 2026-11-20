import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

// La lógica de negocio vive en src/domain y se prueba sin red ni base de datos.
// Los tests corren con la zona horaria del local (constitución, principio 6) para
// detectar cualquier cálculo que dependa por error de la zona del servidor.
process.env.TZ = "America/Argentina/Buenos_Aires";

export default defineConfig({
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
  test: {
    include: ["src/**/*.test.ts", "tests/**/*.test.ts"],
    environment: "node",
  },
});
