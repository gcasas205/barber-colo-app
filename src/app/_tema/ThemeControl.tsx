"use client";

import { Check, Monitor, Moon, Sun } from "lucide-react";
import { useEffect, useId, useRef, useState, useSyncExternalStore } from "react";
import { cx } from "@/ui/cx";
import { applyTheme, readTheme, saveTheme, type ThemePreference } from "./theme";

const OPTIONS: { value: ThemePreference; label: string; icon: typeof Sun }[] = [
  { value: "claro", label: "Claro", icon: Sun },
  { value: "oscuro", label: "Oscuro", icon: Moon },
  { value: "auto", label: "Automático", icon: Monitor },
];

// El tema vive en <html data-theme>: se lee de ahí y se avisa a React cuando cambia.
const listeners = new Set<() => void>();
const subscribe = (fn: () => void) => (listeners.add(fn), () => listeners.delete(fn));

/**
 * Control de tema de la chapa superior (RF-17 de la 001): un botón con el tema actual que abre las tres
 * opciones (Claro, Oscuro, Automático). Compacto para que entre en 360 px junto a "Ingresar".
 */
export function ThemeControl() {
  const current = useSyncExternalStore(subscribe, () => readTheme(), () => "auto" as ThemePreference);
  const [open, setOpen] = useState(false);
  const menuId = useId();
  const root = useRef<HTMLDivElement>(null);
  const CurrentIcon = OPTIONS.find((o) => o.value === current)!.icon;

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent | KeyboardEvent) => {
      if (e instanceof KeyboardEvent ? e.key === "Escape" : !root.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", close);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", close);
    };
  }, [open]);

  const choose = (pref: ThemePreference) => {
    applyTheme(pref);
    saveTheme(pref);
    listeners.forEach((fn) => fn());
    setOpen(false);
  };

  return (
    <div ref={root} className="relative">
      <button
        type="button"
        aria-label={`Tema: ${OPTIONS.find((o) => o.value === current)!.label.toLowerCase()}`}
        aria-expanded={open}
        aria-controls={menuId}
        onClick={() => setOpen((v) => !v)}
        className="grid h-11 w-11 place-items-center rounded-[10px] text-sobre-esmalte hover:bg-[rgb(243_245_244/0.12)] focus-visible:outline focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-poste"
      >
        <CurrentIcon aria-hidden size={22} strokeWidth={2.25} />
      </button>
      {open ? (
        <div
          id={menuId}
          role="group"
          aria-label="Tema"
          className="absolute right-0 top-12 z-40 flex w-48 flex-col gap-1 rounded-[var(--radius-control)] bg-chapa p-1.5 text-tinta shadow-[0_12px_28px_-10px_rgb(14_23_41/0.55),inset_0_0_0_2px_var(--linea)]"
        >
          {OPTIONS.map(({ value, label, icon: Icon }) => (
            <button
              key={value}
              type="button"
              aria-pressed={current === value}
              aria-label={`Tema ${label.toLowerCase()}`}
              onClick={() => choose(value)}
              className={cx(
                "flex min-h-[48px] items-center gap-3 rounded-[10px] px-3 text-left font-bold focus-visible:outline focus-visible:outline-3 focus-visible:outline-offset-1 focus-visible:outline-poste",
                current === value ? "bg-esmalte text-sobre-esmalte" : "hover:bg-esmalte-100",
              )}
            >
              <Icon aria-hidden size={20} strokeWidth={2.25} />
              <span className="flex-1">{label}</span>
              {current === value ? <Check aria-hidden size={18} strokeWidth={3} /> : null}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
