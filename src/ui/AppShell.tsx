import Link from "next/link";
import type { ReactNode } from "react";
import { BottomNav, type NavItem } from "./BottomNav";
import { Badge } from "./brand/Badge";
import { cx } from "./cx";

/**
 * Estructura de la app.
 * - Celular: contenido + barra inferior de esmalte.
 * - Web (≥ 1024 px): riel lateral de esmalte con la insignia y las secciones; el contenido usa el ancho.
 */
export function AppShell({ nav, children }: { nav: NavItem[]; children: ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col lg:grid lg:grid-cols-[248px_1fr]">
      <aside className="sticky top-0 hidden h-dvh flex-col gap-8 bg-esmalte px-4 py-6 text-sobre-esmalte-suave shadow-[8px_0_24px_-18px_rgb(14_23_41/0.6)] lg:flex">
        <Link href="/prototipo" className="flex items-center gap-3 px-2 text-sobre-esmalte">
          <Badge size={52} />
          <span className="flex flex-col leading-tight">
            <span className="letras-chapa text-[18px]">El Colo</span>
            <span className="text-[13px] font-bold text-sobre-esmalte-suave">Barbería y Peluquería</span>
          </span>
        </Link>
        <nav aria-label="Secciones">
          <ul className="flex flex-col gap-1">
            {nav.map(({ href, label, icon: Icon, current }) => (
              <li key={href}>
                <Link
                  href={href}
                  aria-current={current ? "page" : undefined}
                  className={cx(
                    "flex min-h-[48px] items-center gap-3 rounded-[var(--radius-control)] px-3 text-[16px] font-bold transition-colors",
                    current
                      ? "bg-[rgb(243_245_244/0.14)] text-sobre-esmalte shadow-[inset_0_0_0_1px_rgb(243_245_244/0.18)]"
                      : "hover:bg-[rgb(243_245_244/0.08)] hover:text-sobre-esmalte",
                  )}
                >
                  <Icon aria-hidden size={22} strokeWidth={current ? 2.5 : 2} />
                  {label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <div aria-hidden className="poste mt-auto h-2 rounded-full opacity-90" />
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        {children}
        <div className="lg:hidden">
          <BottomNav items={nav} />
        </div>
      </div>
    </div>
  );
}
