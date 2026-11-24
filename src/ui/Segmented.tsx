"use client";

import { useRef, type KeyboardEvent } from "react";
import { cx } from "./cx";

export type SegmentOption = { value: string; label: string; disabled?: boolean; hint?: string };

const ARROW_STEP: Partial<Record<string, 1 | -1>> = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 };

/** A qué opción lleva una flecha desde `current`, saltando las deshabilitadas y dando la vuelta; null si la tecla no mueve. */
export function arrowTarget(key: string, current: number, enabled: number[]): number | null {
  const step = ARROW_STEP[key];
  if (!step || enabled.length === 0) return null;
  return enabled[(enabled.indexOf(current) + step + enabled.length) % enabled.length]!;
}

/** Se llega con Tab a la elegida; si no hay ninguna, a la primera habilitada (patrón de grupo de radios). */
export function isTabStop(i: number, on: boolean, value: string | null, enabled: number[]): boolean {
  return on || (value === null && i === enabled[0]);
}

/**
 * Opciones lado a lado, una elegida (DESIGN.md: la selección es esmalte). Grupo de radios accesible: flechas
 * para moverse, las deshabilitadas se saltean y muestran su motivo (`hint`). Con más de dos opciones, se
 * acomodan en filas.
 */
export function Segmented({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: SegmentOption[];
  value: string | null;
  onChange: (value: string) => void;
}) {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const enabled = options.map((o, i) => (o.disabled ? -1 : i)).filter((i) => i >= 0);

  function onKey(e: KeyboardEvent, i: number) {
    const next = arrowTarget(e.key, i, enabled);
    if (next === null) return;
    e.preventDefault();
    onChange(options[next]!.value);
    refs.current[next]?.focus();
  }

  return (
    <div role="radiogroup" aria-label={label} className="flex flex-wrap gap-1 rounded-[var(--radius-chapa)] bg-esmalte-100 p-1 shadow-[inset_0_0_0_1px_var(--linea)] dark:bg-chapa">
      {options.map((o, i) => {
        const on = o.value === value;
        return (
          <button
            key={o.value}
            ref={(el) => {
              refs.current[i] = el;
            }}
            type="button"
            role="radio"
            aria-checked={on}
            disabled={o.disabled}
            tabIndex={isTabStop(i, on, value, enabled) ? 0 : -1}
            onClick={() => onChange(o.value)}
            onKeyDown={(e) => onKey(e, i)}
            className={cx(
              "flex min-h-[52px] min-w-[8rem] flex-1 flex-col items-center justify-center rounded-[var(--radius-control)] px-4 py-1.5 text-center font-bold transition-colors",
              "focus-visible:outline focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-poste",
              on ? "bg-esmalte text-sobre-esmalte shadow-[var(--shadow-chapa-control)]" : "text-tinta hover:bg-[rgb(29_47_82/0.06)]",
              o.disabled && "cursor-not-allowed text-tinta-suave opacity-70 hover:bg-transparent",
            )}
          >
            <span className="text-[17px]">{o.label}</span>
            {o.hint ? <span className="text-[13px] font-normal">{o.hint}</span> : null}
          </button>
        );
      })}
    </div>
  );
}
