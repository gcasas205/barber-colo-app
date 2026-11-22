"use client";

import { CalendarDays, Settings, Users } from "lucide-react";
import Link, { useLinkStatus } from "next/link";
import { useEffect, useState } from "react";
import { cx } from "@/ui/cx";

const TABS = [
  { href: "/colo", label: "Agenda", icon: CalendarDays },
  { href: "/colo/clientes", label: "Clientes", icon: Users },
  { href: "/colo/ajustes", label: "Ajustes", icon: Settings },
] as const;
export type ColoTabHref = (typeof TABS)[number]["href"];

/**
 * Avisa a las pestañas cuándo esta está cargando y muestra la barrita del poste (DESIGN.md: el poste es la
 * carga). El estado sale de `useLinkStatus`, que se apaga solo al terminar la navegación: nada queda
 * guardado en la pantalla (Next conserva las pantallas visitadas y las vuelve a mostrar tal cual).
 */
function Pending({ href, onPending }: { href: ColoTabHref; onPending: (href: ColoTabHref, pending: boolean) => void }) {
  const { pending } = useLinkStatus();
  useEffect(() => onPending(href, pending), [href, pending, onPending]);
  return (
    <span
      aria-hidden
      className={cx(
        "poste pointer-events-none absolute inset-x-3 bottom-1 h-1.5 rounded-full opacity-0 transition-opacity duration-100",
        pending && "opacity-100",
      )}
    />
  );
}

/**
 * Spec 004, RF-21: Agenda, Clientes y Ajustes. Mientras una pestaña carga, se marca esa; si no, la de la
 * pantalla actual.
 */
export function ColoTabs({ current }: { current: ColoTabHref }) {
  const [loading, setLoading] = useState<ColoTabHref | null>(null);
  const [onPending] = useState(
    () => (href: ColoTabHref, pending: boolean) => setLoading((prev) => (pending ? href : prev === href ? null : prev)),
  );
  // Al ocultarse esta pantalla (Next la guarda para volver), se olvida la carga: al volver, manda `current`.
  useEffect(() => () => setLoading(null), []);
  const active = loading ?? current;
  return (
    <nav aria-label="Panel de Colo">
      <ul className="grid grid-cols-3 gap-2">
        {TABS.map(({ href, label, icon: Icon }) => (
          <li key={href} className="flex">
            <Link
              href={href}
              aria-current={href === current ? "page" : undefined}
              className={cx(
                "relative flex min-h-[52px] w-full items-center justify-center gap-2 rounded-[var(--radius-control)] px-2 font-bold focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-poste active:scale-[0.97]",
                href === active ? "bg-esmalte text-sobre-esmalte" : "bg-chapa shadow-[inset_0_0_0_2px_var(--linea)]",
              )}
            >
              <Icon aria-hidden size={20} strokeWidth={2.5} /> {label}
              <Pending href={href} onPending={onPending} />
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
