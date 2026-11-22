"use client";

import Link, { useLinkStatus } from "next/link";
import { useEffect, useState } from "react";
import { cx } from "@/ui/cx";
import { SECTIONS, type Area, type SectionHref } from "./sections";

/**
 * Avisa cuándo este enlace está cargando y muestra la barrita del poste (DESIGN.md: el poste es la carga). El
 * estado sale de `useLinkStatus`, que se apaga solo al terminar la navegación: nada queda guardado en la pantalla
 * (Next conserva las pantallas visitadas y las vuelve a mostrar tal cual).
 */
function Pending({ href, rail, onPending }: { href: string; rail: boolean; onPending: (href: string, pending: boolean) => void }) {
  const { pending } = useLinkStatus();
  useEffect(() => onPending(href, pending), [href, pending, onPending]);
  return (
    <span
      aria-hidden
      className={cx(
        "poste pointer-events-none absolute rounded-full opacity-0 transition-opacity duration-100",
        rail ? "inset-y-3 left-1 w-1.5" : "inset-x-6 top-1 h-1",
        pending && "opacity-100",
      )}
    />
  );
}

/**
 * Spec 004c, RF-1 a RF-3: barra inferior (celular) o riel lateral (computadora). Mientras una sección carga, se
 * marca esa al instante; si no, la de la pantalla actual. `current` es la sección de la pantalla.
 */
export function SectionNav({ area, current, variant }: { area: Area; current: SectionHref; variant: "bar" | "rail" }) {
  const [loading, setLoading] = useState<string | null>(null);
  const [onPending] = useState(
    () => (href: string, pending: boolean) => setLoading((prev) => (pending ? href : prev === href ? null : prev)),
  );
  // Al ocultarse esta pantalla (Next la guarda para volver), se olvida la carga: al volver, manda `current`.
  useEffect(() => () => setLoading(null), []);
  const active = loading ?? current;
  const rail = variant === "rail";

  return (
    <nav aria-label="Secciones">
      <ul className={rail ? "flex flex-col gap-1" : "mx-auto flex max-w-xl"}>
        {SECTIONS[area].map(({ href, label, icon: Icon }) => {
          const on = href === active;
          return (
            <li key={href} className={rail ? undefined : "flex-1"}>
              <Link
                href={href}
                aria-current={href === current ? "page" : undefined}
                data-on={on || undefined}
                className={cx(
                  "relative flex font-bold focus-visible:outline-3 focus-visible:outline-offset-[-3px] focus-visible:outline-poste",
                  rail
                    ? "min-h-[48px] items-center gap-3 rounded-[var(--radius-control)] px-3 text-[16px] transition-colors"
                    : "min-h-[64px] flex-col items-center justify-center gap-1 text-[13px] active:scale-[0.97]",
                  rail
                    ? on
                      ? "bg-[rgb(243_245_244/0.14)] text-sobre-esmalte shadow-[inset_0_0_0_1px_rgb(243_245_244/0.18)]"
                      : "hover:bg-[rgb(243_245_244/0.08)] hover:text-sobre-esmalte"
                    : on
                      ? "text-sobre-esmalte"
                      : "hover:text-sobre-esmalte",
                )}
              >
                {rail ? (
                  <Icon aria-hidden size={22} strokeWidth={on ? 2.5 : 2} />
                ) : (
                  <span className={cx("grid h-8 w-12 place-items-center rounded-full transition-colors", on && "bg-[rgb(243_245_244/0.16)]")}>
                    <Icon aria-hidden size={22} strokeWidth={on ? 2.5 : 2} />
                  </span>
                )}
                {label}
                <Pending href={href} rail={rail} onPending={onPending} />
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
