"use client";

import { Monitor, Moon, Sun } from "lucide-react";
import { useSyncExternalStore } from "react";
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

/** Control de tema de la chapa superior (RF-17): Claro, Oscuro o Automático. */
export function ThemeControl() {
  const current = useSyncExternalStore(subscribe, () => readTheme(), () => "auto" as ThemePreference);
  const choose = (pref: ThemePreference) => {
    applyTheme(pref);
    saveTheme(pref);
    listeners.forEach((fn) => fn());
  };
  return (
    <div role="group" aria-label="Tema" className="flex gap-1 rounded-[var(--radius-control)] bg-[rgb(243_245_244/0.10)] p-1">
      {OPTIONS.map(({ value, label, icon: Icon }) => (
        <button
          key={value}
          type="button"
          aria-pressed={current === value}
          aria-label={`Tema ${label.toLowerCase()}`}
          title={label}
          onClick={() => choose(value)}
          className={cx(
            "grid h-11 w-11 place-items-center rounded-[10px] transition-colors focus-visible:outline focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-poste",
            // La chapa superior es azul en los dos temas: el activo va siempre en porcelana clara.
            current === value
              ? "bg-[#f3f5f4] text-[#1d2f52] shadow-[0_2px_6px_-2px_rgb(14_23_41/0.6)]"
              : "text-sobre-esmalte-suave hover:bg-[rgb(243_245_244/0.12)]",
          )}
        >
          <Icon aria-hidden size={20} strokeWidth={2.25} />
        </button>
      ))}
    </div>
  );
}
