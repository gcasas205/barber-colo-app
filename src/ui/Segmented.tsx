"use client";

import { useRef, type KeyboardEvent } from "react";
import { cx } from "./cx";

export type SegmentOption = { value: string; label: string; disabled?: boolean; hint?: string };

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
    const step = e.key === "ArrowRight" || e.key === "ArrowDown" ? 1 : e.key === "ArrowLeft" || e.key === "ArrowUp" ? -1 : 0;
    if (!step || enabled.length === 0) return;
    e.preventDefault();
    const pos = enabled.indexOf(i);
    const next = enabled[(pos + step + enabled.length) % enabled.length]!;
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
            tabIndex={on || (value === null && i === enabled[0]) ? 0 : -1}
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
