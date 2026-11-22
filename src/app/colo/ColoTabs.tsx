"use client";

import { CalendarDays, Settings, Users } from "lucide-react";
import Link, { useLinkStatus } from "next/link";
import { useState } from "react";
import { cx } from "@/ui/cx";

const TABS = [
  { href: "/colo", label: "Agenda", icon: CalendarDays },
  { href: "/colo/clientes", label: "Clientes", icon: Users },
  { href: "/colo/ajustes", label: "Ajustes", icon: Settings },
] as const;
export type ColoTabHref = (typeof TABS)[number]["href"];

/** Barrita con el poste (DESIGN.md: el poste es la carga) mientras llega la pantalla. */
function Pending() {
  const { pending } = useLinkStatus();
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
 * Spec 004, RF-21: Agenda, Clientes y Ajustes. Al tocar, la pestaña se marca enseguida y aparece la barrita
 * de carga: así se nota que el toque llegó aunque la red tarde.
 */
export function ColoTabs({ current }: { current: ColoTabHref }) {
  const [chosen, setChosen] = useState<ColoTabHref>(current);
  return (
    <nav aria-label="Panel de Colo">
      <ul className="grid grid-cols-3 gap-2">
        {TABS.map(({ href, label, icon: Icon }) => {
          const active = href === chosen;
          return (
            <li key={href} className="flex">
              <Link
                href={href}
                aria-current={href === current ? "page" : undefined}
                onClick={() => setChosen(href)}
                className={cx(
                  "relative flex min-h-[52px] w-full items-center justify-center gap-2 rounded-[var(--radius-control)] px-2 font-bold focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-poste active:scale-[0.97]",
                  active ? "bg-esmalte text-sobre-esmalte" : "bg-chapa shadow-[inset_0_0_0_2px_var(--linea)]",
                )}
              >
                <Icon aria-hidden size={20} strokeWidth={2.5} /> {label}
                <Pending />
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
