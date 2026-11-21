import type { ComponentPropsWithoutRef, ElementType, ReactNode } from "react";
import { cx } from "./cx";

type Tone = "esmalte" | "blanca";

type PlateProps<T extends ElementType> = {
  as?: T;
  tone?: Tone;
  children: ReactNode;
  className?: string;
} & Omit<ComponentPropsWithoutRef<T>, "as" | "children" | "className">;

/**
 * Chapa: la superficie del mundo. Esmalte azul con borde interior claro (la estructura y lo
 * importante) o chapa blanca (contenido). Esquinas de 14 px, como un cartel esmaltado.
 */
export function Plate<T extends ElementType = "section">({ as, tone = "blanca", className, children, ...rest }: PlateProps<T>) {
  const Tag = (as ?? "section") as ElementType;
  return (
    <Tag
      className={cx(
        "rounded-[var(--radius-chapa)]",
        tone === "esmalte"
          ? "bg-esmalte text-sobre-esmalte shadow-[var(--shadow-chapa)]"
          : "bg-chapa text-tinta shadow-[var(--shadow-chapa-clara)]",
        className,
      )}
      {...rest}
    >
      {children}
    </Tag>
  );
}
