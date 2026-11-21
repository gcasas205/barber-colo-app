import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes } from "react";
import { cx } from "./cx";

const control =
  "min-h-[52px] w-full rounded-[var(--radius-control)] bg-chapa px-4 text-[17px] text-tinta shadow-[inset_0_0_0_2px_var(--linea)] outline-none transition-shadow focus-visible:shadow-[inset_0_0_0_2px_var(--esmalte-800)] focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-poste";

/** Campo con etiqueta arriba y ayuda debajo. */
export function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-[15px] font-bold">{label}</span>
      {children}
      {hint ? <span className="text-[14px] text-tinta-suave">{hint}</span> : null}
    </label>
  );
}

export function TextInput({ className, ...rest }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cx(control, className)} {...rest} />;
}

/** Monto en pesos: prefijo "$" y cifras tabulares. */
export function MoneyInput({ className, ...rest }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <span className="relative flex items-center">
      <span aria-hidden className="cifra pointer-events-none absolute left-4 text-[17px] text-tinta-suave">
        $
      </span>
      <input inputMode="numeric" className={cx(control, "cifra pl-9", className)} {...rest} />
    </span>
  );
}

export function Select({ className, children, ...rest }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select className={cx(control, "appearance-auto", className)} {...rest}>
      {children}
    </select>
  );
}

/** Interruptor: un checkbox nativo con forma de interruptor y su texto. */
export function Switch({
  label,
  hint,
  checked,
  onChange,
}: {
  label: string;
  hint?: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <label className="flex min-h-[52px] cursor-pointer items-center justify-between gap-4">
      <span className="flex flex-col">
        <span className="text-[16px] font-bold">{label}</span>
        {hint ? <span className="text-[14px] text-tinta-suave">{hint}</span> : null}
      </span>
      <input
        type="checkbox"
        role="switch"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="peer sr-only"
      />
      <span
        aria-hidden
        className={cx(
          "relative h-8 w-14 shrink-0 rounded-full transition-colors peer-focus-visible:outline-3 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-poste",
          checked ? "bg-esmalte" : "bg-esmalte-100 shadow-[inset_0_0_0_2px_var(--linea)]",
        )}
      >
        <span
          className={cx(
            "absolute top-1 h-6 w-6 rounded-full bg-chapa shadow-[0_2px_4px_rgb(14_23_41/0.3)] transition-transform duration-150 ease-out",
            checked ? "translate-x-7" : "translate-x-1",
          )}
        />
      </span>
    </label>
  );
}
