import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { cx } from "./cx";

export type NavItem = { href: string; label: string; icon: LucideIcon; current?: boolean };

/** Barra inferior: chapa de esmalte con la sección actual marcada en blanco porcelana. */
export function BottomNav({ items }: { items: NavItem[] }) {
  return (
    <nav aria-label="Secciones" className="sticky bottom-0 z-10 bg-esmalte pb-[env(safe-area-inset-bottom)] text-sobre-esmalte-suave shadow-[0_-8px_18px_-12px_rgb(14_23_41/0.5)]">
      <ul className="mx-auto flex max-w-xl">
        {items.map(({ href, label, icon: Icon, current }) => (
          <li key={href} className="flex-1">
            <Link
              href={href}
              aria-current={current ? "page" : undefined}
              className={cx(
                "flex min-h-[64px] flex-col items-center justify-center gap-1 text-[13px] font-bold",
                current ? "text-sobre-esmalte" : "hover:text-sobre-esmalte",
              )}
            >
              <span
                className={cx(
                  "grid h-8 w-12 place-items-center rounded-full transition-colors",
                  current && "bg-[rgb(243_245_244/0.16)]",
                )}
              >
                <Icon aria-hidden size={22} strokeWidth={current ? 2.5 : 2} />
              </span>
              {label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
