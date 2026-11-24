import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Skills de agentes de terceros (scripts que no son código de la app).
    ".claude/**",
    ".agents/**",
    // Herramientas de ub-mode y lo que generan (reportes de cobertura y mutación).
    "tools/**",
    "target/**",
    ".metrics/**",
  ]),
]);

export default eslintConfig;
