import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const ROOT = fileURLToPath(new URL("..", import.meta.url));

function sourceFiles(dir: string): string[] {
  return readdirSync(path.join(ROOT, dir), { withFileTypes: true }).flatMap((e) => {
    const rel = path.join(dir, e.name);
    return e.isDirectory() ? sourceFiles(rel) : /\.(ts|tsx|mts|mjs|js)$/.test(e.name) ? [rel] : [];
  });
}

describe("seguridad del código", () => {
  it("nadie desactiva la verificación del certificado TLS (S-2)", () => {
    const offenders = [...sourceFiles("src"), "next.config.ts"]
      .filter((f) => !f.endsWith(".test.ts"))
      .filter((f) =>
        /rejectUnauthorized\s*:\s*false|NODE_TLS_REJECT_UNAUTHORIZED|sslmode=no-verify/.test(
          readFileSync(path.join(ROOT, f), "utf8"),
        ),
      );
    expect(offenders).toEqual([]);
  });

  it("ninguna variable de entorno de la base llega al navegador", () => {
    const offenders = sourceFiles("src").filter((f) =>
      /NEXT_PUBLIC_[A-Z_]*(DATABASE|SECRET|SERVICE_ROLE|DB_)/.test(readFileSync(path.join(ROOT, f), "utf8")),
    );
    expect(offenders).toEqual([]);
  });
});
