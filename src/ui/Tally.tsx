import { cx } from "./cx";

/**
 * Cuenta por casilleros (como las marcas de una tarjeta de fidelidad): N casillas, las hechas en esmalte.
 * Se lee también como texto ("3 de 4") para lectores de pantalla.
 */
export function Tally({ done, total, className }: { done: number; total: number; className?: string }) {
  return (
    <div
      role="img"
      aria-label={`${done} de ${total}`}
      className={cx("grid gap-1", className)}
      style={{ gridTemplateColumns: `repeat(${total}, minmax(0, 1fr))` }}
    >
      {Array.from({ length: total }, (_, i) => (
        <span
          key={i}
          className={cx("h-3 rounded-[3px]", i < done ? "bg-esmalte" : "bg-esmalte-100 shadow-[inset_0_0_0_1px_var(--linea)]")}
        />
      ))}
    </div>
  );
}
