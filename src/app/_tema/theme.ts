import { THEME_STORAGE_KEY, type ThemePreference } from "@/shared/theme";

export { THEME_STORAGE_KEY, themeBootScript, type ThemePreference } from "@/shared/theme";

export function applyTheme(pref: ThemePreference, root: { dataset: DOMStringMap } = document.documentElement): void {
  if (pref === "claro") root.dataset.theme = "light";
  else if (pref === "oscuro") root.dataset.theme = "dark";
  else delete root.dataset.theme;
}

export function readTheme(root: { dataset: DOMStringMap } = document.documentElement): ThemePreference {
  return root.dataset.theme === "light" ? "claro" : root.dataset.theme === "dark" ? "oscuro" : "auto";
}

export function saveTheme(pref: ThemePreference): void {
  try {
    if (pref === "auto") localStorage.removeItem(THEME_STORAGE_KEY);
    else localStorage.setItem(THEME_STORAGE_KEY, pref);
  } catch {
    // Sin almacenamiento, el tema vale solo para esta visita.
  }
}

/** El tema que se ve: el elegido, o el del dispositivo si no se eligió (interruptor de dos posiciones). */
export function effectiveTheme(root: { dataset: DOMStringMap }, systemDark: boolean): "light" | "dark" {
  const pref = readTheme(root);
  if (pref === "claro") return "light";
  if (pref === "oscuro") return "dark";
  return systemDark ? "dark" : "light";
}
