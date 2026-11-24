import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";

/**
 * Reglas de dependencias del monolito modular (docs/diseno/01-arquitectura.md, constitución principio 3).
 * Trabaja con rutas relativas a la raíz del repo ("src/modules/schedule/domain/x.ts").
 */

export type SourceFile = { file: string; imports: string[] };
export type Violation = { file: string; import: string; rule: string };

const KERNEL_PACKAGES = ["date-fns", "@date-fns/tz"];
const DATA_PACKAGES = ["kysely", "pg"];
const FRAMEWORK_PACKAGES = ["next", "react", "react-dom"];

const isExternal = (spec: string) => !spec.startsWith(".") && !spec.startsWith("@/");
const packageName = (spec: string) =>
  spec.startsWith("@") ? spec.split("/").slice(0, 2).join("/") : (spec.split("/")[0] ?? spec);
const isAny = (spec: string, list: string[]) => list.includes(packageName(spec)) || spec.startsWith("node:");

/** Ruta del archivo importado (sin extensión) relativa al repo, o null si es un paquete externo. */
export function resolveImport(from: string, spec: string): string | null {
  if (spec.startsWith("@/")) return path.posix.join("src", spec.slice(2));
  if (spec.startsWith(".")) return path.posix.normalize(path.posix.join(path.posix.dirname(from), spec));
  return null;
}

type Place = { area: "module" | "kernel" | "db" | "server" | "app" | "ui" | "other"; module?: string; layer?: string };

function place(p: string): Place {
  const m = /^src\/modules\/([^/]+)(?:\/([^/.]+))?/.exec(p);
  if (m) {
    const rest = m[2];
    const layer = rest === undefined || rest === "index" ? "index" : rest;
    return { area: "module", module: m[1], layer };
  }
  if (p.startsWith("src/shared/kernel")) return { area: "kernel" };
  if (p.startsWith("src/shared/db")) return { area: "db" };
  if (p.startsWith("src/server")) return { area: "server" };
  if (p.startsWith("src/app")) return { area: "app" };
  if (p.startsWith("src/ui")) return { area: "ui" };
  return { area: "other" };
}

export function checkFile({ file, imports }: SourceFile): Violation[] {
  const from = place(file);
  const out: Violation[] = [];
  const flag = (spec: string, rule: string) => out.push({ file, import: spec, rule });

  for (const spec of imports) {
    if (isExternal(spec)) {
      if (from.area === "kernel" && !isAny(spec, KERNEL_PACKAGES)) flag(spec, "el kernel solo usa date-fns");
      if (from.area === "module" && from.layer === "domain") flag(spec, "el dominio no importa paquetes externos");
      if (from.area === "module" && from.layer === "application" && isAny(spec, [...DATA_PACKAGES, ...FRAMEWORK_PACKAGES]))
        flag(spec, "la aplicación no conoce la base ni el framework");
      if ((from.area === "app" || from.area === "ui") && isAny(spec, DATA_PACKAGES))
        flag(spec, "la interfaz no habla con la base");
      continue;
    }

    const target = resolveImport(file, spec);
    if (!target) continue;
    const to = place(target);

    if (from.area === "kernel" && to.area !== "kernel") flag(spec, "el kernel no depende de nada del proyecto");

    if (from.area === "module" && from.layer === "domain") {
      const sameDomain = to.area === "module" && to.module === from.module && to.layer === "domain";
      if (!sameDomain && to.area !== "kernel") flag(spec, "el dominio solo usa su propio dominio y el kernel");
    }

    if (to.area === "module") {
      const sameModule = from.area === "module" && from.module === to.module;
      if (!sameModule && to.layer !== "index" && !(from.area === "server" && to.layer === "infrastructure"))
        flag(spec, "otro módulo se usa solo por su index.ts");
      if (to.layer === "infrastructure" && from.area !== "server" && !(sameModule && from.layer === "infrastructure"))
        flag(spec, "solo src/server arma la infraestructura");
    }

    if (to.area === "db" && !(from.area === "db" || from.area === "server" || (from.area === "module" && from.layer === "infrastructure")))
      flag(spec, "solo la infraestructura y src/server usan la base");

    if (from.area === "ui" && (to.area === "server" || to.area === "module"))
      flag(spec, "los componentes de src/ui son de presentación");
  }
  return out;
}

const IMPORT_RE = /(?:import|export)\s[^'"]*?from\s*["']([^"']+)["']|import\s*\(\s*["']([^"']+)["']\s*\)|import\s+["']([^"']+)["']/g;

export function extractImports(code: string): string[] {
  return [...code.matchAll(IMPORT_RE)].map((m) => m[1] ?? m[2] ?? m[3] ?? "");
}

/** Archivos .ts y .tsx de src/, sin los tests. */
export function readSources(root: string): SourceFile[] {
  const files: SourceFile[] = [];
  const walk = (dir: string) => {
    for (const entry of readdirSync(path.join(root, dir), { withFileTypes: true })) {
      const rel = path.posix.join(dir, entry.name);
      const isDir = entry.isDirectory() || (entry.isSymbolicLink() && statSync(path.join(root, rel)).isDirectory());
      if (isDir) walk(rel);
      else if (/\.tsx?$/.test(entry.name) && !/\.test\.tsx?$/.test(entry.name))
        files.push({ file: rel, imports: extractImports(readFileSync(path.join(root, rel), "utf8")) });
    }
  };
  walk("src");
  return files;
}
