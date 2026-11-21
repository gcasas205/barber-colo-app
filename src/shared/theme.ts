/** Tema elegido por el visitante (RF-17 de la 001). "auto" sigue la configuración del dispositivo. */
export type ThemePreference = "claro" | "oscuro" | "auto";

export const THEME_STORAGE_KEY = "el-colo-tema";

/**
 * Script que corre en el <head> antes de dibujar: aplica el tema guardado sin parpadeo.
 * Si localStorage falla (modo privado, bloqueado), queda Automático.
 */
export const themeBootScript = `(function(){try{var t=localStorage.getItem(${JSON.stringify(THEME_STORAGE_KEY)});var d=document.documentElement;if(t==="claro")d.dataset.theme="light";else if(t==="oscuro")d.dataset.theme="dark";}catch(e){}})();`;
