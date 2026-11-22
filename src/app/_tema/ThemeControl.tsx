"use client";

import { Moon, Sun } from "lucide-react";
import { useSyncExternalStore } from "react";
import { cx } from "@/ui/cx";
import { applyTheme, effectiveTheme, saveTheme } from "./theme";

// El tema vive en <html data-theme> (y, sin elección, en la configuración del dispositivo): se lee de ahí y
// se avisa a React cuando cambia cualquiera de los dos.
const listeners = new Set<() => void>();
function subscribe(fn: () => void) {
  listeners.add(fn);
  const media = window.matchMedia("(prefers-color-scheme: dark)");
  media.addEventListener("change", fn);
  return () => {
    listeners.delete(fn);
    media.removeEventListener("change", fn);
  };
}
const read = () => effectiveTheme(document.documentElement, window.matchMedia("(prefers-color-scheme: dark)").matches);

/**
 * Interruptor de tema de la chapa superior (RF-17 de la 001; cambio pedido por Gonzalo el 2026-11-22: dos
 * posiciones, claro y oscuro). Sin elección, arranca como el dispositivo; al tocarlo, la elección queda guardada.
 */
export function ThemeControl() {
  const theme = useSyncExternalStore(subscribe, read, () => "light" as const);
  const dark = theme === "dark";
  const toggle = () => {
    const next = dark ? "claro" : "oscuro";
    applyTheme(next);
    saveTheme(next);
    listeners.forEach((fn) => fn());
  };
  return (
    <button
      type="button"
      role="switch"
      aria-checked={dark}
      aria-label="Tema oscuro"
      title={dark ? "Pasar a tema claro" : "Pasar a tema oscuro"}
      onClick={toggle}
      className="group relative inline-flex h-9 w-[68px] shrink-0 items-center rounded-full bg-[rgb(243_245_244/0.16)] p-1 shadow-[inset_0_1px_3px_rgb(0_0_0/0.35)] transition-colors focus-visible:outline focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-poste"
    >
      {/* Íconos de fondo: indican hacia dónde se va. */}
      <Sun aria-hidden size={16} strokeWidth={2.5} className={cx("absolute left-2.5 text-sobre-esmalte transition-opacity", dark ? "opacity-60" : "opacity-0")} />
      <Moon aria-hidden size={16} strokeWidth={2.5} className={cx("absolute right-2.5 text-sobre-esmalte transition-opacity", dark ? "opacity-0" : "opacity-60")} />
      {/* La perilla, con el tema actual. */}
      <span
        aria-hidden
        className={cx(
          "grid h-7 w-7 place-items-center rounded-full bg-[#f3f5f4] text-[#1d2a44] shadow-[0_2px_6px_rgb(0_0_0/0.35)] transition-transform duration-200 motion-reduce:transition-none",
          dark ? "translate-x-8" : "translate-x-0",
        )}
      >
        {dark ? <Moon size={16} strokeWidth={2.5} /> : <Sun size={16} strokeWidth={2.5} />}
      </span>
    </button>
  );
}
