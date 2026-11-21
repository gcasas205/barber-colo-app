/** Tema elegido por el visitante (RF-17). "auto" sigue la configuración del dispositivo. */
export type ThemePreference = "claro" | "oscuro" | "auto";

export const THEME_STORAGE_KEY = "el-colo-tema";

/**
 * Script que corre en el <head> antes de dibujar: aplica el tema guardado sin parpadeo.
 * Si localStorage falla (modo privado, bloqueado), queda Automático.
 */
export const themeBootScript = `(function(){try{var t=localStorage.getItem(${JSON.stringify(THEME_STORAGE_KEY)});var d=document.documentElement;if(t==="claro")d.dataset.theme="light";else if(t==="oscuro")d.dataset.theme="dark";}catch(e){}})();`;

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
