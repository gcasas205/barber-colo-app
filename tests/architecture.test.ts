import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { checkFile, extractImports, readSources } from "./architecture/rules";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const rules = (file: string, ...imports: string[]) => checkFile({ file, imports }).map((v) => v.rule);

describe("arquitectura del código actual", () => {
  it("no tiene dependencias prohibidas", () => {
    const sources = readSources(ROOT);
    expect(sources.length).toBeGreaterThan(10);
    expect(sources.flatMap(checkFile)).toEqual([]);
  });
});

describe("reglas de arquitectura", () => {
  it("el dominio solo usa su dominio y el kernel", () => {
    expect(rules("src/modules/schedule/domain/a.ts", "./schedule", "@/shared/kernel")).toEqual([]);
    expect(rules("src/modules/schedule/domain/a.ts", "next/server")).toHaveLength(1);
    expect(rules("src/modules/schedule/domain/a.ts", "@/shared/db/client")).toHaveLength(2);
    expect(rules("src/modules/schedule/domain/a.ts", "../infrastructure/repo")).toHaveLength(2);
    expect(rules("src/modules/schedule/domain/a.ts", "@/modules/pricing")).toHaveLength(1);
  });

  it("otro módulo se usa solo por su index.ts", () => {
    expect(rules("src/modules/booking/application/a.ts", "@/modules/schedule")).toEqual([]);
    expect(rules("src/modules/booking/application/a.ts", "@/modules/schedule/domain/availability")).toEqual([
      "otro módulo se usa solo por su index.ts",
    ]);
    expect(rules("src/app/page.tsx", "@/modules/pricing/domain/service")).toHaveLength(1);
    expect(rules("src/modules/booking/application/a.ts", "../../schedule/domain/x")).toHaveLength(1);
  });

  it("solo src/server arma la infraestructura y usa la base", () => {
    expect(rules("src/server/composition.ts", "@/modules/schedule/infrastructure/repo", "@/shared/db/client")).toEqual([]);
    expect(rules("src/modules/schedule/infrastructure/repo.ts", "@/shared/db/client", "kysely")).toEqual([]);
    expect(rules("src/modules/schedule/application/q.ts", "../infrastructure/repo")).toHaveLength(1);
    expect(rules("src/modules/schedule/index.ts", "./infrastructure/repo")).toHaveLength(1);
    expect(rules("src/app/page.tsx", "@/shared/db/client")).toHaveLength(1);
    expect(rules("src/shared/db/client.ts", "./types", "./pool-config", "kysely", "pg")).toEqual([]);
  });

  it("la aplicación no conoce la base ni el framework", () => {
    expect(rules("src/modules/schedule/application/q.ts", "kysely")).toHaveLength(1);
    expect(rules("src/modules/schedule/application/q.ts", "next/cache")).toHaveLength(1);
    expect(rules("src/modules/schedule/application/q.ts", "../domain/availability", "@/shared/kernel")).toEqual([]);
  });

  it("la interfaz no habla con la base y los componentes no conocen el servidor", () => {
    expect(rules("src/app/page.tsx", "pg")).toHaveLength(1);
    expect(rules("src/app/page.tsx", "@/server/composition", "@/ui/Plate", "@/modules/schedule")).toEqual([]);
    expect(rules("src/ui/Plate.tsx", "@/server/composition")).toHaveLength(1);
    expect(rules("src/ui/Plate.tsx", "@/shared/kernel")).toEqual([]);
  });

  it("el kernel no depende de nada más que date-fns", () => {
    expect(rules("src/shared/kernel/zone.ts", "@date-fns/tz", "./minutes")).toEqual([]);
    expect(rules("src/shared/kernel/zone.ts", "zod")).toHaveLength(1);
    expect(rules("src/shared/kernel/zone.ts", "@/modules/schedule")).toHaveLength(1);
  });

  it("encuentra imports estáticos, dinámicos, de tipos y reexportaciones", () => {
    const code = `import a from "x";\nimport type { B } from './b';\nexport * from "./c";\nconst d = await import("d");\nimport "./e.css";\nimport {\n  f,\n  g,\n} from "@/f";`;
    expect(extractImports(code)).toEqual(["x", "./b", "./c", "d", "./e.css", "@/f"]);
  });
});
