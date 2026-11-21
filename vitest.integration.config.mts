import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

// Tests de integración contra el Postgres local de Supabase (`npm run db:start`).
// La URL se puede cambiar con TEST_DATABASE_URL; por defecto, el puerto de supabase/config.toml.
process.env.TZ = "America/Argentina/Buenos_Aires";

export default defineConfig({
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
  test: {
    include: ["tests/integration/**/*.test.ts"],
    environment: "node",
    // Comparten una sola base: un archivo por vez.
    fileParallelism: false,
    testTimeout: 15_000,
  },
});
