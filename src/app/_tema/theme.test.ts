import { runInNewContext } from "node:vm";
import { describe, expect, it } from "vitest";
import { applyTheme, effectiveTheme, readTheme, themeBootScript, THEME_STORAGE_KEY } from "./theme";

function runBoot(stored: string | null, failing = false) {
  const dataset: Record<string, string> = {};
  runInNewContext(themeBootScript, {
    localStorage: {
      getItem: (k: string) => {
        if (failing) throw new Error("bloqueado");
        return k === THEME_STORAGE_KEY ? stored : null;
      },
    },
    document: { documentElement: { dataset } },
  });
  return dataset.theme;
}

describe("tema (RF-17)", () => {
  it("el script del <head> aplica el tema guardado antes de dibujar", () => {
    expect(runBoot("oscuro")).toBe("dark");
    expect(runBoot("claro")).toBe("light");
    expect(runBoot(null)).toBeUndefined(); // Automático: sigue al dispositivo
    expect(runBoot("cualquier cosa")).toBeUndefined();
    expect(runBoot("oscuro", true)).toBeUndefined(); // sin almacenamiento, Automático
  });

  it("aplicar y leer son simétricos", () => {
    const root = { dataset: {} as DOMStringMap };
    for (const pref of ["claro", "oscuro", "auto"] as const) {
      applyTheme(pref, root);
      expect(readTheme(root)).toBe(pref);
    }
  });
});

describe("effectiveTheme (interruptor de dos posiciones)", () => {
  it("sin elección sigue al dispositivo; con elección, manda la elección", () => {
    expect(effectiveTheme({ dataset: {} }, true)).toBe("dark");
    expect(effectiveTheme({ dataset: {} }, false)).toBe("light");
    expect(effectiveTheme({ dataset: { theme: "light" } }, true)).toBe("light");
    expect(effectiveTheme({ dataset: { theme: "dark" } }, false)).toBe("dark");
  });
});
