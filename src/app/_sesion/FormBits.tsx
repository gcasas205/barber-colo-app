import { CircleAlert } from "lucide-react";
import type { ReactNode } from "react";
import { cx } from "@/ui/cx";

/** Error de un campo, junto al campo y anunciado (RNF-5). */
export function FieldError({ id, children }: { id: string; children?: ReactNode }) {
  return (
    <p id={id} aria-live="polite" className={cx("min-h-0 text-[15px] font-bold text-alerta", !children && "sr-only")}>
      {children ? (
        <span className="inline-flex items-start gap-1.5">
          <CircleAlert aria-hidden size={18} strokeWidth={2.5} className="mt-0.5 shrink-0" />
          {children}
        </span>
      ) : null}
    </p>
  );
}

/** Error del formulario entero, arriba (como en Corralap). */
export function FormAlert({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div role="alert" className="flex gap-3 rounded-[var(--radius-control)] bg-alerta-fondo px-4 py-3 text-tinta shadow-[inset_0_0_0_2px_var(--alerta)]">
      <CircleAlert aria-hidden size={22} strokeWidth={2.5} className="mt-0.5 shrink-0 text-alerta" />
      <div>
        <p className="font-bold">{title}</p>
        <p className="text-[15px]">{children}</p>
      </div>
    </div>
  );
}
