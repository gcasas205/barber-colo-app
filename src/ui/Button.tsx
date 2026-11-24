import type { ButtonHTMLAttributes } from "react";
import { cx } from "./cx";

type Variant = "principal" | "esmalte" | "secundario" | "texto";

const VARIANT: Record<Variant, string> = {
  principal: "bg-poste text-white shadow-[0_8px_16px_-10px_rgb(184_38_47/0.8)] hover:bg-poste-oscuro",
  esmalte: "bg-esmalte text-sobre-esmalte shadow-[var(--shadow-chapa-control)] hover:bg-esmalte-700",
  secundario: "bg-chapa text-tinta shadow-[inset_0_0_0_2px_var(--linea)] hover:shadow-[inset_0_0_0_2px_var(--esmalte-200)]",
  texto: "min-h-[44px] px-2 underline decoration-2 underline-offset-4",
};

/**
 * Botones. "principal" (rojo poste) es la única acción principal de la pantalla.
 * Todos miden 52 px de alto como mínimo: se usan con el pulgar y por personas mayores.
 */
export function Button({
  variant = "secundario",
  className,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  return (
    <button
      type="button"
      className={cx(
        "inline-flex min-h-[52px] items-center justify-center gap-2 rounded-[var(--radius-control)] px-5 text-[17px] font-bold transition-[background-color,transform,box-shadow] duration-150 ease-out active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50",
        VARIANT[variant],
        className,
      )}
      {...rest}
    />
  );
}
